import { getOrderStepPresentation } from '../../lib/notificationPresentation';

export default function OrderProgressTrack({ progress, compact = false, glow = false }) {
  if (!progress || progress.cancelled) {
    return (
      <p className="rxn-order-cancelled">Order cancelled</p>
    );
  }

  const { steps, currentIndex, percent } = progress;

  return (
    <div className={`rxn-progress${compact ? ' rxn-progress--compact' : ''}${glow ? ' rxn-progress--glow' : ''}`}>
      <div className="rxn-progress-bar" aria-hidden>
        <span className="rxn-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      {glow && compact && (
        <p className="rxn-progress-transit-label">In transit</p>
      )}
      <div className="rxn-progress-steps" role="list">
        {steps.map((step, i) => {
          const { label, Icon } = getOrderStepPresentation(step);
          const done = i <= currentIndex;
          const active = i === currentIndex;
          return (
            <div
              key={step}
              role="listitem"
              className={`rxn-progress-step${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
            >
              <span className="rxn-progress-dot">
                <Icon size={compact ? 10 : 12} strokeWidth={2} />
              </span>
              {!compact && <span className="rxn-progress-label">{label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
