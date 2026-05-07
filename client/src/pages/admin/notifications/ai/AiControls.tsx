import React from 'react';

type Props = {
  tone: string;
  language: string;
  onToneChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onQuickCommand: (cmd: string) => void;
};

const QUICK = ['/promo', '/refund', '/shipping', '/dispute', '/seller-warning'];

export function AiControls({ tone, language, onToneChange, onLanguageChange, onQuickCommand }: Props) {
  return (
    <div style={{ padding: 12, display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
          style={{ minHeight: 40, borderRadius: 10, border: '1px solid var(--border-visible)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 13 }}
        >
          {['professional', 'friendly', 'urgent', 'promotional', 'informative'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          style={{ minHeight: 40, borderRadius: 10, border: '1px solid var(--border-visible)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: 13 }}
        >
          {['English', 'French', 'Kinyarwanda'].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => onQuickCommand(cmd)}
            style={{ border: '1px solid var(--border-visible)', borderRadius: 999, background: 'var(--bg-tertiary)', color: '#00BFA5', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
