export function triageDispute(input: { reason: string; evidenceCount: number }) {
  const reason = String(input.reason || '').toLowerCase();
  const severity = reason.includes('fraud') || reason.includes('counterfeit') ? 'high' : input.evidenceCount >= 3 ? 'medium' : 'low';
  return { severity, autoEscalate: severity === 'high' };
}
