import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Maximize2,
  Volume2,
  VolumeX,
  PictureInPicture2,
  GripVertical,
  Radio,
} from 'lucide-react';
import { useLiveStreamUi } from '../../hooks/usePersistentStream';
import { persistentLiveEngine } from '../../live/persistentLiveEngine';
import { useLiveStreamStore } from '../../stores/liveStreamStore';

const FLOAT_SIZE = { width: 168, height: 280 };
const SAFE_BOTTOM = 88;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function FloatingLivePlayer() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const dragRef = useRef(null);
  const [pos, setPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);

  const {
    active,
    minimized,
    sessionId,
    session,
    muted,
    webrtcStatus,
    viewMode,
    streamRevision,
  } = useLiveStreamUi();

  const setMuted = useLiveStreamStore((s) => s.setMuted);
  const closePlayer = useLiveStreamStore((s) => s.closePlayer);

  const visible = active && minimized && viewMode !== 'hidden' && sessionId;
  const provider = session?.streamProvider || 'webrtc';
  const isWebRTC = provider === 'webrtc';
  const playbackUrl = session?.playbackUrl || '';

  useEffect(() => {
    setPipSupported(
      typeof document !== 'undefined' &&
        'pictureInPictureEnabled' in document &&
        document.pictureInPictureEnabled !== false
    );
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!visible || !el) return undefined;
    persistentLiveEngine.attachVideo(el);
    return () => persistentLiveEngine.detachVideo(el);
  }, [visible, webrtcStatus, streamRevision]);

  useEffect(() => {
    if (visible && pos.x === null) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPos({
        x: w - FLOAT_SIZE.width - 16,
        y: h - FLOAT_SIZE.height - SAFE_BOTTOM,
      });
    }
  }, [visible, pos.x]);

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { ...pos };
    setDragging(true);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setPos({
        x: clamp(origin.x + dx, 8, window.innerWidth - FLOAT_SIZE.width - 8),
        y: clamp(origin.y + dy, 8, window.innerHeight - FLOAT_SIZE.height - 8),
      });
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [pos]);

  const handleExpand = () => {
    if (sessionId) navigate(`/live/${sessionId}`);
  };

  const handleClose = () => {
    void persistentLiveEngine.stop('manual');
    closePlayer();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    persistentLiveEngine.setTrackMuted(next);
  };

  const togglePiP = async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        useLiveStreamStore.getState().setViewMode('floating');
      } else if (el.requestPictureInPicture) {
        await el.requestPictureInPicture();
        useLiveStreamStore.getState().setViewMode('pip');
      }
    } catch {
      /* PiP denied */
    }
  };

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    const onLeave = () => useLiveStreamStore.getState().setViewMode('floating');
    el.addEventListener('leavepictureinpicture', onLeave);
    return () => el.removeEventListener('leavepictureinpicture', onLeave);
  }, [visible]);

  const waiting = isWebRTC && webrtcStatus !== 'live';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={dragRef}
          className={`rx-float-live${dragging ? ' rx-float-live--dragging' : ''}`}
          style={{
            left: pos.x ?? undefined,
            top: pos.y ?? undefined,
            width: FLOAT_SIZE.width,
            height: FLOAT_SIZE.height,
          }}
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          role="region"
          aria-label="Floating live player"
        >
          <button
            type="button"
            className="rx-float-live-hit"
            onClick={handleExpand}
            aria-label="Open full live session"
          />

          <div
            className="rx-float-live-drag"
            onPointerDown={onPointerDown}
            aria-hidden
          >
            <GripVertical size={14} />
          </div>

          <div className="rx-float-live-media">
            {isWebRTC ? (
              <>
                <video
                  ref={videoRef}
                  className="rx-float-live-video"
                  playsInline
                  autoPlay
                  muted={muted}
                />
                {waiting && (
                  <div className="rx-float-live-waiting">
                    <span>{webrtcStatus === 'waiting' ? 'Waiting…' : 'Connecting…'}</span>
                  </div>
                )}
              </>
            ) : playbackUrl.includes('youtube.com') ? (
              <iframe
                src={playbackUrl}
                title={session?.title || 'Live'}
                className="rx-float-live-iframe"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            ) : (
              <video
                ref={videoRef}
                src={playbackUrl}
                className="rx-float-live-video"
                playsInline
                autoPlay
                muted={muted}
              />
            )}
            <span className="rx-float-live-badge">
              <Radio size={10} />
              LIVE
            </span>
          </div>

          <div className="rx-float-live-meta">
            <p className="rx-float-live-title">{session?.seller?.name || 'Live'}</p>
            <p className="rx-float-live-sub">{session?.title}</p>
          </div>

          <div className="rx-float-live-controls" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            {pipSupported && isWebRTC && (
              <button type="button" onClick={togglePiP} aria-label="Picture in picture">
                <PictureInPicture2 size={16} />
              </button>
            )}
            <button type="button" onClick={handleExpand} aria-label="Expand live">
              <Maximize2 size={16} />
            </button>
            <button type="button" onClick={handleClose} aria-label="Close live player">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
