import React, { useEffect, useState } from 'react';

interface AudioWaveProps {
  isPlaying: boolean;
  className?: string;
}

export const AudioWave: React.FC<AudioWaveProps> = ({ isPlaying, className = '' }) => {
  const [heights, setHeights] = useState<number[]>([8, 8, 8, 8]);

  useEffect(() => {
    if (!isPlaying) {
      setHeights([8, 8, 8, 8]);
      return;
    }

    const interval = setInterval(() => {
      setHeights([
        8 + Math.random() * 20,
        8 + Math.random() * 20,
        8 + Math.random() * 20,
        8 + Math.random() * 20,
      ]);
    }, 150);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={`flex items-end gap-1 h-6 ${className}`}>
      {heights.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-current rounded-full transition-all duration-150"
          style={{
            height: `${height}px`,
            minHeight: '8px',
            opacity: isPlaying ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
};

