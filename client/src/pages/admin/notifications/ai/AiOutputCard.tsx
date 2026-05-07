import React from 'react';

type Props = {
  title: string;
  value: string;
  compareValue: string;
  compareMode: boolean;
  isThinking: boolean;
  isStreaming: boolean;
  onChange: (next: string) => void;
  onCopy: () => void;
  onRegenerate: () => void;
  onSaveDraft: () => void;
  onSendToEditor: () => void;
  onCompareToggle: () => void;
};

function renderMarkdown(input: string) {
  return input
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

export function AiOutputCard(props: Props) {
  const {
    title,
    value,
    compareValue,
    compareMode,
    isThinking,
    isStreaming,
    onChange,
    onCopy,
    onRegenerate,
    onSaveDraft,
    onSendToEditor,
    onCompareToggle,
  } = props;
  const chip: React.CSSProperties = {
    border: '1px solid var(--border-visible)',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 11,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          borderRadius: 14,
          border: '1px solid rgba(0,191,165,0.35)',
          boxShadow: '0 8px 24px rgba(0,191,165,0.12)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 88%, rgba(0,191,165,0.1)) 0%, var(--card-bg) 100%)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--divider)', fontSize: 12, fontWeight: 800 }}>{title}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 12px' }}>
          <button type="button" style={chip} onClick={onCopy}>Copy</button>
          <button type="button" style={chip} onClick={onRegenerate}>Regenerate</button>
          <button type="button" style={chip} onClick={onSaveDraft}>Save Draft</button>
          <button type="button" style={chip} onClick={onSendToEditor}>Send to Editor</button>
          <button type="button" style={chip} onClick={onCompareToggle}>{compareMode ? 'Hide Compare' : 'Compare'}</button>
        </div>
        {isThinking && <div style={{ padding: '0 12px 8px', fontSize: 12, color: '#00BFA5' }}>AI thinking...</div>}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            minHeight: 150,
            maxHeight: 230,
            overflowY: 'auto',
            border: 'none',
            borderTop: '1px solid var(--divider)',
            padding: 12,
            fontSize: 16,
            background: 'transparent',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />
        <div style={{ padding: '0 12px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
          {isStreaming ? 'Streaming response...' : 'Markdown supported in output.'}
        </div>
        <div
          style={{ padding: '0 12px 12px', fontSize: 12, color: 'var(--text-primary)', borderTop: '1px solid var(--divider)', marginTop: 8 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value || '') }}
        />
        {compareMode && (
          <div style={{ padding: 12, borderTop: '1px solid var(--divider)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Original vs Improved</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', border: '1px solid var(--border-visible)', borderRadius: 8, padding: 8, maxHeight: 120, overflowY: 'auto' }}>{compareValue || '-'}</pre>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', border: '1px solid var(--border-visible)', borderRadius: 8, padding: 8, maxHeight: 120, overflowY: 'auto' }}>{value || '-'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
