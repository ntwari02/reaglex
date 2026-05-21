export function createLockerAccess(params: { lockerId: string }) {
  const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
  const smsMessage = `Locker: ${params.lockerId}, PIN: ${pin}`;
  return {
    lockerId: params.lockerId,
    pin,
    smsMessage,
  };
}
