import React from 'react';
import type { ModerationItem } from './types';

type Props = { items: ModerationItem[] };

export function ModerationWarnings({ items }: Props) {
  if (!items.length) return null;
  return (
    <div style={{ padding: 12, display: 'grid', gap: 8 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            borderRadius: 10,
            border: `1px solid ${item.level === 'critical' ? '#ef4444' : '#f59e0b'}`,
            background: item.level === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.1)',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 12 }}>{item.label}</div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>{item.detail}</div>
        </div>
      ))}
    </div>
  );
}
