import React from 'react';
import type { PreviewMode } from './types';

type Props = {
  mode: PreviewMode;
  onModeChange: (next: PreviewMode) => void;
  subject: string;
  body: string;
};

const MODES: PreviewMode[] = ['email', 'desktop', 'mobile', 'dark', 'push'];

export function NotificationPreviewPanel({ mode, onModeChange, subject, body }: Props) {
  const isDark = mode === 'dark';
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            style={{
              fontSize: 11,
              borderRadius: 999,
              padding: '4px 10px',
              border: mode === m ? '1px solid #00BFA5' : '1px solid var(--border-visible)',
              background: mode === m ? 'rgba(0,191,165,0.1)' : 'var(--bg-tertiary)',
              color: mode === m ? '#00BFA5' : 'var(--text-muted)',
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--border-visible)',
          background: isDark ? '#0f172a' : '#fff',
          color: isDark ? '#e5e7eb' : '#0f172a',
          padding: 12,
          maxHeight: 180,
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>{mode.toUpperCase()} PREVIEW</div>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{subject || 'Notification subject...'}</div>
        <div style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap' }}>{body || 'Notification body preview...'}</div>
      </div>
    </div>
  );
}
