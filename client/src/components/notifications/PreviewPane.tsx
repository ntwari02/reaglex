type PreviewMode = 'email' | 'desktop' | 'mobile' | 'dark' | 'push';

type Props = {
  mode: PreviewMode;
  onModeChange: (mode: PreviewMode) => void;
  subject: string;
  body: string;
};

const modes: PreviewMode[] = ['email', 'desktop', 'mobile', 'dark', 'push'];

export function PreviewPane({ mode, onModeChange, subject, body }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wide ${
              mode === m
                ? 'bg-[var(--accent)] text-white'
                : 'border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Email Preview</p>
        <p className="mb-2 text-sm font-medium text-[var(--text-primary)]">{subject || 'No subject yet'}</p>
        <p className="line-clamp-4 text-xs leading-5 text-[var(--text-secondary)]">
          {body || 'Start writing your notification to see preview output.'}
        </p>
      </div>
    </div>
  );
}
