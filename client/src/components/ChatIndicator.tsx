import React from 'react';
import { Mic, Paperclip } from 'lucide-react';

export type ChatIndicatorStatus = 'typing' | 'recording' | 'file' | null;

interface ChatIndicatorProps {
  status: ChatIndicatorStatus;
  userName?: string; // Optional: show who is typing/recording
  duration?: number; // Optional: recording duration in seconds
  className?: string;
  position?: 'above' | 'below'; // Position relative to input area
}

const ChatIndicator: React.FC<ChatIndicatorProps> = ({ 
  status, 
  userName,
  duration = 0,
  className = '',
  position = 'above'
}) => {
  if (!status) return null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 ${position === 'above' ? 'mb-2' : 'mt-2'} ${className}`}
      style={{
        animation: status ? 'slideIn 0.2s ease-out' : 'slideOut 0.2s ease-in',
      }}
    >
      {status === 'typing' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {/* WhatsApp-style typing dots */}
              <span 
                className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
                style={{
                  animation: 'typingDot 1.4s infinite',
                  animationDelay: '0ms',
                }}
              />
              <span 
                className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
                style={{
                  animation: 'typingDot 1.4s infinite',
                  animationDelay: '200ms',
                }}
              />
              <span 
                className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full"
                style={{
                  animation: 'typingDot 1.4s infinite',
                  animationDelay: '400ms',
                }}
              />
            </div>
            {userName && (
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                {userName} is typing
              </span>
            )}
          </div>
        </div>
      )}

      {status === 'recording' && (
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            {/* Pulsing recording indicator */}
            <div 
              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"
              style={{
                animation: 'recordingPulse 1s infinite',
              }}
            />
          </div>
          <span className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">
            {userName ? `${userName} is recording` : 'Recording audio'}
            {duration > 0 && (
              <span className="ml-2 text-red-500 font-mono">
                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </span>
          {/* Audio waveform indicator */}
          <div className="flex items-center gap-0.5 h-4">
            <div 
              className="w-0.5 bg-red-500 rounded-full"
              style={{
                height: '40%',
                animation: 'audioWave 1s infinite',
                animationDelay: '0ms',
              }}
            />
            <div 
              className="w-0.5 bg-red-500 rounded-full"
              style={{
                height: '60%',
                animation: 'audioWave 1s infinite',
                animationDelay: '150ms',
              }}
            />
            <div 
              className="w-0.5 bg-red-500 rounded-full"
              style={{
                height: '80%',
                animation: 'audioWave 1s infinite',
                animationDelay: '300ms',
              }}
            />
            <div 
              className="w-0.5 bg-red-500 rounded-full"
              style={{
                height: '60%',
                animation: 'audioWave 1s infinite',
                animationDelay: '450ms',
              }}
            />
            <div 
              className="w-0.5 bg-red-500 rounded-full"
              style={{
                height: '40%',
                animation: 'audioWave 1s infinite',
                animationDelay: '600ms',
              }}
            />
          </div>
        </div>
      )}

      {status === 'file' && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Paperclip 
              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400"
              style={{
                animation: 'fileSelect 1s infinite',
                transformOrigin: 'center',
              }}
            />
          </div>
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {userName ? `${userName} is selecting a file` : 'Selecting file'}
          </span>
        </div>
      )}

      {/* CSS Animations via style tag */}
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        @keyframes recordingPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }

        @keyframes audioWave {
          0%, 100% {
            height: 40%;
            opacity: 0.7;
          }
          50% {
            height: 100%;
            opacity: 1;
          }
        }

        @keyframes fileSelect {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(-15deg) scale(1.1);
          }
          75% {
            transform: rotate(15deg) scale(1.1);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default ChatIndicator;

