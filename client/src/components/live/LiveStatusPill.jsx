const MODE_LABEL = {
  showcase: 'Showcase',
  auction: 'Auction',
  flash_deal: 'Flash deal',
  private: 'Private',
};

export default function LiveStatusPill({ status = 'live', mode, compact = false }) {
  const isLive = status === 'live';
  const label =
    status === 'starting_soon'
      ? 'Starting soon'
      : status === 'scheduled'
        ? 'Scheduled'
        : status === 'ended'
          ? 'Ended'
          : status === 'replay_available'
            ? 'Replay'
            : isLive
              ? 'LIVE'
              : status;

  return (
    <span
      className={`live-pill live-pill--${status}${compact ? ' live-pill--compact' : ''}`}
      data-mode={mode}
    >
      {isLive && <span className="live-pill-dot" aria-hidden />}
      {label}
      {mode && !compact ? (
        <span className="live-pill-mode">{MODE_LABEL[mode] || mode}</span>
      ) : null}
    </span>
  );
}
