import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * WhatsApp-style interactive voice note waveform with scrubbing
 * 
 * Features:
 * - Visual waveform display
 * - Click/drag to seek (scrub)
 * - Real-time playback position indicator
 * - Mouse and touch support
 */

interface VoiceWaveformProps {
  duration: number; // Total duration in seconds
  currentTime: number; // Current playback time in seconds
  isPlaying: boolean;
  onSeek: (time: number) => void; // Callback when user seeks
  onSeekStart?: () => void; // Callback when user starts seeking (to cancel autoplay)
  className?: string;
  waveformColor?: string;
  progressColor?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  duration,
  currentTime,
  isPlaying,
  onSeek,
  onSeekStart,
  className = '',
  waveformColor = 'currentColor',
  progressColor = 'currentColor',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  // Generate waveform bars (simplified - in production, you'd use actual audio analysis)
  const generateWaveform = useCallback(() => {
    const bars = 50; // Number of bars in waveform
    const heights: number[] = [];
    
    // Generate random heights for visualization
    // In production, this would come from actual audio analysis
    for (let i = 0; i < bars; i++) {
      heights.push(8 + Math.random() * 24);
    }
    
    return heights;
  }, []);

  const [waveformHeights] = useState<number[]>(generateWaveform());

  /**
   * Calculate seek position from mouse/touch event
   */
  const getSeekTimeFromEvent = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return 0;
      
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      
      return percentage * duration;
    },
    [duration]
  );

  /**
   * Handle mouse/touch start
   */
  const handleStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      const time = getSeekTimeFromEvent(clientX);
      setSeekTime(time);
      
      // Notify parent that seeking started (to cancel autoplay)
      if (onSeekStart) {
        onSeekStart();
      }
    },
    [getSeekTimeFromEvent, onSeekStart]
  );

  /**
   * Handle mouse/touch move
   */
  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      
      const time = getSeekTimeFromEvent(clientX);
      setSeekTime(time);
    },
    [isDragging, getSeekTimeFromEvent]
  );

  /**
   * Handle mouse/touch end
   */
  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    if (seekTime !== null) {
      onSeek(seekTime);
    }
    
    setIsDragging(false);
    setSeekTime(null);
  }, [isDragging, seekTime, onSeek]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX);
    },
    [handleStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleStart(e.touches[0].clientX);
      }
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove]
  );

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Set up global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Calculate progress percentage
  const displayTime = isDragging && seekTime !== null ? seekTime : currentTime;
  const progressPercentage = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-8 cursor-pointer select-none ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{ touchAction: 'none' }}
    >
      {/* Waveform bars */}
      <div className="absolute inset-0 flex items-end gap-0.5 px-1">
        {waveformHeights.map((height, index) => {
          const barPosition = (index / waveformHeights.length) * 100;
          const isPastProgress = barPosition <= progressPercentage;
          
          return (
            <div
              key={index}
              className="flex-1 rounded-sm transition-all duration-75"
              style={{
                height: `${height}px`,
                minHeight: '4px',
                backgroundColor: isPastProgress ? progressColor : waveformColor,
                opacity: isPastProgress ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>

      {/* Playhead indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-current transition-all duration-75 pointer-events-none"
        style={{
          left: `${progressPercentage}%`,
          opacity: isDragging ? 1 : 0.8,
        }}
      >
        <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-current shadow-sm" />
      </div>

      {/* Hover/active overlay for better UX */}
      {isDragging && (
        <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded" />
      )}
    </div>
  );
};

