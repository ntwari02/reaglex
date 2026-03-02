/**
 * Chat List Indicator Component
 * 
 * Displays typing or recording indicators in the chat list view.
 * Shows under the user's name, replacing the last message preview temporarily.
 * 
 * This component is used in the chat list to show real-time activity
 * while keeping the same indicators in the open chat view.
 */

import React from 'react';
import { Mic } from 'lucide-react';

interface ChatListIndicatorProps {
  isTyping?: boolean;
  isRecording?: boolean;
  recordingDuration?: number;
  userName?: string;
  className?: string;
}

const ChatListIndicator: React.FC<ChatListIndicatorProps> = ({
  isTyping = false,
  isRecording = false,
  recordingDuration = 0,
  userName,
  className = '',
}) => {
  if (!isTyping && !isRecording) return null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Priority: recording overrides typing
  if (isRecording) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 ${className}`}>
        <div className="relative flex items-center justify-center">
          <Mic className="w-3 h-3 animate-pulse" />
          <div 
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"
            style={{
              animation: 'recordingPulse 1s infinite',
            }}
          />
        </div>
        <span className="truncate">
          {userName ? `${userName} is recording` : 'Recording voice'}
          {recordingDuration > 0 && (
            <span className="ml-1 font-mono text-[10px]">
              {formatDuration(recordingDuration)}
            </span>
          )}
        </span>
        {/* Small waveform animation */}
        <div className="flex items-center gap-0.5 h-3 ml-1">
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
        <style>{`
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
        `}</style>
      </div>
    );
  }

  if (isTyping) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 italic ${className}`}>
        <div className="flex items-center gap-0.5">
          <span 
            className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full"
            style={{
              animation: 'typingDot 1.4s infinite',
              animationDelay: '0ms',
            }}
          />
          <span 
            className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full"
            style={{
              animation: 'typingDot 1.4s infinite',
              animationDelay: '200ms',
            }}
          />
          <span 
            className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full"
            style={{
              animation: 'typingDot 1.4s infinite',
              animationDelay: '400ms',
            }}
          />
        </div>
        <span className="truncate">
          {userName ? `${userName} is typing...` : 'typing...'}
        </span>
        <style>{`
          @keyframes typingDot {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            30% {
              transform: translateY(-4px);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    );
  }

  return null;
};

export default ChatListIndicator;

