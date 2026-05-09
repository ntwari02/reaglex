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
          placeholder={placeholder || 'Type an instruction…'}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 16,
          }}
        />
      </div>
    </div>
  );
}
