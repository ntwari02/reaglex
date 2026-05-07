import React from 'react';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  placeholder?: string;
};

export function AiPromptInput({ value, onChange, onSubmit, placeholder }: Props) {
  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid var(--border-visible)',
          borderRadius: 12,
          padding: '8px 10px',
          background: 'var(--bg-tertiary)',
        }}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onSubmit();
          }}
          placeholder={placeholder || 'Use /promo, /refund, /shipping...'}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 16,
          }}
        />
        <button
          type="button"
          onClick={onSubmit}
          style={{
            border: 'none',
            background: '#00BFA5',
            color: '#fff',
            borderRadius: 10,
            minHeight: 40,
            minWidth: 40,
            padding: '0 12px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Go
        </button>
      </div>
    </div>
  );
}
