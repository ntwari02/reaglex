/**
 * Visual guide for seller subscription charges (config-driven gateways).
 */
export default function SubscriptionPaymentFlow({ activeStep = 2 }) {
  const steps = [
    { id: 1, label: 'Choose plan' },
    { id: 2, label: 'Payment method' },
    { id: 3, label: 'Secure charge' },
    { id: 4, label: 'Invoice logged' },
  ];

  return (
    <div className="slx-pay-flow" role="list" aria-label="Subscription payment steps">
      {steps.map((s) => (
        <div
          key={s.id}
          role="listitem"
          className={`slx-pay-step${s.id === activeStep ? ' is-active' : ''}${s.id < activeStep ? ' is-done' : ''}`}
        >
          <div className="slx-pay-step-num">{s.id}</div>
          <div className="slx-pay-step-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
