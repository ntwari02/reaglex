import React from 'react';
import type { PreviewMode } from './types';

type Props = {
  subject: string;
  body: string;
};

export function NotificationPreviewPanel({ subject, body }: Props) {
  const mode: PreviewMode = 'email';
  const isDark = mode === 'dark';
  return (
    <div style={{ padding: 12 }}>
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
