use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{Manager, ipc::Channel};
use tauri_plugin_dialog::DialogExt;

struct ActiveDownload {
    id: String,
    cancelled: Arc<AtomicBool>,
}

#[derive(Default, Clone)]
pub struct DownloaderState(Arc<Mutex<Option<ActiveDownload>>>);

#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadError {
    code: &'static str,
    detail: String,
}

fn error(code: &'static str, detail: impl ToString) -> DownloadError {
    DownloadError {
        code,
        detail: detail.to_string(),
    }
}

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Format {
    Mp3,
    M4a,
    Flac,
    Wav,
    Opus,
    Mp4,
    Mkv,
}

impl Format {
    fn extension(self) -> &'static str {
        match self {
            Self::Mp3 => "mp3",
            Self::M4a => "m4a",
            Self::Flac => "flac",
            Self::Wav => "wav",
            Self::Opus => "opus",
            Self::Mp4 => "mp4",
            Self::Mkv => "mkv",
        }
    }
    fn video(self) -> bool {
        matches!(self, Self::Mp4 | Self::Mkv)
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    url: String,
    format: Format,
    max_height: Option<u32>,
}

#[derive(Clone, serde::Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum DownloadEvent {
    Preparing,
    Downloading { percent: Option<f64> },
    Processing,
}

fn validate_url(value: &str) -> Result<(), DownloadError> {
    let url = tauri::Url::parse(value).map_err(|_| error("invalidUrl", ""))?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || value.len() > 8192
    {
        return Err(error("invalidUrl", ""));
    }
    Ok(())
}

fn tools_dir(app: &tauri::AppHandle) -> Result<PathBuf, DownloadError> {
    #[cfg(debug_assertions)]
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("downloader-tools");
    #[cfg(not(debug_assertions))]
    let dir = app
        .path()
        .resource_dir()
        .map_err(|e| error("unavailable", e))?
        .join("downloader-tools");
    let _ = app;
    for name in ["yt-dlp", "ffmpeg", "ffprobe", "deno"] {
        if !dir
            .join(format!("{name}{}", std::env::consts::EXE_SUFFIX))
            .is_file()
        {
            return Err(error("unavailable", ""));
        }
    }
    Ok(dir)
}

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn command(program: impl AsRef<std::ffi::OsStr>) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    cmd
}

/// A Job Object that kills its processes when its last handle closes. The
/// handle is never closed explicitly, so Windows closes it when the editor
/// exits for any reason (quit, restart, crash, End Task), taking yt-dlp and
/// the FFmpeg/Deno processes it started with it.
#[cfg(windows)]
fn kill_on_close_job() -> Option<windows_sys::Win32::Foundation::HANDLE> {
    use std::sync::OnceLock;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::JobObjects::{
        CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
        JobObjectExtendedLimitInformation, SetInformationJobObject,
    };

    // Stored as an address because raw handles are neither Send nor Sync.
    static JOB: OnceLock<usize> = OnceLock::new();
    let address = *JOB.get_or_init(|| unsafe {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return 0;
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let size = u32::try_from(std::mem::size_of_val(&info)).unwrap_or(u32::MAX);
        if SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            (&raw const info).cast(),
            size,
        ) == 0
        {
            CloseHandle(job);
            return 0;
        }
        job as usize
    });
    (address != 0).then_some(address as windows_sys::Win32::Foundation::HANDLE)
}

/// Spawns a tool tied to the editor's lifetime.
///
/// On Windows the process starts suspended, joins the kill-on-close job and
/// only then runs, so everything it starts (yt-dlp's bootloader child, FFmpeg,
/// Deno) inherits the job. If it can't be contained it is killed instead of
/// being left to outlive the editor.
fn spawn_contained(cmd: &mut Command) -> std::io::Result<Child> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_SUSPENDED: u32 = 0x0000_0004;
        cmd.creation_flags(CREATE_NO_WINDOW | CREATE_SUSPENDED);
        let mut child = cmd.spawn()?;
        if let Err(cause) = join_job_and_resume(&child) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(cause);
        }
        Ok(child)
    }
    #[cfg(not(windows))]
    cmd.spawn()
}

#[cfg(windows)]
fn join_job_and_resume(child: &Child) -> std::io::Result<()> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, TH32CS_SNAPTHREAD, THREADENTRY32, Thread32First, Thread32Next,
    };
    use windows_sys::Win32::System::JobObjects::AssignProcessToJobObject;
    use windows_sys::Win32::System::Threading::{OpenThread, ResumeThread, THREAD_SUSPEND_RESUME};

    let job = kill_on_close_job()
        .ok_or_else(|| std::io::Error::other("the downloader job object is unavailable"))?;
    if unsafe { AssignProcessToJobObject(job, child.as_raw_handle().cast()) } == 0 {
        return Err(std::io::Error::last_os_error());
    }
    // A process created suspended has exactly one (suspended) thread. std
    // doesn't expose its handle, so find it by owner process id.
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) };
    if snapshot == INVALID_HANDLE_VALUE {
        return Err(std::io::Error::last_os_error());
    }
    let mut entry: THREADENTRY32 = unsafe { std::mem::zeroed() };
    entry.dwSize = u32::try_from(std::mem::size_of::<THREADENTRY32>()).unwrap_or(u32::MAX);
    let mut resumed = 0;
    let mut failure = None;
    let mut more = unsafe { Thread32First(snapshot, &raw mut entry) } != 0;
    while more {
        if entry.th32OwnerProcessID == child.id() {
            let thread = unsafe { OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID) };
            if thread.is_null() {
                failure = Some(std::io::Error::last_os_error());
            } else {
                if unsafe { ResumeThread(thread) } == u32::MAX {
                    failure = Some(std::io::Error::last_os_error());
                } else {
                    resumed += 1;
                }
                unsafe { CloseHandle(thread) };
            }
        }
        more = unsafe { Thread32Next(snapshot, &raw mut entry) } != 0;
    }
    unsafe { CloseHandle(snapshot) };
    match (resumed, failure) {
        (_, Some(cause)) => Err(cause),
        (0, None) => Err(std::io::Error::other("the downloader thread was not found")),
        _ => Ok(()),
    }
}

fn arguments(request: &DownloadRequest, dir: &Path, tools: &Path) -> Vec<String> {
    let mut args: Vec<String> = [
        "--ignore-config",
        "--no-plugin-dirs",
        "--no-playlist",
        "--playlist-items",
        "1",
        "--no-overwrites",
        "--no-cache-dir",
        "--no-colors",
        "--newline",
        "--progress",
        "--no-simulate",
        "--socket-timeout",
        "30",
        "--retries",
        "2",
        "--fragment-retries",
        "2",
        "--no-js-runtimes",
        "--js-runtimes",
    ]
    .into_iter()
    .map(str::to_owned)
    .collect();
    args.push(format!(
        "deno:{}",
        tools
            .join(format!("deno{}", std::env::consts::EXE_SUFFIX))
            .display()
    ));
    args.extend([
        "--ffmpeg-location".into(),
        tools.to_string_lossy().into_owned(),
        "--paths".into(),
        dir.to_string_lossy().into_owned(),
        "--output".into(),
        "%(title).120B [%(id)s].%(ext)s".into(),
        "--print".into(),
        "before_dl:TTML_PREPARING:%(id)s".into(),
        "--print".into(),
        "post_process:TTML_PROCESSING:%(id)s".into(),
        "--print".into(),
        "after_move:TTML_FILE:%(filepath)j".into(),
        "--progress-template".into(),
        "download:TTML_PROGRESS:%(progress._percent_str)s".into(),
    ]);
    if request.format.video() {
        let height = request
            .max_height
            .map_or(String::new(), |h| format!("[height<=?{h}]"));
        let selector = if matches!(request.format, Format::Mp4) {
            format!("bv*[ext=mp4]{height}+ba[ext=m4a]/b[ext=mp4]{height}")
        } else {
            format!("bv*{height}+ba/b{height}")
        };
        args.extend([
            "--format".into(),
            selector,
            "--merge-output-format".into(),
            request.format.extension().into(),
            "--remux-video".into(),
            request.format.extension().into(),
        ]);
    } else {
        args.extend([
            "--format".into(),
            "bestaudio/best".into(),
            "--extract-audio".into(),
            "--audio-format".into(),
            request.format.extension().into(),
            "--audio-quality".into(),
            "0".into(),
        ]);
    }
    // No shell or user-supplied flags: the only free-form argument is a URL after `--`.
    args.extend(["--".into(), request.url.clone()]);
    args
}

fn terminate(child: &mut Child) {
    #[cfg(windows)]
    {
        let _ = command("taskkill")
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .output();
    }
    #[cfg(unix)]
    {
        let _ = command("kill")
            .args(["-KILL", "--", &format!("-{}", child.id())])
            .output();
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn read_lines(reader: impl std::io::Read + Send + 'static, tx: mpsc::SyncSender<String>) {
    std::thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            if tx.send(line).is_err() {
                break;
            }
        }
    });
}

fn percent(line: &str) -> Option<f64> {
    line.strip_prefix("TTML_PROGRESS:")?
        .trim()
        .trim_end_matches('%')
        .parse::<f64>()
        .ok()
        .filter(|v| v.is_finite())
        .map(|v| v.clamp(0.0, 100.0))
}

fn run_download(
    request: &DownloadRequest,
    dir: &Path,
    tools: &Path,
    cancelled: &AtomicBool,
    events: &Channel<DownloadEvent>,
) -> Result<String, DownloadError> {
    let mut child = spawn_contained(
        command(tools.join(format!("yt-dlp{}", std::env::consts::EXE_SUFFIX)))
            .args(arguments(request, dir, tools))
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped()),
    )
    .map_err(|e| error("failed", e))?;
    let (tx, rx) = mpsc::sync_channel(64);
    read_lines(child.stdout.take().expect("piped stdout"), tx.clone());
    read_lines(child.stderr.take().expect("piped stderr"), tx);
    let started = Instant::now();
    let mut output = None;
    let mut diagnostics = String::new();
    let mut exit = None;
    loop {
        if cancelled.load(Ordering::SeqCst) || started.elapsed() > Duration::from_secs(7200) {
            terminate(&mut child);
            return Err(error(
                if cancelled.load(Ordering::SeqCst) {
                    "cancelled"
                } else {
                    "timeout"
                },
                "",
            ));
        }
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(line) => {
                if line.starts_with("TTML_PROGRESS:") {
                    let _ = events.send(DownloadEvent::Downloading {
                        percent: percent(&line),
                    });
                } else if line.starts_with("TTML_PROCESSING:") {
                    let _ = events.send(DownloadEvent::Processing);
                } else if let Some(path) = line.strip_prefix("TTML_FILE:") {
                    output = serde_json::from_str::<String>(path).ok();
                } else if !line.starts_with("TTML_PREPARING:") {
                    diagnostics.push_str(&line);
                    diagnostics.push('\n');
                    if diagnostics.len() > 16000 {
                        let mut boundary = diagnostics.len() - 8000;
                        while !diagnostics.is_char_boundary(boundary) {
                            boundary += 1;
                        }
                        diagnostics.drain(..boundary);
                    }
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
            Err(mpsc::RecvTimeoutError::Timeout) => {}
        }
        if exit.is_none() {
            match child.try_wait() {
                Ok(status) => exit = status,
                Err(e) => {
                    terminate(&mut child);
                    return Err(error("failed", e));
                }
            }
        }
    }
    let status = match exit {
        Some(status) => status,
        None => child.wait().map_err(|e| error("failed", e))?,
    };
    if !status.success() {
        return Err(error("failed", diagnostics));
    }
    let path = output.ok_or_else(|| error("failed", diagnostics))?;
    let canonical = Path::new(&path)
        .canonicalize()
        .map_err(|e| error("failed", e))?;
    let base = dir.canonicalize().map_err(|e| error("failed", e))?;
    if !canonical.starts_with(base) || !canonical.is_file() {
        return Err(error("failed", "Invalid output path"));
    }
    Ok(path)
}

const SEARCH_RESULTS: usize = 8;

#[derive(Clone, Debug, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    url: String,
    title: String,
    channel: Option<String>,
    duration: Option<f64>,
}

fn validate_query(query: &str) -> Result<String, DownloadError> {
    let query = query.trim();
    if query.is_empty() || query.chars().count() > 200 || query.chars().any(char::is_control) {
        return Err(error("invalidQuery", ""));
    }
    Ok(query.to_owned())
}

fn search_arguments(query: &str, tools: &Path) -> Vec<String> {
    let mut args: Vec<String> = [
        "--ignore-config",
        "--no-plugin-dirs",
        "--no-cache-dir",
        "--no-colors",
        "--no-warnings",
        "--flat-playlist",
        "--dump-single-json",
        "--socket-timeout",
        "30",
        "--no-js-runtimes",
        "--js-runtimes",
    ]
    .into_iter()
    .map(str::to_owned)
    .collect();
    args.push(format!(
        "deno:{}",
        tools
            .join(format!("deno{}", std::env::consts::EXE_SUFFIX))
            .display()
    ));
    // The query is the only free-form argument and stays after `--`.
    args.extend(["--".into(), format!("ytsearch{SEARCH_RESULTS}:{query}")]);
    args
}

fn parse_search(json: &str) -> Result<Vec<SearchResult>, DownloadError> {
    let value: serde_json::Value =
        serde_json::from_str(json).map_err(|e| error("searchFailed", e))?;
    let entries = value
        .get("entries")
        .and_then(serde_json::Value::as_array)
        .ok_or_else(|| error("searchFailed", "No entries in search output"))?;
    let text = |entry: &serde_json::Value, key: &str| {
        entry
            .get(key)
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_owned)
    };
    Ok(entries
        .iter()
        .filter_map(|entry| {
            let url = text(entry, "webpage_url").or_else(|| text(entry, "url"))?;
            validate_url(&url).ok()?;
            Some(SearchResult {
                title: text(entry, "title").unwrap_or_else(|| url.clone()),
                channel: text(entry, "channel").or_else(|| text(entry, "uploader")),
                duration: entry
                    .get("duration")
                    .and_then(serde_json::Value::as_f64)
                    .filter(|d| d.is_finite() && *d >= 0.0),
                url,
            })
        })
        .take(SEARCH_RESULTS)
        .collect())
}

fn run_search(query: &str, tools: &Path) -> Result<Vec<SearchResult>, DownloadError> {
    let mut child = spawn_contained(
        command(tools.join(format!("yt-dlp{}", std::env::consts::EXE_SUFFIX)))
            .args(search_arguments(query, tools))
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped()),
    )
    .map_err(|e| error("searchFailed", e))?;
    let mut stdout = child.stdout.take().expect("piped stdout");
    let mut stderr = child.stderr.take().expect("piped stderr");
    let out = std::thread::spawn(move || {
        let mut text = String::new();
        let _ = std::io::Read::read_to_string(&mut stdout, &mut text);
        text
    });
    let err = std::thread::spawn(move || {
        let mut text = String::new();
        let _ = std::io::Read::read_to_string(&mut stderr, &mut text);
        text
    });
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() > Duration::from_secs(60) => {
                terminate(&mut child);
                return Err(error("timeout", ""));
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(e) => {
                terminate(&mut child);
                return Err(error("searchFailed", e));
            }
        }
    };
    let output = out.join().unwrap_or_default();
    let diagnostics = err.join().unwrap_or_default();
    if !status.success() {
        return Err(error("searchFailed", diagnostics));
    }
    parse_search(&output)
}

#[tauri::command]
pub async fn search_media(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<SearchResult>, DownloadError> {
    let query = validate_query(&query)?;
    let tools = tools_dir(&app)?;
    tauri::async_runtime::spawn_blocking(move || run_search(&query, &tools))
        .await
        .map_err(|e| error("searchFailed", e))?
}

struct ActiveJob(DownloaderState);
impl Drop for ActiveJob {
    fn drop(&mut self) {
        if let Ok(mut active) = self.0.0.lock() {
            *active = None;
        }
    }
}

#[tauri::command]
pub fn downloader_available(app: tauri::AppHandle) -> bool {
    tools_dir(&app).is_ok()
}

fn validate_job_id(id: &str) -> Result<(), DownloadError> {
    if id.is_empty() || id.len() > 64 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err(error("failed", "Invalid job id"));
    }
    Ok(())
}

/// Claims the single download slot for `id`, or reports that it is busy.
fn claim_job(state: &DownloaderState, id: &str) -> Result<Arc<AtomicBool>, DownloadError> {
    let mut active = state.0.lock().map_err(|e| error("failed", e))?;
    if active.is_some() {
        return Err(error("busy", ""));
    }
    let cancelled = Arc::new(AtomicBool::new(false));
    *active = Some(ActiveDownload {
        id: id.to_owned(),
        cancelled: Arc::clone(&cancelled),
    });
    Ok(cancelled)
}

/// Cancels the running job only if it is the one `id` names, so a late cancel
/// from a finished job (or another window) never stops a newer download.
fn cancel_job(state: &DownloaderState, id: &str) -> bool {
    let Ok(active) = state.0.lock() else {
        return false;
    };
    match active.as_ref() {
        Some(job) if job.id == id => {
            job.cancelled.store(true, Ordering::SeqCst);
            true
        }
        _ => false,
    }
}

#[tauri::command]
pub fn cancel_download(state: tauri::State<'_, DownloaderState>, job_id: String) -> bool {
    cancel_job(&state, &job_id)
}

#[tauri::command]
pub async fn download_media(
    window: tauri::Window,
    state: tauri::State<'_, DownloaderState>,
    request: DownloadRequest,
    job_id: String,
    events: Channel<DownloadEvent>,
) -> Result<Option<String>, DownloadError> {
    validate_url(&request.url)?;
    validate_job_id(&job_id)?;
    if request
        .max_height
        .is_some_and(|h| ![720, 1080, 2160].contains(&h))
    {
        return Err(error("failed", "Invalid height"));
    }
    let tools = tools_dir(window.app_handle())?;
    let cancelled = claim_job(&state, &job_id)?;
    let guard = ActiveJob(state.inner().clone());
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        let Some(folder) = window
            .dialog()
            .file()
            .set_parent(&window)
            .blocking_pick_folder()
        else {
            return Ok(None);
        };
        if cancelled.load(Ordering::SeqCst) {
            return Err(error("cancelled", ""));
        }
        let parent = folder.into_path().map_err(|e| error("failed", e))?;
        static SEQUENCE: AtomicU64 = AtomicU64::new(0);
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| error("failed", e))?
            .as_millis();
        let dir = parent.join(format!(
            "download-{stamp}-{}",
            SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir(&dir).map_err(|e| error("failed", e))?;
        let _ = events.send(DownloadEvent::Preparing);
        let result = run_download(&request, &dir, &tools, &cancelled, &events);
        // Only this job's newly created directory is removed, never the selected folder.
        if result.is_err() {
            if let Err(cleanup) = std::fs::remove_dir_all(&dir) {
                return Err(error(
                    "failed",
                    format!(
                        "Could not remove partial files in {}: {cleanup}",
                        dir.display()
                    ),
                ));
            }
        }
        result.map(Some)
    })
    .await
    .map_err(|e| error("failed", e))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};

    #[test]
    fn accepts_only_web_urls_without_credentials() {
        for value in [
            "https://example.org/watch?v=abc&list=x",
            "http://example.org/a",
        ] {
            assert!(validate_url(value).is_ok());
        }
        for value in [
            "--exec=calc",
            "file:///C:/secret",
            "ftp://example.org/a",
            "https://user:pass@example.org/a",
            "not a URL",
        ] {
            assert!(validate_url(value).is_err());
        }
    }

    #[test]
    fn builds_fixed_arguments_and_places_url_last() {
        let request = DownloadRequest {
            url: "https://example.org/watch?v=a&list=b".into(),
            format: Format::Mp3,
            max_height: None,
        };
        let args = arguments(
            &request,
            Path::new("output folder"),
            Path::new("tools folder"),
        );
        assert_eq!(&args[args.len() - 2..], &["--", request.url.as_str()]);
        assert!(args.iter().any(|s| s == "--ignore-config"));
        assert!(args.iter().any(|s| s == "--no-playlist"));
        assert!(args.windows(2).any(|s| s == ["--audio-format", "mp3"]));
    }

    #[test]
    fn caps_video_height_and_does_not_extract_audio() {
        let request = DownloadRequest {
            url: "https://example.org/a".into(),
            format: Format::Mp4,
            max_height: Some(1080),
        };
        let args = arguments(&request, Path::new("out"), Path::new("tools"));
        assert!(
            args.iter()
                .any(|s| s == "bv*[ext=mp4][height<=?1080]+ba[ext=m4a]/b[ext=mp4][height<=?1080]")
        );
        assert!(!args.iter().any(|s| s == "--extract-audio"));
    }

    #[test]
    fn parses_progress_without_accepting_nan() {
        assert_eq!(percent("TTML_PROGRESS: 45.2%"), Some(45.2));
        assert_eq!(percent("TTML_PROGRESS:120%"), Some(100.0));
        assert_eq!(percent("TTML_PROGRESS:NA"), None);
        assert_eq!(percent("TTML_PROGRESS:NaN"), None);
    }

    #[test]
    fn validates_search_queries() {
        assert_eq!(validate_query("  Artist Song ").unwrap(), "Artist Song");
        assert!(validate_query("   ").is_err());
        assert!(validate_query("a\nb").is_err());
        assert!(validate_query(&"a".repeat(201)).is_err());
    }

    #[test]
    fn stale_cancel_does_not_stop_a_newer_job() {
        let state = DownloaderState::default();
        let first = claim_job(&state, "job-a").unwrap();
        assert_eq!(claim_job(&state, "job-b").unwrap_err().code, "busy");
        // Job A finishes and releases the slot; job B starts.
        drop(ActiveJob(state.clone()));
        let second = claim_job(&state, "job-b").unwrap();
        // A's late cancel arrives: it must not touch B.
        assert!(!cancel_job(&state, "job-a"));
        assert!(!second.load(Ordering::SeqCst));
        assert!(!first.load(Ordering::SeqCst));
        assert!(cancel_job(&state, "job-b"));
        assert!(second.load(Ordering::SeqCst));
    }

    #[test]
    fn validates_job_ids() {
        assert!(validate_job_id("0b9e3c1a-7d2f-4e8a-9c3b-1f2e3d4c5b6a").is_ok());
        assert!(validate_job_id("").is_err());
        assert!(validate_job_id("a/b").is_err());
        assert!(validate_job_id(&"a".repeat(65)).is_err());
    }

    #[cfg(windows)]
    #[test]
    fn spawned_tools_and_their_children_join_the_kill_on_close_job() {
        use std::os::windows::io::AsRawHandle;
        use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
        use windows_sys::Win32::System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, PROCESSENTRY32W, Process32FirstW, Process32NextW,
            TH32CS_SNAPPROCESS,
        };
        use windows_sys::Win32::System::JobObjects::IsProcessInJob;
        use windows_sys::Win32::System::Threading::{
            OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
        };

        fn child_of(parent: u32) -> Option<u32> {
            unsafe {
                let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
                assert_ne!(snapshot, INVALID_HANDLE_VALUE);
                let mut entry: PROCESSENTRY32W = std::mem::zeroed();
                entry.dwSize = u32::try_from(std::mem::size_of::<PROCESSENTRY32W>()).unwrap();
                let mut found = None;
                let mut more = Process32FirstW(snapshot, &raw mut entry) != 0;
                while more && found.is_none() {
                    if entry.th32ParentProcessID == parent {
                        found = Some(entry.th32ProcessID);
                    }
                    more = Process32NextW(snapshot, &raw mut entry) != 0;
                }
                CloseHandle(snapshot);
                found
            }
        }

        let job = kill_on_close_job().expect("job object");
        // cmd starts ping as its own child: the descendant must be contained too.
        let mut child = spawn_contained(
            command("cmd")
                .args(["/c", "ping", "-n", "30", "127.0.0.1"])
                .stdout(Stdio::null()),
        )
        .unwrap();
        let mut root_member = 0;
        let root_ok =
            unsafe { IsProcessInJob(child.as_raw_handle().cast(), job, &raw mut root_member) };
        let started = Instant::now();
        let grandchild = loop {
            if let Some(pid) = child_of(child.id()) {
                break Some(pid);
            }
            if started.elapsed() > Duration::from_secs(10) {
                break None;
            }
            std::thread::sleep(Duration::from_millis(20));
        };
        let mut grandchild_member = 0;
        let grandchild_ok = grandchild.is_some_and(|pid| unsafe {
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if process.is_null() {
                return false;
            }
            let ok = IsProcessInJob(process, job, &raw mut grandchild_member) != 0;
            CloseHandle(process);
            ok
        });
        terminate(&mut child);
        assert_ne!(root_ok, 0);
        assert_ne!(root_member, 0, "the spawned process is in the job");
        assert!(grandchild.is_some(), "cmd started a child process");
        assert!(grandchild_ok);
        assert_ne!(grandchild_member, 0, "its child inherited the job");
    }

    #[test]
    fn search_keeps_query_after_separator() {
        let args = search_arguments("--exec calc", Path::new("tools"));
        assert_eq!(&args[args.len() - 2..], &["--", "ytsearch8:--exec calc"]);
        assert!(args.iter().any(|s| s == "--flat-playlist"));
    }

    #[test]
    fn parses_search_entries_and_drops_unsafe_urls() {
        let json = r#"{"entries":[
            {"url":"https://www.youtube.com/watch?v=a","title":"Song","channel":"Artist","duration":215.0},
            {"url":"file:///C:/secret","title":"Bad"},
            {"webpage_url":"https://example.org/b","title":"","uploader":"Uploader","duration":null}
        ]}"#;
        let results = parse_search(json).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].title, "Song");
        assert_eq!(results[0].channel.as_deref(), Some("Artist"));
        assert_eq!(results[0].duration, Some(215.0));
        assert_eq!(results[1].title, "https://example.org/b");
        assert_eq!(results[1].channel.as_deref(), Some("Uploader"));
        assert!(parse_search("not json").is_err());
    }

    #[test]
    #[ignore = "requires prepared downloader tools and network access"]
    fn bundled_tools_search_youtube() {
        let tools = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("downloader-tools");
        let results = run_search("never gonna give you up", &tools).unwrap();
        assert!(!results.is_empty());
    }

    struct Fixture {
        tools: PathBuf,
        dir: PathBuf,
        url: String,
        stop: Arc<AtomicBool>,
        server: Option<std::thread::JoinHandle<()>>,
    }

    impl Fixture {
        fn new() -> Self {
            let tools = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("downloader-tools");
            let parent = std::env::temp_dir();
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let dir = parent.join(format!("native-downloader-test-{stamp}"));
            std::fs::create_dir(&dir).unwrap();
            let source = dir.join("source.mp4");
            let status = command(tools.join("ffmpeg.exe"))
                .args([
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-f",
                    "lavfi",
                    "-i",
                    "color=c=black:s=64x64:d=1",
                    "-f",
                    "lavfi",
                    "-i",
                    "sine=frequency=440:duration=1",
                    "-c:v",
                    "libx264",
                    "-c:a",
                    "aac",
                    "-shortest",
                ])
                .arg(&source)
                .status()
                .unwrap();
            assert!(status.success());
            let bytes = std::fs::read(source).unwrap();
            let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            let url = format!("http://{}/sample.mp4", listener.local_addr().unwrap());
            listener.set_nonblocking(true).unwrap();
            let stop = Arc::new(AtomicBool::new(false));
            let stopping = Arc::clone(&stop);
            let server = std::thread::spawn(move || {
                while !stopping.load(Ordering::SeqCst) {
                    if let Ok((mut stream, _)) = listener.accept() {
                        stream.set_nonblocking(false).unwrap();
                        let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
                        let _ = stream.set_write_timeout(Some(Duration::from_secs(5)));
                        let mut request = Vec::new();
                        let mut chunk = [0u8; 1024];
                        while !request.windows(4).any(|bytes| bytes == b"\r\n\r\n")
                            && request.len() < 8192
                        {
                            match stream.read(&mut chunk) {
                                Ok(0) | Err(_) => break,
                                Ok(count) => request.extend_from_slice(&chunk[..count]),
                            }
                        }
                        if !request.is_empty() {
                            let header = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: video/mp4\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                                bytes.len()
                            );
                            let _ = stream.write_all(header.as_bytes());
                            if !request.starts_with(b"HEAD ") {
                                let _ = stream.write_all(&bytes);
                            }
                            let _ = stream.flush();
                            let _ = stream.shutdown(std::net::Shutdown::Write);
                        }
                    } else {
                        std::thread::sleep(Duration::from_millis(10));
                    }
                }
            });
            Self {
                tools,
                dir,
                url,
                stop,
                server: Some(server),
            }
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            self.stop.store(true, Ordering::SeqCst);
            if let Some(server) = self.server.take() {
                let _ = server.join();
            }
            let _ = std::fs::remove_dir_all(&self.dir);
        }
    }

    #[test]
    #[ignore = "requires prepared Windows x64 downloader tools"]
    fn bundled_tools_download_all_formats() {
        let fixture = Fixture::new();
        for format in [
            Format::Mp3,
            Format::M4a,
            Format::Flac,
            Format::Wav,
            Format::Opus,
            Format::Mp4,
            Format::Mkv,
        ] {
            let dir = fixture.dir.join(format.extension());
            std::fs::create_dir(&dir).unwrap();
            let received = Arc::new(Mutex::new(Vec::new()));
            let sink = Arc::clone(&received);
            let events = Channel::new(move |body| {
                if let tauri::ipc::InvokeResponseBody::Json(json) = body {
                    sink.lock().unwrap().push(json);
                }
                Ok(())
            });
            let request = DownloadRequest {
                url: fixture.url.clone(),
                format,
                max_height: Some(1080),
            };
            let output = run_download(
                &request,
                &dir,
                &fixture.tools,
                &AtomicBool::new(false),
                &events,
            )
            .unwrap();
            assert_eq!(Path::new(&output).extension().unwrap(), format.extension());
            assert!(std::fs::metadata(&output).unwrap().len() > 0);
            let messages = received.lock().unwrap().join("\n");
            assert!(messages.contains("downloading"));
            assert!(messages.contains("processing"));
        }
    }

    #[test]
    #[ignore = "requires prepared Windows x64 downloader tools"]
    fn bundled_tools_cancel_a_running_download() {
        let fixture = Fixture::new();
        let cancelled = Arc::new(AtomicBool::new(false));
        let signal = Arc::clone(&cancelled);
        let events = Channel::new(move |body| {
            if let tauri::ipc::InvokeResponseBody::Json(json) = body {
                if json.contains("downloading") {
                    signal.store(true, Ordering::SeqCst);
                }
            }
            Ok(())
        });
        let request = DownloadRequest {
            url: fixture.url.clone(),
            format: Format::Mp3,
            max_height: None,
        };
        let result = run_download(&request, &fixture.dir, &fixture.tools, &cancelled, &events);
        assert_eq!(result.unwrap_err().code, "cancelled");
    }
}
