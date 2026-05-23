import { useEffect, useRef } from 'react';

/**
 * Seller preview while broadcasting via WebRTC (local camera).
 */
export default function WebRTCBroadcast({ stream, status, className = '', micOn = true, camOn = true }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  return (
    <div className={`live-webrtc-broadcast ${className}`.trim()}>
      <video
        ref={videoRef}
        className="live-webrtc-broadcast-video"
        autoPlay
        playsInline
        muted
      />
      <span className="live-webrtc-broadcast-badge">
        {status === 'live' ? 'You are live' : status === 'connecting' ? 'Starting…' : 'Camera'}
        {!micOn && ' · Mic off'}
        {!camOn && ' · Cam off'}
      </span>
    </div>
  );
}
