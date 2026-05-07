import React from 'react';
import type { AiInsight } from './types';

type Props = { insights: AiInsight[] };

export function AiInsightPanel({ insights }: Props) {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8 }}>Advanced Insights</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        {insights.map((it) => (
          <div key={it.label} style={{ border: '1px solid var(--border-visible)', borderRadius: 10, padding: 8, background: 'var(--bg-tertiary)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{it.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{it.value}</div>
            {it.delta ? <div style={{ fontSize: 10, color: '#00BFA5' }}>{it.delta}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
