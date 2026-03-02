import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * WhatsApp-style voice note autoplay hook with transition sounds and waveform scrubbing
 * 
 * Features:
 * - Autoplays consecutive voice notes from the same sender
 * - Transition sound between consecutive voice notes
 * - Only one audio plays at a time
 * - Auto-scrolls to playing voice note
 * - Handles pause/stop gracefully
 * - Supports seeking (scrubbing) which cancels autoplay
 * - Tracks currentTime for waveform display
 * - Cleans up on unmount
 */

export interface VoiceNote {
  messageId: string;
  attachmentIndex: number;
  audioUrl: string;
  senderId: string;
  senderType: 'buyer' | 'seller';
  duration?: number;
}

interface UseVoiceNoteAutoplayOptions {
  messages: Array<{
    _id: string;
    senderId: string | { _id: string; fullName?: string };
    senderType: 'buyer' | 'seller';
    attachments?: Array<{ type?: string; path: string; duration?: number }>;
  }>;
  getFileUrl: (path: string) => string;
  onScrollToMessage?: (messageId: string) => void;
  transitionSoundUrl?: string; // Optional: URL to transition sound (default: generates a short beep)
}

interface PlayingState {
  messageId: string;
  attachmentIndex: number;
  audioElement: HTMLAudioElement | null;
  currentTime: number;
  duration: number;
}

export function useVoiceNoteAutoplay({
  messages,
  getFileUrl,
  onScrollToMessage,
  transitionSoundUrl,
}: UseVoiceNoteAutoplayOptions) {
  const [playingState, setPlayingState] = useState<PlayingState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transitionAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayEnabledRef = useRef(true);
  const userSeekedRef = useRef(false); // Track if user manually sought
  const currentSequenceRef = useRef<VoiceNote[]>([]);
  const currentIndexRef = useRef(0);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Find all consecutive voice notes from the same sender starting from a given message index
   */
  const findVoiceNoteSequence = useCallback(
    (startIndex: number, senderId: string, senderType: 'buyer' | 'seller'): VoiceNote[] => {
      const sequence: VoiceNote[] = [];
      
      for (let i = startIndex; i < messages.length; i++) {
        const message = messages[i];
        
        // Extract sender ID (handle both string and object)
        const msgSenderId = typeof message.senderId === 'object' 
          ? message.senderId._id 
          : message.senderId;
        
        // Stop if sender changes
        if (msgSenderId !== senderId || message.senderType !== senderType) {
          break;
        }
        
        // Check if message has voice attachments
        if (message.attachments && message.attachments.length > 0) {
          const voiceAttachments = message.attachments.filter(att => !att.type || att.type === 'voice');
          
          if (voiceAttachments.length > 0) {
            // Add all voice attachments from this message
            voiceAttachments.forEach((att) => {
              const attachmentIndex = message.attachments!.findIndex(a => a === att);
              sequence.push({
                messageId: message._id,
                attachmentIndex,
                audioUrl: getFileUrl(att.path),
                senderId: msgSenderId,
                senderType: message.senderType,
                duration: att.duration,
              });
            });
          } else {
            // If message has attachments but no voice, stop sequence
            // (text/image/file message breaks the chain)
            break;
          }
        } else {
          // If message has no attachments (text only), stop sequence
          break;
        }
      }
      
      return sequence;
    },
    [messages, getFileUrl]
  );

  /**
   * Create and configure audio element
   */
  const createAudioElement = useCallback((audioUrl: string): HTMLAudioElement => {
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;
    audio.muted = false;
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    
    return audio;
  }, []);

  /**
   * Generate a short transition sound (soft click/tick)
   * Creates a brief audio tone programmatically using Web Audio API
   */
  const createTransitionSound = useCallback((): { play: () => Promise<void> } => {
    if (transitionSoundUrl) {
      // Use provided transition sound URL
      const audio = new Audio(transitionSoundUrl);
      audio.volume = 0.3; // Soft volume
      audio.preload = 'auto';
      return {
        play: async () => {
          try {
            await audio.play();
            await new Promise(resolve => {
              audio.onended = resolve;
            });
          } catch (error) {
            console.warn('[Transition Sound] Play error:', error);
          }
        }
      };
    }

    // Generate a short beep programmatically using Web Audio API
    return {
      play: async () => {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800; // Frequency in Hz (soft tick sound)
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01); // Fade in
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15); // Fade out
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15); // 150ms duration
          
          // Wait for sound to finish
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // Cleanup
          oscillator.disconnect();
          gainNode.disconnect();
          audioContext.close();
        } catch (error) {
          console.warn('[Transition Sound] Generation error:', error);
        }
      }
    };
  }, [transitionSoundUrl]);

  /**
   * Play transition sound between voice notes
   */
  const playTransitionSound = useCallback(async (): Promise<void> => {
    // Only play if autoplay is enabled and user hasn't manually sought
    if (!autoplayEnabledRef.current || userSeekedRef.current) {
      return;
    }

    try {
      // Stop any existing transition sound
      if (transitionAudioRef.current) {
        transitionAudioRef.current.pause();
        transitionAudioRef.current = null;
      }

      const transitionSound = createTransitionSound();
      await transitionSound.play();
    } catch (error) {
      console.warn('[Voice Autoplay] Transition sound error:', error);
      // Continue even if transition sound fails
    }
  }, [createTransitionSound]);

  // Ref to store handleAudioEnd to avoid circular dependency
  const handleAudioEndRef = useRef<(() => Promise<void>) | null>(null);

  /**
   * Play a specific voice note
   */
  const playVoiceNote = useCallback(
    async (messageId: string, attachmentIndex: number, autoPlayNext = true) => {
      // Find the message
      const message = messages.find(m => m._id === messageId);
      if (!message || !message.attachments || !message.attachments[attachmentIndex]) {
        console.error('[Voice Autoplay] Message or attachment not found');
        return;
      }

      const attachment = message.attachments[attachmentIndex];
      if (attachment.type && attachment.type !== 'voice') {
        console.error('[Voice Autoplay] Attachment is not a voice note');
        return;
      }

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }

      // Extract sender ID
      const senderId = typeof message.senderId === 'object' 
        ? message.senderId._id 
        : message.senderId;

      // Find voice note sequence starting from this message
      const messageIndex = messages.findIndex(m => m._id === messageId);
      if (messageIndex === -1) {
        console.error('[Voice Autoplay] Message index not found');
        return;
      }

      const sequence = findVoiceNoteSequence(messageIndex, senderId, message.senderType);
      
      // Find the current voice note in the sequence
      const currentVoiceIndex = sequence.findIndex(
        v => v.messageId === messageId && v.attachmentIndex === attachmentIndex
      );

      if (currentVoiceIndex === -1) {
        console.error('[Voice Autoplay] Voice note not found in sequence');
        return;
      }

      // Set up sequence for autoplay
      currentSequenceRef.current = sequence;
      currentIndexRef.current = currentVoiceIndex;
      autoplayEnabledRef.current = autoPlayNext;
      setIsPaused(false);

      // Create and play audio
      const audioUrl = getFileUrl(attachment.path);
      const audio = createAudioElement(audioUrl);

      // Set up event handlers
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        console.log('[Voice Autoplay] Audio loaded, duration:', duration);
        
        // Validate duration is a finite number
        if (!isFinite(duration) || duration <= 0) {
          console.warn('[Voice Autoplay] Invalid duration:', duration);
          return;
        }
        
        // Update playing state with duration
        setPlayingState(prev => prev ? {
          ...prev,
          duration: duration,
        } : null);
      };

      // Track currentTime for waveform display
      const updateCurrentTime = () => {
        // CRITICAL: Check if audioRef.current exists and is ready
        if (!audioRef.current || audioRef.current.readyState === 0) {
          return; // Audio not loaded yet
        }
        
        try {
          const currentTime = audioRef.current.currentTime;
          const duration = audioRef.current.duration;
          
          // Validate values are finite numbers
          if (!isFinite(currentTime) || !isFinite(duration)) {
            return; // Invalid values, skip update
          }
          
          setPlayingState(prev => {
            if (!prev || prev.messageId !== messageId || prev.attachmentIndex !== attachmentIndex) {
              return prev;
            }
            return {
              ...prev,
              currentTime: currentTime,
              duration: duration || prev.duration,
            };
          });
        } catch (error) {
          // Silently handle errors (audio might be disposed)
          console.warn('[Voice Autoplay] Error updating currentTime:', error);
        }
      };

      // CRITICAL: Store audio reference BEFORE setting up interval
      audioRef.current = audio;

      // Set up timeupdate interval for smooth waveform updates
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      timeUpdateIntervalRef.current = setInterval(updateCurrentTime, 100); // Update every 100ms

      audio.onplay = () => {
        console.log('[Voice Autoplay] Audio started playing');
        
        // Validate duration before setting state
        const duration = audio.duration;
        const validDuration = isFinite(duration) && duration > 0 ? duration : 0;
        
        setPlayingState({
          messageId,
          attachmentIndex,
          audioElement: audio,
          currentTime: 0,
          duration: validDuration,
        });
        
        // Reset user seek flag when new audio starts
        userSeekedRef.current = false;
        
        // Auto-scroll to playing message
        if (onScrollToMessage) {
          onScrollToMessage(messageId);
        }
      };

      audio.onpause = () => {
        console.log('[Voice Autoplay] Audio paused');
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
          timeUpdateIntervalRef.current = null;
        }
        
        if (audio.ended) {
          // Audio finished naturally
          if (handleAudioEndRef.current) {
            handleAudioEndRef.current().catch(console.error);
          }
        } else {
          // User paused manually
          setIsPaused(true);
          autoplayEnabledRef.current = false;
        }
      };

      audio.onended = () => {
        console.log('[Voice Autoplay] Audio ended');
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
          timeUpdateIntervalRef.current = null;
        }
        if (handleAudioEndRef.current) {
          handleAudioEndRef.current().catch(console.error);
        }
      };

      audio.onerror = (e) => {
        console.error('[Voice Autoplay] Audio error:', e, audio.error);
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
          timeUpdateIntervalRef.current = null;
        }
        setPlayingState(null);
        audioRef.current = null;
        autoplayEnabledRef.current = false;
      };

      // Note: audioRef.current is already set above (before interval setup)

      try {
        // Load and play
        audio.load();
        await audio.play();
        console.log('[Voice Autoplay] Audio playing successfully');
      } catch (error: any) {
        console.error('[Voice Autoplay] Play error:', error);
        
        // Clean up on error
        if (timeUpdateIntervalRef.current) {
          clearInterval(timeUpdateIntervalRef.current);
          timeUpdateIntervalRef.current = null;
        }
        
        if (error.name === 'NotAllowedError') {
          console.warn('[Voice Autoplay] User interaction required to play audio');
        }
        setPlayingState(null);
        audioRef.current = null;
      }
    },
    [messages, getFileUrl, findVoiceNoteSequence, createAudioElement, onScrollToMessage, playingState]
  );

  /**
   * Handle audio end - autoplay next if enabled with transition sound
   */
  const handleAudioEnd = useCallback(async () => {
    // Don't autoplay if disabled, paused, or user manually sought
    if (!autoplayEnabledRef.current || isPaused || userSeekedRef.current) {
      setPlayingState(null);
      audioRef.current = null;
      return;
    }

    // Move to next voice note in sequence
    currentIndexRef.current += 1;

    if (currentIndexRef.current < currentSequenceRef.current.length) {
      const nextVoice = currentSequenceRef.current[currentIndexRef.current];
      console.log('[Voice Autoplay] Auto-playing next voice note:', nextVoice.messageId);
      
      // Play transition sound before next voice note
      await playTransitionSound();
      
      // Play next voice note after transition sound
      await playVoiceNote(nextVoice.messageId, nextVoice.attachmentIndex, true);
    } else {
      // Sequence ended
      console.log('[Voice Autoplay] Sequence ended');
      setPlayingState(null);
      audioRef.current = null;
      currentSequenceRef.current = [];
      currentIndexRef.current = 0;
    }
  }, [isPaused, playVoiceNote, playTransitionSound]);

  // Update ref after handleAudioEnd is defined
  useEffect(() => {
    handleAudioEndRef.current = handleAudioEnd;
  }, [handleAudioEnd]);

  /**
   * Pause current playback
   */
  const pausePlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPaused(true);
      autoplayEnabledRef.current = false;
    }
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  /**
   * Stop playback completely
   */
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    setPlayingState(null);
    setIsPaused(false);
    autoplayEnabledRef.current = false;
    userSeekedRef.current = false;
    currentSequenceRef.current = [];
    currentIndexRef.current = 0;
  }, []);

  /**
   * Seek to a specific time in the current audio
   * This cancels autoplay when user manually seeks
   */
  const seekTo = useCallback((time: number) => {
    if (!audioRef.current || !playingState) {
      return;
    }
    
    // Validate time is a finite number
    if (!isFinite(time) || time < 0) {
      console.warn('[Voice Autoplay] Invalid seek time:', time);
      return;
    }
    
    try {
      const duration = audioRef.current.duration;
      // Clamp time to valid range (only if duration is valid)
      const clampedTime = isFinite(duration) && duration > 0
        ? Math.max(0, Math.min(time, duration))
        : Math.max(0, time);
      
      audioRef.current.currentTime = clampedTime;
      
      // Update playing state
      setPlayingState(prev => prev ? {
        ...prev,
        currentTime: clampedTime,
      } : null);
      
      // Cancel autoplay when user manually seeks
      userSeekedRef.current = true;
      autoplayEnabledRef.current = false;
    } catch (error) {
      console.warn('[Voice Autoplay] Seek error:', error);
    }
  }, [playingState]);

  /**
   * Check if a specific voice note is currently playing
   */
  const isPlaying = useCallback(
    (messageId: string, attachmentIndex: number): boolean => {
      return (
        playingState !== null &&
        playingState.messageId === messageId &&
        playingState.attachmentIndex === attachmentIndex &&
        !isPaused
      );
    },
    [playingState, isPaused]
  );

  /**
   * Check if a voice note is in the current autoplay sequence
   */
  const isInSequence = useCallback(
    (messageId: string, attachmentIndex: number): boolean => {
      return currentSequenceRef.current.some(
        v => v.messageId === messageId && v.attachmentIndex === attachmentIndex
      );
    },
    []
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (transitionAudioRef.current) {
        transitionAudioRef.current.pause();
        transitionAudioRef.current = null;
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      setPlayingState(null);
      currentSequenceRef.current = [];
      currentIndexRef.current = 0;
    };
  }, []);

  return {
    playVoiceNote,
    pausePlayback,
    stopPlayback,
    seekTo,
    isPlaying,
    isInSequence,
    playingState,
    isPaused,
  };
}

