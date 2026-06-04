import { motion } from 'framer-motion';

type Props = {
  active: boolean;
  indeterminate?: boolean;
};

export default function IntelligenceSearchProgress({ active, indeterminate = true }: Props) {
  if (!active) return null;

  return (
    <div className="intel-search-progress" aria-hidden>
      {indeterminate ? (
        <motion.div
          className="intel-search-progress-bar intel-search-progress-bar--indeterminate"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <div className="intel-search-progress-bar" />
      )}
    </div>
  );
}
