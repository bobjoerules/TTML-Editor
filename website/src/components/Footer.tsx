import React from 'react';
import { ExternalLink } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { LiquidPlayerIcon } from './LiquidPlayerIcon';

interface FooterProps {
  onSelectTab: (tab: 'home' | 'finished' | 'checklist' | 'stats' | 'liquid') => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-info">
          <div className="nav-brand" onClick={() => onSelectTab('home')}>
            <img
              src="/logo.svg"
              alt="TTML Editor Logo"
              style={{ width: 26, height: 26, objectFit: 'contain' }}
            />
            <span style={{ fontSize: 17 }}>TTML Editor</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            The premier syllable-by-syllable TTML lyric timing and visual editor.
          </p>
        </div>

        <div className="footer-links">
          <button className="footer-link" onClick={() => onSelectTab('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Home
          </button>
          <button className="footer-link" onClick={() => onSelectTab('finished')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Finished TTMLs
          </button>
          <button className="footer-link" onClick={() => onSelectTab('checklist')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Public Checklist
          </button>
          <button className="footer-link" onClick={() => onSelectTab('stats')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Stats & Profiles
          </button>
          <button className="footer-link" onClick={() => onSelectTab('liquid')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Liquid Player
          </button>
          <a
            href="https://ttmleditor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <ExternalLink size={13} />
            Web App (Browser)
          </a>
          <a
            href="https://github.com/bobjoerules/TTML-Editor"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <GithubIcon size={14} />
            Repository
          </a>
          <a
            href="https://github.com/bobjoerules/Liquid-Player"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <LiquidPlayerIcon size={14} />
            Liquid Player Repo
          </a>
        </div>
      </div>
    </footer>
  );
};
