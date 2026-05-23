/**
 * Acquire seller camera + microphone (progressive constraints for mobile/desktop).
 */
export async function acquireLocalMedia() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser.');
  }
  if (!window.isSecureContext) {
    throw new Error('Camera requires HTTPS. Open the site via https:// or localhost.');
  }

  const attempts = [
    {
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    },
    { video: { facingMode: 'user' }, audio: true },
    { video: true, audio: true },
  ];

  let lastErr;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastErr = e;
    }
  }

  const name = lastErr?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    throw new Error('Camera/mic blocked. Allow access in browser settings and reload.');
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    throw new Error('No camera or microphone found on this device.');
  }
  if (name === 'NotReadableError') {
    throw new Error('Camera is in use by another app. Close it and try again.');
  }
  throw new Error(lastErr?.message || 'Could not open camera and microphone.');
}
