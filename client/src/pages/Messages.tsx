import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// @ts-ignore - Navbar is implemented in JavaScript (.jsx)
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useNotificationStore } from '../stores/notificationStore';
import { buyerInboxAPI, MessageThread, Message } from '../services/buyerInboxApi';
import { websocketService } from '../services/websocketService';
import { VoiceWaveform } from '../components/VoiceWaveform';
import { ImageLightbox } from '../components/ImageLightbox';
import ChatIndicator from '../components/ChatIndicator';
import ChatListIndicator from '../components/ChatListIndicator';
import { useVoiceNoteAutoplay } from '../hooks/useVoiceNoteAutoplay';
import { useGlobalChatIndicators } from '../hooks/useGlobalChatIndicators';
import type { ChatIndicator as ChatIndicatorType } from '../hooks/useGlobalChatIndicators';

// Get server base URL for file attachments
const getFileUrl = (path: string): string => {
  if (!path) return '';
  // If path already includes http, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Otherwise, prepend server base URL
  const serverBase = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${serverBase}${path.startsWith('/') ? path : '/' + path}`;
};

// Helper to resolve avatar URL (handles both full URLs and relative paths)
const resolveAvatarUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // If it's a relative path, prepend the API host
  const API_HOST = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${API_HOST}${url.startsWith('/') ? url : '/' + url}`;
};

import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Store,
  Package,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  ShoppingBag,
  Loader2,
  Plus,
  Mic,
  Play,
  X,
  Trash2,
  Edit2,
  Reply,
  Smile,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

type FilterType = 'all' | 'unread' | 'order' | 'seller' | 'support';

// Request browser notification permission (improved)
const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('[Notifications] Permission result:', permission);
      } catch (error) {
        console.error('[Notifications] Error requesting permission:', error);
      }
    } else if (Notification.permission === 'denied') {
      console.warn('[Notifications] Permission denied. User needs to enable notifications in browser settings.');
    } else {
      console.log('[Notifications] Permission already granted');
    }
  } else {
    console.warn('[Notifications] Browser does not support notifications');
  }
};

// Show browser notification (Instagram-style) with configurable timeout
const showNotification = (title: string, body: string, icon?: string, threadId?: string, timeout: number = 3000) => {
  console.log('[Notifications] Attempting to show notification:', { title, body, permission: Notification.permission, timeout });
  
  if (!('Notification' in window)) {
    console.warn('[Notifications] Browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      const notificationOptions: NotificationOptions = {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: threadId || 'message-notification',
        requireInteraction: false,
        silent: false,
      };

      // Add vibrate if supported (mobile)
      if ('vibrate' in navigator) {
        (notificationOptions as any).vibrate = [200, 100, 200];
      }

      const notification = new Notification(title, notificationOptions);
      console.log('[Notifications] Notification created successfully');

      // Store timeout ID to allow manual closing
      let timeoutId: NodeJS.Timeout | null = null;

      // Handle notification click - navigate to messages page
      notification.onclick = () => {
        console.log('[Notifications] Notification clicked, navigating to messages');
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        window.focus();
        const messagesUrl = threadId ? `/messages?threadId=${threadId}` : '/messages';
        window.location.href = messagesUrl;
        notification.close();
      };

      // Handle notification close
      notification.onclose = () => {
        console.log('[Notifications] Notification closed');
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      // Handle notification error
      notification.onerror = (error) => {
        console.error('[Notifications] Notification error:', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      // Auto-close after specified timeout (default 3 seconds, Instagram-style)
      timeoutId = setTimeout(() => {
        console.log('[Notifications] Notification timeout, closing...');
        notification.close();
        timeoutId = null;
      }, timeout);
    } catch (error) {
      console.error('[Notifications] Error creating notification:', error);
    }
  } else if (Notification.permission === 'default') {
    console.log('[Notifications] Permission not yet granted, requesting...');
    Notification.requestPermission().then((permission) => {
      console.log('[Notifications] Permission result:', permission);
      if (permission === 'granted') {
        // Retry showing notification after permission is granted
        showNotification(title, body, icon, threadId, timeout);
      }
    });
  } else {
    console.warn('[Notifications] Permission denied. User needs to enable notifications in browser settings.');
  }
};

export function Messages() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const { setUnreadCount } = useNotificationStore();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [newMessage, setNewMessage] = useState('');
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingSaved, setIsRecordingSaved] = useState(false);
  
  // Upload progress state
  const [, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [, setUploadErrors] = useState<Map<string, string>>(new Map());
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, File>>(new Map());
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [availableSellers, setAvailableSellers] = useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [newThreadSellerId, setNewThreadSellerId] = useState('');
  const [newThreadType, setNewThreadType] = useState<'rfq' | 'message' | 'order'>('message');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  
  // Real-time indicators state
  const [isRecordingIndicator, setIsRecordingIndicator] = useState(false);
  const [recordingUserId, setRecordingUserId] = useState<string | null>(null);
  const [recordingUserName, setRecordingUserName] = useState<string | null>(null);
  const [recordingDurationIndicator, setRecordingDurationIndicator] = useState(0);
  
  // Image lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Voice note autoplay hook
  const { playVoiceNote, pausePlayback, stopPlayback, seekTo, isPlaying, isInSequence, playingState } = useVoiceNoteAutoplay({
    messages,
    getFileUrl,
    onScrollToMessage: (messageId: string) => {
      // Scroll to message
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    },
  });
  
  // Message actions state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // For documents/files (.pdf, .docx, .webm)
  const imageInputRef = useRef<HTMLInputElement>(null); // For images (.jpg, .jpeg, .png)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingCompleteRef = useRef<((file: File) => void) | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null); // Store stream to keep it alive
  // Store chunks in ref to ensure they persist across function calls
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('audio/webm');

  const activeThread = useMemo(() => {
    return threads.find(t => t._id === selectedThread);
  }, [threads, selectedThread]);

  // Global chat indicators hook - manages indicators for ALL chats (open chat + chat list)
  // getUserName function to resolve user names for indicators
  const getUserNameForGlobal = useCallback((threadId: string, userId: string): string | null => {
    void userId;
    const thread = threads.find(t => t._id === threadId);
    if (!thread) return null;
    
    // For buyer inbox, the other user is always the seller
    if (typeof thread.sellerId === 'object' && thread.sellerId !== null) {
      return thread.sellerId.storeName || thread.sellerId.fullName || 'Seller';
    }
    return 'Seller';
  }, [threads]);

  const {
    getThreadIndicators,
    hasActiveIndicators,
  } = useGlobalChatIndicators({
    currentUserId: user?.id,
    getUserName: getUserNameForGlobal,
  });

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Load threads
  const loadThreads = useCallback(async (silent = false) => {
    try {
      // Check if user is available
      if (!user) {
        console.warn('[Load Threads] No user available, cannot load threads');
        setThreads([]);
        setLoading(false);
        return;
      }
      
      // Check if auth token exists
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.warn('[Load Threads] No auth token found in localStorage');
        setThreads([]);
        setLoading(false);
        return;
      }
      
      console.log('[Load Threads] Starting to load threads...', { 
        searchQuery, 
        filter,
        userId: user?.id,
        hasToken: !!token
      });
      setLoading(true);
      
      const typeFilter = filter === 'order' ? 'order' : filter === 'seller' ? 'message' : undefined;
      const params = {
        search: searchQuery || undefined,
        status: filter === 'unread' ? undefined : 'active',
        type: typeFilter,
        page: 1,
        limit: 50,
      };
      
      console.log('[Load Threads] API call params:', params);
      console.log('[Load Threads] Calling buyerInboxAPI.getThreads...');
      
      const response = await buyerInboxAPI.getThreads(params);
      
      console.log('[Load Threads] API response received:', response);
      console.log('[Load Threads] Threads count:', response.threads?.length || 0);
      console.log('[Load Threads] Threads data:', response.threads);
      
      if (response.threads && Array.isArray(response.threads)) {
        setThreads(response.threads);
        console.log('[Load Threads] Threads state updated with', response.threads.length, 'thread(s)');
      } else {
        console.warn('[Load Threads] Response.threads is not an array:', response.threads);
        setThreads([]);
      }
      
      // Clear any previous errors on success
      if (!silent) {
        console.log('[Load Threads] Successfully loaded', response.threads?.length || 0, 'thread(s)');
      }
    } catch (error: any) {
      console.error('[Load Threads] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        error: error,
      });
      // Only show toast if not silent retry
      if (!silent) {
        showToast(error.message || 'Failed to load conversations', 'error');
      }
      // Set empty array on error to prevent UI issues
      setThreads([]);
      // Re-throw to allow caller to handle
      throw error;
    } finally {
      setLoading(false);
      console.log('[Load Threads] Finished loading threads, loading state set to false');
    }
  }, [searchQuery, filter, showToast, user]);

  // Load thread messages
  const loadThreadMessages = useCallback(async (threadId: string) => {
    if (!threadId) {
      console.error('[Load Thread Messages] No thread ID provided');
      return;
    }
    
    try {
      console.log('[Load Thread Messages] Loading messages for thread:', threadId);
      const response = await buyerInboxAPI.getThread(threadId);
      console.log('[Load Thread Messages] Received', response.messages?.length || 0, 'message(s)');
      
      setMessages(response.messages || []);
      
      // Mark as read
      try {
        await buyerInboxAPI.markThreadAsRead(threadId);
      } catch (readError) {
        console.warn('[Load Thread Messages] Failed to mark as read:', readError);
        // Don't fail the whole operation if marking as read fails
      }
      
      // Join WebSocket room
      try {
        websocketService.joinThread(threadId);
      } catch (wsError) {
        console.warn('[Load Thread Messages] Failed to join WebSocket room:', wsError);
        // Don't fail the whole operation if WebSocket join fails
      }
      
      // Scroll to bottom within the messages container (not the whole page)
      setTimeout(() => {
        if (messagesContainerRef.current) {
          // Scroll within the container, not the whole page
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
          // Fallback: use scrollIntoView with 'nearest' to prevent page scroll
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // Focus the message input after loading messages
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 50);
      }, 150);
    } catch (error: any) {
      console.error('[Load Thread Messages] Error:', error);
      const errorMessage = error.message || 'Failed to load messages';
      showToast(errorMessage, 'error');
      setMessages([]);
      // Don't clear selectedThread on error, just show error message
    }
  }, [showToast]);

  // Send message
  const handleSendMessage = async () => {
    if (!selectedThread) return;
    if (sending) return;

    // Reset typing indicator when message is sent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Emit stop typing event when message is sent
    websocketService.sendTyping(selectedThread, false);
    setIsTyping(false);
    setTypingUserId(null);
    setTypingUserName(null);

    // Check if we have content or files to send (allow sending with just files/images/voice notes)
    const hasContent = newMessage.trim().length > 0;
    const hasFiles = selectedFiles.length > 0 || uploadedAttachments.length > 0;
    
    if (!hasContent && !hasFiles) {
      return; // Nothing to send
    }

    try {
      setSending(true);
      
      // Wait for any in-progress uploads to complete (max 10 seconds)
      const maxWaitTime = 10000; // 10 seconds
      const startTime = Date.now();
      while (uploadingFiles.size > 0 && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Upload remaining files if any (voice notes or files that weren't auto-uploaded)
      let attachments = [...uploadedAttachments];
      
      // Get all files that need to be uploaded (not in uploadedAttachments and not currently uploading)
      const filesToUpload = selectedFiles.filter(f => {
        const isUploaded = uploadedAttachments.some(a => a.originalName === f.name);
        const isUploading = Array.from(uploadingFiles.values()).some(uf => uf === f);
        return !isUploaded && !isUploading;
      });
      
      if (filesToUpload.length > 0) {
        try {
          console.log('[Send Message] Uploading', filesToUpload.length, 'file(s) before sending');
          const uploaded = await buyerInboxAPI.uploadFiles(
            filesToUpload,
            recordingDuration > 0 ? recordingDuration : undefined,
            (progress) => {
              setUploadProgress(prev => new Map(prev).set('sending', progress));
            }
          );
          
          if (uploaded && uploaded.length > 0) {
            attachments = [...attachments, ...uploaded];
            console.log('[Send Message] Successfully uploaded', uploaded.length, 'file(s)');
          } else {
            console.warn('[Send Message] Upload returned empty array');
          }
        } catch (error: any) {
          console.error('[Send Message] Upload error:', error);
          showToast('Failed to upload some files', 'error');
          throw error;
        }
      }

      // Validate: Must have either content OR attachments after upload
      const messageText = newMessage.trim();
      console.log('[Send Message] Validation - Content:', messageText.length > 0, 'Attachments:', attachments.length);
      
      if (!messageText && (!attachments || attachments.length === 0)) {
        console.error('[Send Message] Validation failed - no content and no attachments');
        showToast('Please add a message text, file, image, or voice note', 'error');
        setSending(false);
        return;
      }

      // Send message - WhatsApp style: allow empty content if attachments exist
      console.log('[Send Message] Sending message with', attachments.length, 'attachment(s)');
      const response = await buyerInboxAPI.sendMessage(selectedThread, {
        content: messageText || '', // Empty string is allowed if attachments exist
        attachments: attachments || [],
        replyTo: replyTo?._id,
      });

      // Optimistically add the sent message to the messages array immediately
      if (response.message) {
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some(m => m._id === response.message._id)) {
            return prev;
          }
          return [...prev, response.message];
        });
        
        // Update thread list immediately to show the new message preview
        setThreads((prevThreads) => {
          return prevThreads.map((thread) => {
            if (thread._id === selectedThread) {
              // Generate preview from message content or attachments
              let preview = messageText || '';
              if (!preview && attachments.length > 0) {
                const firstAtt = attachments[0];
                if (firstAtt.type === 'voice') {
                  preview = '🎤 Voice note';
                } else if (firstAtt.type === 'image') {
                  preview = '📷 Image';
                } else {
                  preview = `📎 ${firstAtt.originalName || 'File'}`;
                }
                if (attachments.length > 1) {
                  preview += ` (+${attachments.length - 1} more)`;
                }
              }
              preview = preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
              
              return {
                ...thread,
                lastMessageAt: new Date().toISOString(),
                lastMessagePreview: preview,
                buyerUnreadCount: 0, // Sender has read their own message
              };
            }
            return thread;
          }).sort((a, b) => {
            // Sort by lastMessageAt descending
            const aTime = new Date(a.lastMessageAt).getTime();
            const bTime = new Date(b.lastMessageAt).getTime();
            return bTime - aTime;
          });
        });
      }

      setNewMessage('');
      setSelectedFiles([]);
      setUploadedAttachments([]);
      setRecordingDuration(0);
      setIsRecording(false);
      setIsRecordingSaved(false);
      setUploadProgress(new Map());
      setUploadErrors(new Map());
      setUploadingFiles(new Map());
      
      // Only reload messages for the current thread (thread list is already updated optimistically)
      await loadThreadMessages(selectedThread);
      // NOTE: Removed loadThreads() call to prevent unnecessary chat list refresh
      // The thread list is already updated optimistically above (lines 504-538)
      
      // Scroll to bottom within the messages container (not the whole page)
      setTimeout(() => {
        if (messagesContainerRef.current) {
          // Scroll within the container, not the whole page
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
          // Fallback: use scrollIntoView with 'nearest' to prevent page scroll
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
      
      // Show toast first, then refocus input
      showToast('Message sent', 'success');
      
      // Refocus the message input field after sending (with longer delay to ensure toast doesn't interfere)
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
          // Prevent any page-level scrolling - just focus, don't scroll
          // The input is already visible in the viewport, so no need to scroll
        }
      }, 250);
    } catch (error: any) {
      console.error('[Send Message] Error:', error);
      // Extract error message - check if it's a validation error
      let errorMessage = error.message || 'Failed to send message';
      
      // If error has a response with validation details, show the main message
      if (error.response || (error.message && error.message.includes('Validation error'))) {
        try {
          // Try to parse if it's a JSON string
          if (typeof error.message === 'string' && error.message.includes('Validation error')) {
            errorMessage = error.message.replace('Validation error: ', '');
          }
        } catch (e) {
          // Keep original message if parsing fails
        }
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const handleEditMessage = async (message: Message, newContent: string) => {
    if (!selectedThread) return;
    try {
      await buyerInboxAPI.editMessage(selectedThread, message._id, newContent);
      await loadThreadMessages(selectedThread);
      setEditingMessage(null);
      showToast('Message updated', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to edit message', 'error');
    }
  };

  // Delete message
  const handleDeleteMessage = async (message: Message) => {
    if (!selectedThread) return;
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      await buyerInboxAPI.deleteMessage(selectedThread, message._id);
      await loadThreadMessages(selectedThread);
      showToast('Message deleted', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete message', 'error');
    }
  };

  // React to message
  const handleReactToMessage = async (message: Message, emoji: string) => {
    if (!selectedThread) return;
    try {
      await buyerInboxAPI.reactToMessage(selectedThread, message._id, emoji);
      await loadThreadMessages(selectedThread);
    } catch (error: any) {
      showToast(error.message || 'Failed to react', 'error');
    }
  };

  // Handle file selection with auto-upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalFiles = files.length + selectedFiles.length + uploadedAttachments.length;
    if (totalFiles > 5) {
      showToast('Maximum 5 files allowed', 'error');
      return;
    }
    
    // Add files to selected list
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    
    // Auto-upload files (except voice notes which are handled separately)
    for (const file of files) {
      if (!file.name.startsWith('voice-')) {
        await uploadFileWithProgress(file);
      }
    }
    
    // Clear input
    if (e.target) {
      e.target.value = '';
    }
  };
  
  // Upload file with progress tracking
  const uploadFileWithProgress = async (file: File) => {
    const fileId = `${file.name}-${Date.now()}`;
    setUploadingFiles(prev => new Map(prev).set(fileId, file));
    setUploadProgress(prev => new Map(prev).set(fileId, 0));
    setUploadErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
    
  try {
      const uploaded = await buyerInboxAPI.uploadFiles(
        [file],
        undefined,
        (progress) => {
          setUploadProgress(prev => new Map(prev).set(fileId, progress));
        }
      );
      
      if (uploaded.length > 0) {
        setUploadedAttachments(prev => [...prev, ...uploaded]);
        setSelectedFiles(prev => prev.filter(f => f !== file));
      }
      
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });
      setUploadProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadErrors(prev => new Map(prev).set(fileId, error.message || 'Upload failed'));
      showToast(`Failed to upload ${file.name}`, 'error');
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      console.log('[Voice Recording] Requesting microphone access...');
      
      // Clear previous chunks
      recordingChunksRef.current = [];
      
      // A) Recording setup - Use compatible getUserMedia config
      // Simplified constraints for better browser compatibility
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Don't force channelCount or sampleRate - let browser choose optimal settings
        }
      });
      
      // Store stream in ref to keep it alive until recording stops
      recordingStreamRef.current = stream;
      
      console.log('[Voice Recording] Microphone access granted, stream active:', stream.active);
      const audioTracks = stream.getAudioTracks();
      console.log('[Voice Recording] Audio tracks:', audioTracks.map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
        settings: t.getSettings()
      })));
      
      // Verify track is active and not muted
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available');
      }
      
      const audioTrack = audioTracks[0];
      if (audioTrack.muted) {
        console.warn('[Voice Recording] WARNING: Audio track is muted!');
        audioTrack.enabled = true;
      }
      
      // Ensure track is active
      if (audioTrack.readyState !== 'live') {
        console.warn('[Voice Recording] WARNING: Audio track is not live!');
      }
      
      // A) MediaRecorder MUST use a supported codec with fallbacks
      // CRITICAL: Use audio/webm;codecs=opus for best compatibility and quality
      let mimeType = '';
      let extension = 'webm';
      
      // Try different formats in order of preference
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
        extension = 'webm';
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
        extension = 'webm';
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
        extension = 'ogg';
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
        extension = 'm4a';
      } else {
        // Fallback - let browser choose
        mimeType = ""; // Empty string lets browser choose best format
        extension = 'webm';
        console.warn('[Voice Recording] Using browser default format');
      }
      
      console.log('[Voice Recording] Using mime type:', mimeType || 'browser default', 'extension:', extension);
      
      // Store mime type and extension in ref
      recordingMimeTypeRef.current = mimeType;
      
      // Create MediaRecorder with supported codec
      // If mimeType is empty, browser will choose best format
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
      // CRITICAL: Get the actual mimeType used by MediaRecorder
      const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
      console.log('[Voice Recording] MediaRecorder actual mimeType:', actualMimeType);
      recordingMimeTypeRef.current = actualMimeType;
      
      console.log('[Voice Recording] MediaRecorder created with mimeType:', mimeType);
      console.log('[Voice Recording] MediaRecorder state:', mediaRecorder.state);
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Collect data chunks - use timeslice to ensure regular data collection
      // CRITICAL: Store chunks in ref to ensure they persist across function calls
      mediaRecorder.ondataavailable = (e) => {
        console.log('[Voice Recording] Data available, chunk size:', e.data.size, 'bytes');
        if (e.data && e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
          const totalSize = recordingChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          console.log('[Voice Recording] Chunk added. Total chunks:', recordingChunksRef.current.length, 'Total size:', totalSize, 'bytes');
        } else {
          console.warn('[Voice Recording] WARNING: Received empty chunk!');
        }
      };
      
      mediaRecorder.onerror = (e) => {
        console.error('[Voice Recording] MediaRecorder error:', e);
        console.error('[Voice Recording] Error event:', e);
        showToast('Recording error occurred', 'error');
      };
      
      mediaRecorder.onstop = () => {
        console.log('[Voice Recording] Recording stopped');
        console.log('[Voice Recording] Total chunks collected:', recordingChunksRef.current.length);
        console.log('[Voice Recording] Chunks sizes:', recordingChunksRef.current.map(c => c.size));
        
        const totalSize = recordingChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('[Voice Recording] Total chunks size:', totalSize, 'bytes');
        
        // CRITICAL: Verify we have chunks before creating blob
        if (recordingChunksRef.current.length === 0) {
          console.error('[Voice Recording] ERROR: No chunks collected!');
          showToast('Recording failed: No audio data captured', 'error');
          
          if (recordingStreamRef.current) {
            recordingStreamRef.current.getTracks().forEach(track => track.stop());
            recordingStreamRef.current = null;
          }
          
          recordingChunksRef.current = [];
          if (recordingCompleteRef.current) {
            recordingCompleteRef.current(null as any);
            recordingCompleteRef.current = null;
          }
          return;
        }
        
        // A) On stop, properly build blob and file
        // CRITICAL: Use MediaRecorder's actual mimeType if available, otherwise use stored ref
        const mimeType = mediaRecorderRef.current?.mimeType || recordingMimeTypeRef.current || 'audio/webm';
        console.log('[Voice Recording] Using mimeType for blob:', mimeType);
        
        // CRITICAL: Create blob from all chunks with correct mimeType
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        console.log('[Voice Recording] Final blob size:', blob.size, 'bytes');
        console.log('[Voice Recording] Blob type:', blob.type);
        console.log('[Voice Recording] Blob chunks used:', recordingChunksRef.current.length);
        
        // Verify blob is not empty
        if (blob.size === 0) {
          console.error('[Voice Recording] ERROR: Blob is empty! No audio data captured.');
          console.error('[Voice Recording] Chunks count:', recordingChunksRef.current.length);
          console.error('[Voice Recording] Total chunks size:', totalSize);
          showToast('Recording failed: No audio data captured', 'error');
          
          // A) Ensure stream tracks stop after recording ends
          if (recordingStreamRef.current) {
            recordingStreamRef.current.getTracks().forEach(track => track.stop());
            recordingStreamRef.current = null;
          }
          
          recordingChunksRef.current = [];
          if (recordingCompleteRef.current) {
            recordingCompleteRef.current(null as any);
            recordingCompleteRef.current = null;
          }
          return;
        }
        
        // Additional validation: blob should be at least 1KB for a meaningful recording
        if (blob.size < 1024) {
          console.warn('[Voice Recording] WARNING: Blob size is very small:', blob.size, 'bytes. This might indicate a problem.');
        }
        
        // Determine file extension based on mime type
        let extension = 'webm';
        if (mimeType.includes('ogg')) extension = 'ogg';
        else if (mimeType.includes('mp4') || mimeType.includes('m4a')) extension = 'm4a';
        else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) extension = 'mp3';
        else if (mimeType.includes('wav')) extension = 'wav';
        
        // A) Properly build file with correct name and type
        const file = new File([blob], `voicenote-${Date.now()}.${extension}`, { type: mimeType });
        console.log('[Voice Recording] File created:', file.name, 'size:', file.size, 'bytes', 'type:', file.type);
        
        // Verify file size matches blob size
        if (file.size !== blob.size) {
          console.error('[Voice Recording] ERROR: File size mismatch! Blob:', blob.size, 'File:', file.size);
        }
        
        // CRITICAL: Test local playback before adding to files
        // Create a temporary audio element to test playback
        const testAudio = new Audio();
        const testUrl = URL.createObjectURL(blob);
        testAudio.src = testUrl;
        testAudio.volume = 1.0;
        testAudio.muted = false;
        
        // Helper function to clean up and add file
        const addFileAndCleanup = () => {
          URL.revokeObjectURL(testUrl);
        
        // Add file to selected files
        setSelectedFiles((prev) => [...prev, file]);
          
          // Show "saved" status
          setIsRecordingSaved(true);
          setTimeout(() => setIsRecordingSaved(false), 2000);
        
        // A) Ensure stream tracks stop after recording ends (but only after blob is created)
          // CRITICAL: Don't stop stream until blob is fully created and tested
        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log('[Voice Recording] Audio track stopped:', track.label);
          });
          recordingStreamRef.current = null;
        }
        
        // Clear chunks after use (but keep them until file is created)
        recordingChunksRef.current = [];
        
        // Call the completion callback if set
        if (recordingCompleteRef.current) {
          recordingCompleteRef.current(file);
          recordingCompleteRef.current = null;
        }
        };
        
        // Test if audio can be loaded and played
        testAudio.onloadedmetadata = () => {
          console.log('[Voice Recording] Audio test - Duration:', testAudio.duration, 'seconds');
          console.log('[Voice Recording] Audio test - Ready to play');
          addFileAndCleanup();
        };
        
        testAudio.onerror = (e) => {
          console.error('[Voice Recording] Audio test failed:', e, testAudio.error);
          showToast('Warning: Audio file may not play correctly', 'warning');
          // Still add the file - it might work on other browsers
          addFileAndCleanup();
        };
        
        // Timeout after 2 seconds
        setTimeout(() => {
          if (testAudio.readyState === 0) {
            console.warn('[Voice Recording] Audio test timeout - proceeding anyway');
            addFileAndCleanup();
          }
        }, 2000);
        
        // Load the audio
        testAudio.load();
      };
      
      // Start recording with timeslice to ensure regular data collection
      // CRITICAL: Use timeslice (100ms) for better chunk collection
      // This ensures we capture audio data more frequently
      mediaRecorder.start(100);
      console.log('[Voice Recording] MediaRecorder started, state:', mediaRecorder.state);
      console.log('[Voice Recording] Recording started with 100ms timeslice');
      console.log('[Voice Recording] MediaRecorder mimeType:', mediaRecorder.mimeType);
      
      // Verify MediaRecorder is in recording state
      if (mediaRecorder.state !== 'recording') {
        console.error('[Voice Recording] ERROR: MediaRecorder not in recording state! State:', mediaRecorder.state);
        throw new Error('Failed to start recording');
      }
      
      // Verify stream is still active
      if (!stream.active) {
        console.error('[Voice Recording] ERROR: Stream is not active!');
        throw new Error('Stream is not active');
      }
      
      // Log audio track settings to verify recording
      const track = stream.getAudioTracks()[0];
      console.log('[Voice Recording] Audio track settings:', track.getSettings());
      console.log('[Voice Recording] Audio track constraints:', track.getConstraints());
      
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Send recording indicator to other users
      if (selectedThread) {
        websocketService.sendRecording(selectedThread, true, 0);
      }
      
      // Update recording duration and send updates to WebSocket
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          // Send duration update to WebSocket every second
          if (selectedThread) {
            websocketService.sendRecording(selectedThread, true, newDuration);
          }
          return newDuration;
        });
      }, 1000);
    } catch (error: any) {
      console.error('[Voice Recording] getUserMedia error:', error);
      console.error('[Voice Recording] Error name:', error.name);
      console.error('[Voice Recording] Error message:', error.message);
      console.error('[Voice Recording] Error stack:', error.stack);
      
      // Clear chunks and stop stream on error
      recordingChunksRef.current = [];
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
      }
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        showToast('Microphone permission denied. Please allow microphone access.', 'error');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        showToast('No microphone found. Please connect a microphone.', 'error');
      } else {
        showToast(`Failed to start recording: ${error.message}`, 'error');
      }
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      const currentDuration = recordingDuration;
      const hasText = newMessage.trim().length > 0;
      
      console.log('[Voice Recording] Stopping recording, duration:', currentDuration, 'seconds');
      console.log('[Voice Recording] MediaRecorder state before stop:', mediaRecorderRef.current.state);
      console.log('[Voice Recording] Total chunks before stop:', recordingChunksRef.current.length);
      
      // CRITICAL: Request final data chunk before stopping to ensure all audio is captured
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          console.log('[Voice Recording] Requesting final data chunk...');
          mediaRecorderRef.current.requestData();
          // Wait longer to ensure final data chunk is collected and processed
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log('[Voice Recording] Final data requested, chunks count:', recordingChunksRef.current.length);
        }
      } catch (error) {
        console.warn('[Voice Recording] Warning: Could not request final data:', error);
      }
      
      // Stop the MediaRecorder - onstop handler will process chunks
      // CRITICAL: Wait for onstop to complete before proceeding
      if (mediaRecorderRef.current.state === 'recording') {
        console.log('[Voice Recording] Stopping MediaRecorder...');
        mediaRecorderRef.current.stop();
        
        // Wait a bit for onstop handler to process
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Auto-send voice note if no text content (WhatsApp style)
      if (currentDuration > 0 && !hasText) {
        // Wait for recording to finish and get the file
        const recordedFile = await new Promise<File>((resolve) => {
          recordingCompleteRef.current = resolve;
        });
        
        if (recordedFile && selectedThread) {
          // Auto-upload and send the voice note
          try {
            const uploaded = await buyerInboxAPI.uploadFiles(
              [recordedFile],
              currentDuration,
              (progress) => {
                setUploadProgress(prev => new Map(prev).set('voice-sending', progress));
              }
            );
            
            // Send message with voice note only
            if (uploaded.length > 0) {
              const response = await buyerInboxAPI.sendMessage(selectedThread, {
                content: '',
                attachments: uploaded,
              });
              
              // Optimistically add the sent voice note to the messages array immediately
              if (response.message) {
                setMessages((prev) => {
                  if (prev.some(m => m._id === response.message._id)) {
                    return prev;
                  }
                  return [...prev, response.message];
                });
                
                // Update thread list immediately
                setThreads((prevThreads) => {
                  return prevThreads.map((thread) => {
                    if (thread._id === selectedThread) {
        return {
                        ...thread,
                        lastMessageAt: new Date().toISOString(),
                        lastMessagePreview: '🎤 Voice note',
                        buyerUnreadCount: 0,
                      };
                    }
                    return thread;
                  }).sort((a, b) => {
                    const aTime = new Date(a.lastMessageAt).getTime();
                    const bTime = new Date(b.lastMessageAt).getTime();
                    return bTime - aTime;
                  });
                });
              }
              
              // Clear voice note files
              setSelectedFiles(prev => prev.filter(f => f !== recordedFile));
              setUploadedAttachments([]);
              setRecordingDuration(0);
              setUploadProgress(new Map());
              
              // Only reload messages for the current thread (thread list is already updated optimistically)
              await loadThreadMessages(selectedThread);
              // NOTE: Removed loadThreads() call to prevent unnecessary chat list refresh
              
              // Scroll to bottom
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                } else {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }, 100);
              
              showToast('Voice note sent', 'success');
            }
          } catch (error: any) {
            showToast(error.message || 'Failed to send voice note', 'error');
          }
        }
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setSelectedFiles(prev => prev.filter(file => !file.name.startsWith('voice-')));
      
      // Stop recording indicator
      if (selectedThread) {
        websocketService.sendRecording(selectedThread, false);
      }
    }
  };

  const formatRecordingDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Load available sellers
  const loadAvailableSellers = async () => {
    try {
      setLoadingSellers(true);
      const response = await buyerInboxAPI.getSellers();
      setAvailableSellers(response.sellers || []);
    } catch (error: any) {
      console.error('Load sellers error:', error);
    } finally {
      setLoadingSellers(false);
    }
  };

  // Create new thread
  const handleCreateThread = async () => {
    if (!newThreadSubject.trim() || !newThreadSellerId) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    try {
      const response = await buyerInboxAPI.createThread({
        sellerId: newThreadSellerId,
        subject: newThreadSubject,
        type: newThreadType,
      });

      setShowNewThreadDialog(false);
      setNewThreadSubject('');
      setNewThreadSellerId('');
      setNewThreadType('message');

      await loadThreadMessages(response.thread._id);
      setSelectedThread(response.thread._id);
      await loadThreads();
      
      showToast('Conversation started', 'success');
    } catch (error: any) {
      console.error('Create thread error:', error);
      const errorMessage = error.message || 'Failed to create conversation';
      if (!errorMessage.includes('Network error') && !errorMessage.includes('Failed to fetch')) {
        showToast(errorMessage, 'error');
      }
    }
  };

  // Format time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Filter threads
  const filteredThreads = useMemo(() => {
    let filtered = threads.filter(t => t.status === 'active');
    
    if (filter === 'unread') {
      filtered = filtered.filter(t => t.buyerUnreadCount > 0);
    } else if (filter === 'order') {
      filtered = filtered.filter(t => t.type === 'order');
    } else if (filter === 'seller') {
      filtered = filtered.filter(t => t.type === 'message');
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(t =>
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (typeof t.sellerId === 'object' && t.sellerId.fullName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort: chats with active indicators first, then by lastMessageAt
    return filtered.sort((a, b) => {
      const aHasIndicators = hasActiveIndicators(a._id);
      const bHasIndicators = hasActiveIndicators(b._id);
      
      // Priority: chats with active indicators go to top
      if (aHasIndicators && !bHasIndicators) return -1;
      if (!aHasIndicators && bHasIndicators) return 1;
      
      // If both have or both don't have indicators, sort by lastMessageAt
      const aTime = new Date(a.lastMessageAt).getTime();
      const bTime = new Date(b.lastMessageAt).getTime();
      return bTime - aTime;
    });
  }, [threads, filter, searchQuery, hasActiveIndicators]);

  const totalUnread = useMemo(() => {
    return threads.reduce((sum, t) => sum + t.buyerUnreadCount, 0);
  }, [threads]);

  // Update global notification count when unread count changes
  useEffect(() => {
    setUnreadCount(totalUnread);
  }, [totalUnread, setUnreadCount]);

  // Update document title with unread count
  useEffect(() => {
    const baseTitle = 'Messages';
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = baseTitle; // Reset on unmount
    };
  }, [totalUnread]);

  // WebSocket setup - FIXED to handle real-time messages properly
  useEffect(() => {
    websocketService.connect();

    // Handle new messages - FIXED: Always update messages if thread is active
    websocketService.onNewMessage = (threadId: string, message: any) => {
      // Clear recording indicator when a message is received in the active thread
      // This ensures the indicator disappears when the user sends their voice note or any message
      if (selectedThread === threadId && isRecordingIndicator) {
        // Check if the message is from the user who was recording, or if it's a voice note
        const messageSenderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
        const isVoiceNote = message.attachments && message.attachments.some((att: any) => att.type === 'voice');
        
        // Clear indicator if: message is from recording user OR it's a voice note (recording completed)
        if (messageSenderId === recordingUserId || isVoiceNote) {
          setIsRecordingIndicator(false);
          setRecordingUserId(null);
          setRecordingUserName(null);
          setRecordingDurationIndicator(0);
        }
      }
      
      // Update messages if this is the active thread
      if (selectedThread === threadId) {
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some(m => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });
        // Scroll within messages container, not the whole page
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
      }
      
      // Update thread list immediately to show the new message preview
      setThreads((prevThreads) => {
        const updatedThreads = prevThreads.map((thread) => {
          if (thread._id === threadId) {
            // Generate preview from message content or attachments
            let preview = message.content || '';
            if (!preview && message.attachments && message.attachments.length > 0) {
              const firstAtt = message.attachments[0];
              if (firstAtt.type === 'voice') {
                preview = '🎤 Voice note';
              } else if (firstAtt.type === 'image') {
                preview = '📷 Image';
              } else {
                preview = `📎 ${firstAtt.originalName || 'File'}`;
              }
              if (message.attachments.length > 1) {
                preview += ` (+${message.attachments.length - 1} more)`;
              }
            }
            preview = preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
            
            return {
              ...thread,
              lastMessageAt: new Date().toISOString(),
              lastMessagePreview: preview,
              // Update unread count based on sender
              ...(message.senderType === 'seller' ? { buyerUnreadCount: (thread.buyerUnreadCount || 0) + 1 } : { buyerUnreadCount: 0 }),
            };
          }
          return thread;
        });
        
        // Sort by lastMessageAt descending (most recent first)
        return updatedThreads.sort((a, b) => {
          const aTime = new Date(a.lastMessageAt).getTime();
          const bTime = new Date(b.lastMessageAt).getTime();
          return bTime - aTime;
        });
      });
      
      // NOTE: Removed loadThreads() call - optimistic update is sufficient, prevents UI flicker
      
      // Show notification if message is from seller
      // Show notification if: (1) not in active thread OR (2) page is not focused (user is on another tab/window)
      if (message.senderType === 'seller') {
        const thread = threads.find(t => t._id === threadId);
        const sellerName = typeof thread?.sellerId === 'object' 
          ? (thread.sellerId.storeName || thread.sellerId.fullName || 'Seller')
          : 'Seller';
        
        // Show notification if not in active thread OR if page is not focused
        const shouldNotify = selectedThread !== threadId || !document.hasFocus();
        
        if (shouldNotify) {
          const messagePreview = message.content || (message.attachments && message.attachments.length > 0 
            ? (message.attachments[0].type === 'voice' ? '🎤 Voice note' 
               : message.attachments[0].type === 'image' ? '📷 Image' 
               : `📎 ${message.attachments[0].originalName || 'File'}`)
            : 'New message');
          
          showNotification(
            sellerName,
            messagePreview.substring(0, 50) + (messagePreview.length > 50 ? '...' : ''),
            typeof thread?.sellerId === 'object' ? (resolveAvatarUrl(thread.sellerId.avatarUrl) || undefined) : undefined,
            threadId,
            3000 // 3 second timeout (Instagram-style)
          );
        }
        
        // Only show toast if not in active thread
        if (selectedThread !== threadId) {
          showToast(`New message from ${sellerName}`, 'info');
        }
      }
    };

    // Handle thread updates
    websocketService.onThreadUpdate = (threadId: string, update?: any, lastMessage?: any) => {
      // Update messages if this is the active thread
      if (selectedThread === threadId && lastMessage) {
        // If we have a lastMessage, add it to messages
        setMessages((prev) => {
          if (prev.some(m => m._id === lastMessage._id)) {
            return prev;
          }
          const newMessages = [...prev, lastMessage];
          // Auto-scroll for voice notes and new messages (within container, not whole page)
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            } else {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 100);
          return newMessages;
        });
      }
      
      // Update thread list immediately
      if (update) {
        setThreads((prevThreads) => {
          const updatedThreads = prevThreads.map((thread) => {
            if (thread._id === threadId) {
              return {
                ...thread,
                ...update,
                lastMessageAt: update.lastMessageAt || thread.lastMessageAt,
              };
            }
            return thread;
          });
          
          // Sort by lastMessageAt descending (most recent first)
          return updatedThreads.sort((a, b) => {
            const aTime = new Date(a.lastMessageAt).getTime();
            const bTime = new Date(b.lastMessageAt).getTime();
            return bTime - aTime;
          });
        });
      }
      
      // NOTE: Removed loadThreads() call - optimistic update is sufficient, prevents UI flicker
    };

    // Handle typing indicators
    websocketService.onUserTyping = (threadId: string, userId: string, userName: string, isTyping: boolean) => {
      if (selectedThread === threadId && userId !== user?.id) {
        setIsTyping(isTyping);
        setTypingUserId(userId);
        setTypingUserName(userName || null);
        if (!isTyping) {
          setTimeout(() => {
            setIsTyping(false);
            setTypingUserId(null);
            setTypingUserName(null);
          }, 2000);
        }
      }
    };

    // Handle recording indicators
    websocketService.onUserRecording = (threadId: string, userId: string, isRecording: boolean, duration?: number) => {
      if (selectedThread === threadId && userId !== user?.id) {
        if (isRecording) {
          setIsRecordingIndicator(true);
          setRecordingUserId(userId);
          // Get user name from thread
          const thread = threads.find(t => t._id === threadId);
          const userName = typeof thread?.sellerId === 'object' 
            ? (thread.sellerId.storeName || thread.sellerId.fullName || 'Someone')
            : 'Someone';
          setRecordingUserName(userName);
          // Update duration if provided
          if (duration !== undefined) {
            setRecordingDurationIndicator(duration);
          }
        } else {
          // Stop recording indicator immediately
          setIsRecordingIndicator(false);
          setRecordingUserId(null);
          setRecordingUserName(null);
          setRecordingDurationIndicator(0);
        }
      }
    };

    return () => {
      // Reset typing indicator when leaving conversation
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setIsTyping(false);
      setTypingUserId(null);
      setTypingUserName(null);
      
      // Reset recording indicator when leaving conversation
      setIsRecordingIndicator(false);
      setRecordingUserId(null);
      setRecordingUserName(null);
      setRecordingDurationIndicator(0);
      
      if (selectedThread) {
        // Send stop typing before leaving thread
        websocketService.sendTyping(selectedThread, false);
        websocketService.leaveThread(selectedThread);
      }
    };
  }, [selectedThread, loadThreads, threads, user?.id, showToast]);

  // Join thread when selected
  useEffect(() => {
    // Reset typing indicator when switching conversations
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    setTypingUserId(null);
    setTypingUserName(null);
    
    // Reset recording indicator when switching conversations
    setIsRecordingIndicator(false);
    setRecordingUserId(null);
    setRecordingUserName(null);
    setRecordingDurationIndicator(0);
    
    if (selectedThread) {
      console.log('[useEffect] Selected thread changed to:', selectedThread);
      // Load messages for the selected thread
      loadThreadMessages(selectedThread).catch((error) => {
        console.error('[useEffect] Failed to load thread messages:', error);
      });
    } else {
      // Clear messages when no thread is selected
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread]); // Only depend on selectedThread to avoid infinite loops (loadThreadMessages is stable)

  // Initial load - only if user is logged in
  useEffect(() => {
  if (!user) {
      console.log('[Initial Load] User not logged in, skipping thread load');
      return;
    }
    
    console.log('[Initial Load] User is logged in, loading threads...', { 
      userId: user?.id, 
      userEmail: user?.email 
    });
    
    const loadInitialThreads = async () => {
      try {
        console.log('[Initial Load] Calling loadThreads...');
        await loadThreads();
        console.log('[Initial Load] loadThreads completed successfully');
      } catch (error: any) {
        console.error('[Initial Load] Failed to load threads on mount:', error);
        console.error('[Initial Load] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
        
        // Retry once after a short delay if it's a network error
        if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('connection')) {
          console.log('[Initial Load] Network error detected, retrying in 2 seconds...');
          setTimeout(async () => {
            try {
              console.log('[Initial Load] Retrying loadThreads...');
              await loadThreads(true); // Silent retry
              console.log('[Initial Load] Retry successful');
            } catch (retryError: any) {
              console.error('[Initial Load] Retry also failed:', retryError);
            }
          }, 2000);
        }
      }
    };
    
    // Small delay to ensure auth token is available
    const timer = setTimeout(() => {
      loadInitialThreads();
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Run when user changes (login/logout)

  // Detect when internet connection is restored and retry loading threads
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network] Internet connection restored, retrying to load threads...');
      // Retry loading threads when internet comes back (silently to avoid duplicate toasts)
      loadThreads(true).then(() => {
        console.log('[Network] Successfully loaded threads after connection restored');
        showToast('Connection restored', 'success');
      }).catch((error) => {
        console.error('[Network] Retry failed:', error);
        // Only show error if it's not a network error (to avoid duplicate messages)
        if (!error.message?.includes('internet') && !error.message?.includes('connection')) {
          showToast(error.message || 'Failed to load threads', 'error');
        }
      });
    };

    const handleOffline = () => {
      console.log('[Network] Internet connection lost');
      showToast('No internet connection', 'error');
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already online and threads failed to load
    if (navigator.onLine && threads.length === 0 && !loading) {
      // Small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        console.log('[Network] Already online, checking if threads need to be loaded...');
        loadThreads(true).catch((error) => {
          console.error('[Network] Initial load failed:', error);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadThreads, threads.length, loading, showToast]);

  // Auto-select thread from URL parameter or first thread
  useEffect(() => {
    const threadIdFromUrl = searchParams.get('threadId');
    
    if (threadIdFromUrl) {
      // Check if the thread exists in the loaded threads
      const threadExists = threads.some(t => t._id === threadIdFromUrl);
      if (threadExists) {
        console.log('[Auto-select] Selecting thread from URL:', threadIdFromUrl);
        setSelectedThread(threadIdFromUrl);
        // Remove threadId from URL after selecting
        searchParams.delete('threadId');
        setSearchParams(searchParams, { replace: true });
      } else if (threads.length > 0) {
        // Thread not found, clear the URL parameter
        console.warn('[Auto-select] Thread not found in loaded threads:', threadIdFromUrl);
        searchParams.delete('threadId');
        setSearchParams(searchParams, { replace: true });
      }
    } else if (!selectedThread && filteredThreads.length > 0) {
      // No thread ID in URL, select first thread
      setSelectedThread(filteredThreads[0]._id);
    }
  }, [selectedThread, filteredThreads, threads, searchParams, setSearchParams]);

  // Scroll to bottom (only when thread changes or messages are loaded initially)
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    }
  }, [selectedThread]); // Only scroll when thread changes, not on every message update

  // Typing indicator
  /**
   * Handle typing indicator with proper debounce
   * - Emits typing event when user starts typing (input not empty)
   * - Uses 400ms debounce before sending "stop typing" event
   * - Prevents flickering with proper state management
   */
  const handleTyping = () => {
    if (!selectedThread) return;
    
    const hasContent = newMessage.trim().length > 0;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // If input has content, emit typing started event
    if (hasContent) {
      // Emit typing event: { senderId, receiverId, isTyping: true }
      websocketService.sendTyping(selectedThread, true);
      
      // Set timeout to emit stop typing after 400ms of no typing (debounce)
      typingTimeoutRef.current = setTimeout(() => {
        // Emit typing event: { senderId, receiverId, isTyping: false }
        websocketService.sendTyping(selectedThread, false);
      }, 400); // 400ms debounce to prevent flickering
    } else {
      // Input is empty, immediately emit stop typing
      websocketService.sendTyping(selectedThread, false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log('[Messages] No user found, redirecting to login...');
    navigate('/login');
    }
  }, [user, navigate]);
  
  if (!user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-primary">
      <Navbar />

      <main className="w-full px-3 sm:px-4 lg:px-6 xl:px-8 pt-20 pb-3 sm:pb-4 lg:pb-6">
        {/* Header - Responsive */}
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
                {totalUnread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-orange-500 text-white text-xs sm:text-sm font-bold">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => {
                  loadAvailableSellers();
                  setShowNewThreadDialog(true);
                }}
                className="gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                size="sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">New Conversation</span>
                <span className="sm:hidden">New</span>
              </Button>
              <Link to="/products" className="hidden sm:block">
                <Button variant="outline" className="gap-2 text-xs sm:text-sm" size="sm">
                  <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden md:inline">Continue Shopping</span>
                  <span className="md:hidden">Shop</span>
              </Button>
            </Link>
            </div>
          </div>

          {/* Search and Filters - Responsive */}
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All', icon: MessageSquare },
                  { id: 'unread', label: 'Unread', icon: AlertCircle },
                  { id: 'order', label: 'Orders', icon: Package },
                  { id: 'seller', label: 'Sellers', icon: Store },
                ].map((filterOption) => {
                  const Icon = filterOption.icon;
                  return (
                    <button
                      key={filterOption.id}
                      onClick={() => setFilter(filterOption.id as FilterType)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap active:scale-95 ${
                        filter === filterOption.id
                          ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      {filterOption.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Layout - WhatsApp Style - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr] gap-3 sm:gap-4 lg:gap-6" style={{ height: 'calc(100vh - 240px)', minHeight: '500px' }}>
          {/* Conversations List - WhatsApp Style - Hidden on mobile when thread selected */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 ${selectedThread ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
                  Chats
              </h2>
                <button
                  onClick={() => {
                    loadAvailableSellers();
                    setShowNewThreadDialog(true);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95"
                  title="New conversation"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search or start new chat"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">No conversations found</p>
                  <Button
                    onClick={() => {
                      loadAvailableSellers();
                      setShowNewThreadDialog(true);
                    }}
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Start Conversation
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredThreads.map((thread) => {
                    const seller = typeof thread.sellerId === 'object' ? thread.sellerId : null;
                    const isActive = selectedThread === thread._id;
                    return (
                    <button
                        key={thread._id}
                      type="button"
                        onClick={() => {
                          // Set selected thread - useEffect will handle loading messages
                          console.log('[Thread Click] Selecting thread:', thread._id);
                          setSelectedThread(thread._id);
                        }}
                        className={`w-full p-2.5 sm:p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${
                          isActive ? 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-teal-500 overflow-hidden">
                              {seller?.avatarUrl && seller.avatarUrl.trim() ? (
                              <img
                                  src={resolveAvatarUrl(seller.avatarUrl) || seller.avatarUrl}
                                  alt={seller.fullName || seller.storeName || 'Seller'}
                                className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // If profile image fails to load, show first letter (avatar)
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const name = seller?.fullName || seller?.storeName || 'S';
                                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white font-bold text-lg">${name[0].toUpperCase()}</div>`;
                                    }
                                  }}
                              />
                            ) : (
                                // No profile image, use first letter (avatar)
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                  {(seller?.fullName || seller?.storeName || 'S')[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                            {thread.type === 'order' && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                              <Package className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                {seller?.storeName || seller?.fullName || thread.subject}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                                {formatMessageTime(thread.lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            {/* Show indicator OR last message preview */}
                            {(() => {
                              const threadIndicators = getThreadIndicators(thread._id);
                              const activeIndicator = threadIndicators.find((ind: ChatIndicatorType) => ind.isTyping || ind.isRecording);
                              
                              if (activeIndicator) {
                                // Show indicator instead of last message preview
                                return (
                                  <div className="flex-1 min-w-0">
                                    <ChatListIndicator
                                      isTyping={activeIndicator.isTyping}
                                      isRecording={activeIndicator.isRecording}
                                      recordingDuration={activeIndicator.recordingDuration}
                                      userName={activeIndicator.userName}
                                      className="truncate"
                                    />
                                  </div>
                                );
                              }
                              
                              // Show last message preview when no indicator
                              return (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                                {thread.lastMessagePreview || 'No messages yet'}
                              </p>
                              );
                            })()}
                              {thread.buyerUnreadCount > 0 && (
                                <span className="bg-orange-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 min-w-[20px]">
                                  {thread.buyerUnreadCount > 9 ? '9+' : thread.buyerUnreadCount}
                              </span>
                            )}
                          </div>
                            {thread.type === 'order' && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <Package className="h-3 w-3" />
                                <span>Order</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area - WhatsApp Style - Responsive */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-lg flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 ${selectedThread ? 'flex' : 'hidden lg:flex'}`}>
            {activeThread ? (
              <>
                {/* Chat Header - WhatsApp Style - Responsive */}
                <div className="p-2.5 sm:p-3 md:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Back button for mobile */}
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95 flex-shrink-0"
                      aria-label="Back to conversations"
                    >
                      <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-teal-500 overflow-hidden">
                        {typeof activeThread.sellerId === 'object' && activeThread.sellerId.avatarUrl && activeThread.sellerId.avatarUrl.trim() ? (
                          <img
                            src={resolveAvatarUrl(activeThread.sellerId.avatarUrl) || activeThread.sellerId.avatarUrl}
                            alt={activeThread.sellerId.storeName || activeThread.sellerId.fullName || 'Seller'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If profile image fails to load, show first letter (avatar)
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const name = typeof activeThread.sellerId === 'object' 
                                  ? (activeThread.sellerId.storeName || activeThread.sellerId.fullName || 'S')
                                  : 'S';
                                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white font-bold">${name[0].toUpperCase()}</div>`;
                              }
                            }}
                          />
                        ) : (
                          // No profile image, use first letter (avatar)
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {(typeof activeThread.sellerId === 'object' ? (activeThread.sellerId.storeName || activeThread.sellerId.fullName || 'S') : 'S')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      {/* Online status indicator */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      {activeThread.type === 'order' && (
                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                          <Package className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {typeof activeThread.sellerId === 'object' 
                            ? (activeThread.sellerId.storeName || activeThread.sellerId.fullName || 'Seller')
                            : 'Seller'}
                        </h3>
                        <span className="text-[10px] text-green-500">●</span>
                      </div>
                      {/* Typing Indicator - Show under receiver's name in header (WhatsApp style) */}
                      {isTyping && typingUserId ? (
                        <div className="flex items-center gap-1.5 mt-0.5 animate-fadeIn transition-opacity duration-200">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-1 h-1 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                            {typingUserName || (typeof activeThread.sellerId === 'object' ? (activeThread.sellerId.storeName || activeThread.sellerId.fullName) : 'Someone')} is typing...
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate animate-fadeIn transition-opacity duration-200">{activeThread.subject}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="rounded-full">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages - WhatsApp Style - Responsive */}
                <div 
                  ref={messagesContainerRef} 
                  className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 bg-[#efeae2] dark:bg-gray-900/50" 
                  style={{ 
                    maxHeight: '100%',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4d4d4\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                  }}
                >
                  {messages.map((message, index) => {
                    const isOwnMessage = message.senderType === 'buyer';
                    const showDate = index === 0 || 
                      formatMessageDate(message.createdAt) !== formatMessageDate(messages[index - 1].createdAt);
                    const sender = typeof message.senderId === 'object' ? message.senderId : null;
                    const isDeleted = message.isDeleted;
                    
                    return (
                      <div key={message._id}>
                        {showDate && (
                          <div className="text-center my-4">
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full inline-block">
                              {formatMessageDate(message.createdAt)}
                            </span>
                          </div>
                        )}
                        <div className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          {!isOwnMessage && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-teal-500 overflow-hidden flex-shrink-0">
                              {sender?.avatarUrl && sender.avatarUrl.trim() ? (
                                <img
                                  src={resolveAvatarUrl(sender.avatarUrl) || ''}
                                  alt={sender.fullName || 'Seller'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // If profile image fails to load, show first letter (avatar)
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const name = sender?.fullName || 'S';
                                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-xs font-bold">${name[0].toUpperCase()}</div>`;
                                    }
                                  }}
                                />
                              ) : (
                                // No profile image, use first letter (avatar)
                                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                  {(sender?.fullName || 'S')[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            )}
                            <div
                            className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] ${isOwnMessage ? 'items-end' : 'items-start'}`}
                            onTouchStart={(e) => {
                              const touch = e.touches[0];
                              const target = e.currentTarget;
                              const startX = touch.clientX;
                              const startY = touch.clientY;
                              let moved = false;
                              
                              const onTouchMove = (moveEvent: TouchEvent) => {
                                const currentTouch = moveEvent.touches[0];
                                const deltaX = currentTouch.clientX - startX;
                                const deltaY = Math.abs(currentTouch.clientY - startY);
                                
                                // Only allow horizontal swipe (not vertical scroll)
                                if (Math.abs(deltaX) > 10 && deltaY < 50) {
                                  moved = true;
                                  // Visual feedback - slight shift
                                  target.style.transform = `translateX(${Math.min(deltaX, 50)}px)`;
                                  target.style.transition = 'transform 0.1s';
                                }
                              };
                              
                              const onTouchEnd = () => {
                                const finalTouch = (e.nativeEvent as TouchEvent).changedTouches[0];
                                const deltaX = finalTouch.clientX - startX;
                                
                                if (moved && deltaX > 50 && !isOwnMessage) {
                                  // Swipe right to reply (only for received messages)
                                  setReplyTo(message);
                                  showToast('Replying to message', 'info');
                                }
                                
                                // Reset transform
                                target.style.transform = '';
                                target.style.transition = '';
                                
                                document.removeEventListener('touchmove', onTouchMove);
                                document.removeEventListener('touchend', onTouchEnd);
                              };
                              
                              document.addEventListener('touchmove', onTouchMove);
                              document.addEventListener('touchend', onTouchEnd);
                            }}
                          >
                            <div
                              className={`rounded-2xl px-3 py-2 shadow-sm ${
                                isOwnMessage
                                  ? 'bg-[#dcf8c6] dark:bg-green-700 text-gray-900 dark:text-white rounded-br-sm'
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm shadow-md'
                              }`}
                              style={{
                                boxShadow: isOwnMessage 
                                  ? '0 1px 2px rgba(0,0,0,0.1)' 
                                  : '0 1px 2px rgba(0,0,0,0.1)'
                              }}
                            >
                              {/* Sender name with avatar for received messages */}
                              {!isOwnMessage && sender && (
                                <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-gray-200 dark:border-gray-700">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-teal-500 flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0 overflow-hidden">
                                    {sender.avatarUrl && sender.avatarUrl.trim() ? (
                                      <img
                                        src={sender.avatarUrl}
                                        alt={sender.fullName || 'Seller'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          // If profile image fails to load, show first letter (avatar)
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent) {
                                            const name = sender.fullName || 'S';
                                            parent.textContent = name[0].toUpperCase();
                                          }
                                        }}
                                      />
                                    ) : (
                                      // No profile image, use first letter (avatar)
                                      (sender.fullName || 'S')[0].toUpperCase()
                                    )}
                                  </div>
                                  <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                                    {sender.fullName || 'Seller'}
                                  </span>
                                </div>
                              )}
                              {isDeleted ? (
                                <span className="italic text-gray-500 dark:text-gray-400 text-sm">This message was deleted</span>
                              ) : editingMessage?._id === message._id ? (
                                <input
                                  type="text"
                                  defaultValue={message.content}
                                  onBlur={(e) => {
                                    if (e.target.value !== message.content) {
                                      handleEditMessage(message, e.target.value);
                                    }
                                    setEditingMessage(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditMessage(message, e.currentTarget.value);
                                      setEditingMessage(null);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingMessage(null);
                                    }
                                  }}
                                  className="w-full bg-transparent border-none outline-none text-sm"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  {message.replyTo && (
                                    <div className={`mb-2 px-2 py-1.5 rounded-lg border-l-4 ${
                                      isOwnMessage 
                                        ? 'bg-white/30 dark:bg-white/10 border-white/50' 
                                        : 'bg-gray-100 dark:bg-gray-700/50 border-orange-500'
                                    }`}>
                                      <div className="flex items-center gap-1.5 mb-0.5">
                                        <Reply className={`w-3 h-3 ${isOwnMessage ? 'text-white/80' : 'text-orange-500'}`} />
                                        <span className={`text-[10px] font-semibold ${isOwnMessage ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}`}>
                                          {typeof message.replyTo === 'object' && message.replyTo.senderId 
                                            ? (typeof message.replyTo.senderId === 'object' 
                                                ? message.replyTo.senderId.fullName || 'User'
                                                : 'User')
                                            : 'You'}
                                        </span>
                                      </div>
                                      <p className={`text-[11px] line-clamp-2 ${isOwnMessage ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {typeof message.replyTo === 'object' 
                                          ? (message.replyTo.content || ((message.replyTo as any).attachments && (message.replyTo as any).attachments.length > 0 ? '📎 Attachment' : 'Message'))
                                          : 'Message'}
                                      </p>
                                    </div>
                                  )}
                                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                      {message.attachments.map((attachment, idx) => (
                                        <div key={idx}>
                                          {attachment.type === 'voice' ? (
                                            <div 
                                              id={`message-${message._id}`}
                                              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                                                isPlaying(message._id, idx)
                                                  ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500'
                                                  : isInSequence(message._id, idx)
                                                  ? 'bg-orange-50 dark:bg-orange-900/10 border border-orange-300 dark:border-orange-700'
                                                  : 'bg-black/10 dark:bg-white/10'
                                              }`}
                                            >
                                              <button
                                                onClick={async () => {
                                                  const currentlyPlaying = isPlaying(message._id, idx);
                                                  
                                                  if (currentlyPlaying) {
                                                    // Pause if currently playing
                                                    pausePlayback();
                                                          } else {
                                                    // Stop any current playback and start new one
                                                    stopPlayback();
                                                    await playVoiceNote(message._id, idx, true);
                                                  }
                                                }}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all flex-shrink-0 relative ${
                                                  isPlaying(message._id, idx)
                                                    ? 'bg-orange-600 hover:bg-orange-700 animate-pulse shadow-lg'
                                                    : 'bg-orange-500 hover:bg-orange-600'
                                                }`}
                                                title={isPlaying(message._id, idx) ? 'Pause playback' : 'Play voice note (autoplay enabled)'}
                                              >
                                                {isPlaying(message._id, idx) ? (
                                                  <>
                                                    <X className="w-4 h-4" />
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-400 rounded-full animate-ping" />
                                                  </>
                                                ) : (
                                                  <Play className="w-4 h-4 ml-0.5" />
                                                )}
                                              </button>
                                              <div className="flex-1 min-w-0">
                                                {/* Interactive waveform with scrubbing */}
                                                <VoiceWaveform
                                                  duration={attachment.duration || (playingState?.messageId === message._id && playingState?.attachmentIndex === idx ? playingState.duration : 0)}
                                                  currentTime={playingState?.messageId === message._id && playingState?.attachmentIndex === idx ? playingState.currentTime : 0}
                                                  isPlaying={isPlaying(message._id, idx)}
                                                  onSeek={(time) => {
                                                    if (playingState?.messageId === message._id && playingState?.attachmentIndex === idx) {
                                                      seekTo(time);
                                                    }
                                                  }}
                                                  onSeekStart={() => {
                                                    // Cancel autoplay when user starts seeking
                                                    if (playingState?.messageId === message._id && playingState?.attachmentIndex === idx) {
                                                      pausePlayback();
                                                    }
                                                  }}
                                                  className="mb-1"
                                                  waveformColor="rgb(249 115 22)" // orange-500
                                                  progressColor="rgb(234 88 12)" // orange-600
                                                  />
                                                <div className="flex items-center gap-2 justify-between">
                                                  <span className="text-[10px] text-gray-600 dark:text-gray-400">
                                                    {attachment.duration ? `${Math.floor(attachment.duration)}s` : 'Voice'}
                                                  </span>
                                                  {isInSequence(message._id, idx) && !isPlaying(message._id, idx) && (
                                                    <span className="text-[8px] text-orange-500 dark:text-orange-400 opacity-75">
                                                      (in queue)
                                                    </span>
                                                  )}
                                                </div>
                                                {/* Hidden audio element for backward compatibility */}
                                                <audio 
                                                  id={`audio-${message._id}-${idx}`}
                                                  src={getFileUrl(attachment.path)} 
                                                  className="hidden"
                                                  preload="auto"
                                                  crossOrigin="anonymous"
                                                />
                                              </div>
                                            </div>
                                          ) : attachment.type === 'image' ? (
                                            <div className="mt-2 -mx-1 -my-1 first:mt-0">
                                              <img
                                                src={getFileUrl(attachment.path)}
                                                alt={attachment.originalName}
                                                className="max-w-[200px] sm:max-w-[300px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                                onClick={() => setLightboxImage(getFileUrl(attachment.path))}
                                                loading="lazy"
                                                onError={(e) => {
                                                  console.error('Image load error:', attachment.path);
                                                  (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                              />
                                            </div>
                                          ) : (
                                            <a
                                              href={getFileUrl(attachment.path)}
                                              download={attachment.originalName}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors mt-2"
                                              onClick={(e) => {
                                                // Force download
                                                const link = document.createElement('a');
                                                link.href = getFileUrl(attachment.path);
                                                link.download = attachment.originalName;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                e.preventDefault();
                                              }}
                                            >
                                              <FileText className="h-4 w-4 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <span className="text-xs font-medium block truncate">{attachment.originalName}</span>
                                                {attachment.size && (
                                                  <span className="text-[10px] text-gray-600 dark:text-gray-400">
                                                    {(attachment.size / 1024).toFixed(1)} KB
                                                  </span>
                                                )}
                                              </div>
                                            </a>
                                          )}
                                    </div>
                                  ))}
                                </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className={`flex items-center gap-1 px-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {new Date(message.createdAt).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: false
                                })}
                              </span>
                              {message.isEdited && <span className="text-[10px] italic opacity-75 text-gray-500 dark:text-gray-400">(edited)</span>}
                              {isOwnMessage && (
                                <>
                                  <span className="text-[10px]">
                                    {message.status === 'read' ? (
                                    <CheckCheck className="h-3 w-3 text-blue-500" />
                                    ) : message.status === 'delivered' ? (
                                      <CheckCheck className="h-3 w-3 text-gray-400" />
                                  ) : (
                                    <Check className="h-3 w-3 text-gray-400" />
                                  )}
                                </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleReactToMessage(message, '👍')}
                                      className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                                      title="React"
                                    >
                                      <Smile className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setReplyTo(message)}
                                      className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                                      title="Reply"
                                    >
                                      <Reply className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setEditingMessage(message)}
                                      className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(message)}
                                      className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded text-red-500 transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </>
                              )}
                              {!isOwnMessage && message.reactions && message.reactions.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {message.reactions.map((reaction, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] bg-black/20 dark:bg-white/20 px-1.5 py-0.5 rounded"
                                    >
                                      {reaction.emoji}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          {isOwnMessage && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-500 overflow-hidden flex-shrink-0">
                              {user.avatar_url && user.avatar_url.trim() ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.full_name || user.email || 'You'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // If profile image fails to load, show first letter (avatar)
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const name = user.full_name || user.email || 'U';
                                      parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-white text-xs font-bold">${name.charAt(0).toUpperCase()}</div>`;
                                    }
                                  }}
                                />
                              ) : (
                                // No profile image, use first letter (avatar)
                              <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                  {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Typing Indicator in messages area */}
                  {isTyping && typingUserId && (
                    <div className="flex gap-2 justify-start py-2">
                      <ChatIndicator 
                        status="typing" 
                        userName={typingUserName || (typeof activeThread?.sellerId === 'object' ? (activeThread.sellerId.storeName || activeThread.sellerId.fullName) : 'Someone')}
                        position="below"
                        className="ml-2"
                      />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input - WhatsApp Style - Responsive */}
                <div className="p-2 sm:p-2.5 md:p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  {/* Typing Indicator - Show above input area (WhatsApp style) */}
                  {isTyping && typingUserId && (
                    <ChatIndicator 
                      status="typing" 
                      userName={typingUserName || (typeof activeThread?.sellerId === 'object' ? (activeThread.sellerId.storeName || activeThread.sellerId.fullName) : 'Someone')}
                      position="above"
                      className="mb-2"
                    />
                  )}
                  {/* Recording Indicator - Show above input area (WhatsApp style) */}
                  {/* Show indicator when OTHER user is recording (receiver sees this) */}
                  {isRecordingIndicator && recordingUserId && (
                    <ChatIndicator 
                      status="recording" 
                      userName={recordingUserName || (typeof activeThread?.sellerId === 'object' ? (activeThread.sellerId.storeName || activeThread.sellerId.fullName) : 'Someone')}
                      duration={recordingDurationIndicator}
                      position="above"
                      className="mb-2"
                    />
                  )}
                  {replyTo && (
                    <div className="mb-2 p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-orange-500 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Reply className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                            {typeof replyTo.senderId === 'object' 
                              ? (replyTo.senderId.fullName || 'User')
                              : 'User'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">
                          {replyTo.content || (replyTo.attachments && replyTo.attachments.length > 0 ? '📎 Attachment' : 'Message')}
                        </p>
                      </div>
                      <button 
                        onClick={() => setReplyTo(null)} 
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Cancel reply"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    {/* File input for documents - accepts: text, word, spreadsheets, presentations, PDF, data files, archives, etc. */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".txt,.rtf,.doc,.docx,.odt,.xls,.xlsx,.ods,.ppt,.pptx,.odp,.pdf,.epub,.mobi,.csv,.json,.xml,.yaml,.yml,.sql,.zip,.rar,.7z,.tar,.gz,.md,.tex,.log,.webm"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {/* Image input for images - accepts: .jpg, .jpeg, .png */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,image/jpeg,image/jpg,image/png"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {/* Recording Mode UI - Show SEND button for voice note */}
                    {isRecording ? (
                      <>
                        <button
                          onClick={cancelRecording}
                          className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-red-500 flex-shrink-0 transition-colors"
                          title="Cancel recording"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="flex-1 flex items-center justify-between bg-white dark:bg-gray-800 border-2 border-red-500 rounded-full px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-red-500">
                              Recording: {formatRecordingDuration(recordingDuration)}
                            </span>
                          </div>
                          {/* SEND button for voice note - always visible when recording */}
                          <button
                            onClick={async () => {
                              // Stop recording first, then send
                              if (mediaRecorderRef.current && isRecording) {
                                const currentDuration = recordingDuration;
                                mediaRecorderRef.current.stop();
                                setIsRecording(false);
                                if (recordingIntervalRef.current) {
                                  clearInterval(recordingIntervalRef.current);
                                }
                                
                                // Wait for recording to finish and get the file
                                const recordedFile = await new Promise<File>((resolve) => {
                                  recordingCompleteRef.current = resolve;
                                });
                                
                                if (recordedFile && selectedThread) {
                                  // Auto-upload and send the voice note
                                  try {
                                    setSending(true);
                                    const uploaded = await buyerInboxAPI.uploadFiles(
                                      [recordedFile],
                                      currentDuration,
                                      (progress) => {
                                        setUploadProgress(prev => new Map(prev).set('voice-sending', progress));
                                      }
                                    );
                                    
                                    // Send message with voice note only
                                    if (uploaded.length > 0) {
                                      const response = await buyerInboxAPI.sendMessage(selectedThread, {
                                        content: '',
                                        attachments: uploaded,
                                      });
                                      
                                      // Optimistically add the sent voice note to the messages array immediately
                                      if (response.message) {
                                        setMessages((prev) => {
                                          if (prev.some(m => m._id === response.message._id)) {
                                            return prev;
                                          }
                                          return [...prev, response.message];
                                        });
                                        
                                        // Update thread list immediately
                                        setThreads((prevThreads) => {
                                          return prevThreads.map((thread) => {
                                            if (thread._id === selectedThread) {
                                              return {
                                                ...thread,
                                                lastMessageAt: new Date().toISOString(),
                                                lastMessagePreview: '🎤 Voice note',
                                                buyerUnreadCount: 0,
                                              };
                                            }
                                            return thread;
                                          }).sort((a, b) => {
                                            const aTime = new Date(a.lastMessageAt).getTime();
                                            const bTime = new Date(b.lastMessageAt).getTime();
                                            return bTime - aTime;
                                          });
                                        });
                                      }
                                      
                                      // Clear voice note files and reset UI
                                      setSelectedFiles(prev => prev.filter(f => f !== recordedFile));
                                      setUploadedAttachments([]);
                                      setRecordingDuration(0);
                                      setUploadProgress(new Map());
                                      
                                      // Only reload messages for the current thread (thread list is already updated optimistically)
                                      await loadThreadMessages(selectedThread);
                                      // NOTE: Removed loadThreads() call to prevent unnecessary chat list refresh
                                      
                                      // Scroll to bottom
                                      setTimeout(() => {
                                        if (messagesContainerRef.current) {
                                          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                                        } else {
                                          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                        }
                                      }, 100);
                                      
                                      showToast('Voice note sent', 'success');
                                    }
                                  } catch (error: any) {
                                    showToast(error.message || 'Failed to send voice note', 'error');
                                  } finally {
                                    setSending(false);
                                  }
                                }
                              }
                            }}
                            disabled={sending || recordingDuration === 0}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex-shrink-0 transition-colors"
                            title="Send voice note"
                          >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Normal Mode UI - WhatsApp Style with Media Preview Inside */}
                        <div className="flex-1 relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-300 dark:border-gray-600 overflow-hidden">
                          {/* Media Preview - WhatsApp Style: Show inside text field area */}
                          {(selectedFiles.length > 0 || uploadedAttachments.length > 0) && (
                            <div className="px-3 pt-2 pb-1 border-b border-gray-200 dark:border-gray-700">
                              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {/* Show uploaded attachments (images/files) */}
                                {uploadedAttachments.map((attachment, idx) => (
                                  <div key={`uploaded-${idx}`} className="relative group">
                                    {attachment.type === 'image' ? (
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                                        <img
                                          src={getFileUrl(attachment.path)}
                                          alt={attachment.originalName}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                        <button
                                          onClick={() => {
                                            setUploadedAttachments(prev => prev.filter((_, i) => i !== idx));
                                            setSelectedFiles(prev => prev.filter(f => f.name !== attachment.originalName));
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md"
                                          title="Remove"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : attachment.type === 'voice' ? (
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        <div className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] text-white font-medium text-center">
                                          {attachment.duration ? `${Math.floor(attachment.duration)}s` : 'Voice'}
                                        </div>
                                        <button
                                          onClick={() => {
                                            setUploadedAttachments(prev => prev.filter((_, i) => i !== idx));
                                            setSelectedFiles(prev => prev.filter(f => !f.name.startsWith('voice-')));
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md"
                                          title="Remove"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600">
                                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400" />
                                        <span className="text-[7px] text-gray-600 dark:text-gray-300 text-center px-1 truncate w-full mt-0.5">
                                          {attachment.originalName}
                                        </span>
                                        <button
                                          onClick={() => {
                                            setUploadedAttachments(prev => prev.filter((_, i) => i !== idx));
                                            setSelectedFiles(prev => prev.filter(f => f.name !== attachment.originalName));
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md"
                                          title="Remove"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {/* Show selected files (not yet uploaded) */}
                                {selectedFiles.filter(f => !uploadedAttachments.some(a => a.originalName === f.name)).map((file, idx) => (
                                  <div key={`selected-${idx}`} className="relative group">
                                    {file.type.startsWith('image/') ? (
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                                        <img
                                          src={URL.createObjectURL(file)}
                                          alt={file.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                        <button
                                          onClick={() => {
                                            const fileIndex = selectedFiles.findIndex(f => f === file);
                                            setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md"
                                          title="Remove"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : file.name.startsWith('voice-') || file.type.startsWith('audio/') ? (
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                                        <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                        <div className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] text-white font-medium text-center">
                                          {recordingDuration > 0 ? `${recordingDuration}s` : 'Voice'}
                                        </div>
                                        <button
                                          onClick={() => {
                                            const fileIndex = selectedFiles.findIndex(f => f === file);
                                            setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md"
                                          title="Remove"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600">
                                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400" />
                                        <span className="text-[7px] text-gray-600 dark:text-gray-300 text-center px-1 truncate w-full mt-0.5">
                                          {file.name}
                                        </span>
                                        <button
                                          onClick={() => {
                                            const fileIndex = selectedFiles.findIndex(f => f === file);
                                            setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md"
                                          title="Remove"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Recording Indicator - Show above input when recording */}
                          {isRecording && (
                            <div className="mb-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                              <div className="relative flex items-center justify-center">
                                <Mic className="w-4 h-4 text-red-500" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                              </div>
                              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                Recording: {formatRecordingDuration(recordingDuration)}
                              </span>
                              <div className="ml-auto flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                              </div>
                            </div>
                          )}
                          {/* Saved Status Indicator */}
                          {isRecordingSaved && (
                            <div className="mb-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 animate-fadeIn">
                              <div className="relative flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-500" />
                              </div>
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                Voice note saved
                              </span>
                            </div>
                          )}
                          {/* Text Input Area */}
                          <div className="relative flex items-center">
                      <textarea
                        ref={messageInputRef}
                        value={newMessage}
                              onChange={(e) => {
                                setNewMessage(e.target.value);
                                handleTyping();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              placeholder={
                                isRecording 
                                  ? `Recording... ${formatRecordingDuration(recordingDuration)}` 
                                  : selectedFiles.length > 0 || uploadedAttachments.length > 0 
                                    ? "Add a caption (optional)" 
                                    : "Type a message"
                              }
                        rows={1}
                              className={`w-full px-4 py-2.5 pr-20 rounded-lg bg-transparent text-sm focus:outline-none resize-none max-h-32 overflow-y-auto transition-colors ${
                                isRecording
                                  ? 'text-red-600 dark:text-red-400 placeholder-red-400 dark:placeholder-red-500 border-2 border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
                                  : (selectedFiles.length > 0 || uploadedAttachments.length > 0) && !newMessage.trim()
                                    ? 'text-red-500 dark:text-red-400 placeholder-red-400 dark:placeholder-red-500 border-red-300 dark:border-red-600'
                                    : 'text-gray-900 dark:text-white'
                              }`}
                              style={{ minHeight: '44px' }}
                              disabled={isRecording}
                            />
                            {/* Icons inside input - WhatsApp Style - Show when no media or show alongside media */}
                            {!newMessage.trim() && uploadedAttachments.length === 0 && selectedFiles.length === 0 && (
                              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                {/* File picker button - opens document picker */}
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                                  title="Attach file (documents, spreadsheets, PDFs, archives, etc.)"
                                >
                                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                {/* Image picker button - opens image picker */}
                                <button
                                  onClick={() => imageInputRef.current?.click()}
                                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                                  title="Attach image (.jpg, .jpeg, .png)"
                                >
                                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button
                                  onMouseDown={startRecording}
                                  onMouseUp={stopRecording}
                                  onTouchStart={startRecording}
                                  onTouchEnd={stopRecording}
                                  className={`p-2 rounded-lg transition-all active:scale-95 relative ${
                                    isRecording 
                                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                                      : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-500'
                                  }`}
                                  title={isRecording ? `Recording... ${formatRecordingDuration(recordingDuration)}` : "Hold to record voice note"}
                                >
                                  <Mic className={`w-4 h-4 sm:w-5 sm:h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                                  {isRecording && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white dark:border-gray-800 animate-ping" />
                                  )}
                                </button>
                    </div>
                            )}
                            {/* Show attachment icons when media is selected (for adding more) */}
                            {(selectedFiles.length > 0 || uploadedAttachments.length > 0) && (
                              <div className="absolute right-2 bottom-2 flex items-center gap-0.5 sm:gap-1">
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                                  title="Add more files"
                                >
                                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Send button - Show when typing OR when media is selected (WhatsApp style: can send media without text) */}
                        {(newMessage.trim() || uploadedAttachments.length > 0 || selectedFiles.length > 0) && (
                          <button
                      onClick={handleSendMessage}
                            disabled={sending}
                            className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex-shrink-0 transition-colors shadow-md active:scale-95"
                            title="Send message"
                          >
                            {sending ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#efeae2] dark:bg-gray-900/50">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select a conversation</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose a conversation from the list to start messaging</p>
                  <Button
                    onClick={() => {
                      loadAvailableSellers();
                      setShowNewThreadDialog(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Start New Conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Thread Dialog */}
      <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreateThread();
            }}
            className="space-y-4 mt-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Seller
              </label>
              {loadingSellers ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              ) : (
                <select
                  value={newThreadSellerId}
                  onChange={(e) => setNewThreadSellerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select a seller...</option>
                  {availableSellers.map((seller) => (
                    <option key={seller._id} value={seller._id}>
                      {seller.storeName || seller.fullName} ({seller.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={newThreadSubject}
                onChange={(e) => setNewThreadSubject(e.target.value)}
                placeholder="e.g., Question about product availability"
                className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={newThreadType}
                onChange={(e) => setNewThreadType(e.target.value as 'rfq' | 'message' | 'order')}
                className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="message">General Message</option>
                <option value="rfq">RFQ (Request for Quote)</option>
                <option value="order">Order Related</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewThreadDialog(false);
                  setNewThreadSubject('');
                  setNewThreadSellerId('');
                  setNewThreadType('message');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newThreadSubject.trim() || !newThreadSellerId || loadingSellers}
              >
                {loadingSellers ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Create Conversation'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxImage !== null}
        imageUrl={lightboxImage || ''}
        onClose={() => setLightboxImage(null)}
      />

      <footer className="text-center py-8 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800 mt-8">
        © 2026 Reaglex. All rights reserved.
      </footer>
    </div>
  );
}
