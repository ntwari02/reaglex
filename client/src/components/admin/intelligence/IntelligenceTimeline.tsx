import { motion } from 'framer-motion';

export type TimelineEntry = { label: string; at: string; tone?: 'default' | 'warn' | 'ok' };

type Props = {
  entries: TimelineEntry[];
  compact?: boolean;
};

export default function IntelligenceTimeline({ entries, compact = false }: Props) {
  if (!entries.length) return null;

  return (
    <ol className={`intel-timeline${compact ? ' intel-timeline--compact' : ''}`}>
      {entries.map((entry, i) => (
        <motion.li
          key={`${entry.label}-${entry.at}-${i}`}
          className="intel-timeline-item"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
        >
          <span className="intel-timeline-dot" data-tone={entry.tone || 'default'} />
          <div className="intel-timeline-body">
            <span className="intel-timeline-time">{entry.at}</span>
            <span className="intel-timeline-label">{entry.label}</span>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
