export function digitalEscrowReleaseEligibleAt(minutes = 10) {
  return new Date(Date.now() + Math.max(1, minutes) * 60 * 1000);
}
