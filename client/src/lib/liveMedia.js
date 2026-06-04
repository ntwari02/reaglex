/**
 * Seller camera + mic — progressive fallbacks (browser + PWA).
 * Requires a user gesture before calling (button click).
 */

async function queryAvPermission(kind) {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const status = await navigator.permissions.query({ name: kind });
    return status.state;
  } catch {
    return 'unknown';
  }
}

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator).standalone === true
  );
}

export async function acquireLocalMedia() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser.');
  }

  const secure =
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!secure) {
    throw new Error('Camera needs HTTPS. Open the site with https:// (not http).');
  }

  const camPerm = await queryAvPermission('camera');
  const micPerm = await queryAvPermission('microphone');

  if (camPerm === 'denied' || micPerm === 'denied') {
    throw new Error(
      'Camera or microphone is blocked. Tap the lock icon in the address bar, allow Camera & Microphone, then reload.'
    );
  }

  const pwa = isStandalonePwa();
  const attempts = pwa
    ? [
        { audio: true, video: { facingMode: 'user' } },
        { audio: true, video: true },
        { video: true, audio: true },
      ]
    : [
        {
          audio: { echoCancellation: true, noiseSuppression: true },
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        },
        { audio: true, video: { facingMode: 'user' } },
        { audio: true, video: true },
        { video: true },
      ];

  let lastErr;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const vTracks = stream.getVideoTracks();
      const aTracks = stream.getAudioTracks();
      if (!vTracks.length) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('No video track from camera');
      }
      if (!aTracks.length && constraints.audio !== false) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioOnly.getAudioTracks().forEach((t) => stream.addTrack(t));
        } catch {
          /* video-only fallback */
        }
      }
      return stream;
    } catch (e) {
      lastErr = e;
    }
  }

  const name = lastErr?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    throw new Error(
      'Permission denied. Allow camera & microphone for this site in browser settings, then tap Start again.'
    );
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    throw new Error('No camera or microphone found on this device.');
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    throw new Error('Camera is busy. Close other apps using the camera and try again.');
  }
  if (name === 'OverconstrainedError') {
    throw new Error('Camera settings not supported. Try another browser or device.');
  }
  throw new Error(lastErr?.message || 'Could not open camera and microphone.');
}
