import { useEffect, useRef } from 'react';

/**
 * Provider-agnostic live player — commerce UI never imports YouTube APIs directly.
 */
export default function LivePlayer({
  playbackUrl = '',
  provider = 'youtube',
  isLive = true,
  autoplay = true,
  className = '',
  remoteStream = null,
  localStream = null,
  webrtcStatus = '',
}) {
  const videoRef = useRef(null);
  const url = playbackUrl || '';
  const isWebRTC = provider === 'webrtc';
  const isYoutube = provider === 'youtube' || url.includes('youtube.com/embed');
  const isHls =
    !isYoutube &&
    !isWebRTC &&
    (url.includes('.m3u8') || provider === 'mux' || provider === 'aws-ivs' || provider === 'selfhosted');

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isWebRTC) return undefined;
    const stream = remoteStream || localStream;
    if (stream) {
      el.srcObject = stream;
      if (autoplay && isLive) {
        el.play().catch(() => {});
      }
    } else {
      el.srcObject = null;
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [isWebRTC, remoteStream, localStream, autoplay, isLive]);

  if (isWebRTC) {
    const hasStream = Boolean(remoteStream || localStream);
    return (
      <div className={`live-player live-player--webrtc ${className}`.trim()}>
        <video
          ref={videoRef}
          className="live-player-video"
          playsInline
          autoPlay={autoplay && isLive}
          muted={Boolean(localStream) || autoplay}
        />
        {!hasStream && (
          <div className="live-player-waiting">
            <p className="live-player-placeholder">
              {webrtcStatus === 'waiting' ? 'Waiting for host…' : 'Connecting stream…'}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`live-player live-player--empty ${className}`.trim()}>
        <p className="live-player-placeholder">Stream starting soon…</p>
      </div>
    );
  }

  if (isYoutube) {
    return (
      <div className={`live-player live-player--youtube ${className}`.trim()}>
        <iframe
          src={url}
          title="Live stream"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="live-player-iframe"
        />
      </div>
    );
  }

  return (
    <div className={`live-player live-player--hls ${className}`.trim()}>
      <video
        src={url}
        className="live-player-video"
        controls
        playsInline
        autoPlay={autoplay && isLive}
        muted={autoplay}
      />
    </div>
  );
}
