use std::fs;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use discord_rich_presence::{DiscordIpc, DiscordIpcClient, activity};

const DISCORD_CLIENT_ID: &str = "1564500602854318111";
const DISCORD_LOGO_URL: &str =
    "https://raw.githubusercontent.com/bobjoerules/TTML-Editor/main/public/logo.png";
const REPOSITORY_URL: &str = "https://github.com/bobjoerules/TTML-Editor";

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct DiscordActivityPayload {
    details: Option<String>,
    state: Option<String>,
    playing: bool,
    activity_type: Option<String>,
    show_repository_button: bool,
    start_timestamp: Option<i64>,
    end_timestamp: Option<i64>,
    large_image: Option<String>,
    large_image_text: Option<String>,
    small_image: Option<String>,
    small_image_text: Option<String>,
}

struct DiscordConnection {
    client: Option<DiscordIpcClient>,
    retry_after: Option<Instant>,
}

impl Default for DiscordConnection {
    fn default() -> Self {
        Self {
            client: None,
            retry_after: None,
        }
    }
}

#[derive(Default)]
struct DiscordState(Mutex<DiscordConnection>);

fn connect_discord() -> Result<DiscordIpcClient, String> {
    let mut client = DiscordIpcClient::new(DISCORD_CLIENT_ID);
    client.connect().map_err(|e| e.to_string())?;
    Ok(client)
}

#[tauri::command]
async fn set_discord_activity(
    payload: DiscordActivityPayload,
    discord: tauri::State<'_, DiscordState>,
) -> Result<(), String> {
    let mut connection = discord.0.lock().map_err(|e| e.to_string())?;
    if connection.client.is_none() {
        if connection
            .retry_after
            .is_some_and(|retry_after| retry_after > Instant::now())
        {
            return Ok(());
        }
        match connect_discord() {
            Ok(client) => {
                connection.client = Some(client);
                connection.retry_after = None;
            }
            Err(error) => {
                log::debug!("Discord RPC is unavailable: {error}");
                connection.retry_after = Some(Instant::now() + Duration::from_secs(5));
                return Ok(());
            }
        }
    }

    let mut assets = activity::Assets::new();

    if let Some(large_image) = payload.large_image.as_deref() {
        if large_image.starts_with("http://") || large_image.starts_with("https://") {
            assets = assets.large_image(large_image);
        } else {
            assets = assets.large_image(DISCORD_LOGO_URL);
        }
    } else {
        assets = assets.large_image(DISCORD_LOGO_URL);
    }

    if let Some(large_image_text) = payload.large_image_text.as_deref() {
        assets = assets.large_text(large_image_text);
    } else {
        assets = assets.large_text("TTML Editor");
    }

    if let Some(small_image) = payload.small_image.as_deref() {
        if small_image.starts_with("http://") || small_image.starts_with("https://") {
            assets = assets.small_image(small_image);
        }
    }
    if let Some(small_image_text) = payload.small_image_text.as_deref() {
        assets = assets.small_text(small_image_text);
    }

    let activity_type = match payload.activity_type.as_deref() {
        Some("playing") => activity::ActivityType::Playing,
        Some("watching") => activity::ActivityType::Watching,
        Some("competing") => activity::ActivityType::Competing,
        _ => activity::ActivityType::Listening,
    };

    let mut rich_presence = activity::Activity::new()
        .activity_type(activity_type)
        .assets(assets);

    if let Some(details) = payload.details.as_deref() {
        rich_presence = rich_presence.details(details);
    }
    if let Some(state) = payload.state.as_deref() {
        rich_presence = rich_presence.state(state);
    }

    if payload.show_repository_button {
        rich_presence = rich_presence.buttons(vec![activity::Button::new(
            "View repository",
            REPOSITORY_URL,
        )]);
    }

    if let Some(start) = payload.start_timestamp {
        let mut timestamps = activity::Timestamps::new().start(start);
        if let Some(end) = payload.end_timestamp {
            timestamps = timestamps.end(end);
        }
        rich_presence = rich_presence.timestamps(timestamps);
    }

    let result = connection
        .client
        .as_mut()
        .expect("Discord client was initialized")
        .set_activity(rich_presence)
        .map_err(|e| e.to_string());
    if result.is_err() {
        connection.client = None;
        connection.retry_after = Some(Instant::now() + Duration::from_secs(5));
    }
    result
}

#[tauri::command]
async fn clear_discord_activity(discord: tauri::State<'_, DiscordState>) -> Result<(), String> {
    let mut connection = discord.0.lock().map_err(|e| e.to_string())?;
    if let Some(client) = connection.client.as_mut() {
        let result = client.clear_activity().map_err(|e| e.to_string());
        if result.is_err() {
            connection.client = None;
        }
        return result;
    }
    connection.retry_after = None;
    Ok(())
}

#[derive(serde::Serialize)]
struct OpenFileData {
    pub filename: String,
    pub data: String,
    pub ext: String,
}

#[tauri::command]
fn convert_audio_mp3_to_flac(input_data: Vec<u8>, filename: String) -> Result<Vec<u8>, String> {
    let temp_dir = std::env::temp_dir();
    let input_path = temp_dir.join(format!("ttml_tool_input_{}", filename));
    let output_path = temp_dir.join("ttml_tool_output.flac");

    if let Err(e) = fs::write(&input_path, &input_data) {
        return Err(format!("Failed to write temp input file: {}", e));
    }

    let ffmpeg_result = std::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            input_path.to_str().unwrap(),
            "-codec:a",
            "flac",
            "-sample-rate",
            "44100",
            output_path.to_str().unwrap(),
        ])
        .output();

    let _ = fs::remove_file(&input_path);

    match ffmpeg_result {
        Ok(result) => {
            if result.status.success() {
                match fs::read(&output_path) {
                    Ok(converted_data) => {
                        let _ = fs::remove_file(&output_path);
                        Ok(converted_data)
                    }
                    Err(e) => Err(format!("Failed to read converted file: {}", e)),
                }
            } else {
                let stderr_output = String::from_utf8_lossy(&result.stderr);
                let stdout_output = String::from_utf8_lossy(&result.stdout);
                if stderr_output.contains("not found")
                    || stderr_output.is_empty() && stdout_output.is_empty()
                {
                    Err(
                        "ffmpeg not found. Please install ffmpeg and ensure it's in your PATH."
                            .to_string(),
                    )
                } else {
                    Err(format!(
                        "FFmpeg conversion failed: {}\nStdout: {}",
                        stderr_output, stdout_output
                    ))
                }
            }
        }
        Err(e) => {
            let error_msg = if e.kind() == std::io::ErrorKind::NotFound {
                "ffmpeg not found. Please install ffmpeg and ensure it's in your PATH.".to_string()
            } else {
                format!(
                    "Failed to run ffmpeg: {}. Make sure ffmpeg is installed and in your PATH.",
                    e
                )
            };
            Err(error_msg)
        }
    }
}

#[tauri::command]
fn get_open_file_data() -> Option<OpenFileData> {
    let filename = std::env::args().nth(1);
    if let Some(filename) = filename {
        let path = std::path::Path::new(&filename);
        let ext = path
            .extension()
            .map(|x| x.to_string_lossy().into_owned())
            .unwrap_or_default();
        if let Ok(data) = std::fs::read_to_string(&filename) {
            return Some(OpenFileData {
                filename,
                data,
                ext,
            });
        }
    }

    None
}

#[tauri::command]
fn create_new_window(app: tauri::AppHandle) -> Result<(), String> {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let window_id = format!("window-{}", timestamp);

    #[allow(unused_mut)]
    let mut builder = tauri::WebviewWindowBuilder::new(
        &app,
        &window_id,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .inner_size(800.0, 600.0)
    .min_inner_size(640.0, 480.0)
    .resizable(true)
    .devtools(true)
    .disable_drag_drop_handler()
    .visible(false);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title("")
            .hidden_title(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay);
    }

    #[cfg(target_os = "windows")]
    {
        builder = builder
            .title("TTML Editor")
            .decorations(false)
            .center();
    }

    #[cfg(target_os = "linux")]
    {
        builder = builder.title("").decorations(false);
    }

    let webview_window = builder.build().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use tauri_plugin_decorum::WebviewWindowExt;
        let _ = webview_window.set_traffic_lights_inset(16.0, 20.0);
        let _ = webview_window.make_transparent();
        let win_clone = webview_window.clone();
        webview_window.on_window_event(move |evt| {
            if let tauri::WindowEvent::Resized(_) = evt {
                let _ = win_clone.set_traffic_lights_inset(16.0, 20.0);
            }
        });
    }

    let fallback_window = webview_window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(1500));
        if let Ok(is_visible) = fallback_window.is_visible() {
            if !is_visible {
                let _ = fallback_window.show();
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn fetch_url(
    url: String,
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let mut req = client.get(&url);
    if let Some(headers_map) = headers {
        for (k, v) in headers_map {
            req = req.header(k, v);
        }
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Network request failed: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("Server returned HTTP {}", status.as_u16()));
    }

    let body = resp.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[tauri::command]
async fn fetch_binary(url: String) -> Result<tauri::ipc::Response, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("Server returned HTTP {}", status.as_u16()));
    }

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes.to_vec()))
}

#[tauri::command]
async fn fetch_apple_ttml(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        if status.as_u16() == 404 {
            return Err("Track or lyrics not found for this Spotify ID.".to_string());
        }
        return Err(format!("Server returned HTTP {}", status.as_u16()));
    }

    let body = resp.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[allow(clippy::missing_panics_doc)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(any(target_os = "macos", windows, target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    #[cfg(desktop)]
    {
        use tauri_plugin_window_state::StateFlags;

        builder = builder.plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::SIZE | StateFlags::MAXIMIZED | StateFlags::FULLSCREEN)
                .build(),
        );
    }

    builder
        .manage(DiscordState::default())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
                use tauri::{Emitter, Manager};
                use tauri_plugin_decorum::WebviewWindowExt;

                let handle = app.handle();

                // 1. App menu
                let app_menu = Submenu::new(app, "TTML Editor", true)?;
                app_menu.append(&PredefinedMenuItem::about(app, None, None)?)?;
                app_menu.append(&PredefinedMenuItem::separator(app)?)?;
                let account_item = MenuItem::with_id(
                    app,
                    "menu-cloud-auth",
                    "Cloud Account...",
                    true,
                    None::<&str>,
                )?;
                app_menu.append(&account_item)?;
                let settings_item = MenuItem::with_id(
                    app,
                    "menu-settings",
                    "Settings...",
                    true,
                    Some("CmdOrCtrl+,"),
                )?;
                app_menu.append(&settings_item)?;
                app_menu.append(&PredefinedMenuItem::separator(app)?)?;
                app_menu.append(&PredefinedMenuItem::quit(app, None)?)?;

                // 2. File menu
                let file_menu = Submenu::new(app, "File", true)?;
                let new_file_item =
                    MenuItem::with_id(app, "menu-new-file", "New File", true, Some("CmdOrCtrl+N"))?;
                let new_window_item = MenuItem::with_id(
                    app,
                    "menu-new-window",
                    "New Window",
                    true,
                    Some("CmdOrCtrl+Shift+N"),
                )?;
                let open_file_item = MenuItem::with_id(
                    app,
                    "menu-open-file",
                    "Open File...",
                    true,
                    Some("CmdOrCtrl+O"),
                )?;
                let open_cloud_item = MenuItem::with_id(
                    app,
                    "menu-cloud-open",
                    "Open from Cloud...",
                    true,
                    Some("CmdOrCtrl+Shift+O"),
                )?;
                let save_file_item = MenuItem::with_id(
                    app,
                    "menu-save-file",
                    "Save File",
                    true,
                    Some("CmdOrCtrl+S"),
                )?;
                let save_cloud_item = MenuItem::with_id(
                    app,
                    "menu-cloud-save",
                    "Save to Cloud...",
                    true,
                    Some("CmdOrCtrl+Shift+S"),
                )?;
                let history_restore_item = MenuItem::with_id(
                    app,
                    "menu-history-restore",
                    "Auto-Saves...",
                    true,
                    None::<&str>,
                )?;
                let metadata_item = MenuItem::with_id(
                    app,
                    "menu-metadata",
                    "Metadata Editor...",
                    true,
                    None::<&str>,
                )?;
                file_menu.append(&new_file_item)?;
                file_menu.append(&new_window_item)?;
                file_menu.append(&open_file_item)?;
                file_menu.append(&open_cloud_item)?;
                file_menu.append(&PredefinedMenuItem::separator(app)?)?;
                file_menu.append(&save_file_item)?;
                file_menu.append(&save_cloud_item)?;
                file_menu.append(&history_restore_item)?;
                file_menu.append(&PredefinedMenuItem::separator(app)?)?;
                file_menu.append(&metadata_item)?;

                // 3. Edit menu
                let edit_menu = Submenu::new(app, "Edit", true)?;
                let undo_item =
                    MenuItem::with_id(app, "menu-undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
                let redo_item =
                    MenuItem::with_id(app, "menu-redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?;
                let find_item =
                    MenuItem::with_id(app, "menu-find", "Find...", true, Some("CmdOrCtrl+F"))?;
                let replace_item = MenuItem::with_id(
                    app,
                    "menu-replace",
                    "Replace...",
                    true,
                    Some("CmdOrCtrl+H"),
                )?;
                let select_all_item = MenuItem::with_id(
                    app,
                    "menu-select-all",
                    "Select All",
                    true,
                    Some("CmdOrCtrl+A"),
                )?;
                edit_menu.append(&undo_item)?;
                edit_menu.append(&redo_item)?;
                edit_menu.append(&PredefinedMenuItem::separator(app)?)?;
                edit_menu.append(&find_item)?;
                edit_menu.append(&replace_item)?;
                edit_menu.append(&PredefinedMenuItem::separator(app)?)?;
                edit_menu.append(&PredefinedMenuItem::cut(app, None)?)?;
                edit_menu.append(&PredefinedMenuItem::copy(app, None)?)?;
                edit_menu.append(&PredefinedMenuItem::paste(app, None)?)?;
                edit_menu.append(&PredefinedMenuItem::separator(app)?)?;
                edit_menu.append(&select_all_item)?;

                // 4. Tools menu
                let tools_menu = Submenu::new(app, "Tools", true)?;

                let auto_segment_item = MenuItem::with_id(
                    app,
                    "menu-auto-segment",
                    "Auto Segment",
                    true,
                    Some("CmdOrCtrl+K"),
                )?;

                let segment_menu = Submenu::new(app, "Segmentation", true)?;
                let auto_segment_sub_item = MenuItem::with_id(
                    app,
                    "menu-auto-segment-sub",
                    "Auto Segment",
                    true,
                    None::<&str>,
                )?;
                let ruby_segment_item = MenuItem::with_id(
                    app,
                    "menu-ruby-segment",
                    "Ruby Segmentation",
                    true,
                    None::<&str>,
                )?;
                let adv_segment_item = MenuItem::with_id(
                    app,
                    "menu-advanced-segment",
                    "Advanced Segmentation...",
                    true,
                    None::<&str>,
                )?;
                let learned_splits_item = MenuItem::with_id(
                    app,
                    "menu-learned-splits",
                    "Learned Splits...",
                    true,
                    None::<&str>,
                )?;
                segment_menu.append(&auto_segment_sub_item)?;
                segment_menu.append(&ruby_segment_item)?;
                segment_menu.append(&adv_segment_item)?;
                segment_menu.append(&learned_splits_item)?;

                let sync_timestamps_item = MenuItem::with_id(
                    app,
                    "menu-sync-line-timestamps",
                    "Sync Line Timestamps",
                    true,
                    None::<&str>,
                )?;
                let auto_duet_item = MenuItem::with_id(
                    app,
                    "menu-auto-duet-singer",
                    "Auto Duet Based on Singer",
                    true,
                    None::<&str>,
                )?;
                let time_shift_item =
                    MenuItem::with_id(app, "menu-time-shift", "Time Shift...", true, None::<&str>)?;
                let time_stretch_item = MenuItem::with_id(
                    app,
                    "menu-time-stretch",
                    "Time Stretch...",
                    true,
                    None::<&str>,
                )?;
                let checklist_item = MenuItem::with_id(
                    app,
                    "menu-checklist",
                    "TTML Checklist...",
                    true,
                    Some("CmdOrCtrl+Shift+C"),
                )?;
                let grammar_check_item = MenuItem::with_id(
                    app,
                    "menu-grammar-check",
                    "Grammar and Spelling Check...",
                    true,
                    None::<&str>,
                )?;
                let spotmatch_item = MenuItem::with_id(
                    app,
                    "menu-spotmatch",
                    "SpotMatch (Alternate Spotify IDs)...",
                    true,
                    Some("CmdOrCtrl+Shift+M"),
                )?;
                let latency_item = MenuItem::with_id(
                    app,
                    "menu-latency-test",
                    "Latency Test...",
                    true,
                    None::<&str>,
                )?;
                let download_audio_item = MenuItem::with_id(
                    app,
                    "menu-download-audio",
                    "Download Audio...",
                    true,
                    None::<&str>,
                )?;

                tools_menu.append(&auto_segment_item)?;
                tools_menu.append(&segment_menu)?;
                tools_menu.append(&sync_timestamps_item)?;
                tools_menu.append(&auto_duet_item)?;
                tools_menu.append(&PredefinedMenuItem::separator(app)?)?;
                tools_menu.append(&time_shift_item)?;
                tools_menu.append(&time_stretch_item)?;
                tools_menu.append(&PredefinedMenuItem::separator(app)?)?;
                tools_menu.append(&checklist_item)?;
                tools_menu.append(&grammar_check_item)?;
                tools_menu.append(&spotmatch_item)?;
                tools_menu.append(&download_audio_item)?;
                tools_menu.append(&latency_item)?;

                // 5. Help menu
                let help_menu = Submenu::new(app, "Help", true)?;
                let start_guide_item =
                    MenuItem::with_id(app, "menu-start-guide", "Start Guide", true, None::<&str>)?;
                let github_item =
                    MenuItem::with_id(app, "menu-github", "GitHub", true, None::<&str>)?;
                let wiki_item =
                    MenuItem::with_id(app, "menu-wiki", "SpicyLyrics Guides", true, None::<&str>)?;
                let whats_new_item =
                    MenuItem::with_id(app, "menu-whats-new", "What's New", true, None::<&str>)?;
                let changelog_item = MenuItem::with_id(
                    app,
                    "menu-changelog",
                    "Changelog & Updates",
                    true,
                    None::<&str>,
                )?;
                let about_item =
                    MenuItem::with_id(app, "menu-about", "About TTML Editor", true, None::<&str>)?;

                help_menu.append(&start_guide_item)?;
                help_menu.append(&github_item)?;
                help_menu.append(&wiki_item)?;
                help_menu.append(&PredefinedMenuItem::separator(app)?)?;
                help_menu.append(&whats_new_item)?;
                help_menu.append(&changelog_item)?;
                help_menu.append(&PredefinedMenuItem::separator(app)?)?;
                help_menu.append(&about_item)?;

                let menu = Menu::with_items(
                    app,
                    &[&app_menu, &file_menu, &edit_menu, &tools_menu, &help_menu],
                )?;
                app.set_menu(menu)?;

                let app_handle_clone = handle.clone();
                app.on_menu_event(move |app_h, event| {
                    let id = event.id().0.as_str();
                    if id == "menu-new-window" {
                        let _ = create_new_window(app_h.clone());
                    } else if id.starts_with("menu-") {
                        let _ = app_handle_clone.emit(id, ());
                    }
                });

                let main_window = app.get_webview_window("main").unwrap();
                main_window.set_traffic_lights_inset(16.0, 20.0).unwrap();
                main_window.make_transparent().unwrap();
                let main_window_clone = main_window.clone();
                main_window.on_window_event(move |evt| {
                    if let tauri::WindowEvent::Resized(_) = evt {
                        main_window_clone
                            .set_traffic_lights_inset(16.0, 20.0)
                            .unwrap();
                    }
                });
            }

            // Safety fallback: Ensure main window is made visible after 1.5s even if frontend has delay or error
            #[cfg(desktop)]
            {
                use tauri::Manager;
                if let Some(main_window) = app.get_webview_window("main") {
                    let fallback_window = main_window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(1500));
                        if let Ok(is_visible) = fallback_window.is_visible() {
                            if !is_visible {
                                log::info!("Safety fallback triggered: force-showing main window");
                                let _ = fallback_window.show();
                            }
                        }
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_open_file_data,
            convert_audio_mp3_to_flac,
            set_discord_activity,
            clear_discord_activity,
            create_new_window,
            fetch_apple_ttml,
            fetch_url,
            fetch_binary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
