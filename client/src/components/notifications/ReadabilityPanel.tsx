import { AlertTriangle, Clock3, Gauge, Smile } from 'lucide-react';
import type { ReadabilityResult } from './types';

type Props = {
  result: ReadabilityResult | null;
  open: boolean;
};

export function ReadabilityPanel({ result, open }: Props) {
  if (!open || !result) return null;

  const sentimentPct =
    result.sentiment === 'positive' ? 82 : result.sentiment === 'neutral' ? 52 : 24;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
        <Gauge className="h-4 w-4 text-[var(--accent)]" />
        Readability Analysis
      </div>
      <div className="grid gap-3 text-sm text-[var(--text-secondary)] md:grid-cols-3">
        <div className="rounded-md bg-white/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <Gauge className="h-3.5 w-3.5" /> Flesch Score
          </div>
          <p className="font-medium text-[var(--text-primary)]">{result.fleschScore}/100</p>
        </div>
        <div className="rounded-md bg-white/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <Clock3 className="h-3.5 w-3.5" /> Read Time
          </div>
          <p className="font-medium text-[var(--text-primary)]">{result.estimatedReadMinutes} min</p>
        </div>
        <div className="rounded-md bg-white/5 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <Smile className="h-3.5 w-3.5" /> Sentiment
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${sentimentPct}%` }} />
          </div>
        </div>
      </div>
      {result.spamWarnings.length ? (
        <div className="mt-3 rounded-md border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]">
          <div className="mb-2 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Spam word warnings
          </div>
          <div className="flex flex-wrap gap-2">
            {result.spamWarnings.map((word) => (
              <span key={word} className="rounded-md border border-[var(--warning)]/40 px-2 py-1">
                {word}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
