import React, { useState, useEffect } from 'react';
import { Download, Globe, ExternalLink, LogIn, User as UserIcon, Shield, Menu, X, Award, ListTodo } from 'lucide-react';
import type { User } from 'firebase/auth';
import { GithubIcon } from './GithubIcon';
import { LiquidPlayerIcon } from './LiquidPlayerIcon';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { isUserModerator, subscribeToAuth } from '../utils/firebase';

interface NavbarProps {
  currentTab: 'home' | 'finished' | 'checklist' | 'stats' | 'liquid';
  onSelectTab: (tab: 'home' | 'finished' | 'checklist' | 'stats' | 'liquid') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const isMod = isUserModerator(user?.uid);

  return (
    <>
      <header className="navbar">
        <div className="container nav-content">
          <div
            className="nav-brand"
            onClick={() => {
              onSelectTab('home');
              setMobileMenuOpen(false);
            }}
          >
            <img
              src="/logo.svg"
              alt="TTML Editor Logo"
              style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.25))' }}
            />
            <span className="nav-brand-title">TTML Editor</span>
          </div>

          <nav className="nav-desktop-only">
            <ul className="nav-links">
              <li>
                <button
                  className={`nav-link ${currentTab === 'home' ? 'active' : ''}`}
                  onClick={() => onSelectTab('home')}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  className={`nav-link ${currentTab === 'finished' ? 'active' : ''}`}
                  onClick={() => onSelectTab('finished')}
                >
                  Finished TTMLs
                </button>
              </li>
              <li>
                <button
                  className={`nav-link ${currentTab === 'checklist' ? 'active' : ''}`}
                  onClick={() => onSelectTab('checklist')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <ListTodo size={15} color="#e4e4e7" />
                    Checklist
                  </span>
                </button>
              </li>
              <li>
                <button
                  className={`nav-link ${currentTab === 'stats' ? 'active' : ''}`}
                  onClick={() => onSelectTab('stats')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <Award size={15} color="#e4e4e7" />
                    Stats & Profiles
                  </span>
                </button>
              </li>
              <li>
                <button
                  className={`nav-link ${currentTab === 'liquid' ? 'active' : ''}`}
                  onClick={() => onSelectTab('liquid')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <LiquidPlayerIcon size={15} />
                    Liquid Player
                  </span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="nav-actions">
            <a
              href="https://ttmleditor.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm nav-desktop-action"
              style={{ borderColor: 'rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.06)' }}
              title="Open web editor in browser"
            >
              <Globe size={15} color="#f4f4f5" />
              <span className="nav-desktop-action-label">Open in Browser</span>
              <ExternalLink size={12} className="nav-desktop-action-label" style={{ opacity: 0.7 }} />
            </a>
            <a
              href="https://github.com/bobjoerules/TTML-Editor"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm nav-desktop-action"
              title="GitHub Repository"
            >
              <GithubIcon size={16} />
              <span className="nav-desktop-action-label">GitHub</span>
            </a>
            <a
              href="https://github.com/bobjoerules/TTML-Editor/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm nav-desktop-action"
              title="Download Desktop App"
            >
              <Download size={16} />
              <span className="nav-desktop-action-label">Download</span>
            </a>

            {user ? (
              <button
                className="nav-user-profile-btn"
                onClick={() => setProfileModalOpen(true)}
                title={user.displayName || user.email || 'User Profile'}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Avatar'} className="nav-avatar-img" />
                ) : (
                  <div className="nav-avatar-initial">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="nav-user-name">{user.displayName || user.email?.split('@')[0] || 'User'}</span>
                {isMod && (
                  <span className="badge badge-mod-pill" title="Verified Moderator">
                    <Shield size={10} />
                    <span>MOD</span>
                  </span>
                )}
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm nav-login-btn"
                onClick={() => setAuthModalOpen(true)}
              >
                <LogIn size={15} color="#e4e4e7" />
                <span>Sign In</span>
              </button>
            )}

            <button
              className="nav-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="nav-mobile-drawer">
            <div className="nav-mobile-links">
              <button
                className={`nav-mobile-link ${currentTab === 'home' ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab('home');
                  setMobileMenuOpen(false);
                }}
              >
                Home
              </button>
              <button
                className={`nav-mobile-link ${currentTab === 'finished' ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab('finished');
                  setMobileMenuOpen(false);
                }}
              >
                Finished TTMLs
              </button>
              <button
                className={`nav-mobile-link ${currentTab === 'checklist' ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab('checklist');
                  setMobileMenuOpen(false);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <ListTodo size={16} color="#e4e4e7" />
                  Public Checklist
                </span>
              </button>
              <button
                className={`nav-mobile-link ${currentTab === 'stats' ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab('stats');
                  setMobileMenuOpen(false);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Award size={16} color="#e4e4e7" />
                  Stats & Profiles
                </span>
              </button>
              <button
                className={`nav-mobile-link ${currentTab === 'liquid' ? 'active' : ''}`}
                onClick={() => {
                  onSelectTab('liquid');
                  setMobileMenuOpen(false);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <LiquidPlayerIcon size={16} />
                  Liquid Player
                </span>
              </button>
            </div>

            <div className="nav-mobile-divider" />

            <div className="nav-mobile-actions">
              <a
                href="https://ttmleditor.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm nav-mobile-action-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Globe size={15} color="#f4f4f5" />
                <span>Open in Browser</span>
                <ExternalLink size={12} style={{ opacity: 0.7 }} />
              </a>
              <a
                href="https://github.com/bobjoerules/TTML-Editor"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm nav-mobile-action-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <GithubIcon size={16} />
                <span>GitHub</span>
              </a>
              <a
                href="https://github.com/bobjoerules/TTML-Editor/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm nav-mobile-action-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Download size={16} />
                <span>Download App</span>
              </a>
            </div>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        user={user}
        onClose={() => setProfileModalOpen(false)}
        onProfileUpdated={() => {
          // Force refresh user state if needed
          if (user) {
            setUser({ ...user });
          }
        }}
      />
    </>
  );
};
