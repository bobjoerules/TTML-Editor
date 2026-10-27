import React, { useState, useEffect } from 'react';
import {
  Download,
  Play,
  Layers,
  Sparkles,
  Cloud,
  CheckCircle2,
  Radio,
  Sliders,
  Maximize2,
  X,
  Flame,
  ArrowRight,
  Globe,
  ExternalLink,
  Users,
  Music,
  Copy,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';
import { LiquidPlayerIcon } from '../components/LiquidPlayerIcon';
import { fetchCloudSongStats, type CloudSongStats } from '../utils/firebase';

interface HomePageProps {
  onNavigate: (tab: 'home' | 'finished' | 'checklist' | 'stats' | 'liquid') => void;
}

interface ScreenshotItem {
  id: string;
  title: string;
  category: string;
  desc: string;
  src: string;
}

const SCREENSHOTS: ScreenshotItem[] = [
  {
    id: 'preview',
    title: 'Apple Music Live Preview',
    category: 'Preview Mode',
    desc: 'Real-time rendering of animated syllable karaoke lyrics with Apple Music style glow, backdrop filters, and unsynced warnings.',
    src: '/images/preview tab.png',
  },
  {
    id: 'sync',
    title: 'Syllable Audio Syncing',
    category: 'Sync Engine',
    desc: 'Fast keyboard and waveform sync engine for recording precise start, end, and duration timestamps for every syllable.',
    src: '/images/sync tab.png',
  },
  {
    id: 'edit',
    title: 'Full TTML Lyric Editor',
    category: 'Editor',
    desc: 'Line-by-line management, auto syllabification, songwriter metadata extraction, and multi-track background vocal management.',
    src: '/images/edit tab.png',
  },
  {
    id: 'checklist',
    title: 'Smart TTML Checklist',
    category: 'Tools',
    desc: 'Song cover art thumbnails, live progress bar, direct Genius provider search, and 1-click lyric importing.',
    src: '/images/ttml checklist.png',
  },
  {
    id: 'cloud',
    title: 'Cloud Sync & Library',
    category: 'Cloud',
    desc: 'Upload, manage, and share your synced TTML lyrics and audio files seamlessly with Firebase Cloud integration.',
    src: '/images/cloud.png',
  },
  {
    id: 'rpc',
    title: 'Discord Rich Presence',
    category: 'Integration',
    desc: 'Broadcast your live editing sessions, current song, album cover art, and progress directly to Discord.',
    src: '/images/rpc page.png',
  },
  {
    id: 'theme',
    title: 'Custom Themes & Visuals',
    category: 'Settings',
    desc: 'Extensive customization with custom background artwork, equalizer curves, latency testing, and UI styling.',
    src: '/images/theme settings.png',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [activeScreenshot, setActiveScreenshot] = useState<string>('preview');
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [cloudStats, setCloudStats] = useState<CloudSongStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  const loadCloudStats = async () => {
    setLoadingStats(true);
    try {
      const data = await fetchCloudSongStats();
      setCloudStats(data);
    } catch (err) {
      console.error('Failed to load cloud stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadCloudStats();
  }, []);

  const currentItem = SCREENSHOTS.find((s) => s.id === activeScreenshot) || SCREENSHOTS[0];

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      {/* Hero Section */}
      <section className="hero-section">

        <h1 className="hero-title">
          Sync Every Syllable.<br />
          <span className="text-gradient">Experience Living Lyrics.</span>
        </h1>

        <p className="hero-subtitle">
          The ultimate desktop app and suite for creating, timing, editing, and previewing Apple Music style syllable TTML lyrics with studio precision.
        </p>

        <div className="hero-badge">
          <span className="hero-badge-dot"></span>
          <span>TTML Editor v4.4.0 Released</span>
        </div>

        <div className="hero-buttons">
          <a
            href="https://ttmleditor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ padding: '12px 28px' }}
          >
            <Globe size={18} />
            <span>Open in Browser</span>
            <ExternalLink size={14} style={{ opacity: 0.8 }} />
          </a>

          <a
            href="https://github.com/bobjoerules/AMLL-TTML-TOOL/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Download size={18} />
            <span>Download Desktop App</span>
          </a>

          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('finished')}
          >
            <CheckCircle2 size={18} color="#10b981" />
            <span>Browse Finished TTMLs</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('liquid')}
          >
            <LiquidPlayerIcon size={18} />
            <span>Discover Liquid Player</span>
          </button>
        </div>

        {/* Interactive App Showcase Carousel */}
        <div className="showcase-container">
          <div className="showcase-tabs">
            {SCREENSHOTS.map((item) => (
              <button
                key={item.id}
                className={`showcase-tab-btn ${activeScreenshot === item.id ? 'active' : ''}`}
                onClick={() => setActiveScreenshot(item.id)}
              >
                {item.category}
              </button>
            ))}
          </div>

          <div className="showcase-image-wrapper">
            <img
              src={currentItem.src}
              alt={currentItem.title}
              className="showcase-img"
              onClick={() => setLightboxImg(currentItem.src)}
              style={{ cursor: 'zoom-in' }}
            />
            <button
              onClick={() => setLightboxImg(currentItem.src)}
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: 9999,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Maximize2 size={14} />
              <span>Full Resolution</span>
            </button>
          </div>

          <div style={{ marginTop: 20, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{currentItem.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4, maxWidth: 800 }}>{currentItem.desc}</p>
            </div>
            <a
              href="https://github.com/bobjoerules/AMLL-TTML-TOOL"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <span>View Source</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Cloud Library & Community Live Statistics Section */}
      <section style={{ marginTop: 70, marginBottom: 20 }}>
        <div
          className="glass-panel"
          style={{
            padding: '36px 32px',
            borderRadius: 24,
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background:
              'linear-gradient(180deg, rgba(22, 22, 28, 0.8) 0%, rgba(14, 14, 18, 0.92) 100%)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Subtle atmospheric glow behind the card */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: '8%',
              width: 320,
              height: 320,
              background:
                'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)',
              filter: 'blur(50px)',
              pointerEvents: 'none',
            }}
          />

          {/* Section Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 28,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                <Cloud size={14} />
                <span>Cloud Synchronization Network</span>
              </div>
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  margin: '4px 0',
                }}
              >
                Live Cloud Library Statistics
              </h2>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  maxWidth: 640,
                }}
              >
                Real-time analytics across all user cloud libraries, including private saves and alternate duplicate versions.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={loadCloudStats}
                disabled={loadingStats}
                title="Refresh live cloud statistics"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} className={loadingStats ? 'spin' : ''} />
                <span>{loadingStats ? 'Updating…' : 'Refresh'}</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('stats')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Users size={14} />
                <span>Creator Stats</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {/* 1. Total Users */}
            <div
              className="glass-panel"
              style={{
                padding: '24px 20px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Active Users
                  </span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}
                  >
                    <Users size={18} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#ffffff',
                    lineHeight: 1.1,
                  }}
                >
                  {loadingStats && !cloudStats
                    ? '...'
                    : (cloudStats?.totalUsers || 0).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Registered synchronizers & cloud creators
                </span>
              </div>
            </div>

            {/* 2. Songs Saved to Cloud (Even Private Ones) */}
            <div
              className="glass-panel"
              style={{
                padding: '24px 20px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Songs Saved to Cloud
                  </span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(56, 189, 248, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                  >
                    <Cloud size={18} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#ffffff',
                    lineHeight: 1.1,
                  }}
                >
                  {loadingStats && !cloudStats
                    ? '...'
                    : (cloudStats?.totalSongs || 0).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#94a3b8',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  <Lock size={10} />
                  {cloudStats?.privateSongs ?? 0} Private
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  <Globe size={10} />
                  {cloudStats?.publicSongs ?? 0} Public
                </span>
              </div>
            </div>

            {/* 3. Unique Songs */}
            <div
              className="glass-panel"
              style={{
                padding: '24px 20px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Unique Songs
                  </span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(168, 85, 247, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#c084fc',
                    }}
                  >
                    <Music size={18} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#ffffff',
                    lineHeight: 1.1,
                  }}
                >
                  {loadingStats && !cloudStats
                    ? '...'
                    : (cloudStats?.uniqueSongs || 0).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Distinct song & artist pairs in cloud
                </span>
              </div>
            </div>

            {/* 4. Dupe Amount (Separate Stat) */}
            <div
              className="glass-panel"
              style={{
                padding: '24px 20px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Duplicate Saves
                  </span>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(251, 191, 36, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fbbf24',
                    }}
                  >
                    <Copy size={18} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#ffffff',
                    lineHeight: 1.1,
                  }}
                >
                  {loadingStats && !cloudStats
                    ? '...'
                    : (cloudStats?.duplicateSongs || 0).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#fbbf24',
                    background: 'rgba(251, 191, 36, 0.1)',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}
                >
                  Separate Stat
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Alternative versions & revisions
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section style={{ marginTop: 80 }}>
        <div className="section-header">
          <span className="section-tag">Powerful Toolset</span>
          <h2 className="section-title">Built for Precision & Speed</h2>
          <p className="section-desc">
            Everything you need to craft high-quality syllable synced lyrics that look and feel identical to Apple Music.
          </p>
        </div>

        <div className="features-grid">
          <div className="glass-panel feature-card">
            <div className="feature-icon">
              <Sparkles size={24} />
            </div>
            <h3 className="feature-title">Syllable-Level Timing</h3>
            <p className="feature-desc">
              Accurately mark every word and syllable boundary with hotkey recording, spectrogram alignment, and time-stretching tools.
            </p>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#f4f4f5' }}>
              <Layers size={24} />
            </div>
            <h3 className="feature-title">Next-Gen Spicy Lyrics Engine</h3>
            <p className="feature-desc">
              Experience lyrics with upstream Spicy Lyrics integration, Apple HIG Liquid Glass aesthetics, 3-phase syllable expansion, dynamic glow, and duet layouts.
            </p>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
              <CheckCircle2 size={24} />
            </div>
            <h3 className="feature-title">Smart TTML Checklist</h3>
            <p className="feature-desc">
              Organize your sync queue with cover art thumbnails, progress tracking, provider search (Genius, LRCLIB, Lyrically), and 1-click imports.
            </p>
            <div style={{ marginTop: 14 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('checklist')}
                style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>View Public Checklist</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#d4d4d8' }}>
              <Cloud size={24} />
            </div>
            <h3 className="feature-title">Cloud Storage & Collaboration</h3>
            <p className="feature-desc">
              Save your finished lyrics, translations, romanizations, and audio files directly to the cloud for backup and community sharing.
            </p>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#e4e4e7' }}>
              <Radio size={24} />
            </div>
            <h3 className="feature-title">Discord Rich Presence</h3>
            <p className="feature-desc">
              Showcase your creative sessions on Discord with album art, title, artist, live timeline, and repository link buttons.
            </p>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
              <Sliders size={24} />
            </div>
            <h3 className="feature-title">Audio Engine & EQ</h3>
            <p className="feature-desc">
              High-performance Web Audio engine featuring 10-band parametric EQ, pitch preservation, latency calibration, and sleep recovery.
            </p>
          </div>
        </div>
      </section>

      {/* Liquid Player Callout */}
      <section className="glass-panel" style={{ padding: 48, marginTop: 40, border: '1px solid rgba(255, 255, 255, 0.12)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 250, height: 250, background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div style={{ maxWidth: 640 }}>
            <span className="section-tag section-tag-liquid">Featured Companion App</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: 'white', marginBottom: 12 }}>
              Play Synced TTMLs in <span className="text-gradient-liquid">Liquid Player</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.6 }}>
              Liquid Player is a gorgeous, feature-rich music player and synced lyrics companion built with SwiftUI to render syllable-timed TTML lyrics created with TTML Editor in full glory.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <button className="btn btn-liquid" onClick={() => onNavigate('liquid')}>
              <LiquidPlayerIcon size={18} />
              <span>Explore Liquid Player</span>
            </button>
            <a
              href="https://github.com/bobjoerules/Liquid-Player"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <GithubIcon size={18} />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div className="lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxImg(null)}>
              <X size={24} />
            </button>
            <img src={lightboxImg} alt="Preview" className="lightbox-image" />
          </div>
        </div>
      )}
    </div>
  );
};
