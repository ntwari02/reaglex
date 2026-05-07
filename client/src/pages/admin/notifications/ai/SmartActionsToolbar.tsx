import React from 'react';

type Props = {
  onGenerate: () => void;
  onRewrite: () => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
  onSend: () => void;
  disabled?: boolean;
};

export function SmartActionsToolbar({
  onGenerate,
  onRewrite,
  onSaveDraft,
  onSchedule,
  onSend,
  disabled,
}: Props) {
  const btn: React.CSSProperties = {
    borderRadius: 10,
    border: '1px solid var(--border-visible)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    minHeight: 40,
    padding: '0 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, padding: 12 }}>
      <button type="button" onClick={onGenerate} style={btn} disabled={disabled}>Generate</button>
      <button type="button" onClick={onRewrite} style={btn} disabled={disabled}>Rewrite</button>
      <button type="button" onClick={onSaveDraft} style={btn}>Save Draft</button>
      <button type="button" onClick={onSchedule} style={btn}>Schedule</button>
      <button
        type="button"
        onClick={onSend}
        style={{ ...btn, gridColumn: '1 / -1', background: '#00BFA5', color: '#fff', border: 'none' }}
      >
        Send Notification
      </button>
    </div>
  );
}
