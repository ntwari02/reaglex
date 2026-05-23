import { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  PictureInPicture2,
  X,
  Radio,
} from 'lucide-react';

/**
 * Video overlay controls (fullscreen, PiP, mute, pop-out, dismiss).
 */
export default function LiveVideoChrome({
  videoRef,
  muted = true,
  onToggleMute,
  onPopOut,
  onDismiss,
  showLiveBadge = true,
  compact = false,
}) {
  const [pipOk, setPipOk] = useState(false);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    setPipOk(
      typeof document !== 'undefined' &&
        'pictureInPictureEnabled' in document &&
        document.pictureInPictureEnabled !== false
    );
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const getVideoEl = () => videoRef?.current;

  const toggleFullscreen = async () => {
    const el = getVideoEl()?.closest?.('.live-buyer-stage, .live-player, .live-studio-stage') || getVideoEl();
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* denied */
    }
  };

  const togglePiP = async () => {
    const el = getVideoEl();
    if (!el?.requestPictureInPicture) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      /* denied */
    }
  };

  return (
    <div className={`live-video-chrome${compact ? ' live-video-chrome--compact' : ''}`}>
      {showLiveBadge && (
        <span className="live-video-chrome-live">
          <Radio size={10} />
          LIVE
        </span>
      )}
      <div className="live-video-chrome-actions">
        <button type="button" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        {pipOk && (
          <button type="button" onClick={togglePiP} aria-label="Picture in picture">
            <PictureInPicture2 size={16} />
          </button>
        )}
        <button type="button" onClick={toggleFullscreen} aria-label={isFs ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        {onPopOut && (
          <button type="button" onClick={onPopOut} aria-label="Pop out player">
            <Minimize2 size={16} />
          </button>
        )}
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Close live">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
