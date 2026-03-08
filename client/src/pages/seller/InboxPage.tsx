import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageCircle,
  Search,
  Filter,
  Mail,
  User,
  AlertCircle,
  Paperclip,
  Mic,
  Send,
  Smile,
  Edit2,
  Trash2,
  Reply,
  Image as ImageIcon,
  FileText,
  Play,
  X,
  Loader2,
  Plus,
  Check,
  Bell,
  ClipboardList,
  DollarSign,
  CheckCircle2,
  Archive,
  Tag,
  Phone,
  Video,
  Pin,
  MoreHorizontal,
  ChevronDown,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { inboxAPI, Message, MessageThread, MessageAttachment } from '@/services/inboxApi';
import { websocketService } from '@/services/websocketService';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AudioWave } from '@/components/AudioWave';
import { VoiceWaveform } from '@/components/VoiceWaveform';
import { ImageLightbox } from '@/components/ImageLightbox';
import { UploadProgress } from '@/components/UploadProgress';
import ChatIndicator from '@/components/ChatIndicator';
import ChatListIndicator from '@/components/ChatListIndicator';
import { useVoiceNoteAutoplay } from '@/hooks/useVoiceNoteAutoplay';
import { useGlobalChatIndicators } from '@/hooks/useGlobalChatIndicators';
import type { ChatIndicator as ChatIndicatorType } from '@/hooks/useGlobalChatIndicators';

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
  const API_HOST = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${API_HOST}${url.startsWith('/') ? url : '/' + url}`;
};

function LiveTimestamp({ timestamp }: { timestamp: string }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(timestamp).getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (minutes < 1) setTime('Just now');
      else if (minutes < 60) setTime(`${minutes}m`);
      else if (hours < 24) setTime(`${hours}h`);
      else if (days < 7) setTime(`${days}d`);
      else setTime(new Date(timestamp).toLocaleDateString());
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [timestamp]);
  return <span>{time || 'Just now'}</span>;
}

const InboxPage: React.FC = () => {
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const { setUnreadCount } = useNotificationStore();
  
  // State
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [mailboxFilter, setMailboxFilter] = useState<'all' | 'unread' | 'rfq' | 'negotiations' | 'resolved' | 'archived'>('all');
  const [listFilterPill, setListFilterPill] = useState<'all' | 'buyers' | 'unread' | 'rfq'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [notificationBannerDismissed, setNotificationBannerDismissed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chats' | 'messages'>('chats');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [stats, setStats] = useState<{ totalThreads: number; unreadThreads: number; activeThreads: number; archivedThreads: number } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMessageAlert, setNewMessageAlert] = useState(false);
  const [newMessageFromName, setNewMessageFromName] = useState<string | null>(null);
  const [highlightThreadId, setHighlightThreadId] = useState<string | null>(null);
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(new Set());
  
  // Message composer state
  const [messageContent, setMessageContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<MessageAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecordingSaved, setIsRecordingSaved] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [uploadErrors, setUploadErrors] = useState<Map<string, string>>(new Map());
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, File>>(new Map());
  
  // New thread dialog state
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [newThreadBuyerId, setNewThreadBuyerId] = useState('');
  const [newThreadType, setNewThreadType] = useState<'rfq' | 'message' | 'order'>('message');
  const [availableBuyers, setAvailableBuyers] = useState<any[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  
  // Image lightbox state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Voice note autoplay hook
  const { playVoiceNote, pausePlayback, stopPlayback, seekTo, isPlaying, isInSequence, playingState, isPaused } = useVoiceNoteAutoplay({
    messages,
    getFileUrl,
    onScrollToMessage: (messageId: string) => {
      // Scroll to message
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    },
  });
  
  // Legacy audio playing state (for backward compatibility)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  // Real-time indicators state
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [typingUserName, setTypingUserName] = useState<string | null>(null);
  const [isRecordingIndicator, setIsRecordingIndicator] = useState(false);
  const [recordingUserId, setRecordingUserId] = useState<string | null>(null);
  const [recordingUserName, setRecordingUserName] = useState<string | null>(null);
  const [recordingDurationIndicator, setRecordingDurationIndicator] = useState(0);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [selectingFileUserId, setSelectingFileUserId] = useState<string | null>(null);
  const [selectingFileName, setSelectingFileName] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const failedMessageIdsRef = useRef<Set<string>>(new Set());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null); // Store stream to keep it alive
  // Store chunks in ref to ensure they persist across function calls
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>('audio/webm');

  // Global chat indicators hook - manages indicators for ALL chats (open chat + chat list)
  // getUserName function to resolve user names for indicators
  const getUserNameForGlobal = useCallback((threadId: string, userId: string): string | null => {
    const thread = threads.find(t => t._id === threadId);
    if (!thread) return null;
    
    // For seller inbox, the other user is always the buyer
    if (typeof thread.buyerId === 'object' && thread.buyerId !== null) {
      return thread.buyerId.fullName || 'Buyer';
    }
    return 'Buyer';
  }, [threads]);

  const {
    getThreadIndicators,
    hasActiveIndicators,
  } = useGlobalChatIndicators({
    currentUserId: user?.id,
    getUserName: getUserNameForGlobal,
  });

  // Filter threads by mailbox sidebar filter
  const threadsByMailbox = useMemo(() => {
    return threads.filter((t) => {
      if (mailboxFilter === 'all') return true;
      if (mailboxFilter === 'unread') return (t.sellerUnreadCount || 0) > 0;
      if (mailboxFilter === 'rfq') return t.type === 'rfq';
      if (mailboxFilter === 'negotiations') return t.type === 'order';
      if (mailboxFilter === 'resolved') return t.status === 'resolved';
      if (mailboxFilter === 'archived') return t.status === 'archived';
      return true;
    });
  }, [threads, mailboxFilter]);

  // Apply list filter pill (column 2) and search
  const threadsFilteredForList = useMemo(() => {
    let list = threadsByMailbox;
    if (listFilterPill === 'unread') list = list.filter((t) => (t.sellerUnreadCount || 0) > 0);
    if (listFilterPill === 'rfq') list = list.filter((t) => t.type === 'rfq');
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) => {
        const buyer = typeof t.buyerId === 'object' && t.buyerId !== null ? t.buyerId : null;
        const name = buyer ? (buyer.fullName || buyer.email || '').toLowerCase() : '';
        const subj = (t.subject || '').toLowerCase();
        const preview = (t.lastMessagePreview || '').toLowerCase();
        return name.includes(q) || subj.includes(q) || preview.includes(q);
      });
    }
    return list;
  }, [threadsByMailbox, listFilterPill, searchQuery]);

  // Sort threads: chats with active indicators first, then by lastMessageAt
  const sortedThreads = useMemo(() => {
    const list = [...threadsFilteredForList].sort((a, b) => {
      const aHasIndicators = hasActiveIndicators(a._id);
      const bHasIndicators = hasActiveIndicators(b._id);
      if (aHasIndicators && !bHasIndicators) return -1;
      if (!aHasIndicators && bHasIndicators) return 1;
      const aTime = new Date(a.lastMessageAt).getTime();
      const bTime = new Date(b.lastMessageAt).getTime();
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });
    return list;
  }, [threadsFilteredForList, hasActiveIndicators, sortOrder]);

  // Calculate total unread messages
  const totalUnread = useMemo(() => {
    return threads.reduce((sum, t) => sum + (t.sellerUnreadCount || 0), 0);
  }, [threads]);

  // Update global notification count when unread count changes
  useEffect(() => {
    setUnreadCount(totalUnread);
  }, [totalUnread, setUnreadCount]);

  // Update document title with unread count
  useEffect(() => {
    const baseTitle = 'Inbox';
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => {
      document.title = baseTitle; // Reset on unmount
    };
  }, [totalUnread]);

  // Load threads
  const loadThreads = useCallback(async (silent = false) => {
    try {
      setLoading(true);
      const response = await inboxAPI.getThreads({
        search: searchQuery || undefined,
        status: filterStatus || undefined,
        type: filterType || undefined,
        page: 1,
        limit: 50,
      });
      setThreads(response.threads);
      // Clear any previous errors on success
      if (!silent) {
        console.log('[Load Threads] Successfully loaded', response.threads.length, 'thread(s)');
      }
    } catch (error: any) {
      console.error('[Load Threads] Error:', error);
      // Only show toast if not silent retry
      if (!silent) {
        showToast(error.message || 'Failed to load threads', 'error');
      }
      // Re-throw to allow caller to handle
      throw error;
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, filterType, showToast]);

  // Scroll to bottom (WhatsApp-style: only when near bottom)
  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    setNewMessageAlert(false);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distanceFromBottom > 200);
    if (distanceFromBottom < 150) setNewMessageAlert(false);
  }, []);

  // Load thread messages (initial load only — no refetch after send)
  const loadThreadMessages = useCallback(async (threadId: string) => {
    try {
      const response = await inboxAPI.getThread(threadId);
      setActiveThread(response.thread);
      setMessages(response.messages || []);
      setFailedMessageIds(new Set());
      failedMessageIdsRef.current = new Set();
      await inboxAPI.markThreadAsRead(threadId);
      websocketService.joinThread(threadId);
      setNewMessageAlert(false);
      setTimeout(() => scrollToBottom('auto'), 100);
    } catch (error: any) {
      console.error('Load messages error:', error);
      showToast(error.message || 'Failed to load messages', 'error');
      setMessages([]);
    }
  }, [showToast, scrollToBottom]);

  // Send message
  const handleSendMessage = async () => {
    if (!activeThread) return;
    if (sending) return;
    
    // Reset typing indicator when message is sent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    // Emit stop typing event when message is sent
    websocketService.sendTyping(activeThread._id, false);
    setIsTyping(false);
    setTypingUserId(null);
    setTypingUserName(null);
    
    // If recording, stop it first
    if (isRecording) {
      stopRecording();
      // Wait a bit for the recording to finish processing
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Check if we have content or files to send (allow sending with just files/images/voice notes)
    const hasContent = messageContent.trim().length > 0;
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
          const uploaded = await inboxAPI.uploadFiles(
            filesToUpload,
            recordingDuration > 0 ? recordingDuration : undefined,
            (progress) => {
              // Overall progress for remaining files
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

      const messageText = messageContent.trim();
      if (!messageText && (!attachments || attachments.length === 0)) {
        showToast('Please add a message text, file, image, or voice note', 'error');
        setSending(false);
        return;
      }

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        _id: tempId,
        threadId: activeThread._id,
        senderId: user ? { _id: user.id, fullName: user.full_name || user.email || '', email: user.email || '' } : { _id: '', fullName: '', email: '' },
        senderType: 'seller',
        content: messageText || '',
        attachments: attachments || [],
        readBy: [],
        status: 'sending',
        isEdited: false,
        isDeleted: false,
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replyTo: replyTo?._id,
      } as Message;

      setMessages((prev) => [...prev, optimisticMsg]);
      setMessageContent('');
      setSelectedFiles([]);
      setUploadedAttachments([]);
      setReplyTo(null);
      setRecordingDuration(0);
      setIsRecording(false);
      setIsRecordingSaved(false);
      setUploadProgress(new Map());
      setUploadErrors(new Map());
      setUploadingFiles(new Map());
      scrollToBottom('smooth');
      messageInputRef.current?.focus();

      inboxAPI.sendMessage(activeThread._id, {
        content: messageText || '',
        attachments: attachments || [],
        replyTo: replyTo?._id,
      }).then((response) => {
        if (!response.message) return;
        setMessages((prev) => prev.map((m) =>
          m._id === tempId ? { ...response.message, status: 'sent' } : m
        ));
        setThreads((prevThreads) => prevThreads.map((thread) => {
          if (thread._id !== activeThread._id) return thread;
          let preview = messageText || '';
          if (!preview && attachments.length > 0) {
            const firstAtt = attachments[0];
            preview = firstAtt.type === 'voice' ? '🎤 Voice note' : firstAtt.type === 'image' ? '📷 Image' : `📎 ${firstAtt.originalName || 'File'}`;
            if (attachments.length > 1) preview += ` (+${attachments.length - 1} more)`;
          }
          preview = preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
          return { ...thread, lastMessageAt: new Date().toISOString(), lastMessagePreview: preview, sellerUnreadCount: 0 };
        }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
      }).catch((err) => {
        setFailedMessageIds((prev) => new Set(prev).add(tempId));
        failedMessageIdsRef.current = new Set(failedMessageIdsRef.current).add(tempId);
        showToast(err.message || 'Failed to send message', 'error');
      }).finally(() => setSending(false));
      return;
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

  /** Retry sending a failed message (optimistic message with temp id). */
  const handleRetryFailedMessage = useCallback((message: Message) => {
    if (!activeThread || !message._id.startsWith('temp-') || !failedMessageIds.has(message._id)) return;
    setSending(true);
    inboxAPI.sendMessage(activeThread._id, {
      content: message.content || '',
      attachments: message.attachments || [],
      replyTo: message.replyTo,
    }).then((response) => {
      if (!response.message) return;
      setMessages((prev) => prev.map((m) =>
        m._id === message._id ? { ...response.message!, status: 'sent' } : m
      ));
      setFailedMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(message._id);
        return next;
      });
      failedMessageIdsRef.current.delete(message._id);
      showToast('Message sent', 'success');
    }).catch((err) => {
      showToast(err.message || 'Failed to send again', 'error');
    }).finally(() => setSending(false));
  }, [activeThread, failedMessageIds, showToast]);

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
      const uploaded = await inboxAPI.uploadFiles(
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
  
  // Retry failed upload
  const retryUpload = async (fileId: string) => {
    const file = uploadingFiles.get(fileId);
    if (file) {
      setUploadErrors(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });
      await uploadFileWithProgress(file);
    }
  };

  // Handle voice note recording
  const recordingCompleteRef = useRef<((file: File) => void) | null>(null);
  
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
        
        // Create blob from all chunks (FIXED: Use ref chunks and stored mime type)
        // CRITICAL: Use MediaRecorder's actual mimeType if available, otherwise use stored ref
        const mimeType = mediaRecorderRef.current?.mimeType || recordingMimeTypeRef.current || 'audio/webm';
        console.log('[Voice Recording] Using mimeType for blob:', mimeType);
        const blob = new Blob(recordingChunksRef.current, { type: mimeType });
        console.log('[Voice Recording] Final blob size:', blob.size, 'bytes');
        console.log('[Voice Recording] Blob type:', blob.type);
        console.log('[Voice Recording] Blob size validation:', blob.size > 0 ? 'PASS' : 'FAIL');
        
        // CRITICAL: Verify blob is not empty - strong validation
        if (blob.size === 0) {
          console.error('[Voice Recording] ERROR: Blob is empty! No audio data captured.');
          console.error('[Voice Recording] Chunks count:', recordingChunksRef.current.length);
          console.error('[Voice Recording] Total chunks size:', totalSize);
          showToast('Recording failed: No audio data captured', 'error');
          
          // Stop stream tracks
          if (recordingStreamRef.current) {
            recordingStreamRef.current.getTracks().forEach(track => track.stop());
            recordingStreamRef.current = null;
          }
          
          recordingChunksRef.current = [];
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
        
        // Create File from blob with correct type for multipart/form-data upload
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: mimeType });
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
          
          // Add file to selected files - waveform UI will appear after blob exists
          setSelectedFiles((prev) => [...prev, file]);
          
          // Show "saved" status
          setIsRecordingSaved(true);
          setTimeout(() => setIsRecordingSaved(false), 2000);
          
          // Stop stream tracks AFTER blob is created and file is ready
          // CRITICAL: Don't stop stream until after blob is created and tested
          if (recordingStreamRef.current) {
            recordingStreamRef.current.getTracks().forEach(track => {
              track.stop();
              console.log('[Voice Recording] Audio track stopped:', track.label);
            });
            recordingStreamRef.current = null;
          }
          
          // Clear chunks after use
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
      
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Send recording indicator to other users
      if (activeThread) {
        websocketService.sendRecording(activeThread._id, true, 0);
      }
      
      // Update recording duration and send updates to WebSocket
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          // Send duration update to WebSocket every second
          if (activeThread) {
            websocketService.sendRecording(activeThread._id, true, newDuration);
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
      const hasText = messageContent.trim().length > 0;
      
      console.log('[Voice Recording] Stopping recording, duration:', currentDuration, 'seconds');
      console.log('[Voice Recording] MediaRecorder state before stop:', mediaRecorderRef.current.state);
      console.log('[Voice Recording] Total chunks before stop:', recordingChunksRef.current.length);
      
      // CRITICAL: Request final data chunk before stopping to ensure all audio is captured
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
          // Small delay to ensure final data chunk is collected
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (error) {
        console.warn('[Voice Recording] Warning: Could not request final data:', error);
      }
      
      // Stop the MediaRecorder - onstop handler will process chunks
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Stop recording indicator
      if (activeThread) {
        websocketService.sendRecording(activeThread._id, false);
      }
      
      console.log('[Voice Recording] MediaRecorder state after stop:', mediaRecorderRef.current.state);
      
      // Auto-send voice note if no text content (WhatsApp style)
      if (currentDuration > 0 && !hasText) {
        // Wait for recording to finish and get the file
        const recordedFile = await new Promise<File>((resolve) => {
          recordingCompleteRef.current = resolve;
        });
        
        if (recordedFile && activeThread) {
          // Auto-upload and send the voice note
          try {
            const uploaded = await inboxAPI.uploadFiles(
              [recordedFile],
              currentDuration,
              (progress) => {
                setUploadProgress(prev => new Map(prev).set('voice-sending', progress));
              }
            );
            
            // Send message with voice note only
            if (uploaded.length > 0) {
              await inboxAPI.sendMessage(activeThread._id, {
                content: '',
                attachments: uploaded,
              });
              
              // Clear voice note files
              setSelectedFiles(prev => prev.filter(f => f !== recordedFile));
              setUploadedAttachments([]);
              setRecordingDuration(0);
              setUploadProgress(new Map());
              
              // Only reload messages for the current thread (thread list will be updated via WebSocket)
              await loadThreadMessages(activeThread._id);
              // NOTE: Removed loadThreads() call to prevent unnecessary chat list refresh
              
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
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      // Remove any voice note files that were just recorded
      setSelectedFiles(prev => prev.filter(file => !file.name.startsWith('voice-')));
      
      // Stop recording indicator
      if (activeThread) {
        websocketService.sendRecording(activeThread._id, false);
      }
    }
  };

  // Format recording duration as MM:SS
  const formatRecordingDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Edit message
  const handleEditMessage = async (message: Message, newContent: string) => {
    if (!activeThread) return;
    try {
      await inboxAPI.editMessage(activeThread._id, message._id, newContent);
      await loadThreadMessages(activeThread._id);
      setEditingMessage(null);
      showToast('Message updated', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to edit message', 'error');
    }
  };

  // Delete message
  const handleDeleteMessage = async (message: Message) => {
    if (!activeThread) return;
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      await inboxAPI.deleteMessage(activeThread._id, message._id);
      await loadThreadMessages(activeThread._id);
      showToast('Message deleted', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete message', 'error');
    }
  };

  // React to message
  const handleReactToMessage = async (message: Message, emoji: string) => {
    if (!activeThread) return;
    try {
      await inboxAPI.reactToMessage(activeThread._id, message._id, emoji);
      await loadThreadMessages(activeThread._id);
    } catch (error: any) {
      showToast(error.message || 'Failed to react', 'error');
    }
  };

  // Forward message (can be used later with a dialog to select target thread)
  // const handleForwardMessage = async (message: Message, targetThreadId: string) => {
  //   if (!activeThread) return;
  //   try {
  //     await inboxAPI.forwardMessage(activeThread._id, message._id, targetThreadId);
  //     showToast('Message forwarded', 'success');
  //   } catch (error: any) {
  //     showToast(error.message || 'Failed to forward message', 'error');
  //   }
  // };

  // Load available buyers (for creating new thread)
  const loadAvailableBuyers = async () => {
    try {
      setLoadingBuyers(true);
      const response = await inboxAPI.getBuyers();
      const buyers = response.buyers || [];
      setAvailableBuyers(buyers);
      
      if (buyers.length === 0) {
        showToast('No buyers available. Please try again later.', 'info');
      }
    } catch (error: any) {
      console.error('Load buyers error:', error);
      const errorMessage = error.message || 'Failed to load buyers';
      
      // Only show fallback buyers in development, not in production
      if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
        showToast('Unable to load buyers. Please check your connection.', 'error');
        setAvailableBuyers([]);
      } else {
        // Fallback to test buyers if API fails with other errors (for development)
        setAvailableBuyers([
          { _id: 'buyer1', fullName: 'Acme Corp', email: 'buyer1@test.com' },
          { _id: 'buyer2', fullName: 'Global Retailers Ltd', email: 'buyer2@test.com' },
          { _id: 'buyer3', fullName: 'Startup Hub', email: 'buyer3@test.com' },
        ]);
      }
    } finally {
      setLoadingBuyers(false);
    }
  };

  // Create new thread
  const [creatingThread, setCreatingThread] = useState(false);
  
  const handleCreateThread = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Validate fields
    if (!newThreadSubject.trim()) {
      showToast('Please enter a subject', 'error');
      return;
    }

    if (!newThreadBuyerId) {
      showToast('Please select a buyer', 'error');
      return;
    }

    try {
      setCreatingThread(true);
      console.log('[Create Thread] Creating thread with:', {
        buyerId: newThreadBuyerId,
        subject: newThreadSubject.trim(),
        type: newThreadType,
      });
      
      const response = await inboxAPI.createThread({
        buyerId: newThreadBuyerId,
        subject: newThreadSubject.trim(),
        type: newThreadType,
      });

      console.log('[Create Thread] Thread created successfully:', response.thread._id);

      setShowNewThreadDialog(false);
      setNewThreadSubject('');
      setNewThreadBuyerId('');
      setNewThreadType('message');

      // Load the new thread
      await loadThreadMessages(response.thread._id);
      setActiveThread(response.thread);
      await loadThreads();
      
      showToast('Thread created successfully', 'success');
    } catch (error: any) {
      console.error('[Create Thread] Error:', error);
      const errorMessage = error.message || 'Failed to create thread';
      
      // Show specific error messages
      if (errorMessage.includes('validation') || errorMessage.includes('required')) {
        showToast('Please fill in all required fields correctly', 'error');
      } else if (errorMessage.includes('internet') || errorMessage.includes('connection')) {
        showToast(errorMessage, 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setCreatingThread(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };


  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notification
  const showNotification = (title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'message-notification',
        requireInteraction: false,
      });
    }
  };

  // WebSocket setup
  useEffect(() => {
    // Connect WebSocket
    websocketService.connect();

    // Setup event handlers
    websocketService.onNewMessage = (threadId: string, message: Message) => {
      if (activeThread?._id === threadId) {
        setMessages((prev) => {
          if (prev.some(m => m._id === message._id)) return prev;
          const newMessages = [...prev, message];
          const container = messagesContainerRef.current;
          const distanceFromBottom = container
            ? container.scrollHeight - container.scrollTop - container.clientHeight
            : 0;
          if (distanceFromBottom < 300) {
            setTimeout(() => scrollToBottom('smooth'), 100);
          } else if (message.senderType === 'buyer') {
            const buyerName = typeof activeThread?.buyerId === 'object' && activeThread?.buyerId
              ? (activeThread.buyerId.fullName || 'Buyer')
              : 'Buyer';
            setNewMessageFromName(buyerName);
            setNewMessageAlert(true);
          }
          return newMessages;
        });
      }
      
      // Update thread list optimistically to show the new message preview
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
              ...(message.senderType === 'buyer' ? { sellerUnreadCount: (thread.sellerUnreadCount || 0) + 1 } : { sellerUnreadCount: 0 }),
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
      
      // Show notification if message is from buyer and not in active thread
      if (message.senderType === 'buyer' && activeThread?._id !== threadId) {
        const thread = threads.find(t => t._id === threadId);
        const buyerName = typeof thread?.buyerId === 'object' && thread.buyerId !== null
          ? (thread.buyerId.fullName || 'Buyer')
          : 'Buyer';
        const avatarUrl = typeof thread?.buyerId === 'object' && thread.buyerId !== null && thread.buyerId.avatarUrl 
          ? (resolveAvatarUrl(thread.buyerId.avatarUrl) ?? undefined)
          : undefined;
        showNotification(
          buyerName,
          message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
          avatarUrl
        );
        showToast(`New message from ${buyerName}`, 'info');
      }
    };

    websocketService.onThreadUpdate = (threadId: string, _update?: any, lastMessage?: any) => {
      if (activeThread?._id === threadId) {
        if (lastMessage) {
          setMessages((prev) => {
            if (prev.some(m => m._id === lastMessage._id)) {
              return prev;
            }
            const newMessages = [...prev, lastMessage];
            // Auto-scroll for voice notes and new messages
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return newMessages;
          });
        } else {
          loadThreadMessages(threadId);
        }
      }
      
      // Update thread list optimistically
      if (_update) {
        setThreads((prevThreads) => {
          const updatedThreads = prevThreads.map((thread) => {
            if (thread._id === threadId) {
              return {
                ...thread,
                ..._update,
                lastMessageAt: _update.lastMessageAt || thread.lastMessageAt,
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

    /**
     * Listen for incoming typing events from other users
     * - Only show if senderId is current chat partner and isTyping = true
     * - Hide typing text if isTyping = false
     * - Prevents flickering with proper state management
     */
    websocketService.onUserTyping = (threadId: string, userId: string, userName: string, isTyping: boolean) => {
      // Only show typing indicator if it's for the current thread and not from current user
      if (activeThread?._id === threadId && userId !== user?.id) {
        if (isTyping) {
          // Show typing indicator with smooth fade-in
          setIsTyping(true);
          setTypingUserId(userId);
          setTypingUserName(userName || null);
        } else {
          // Hide typing indicator with smooth fade-out (after short delay to prevent flickering)
          setTimeout(() => {
            setIsTyping(false);
            setTypingUserId(null);
            setTypingUserName(null);
          }, 500); // Small delay to prevent flickering on fast typing
        }
      }
    };

    /**
     * Listen for incoming recording events from other users
     * - Only show if it's for the current thread and not from current user
     * - Shows recording indicator with duration
     */
    websocketService.onUserRecording = (threadId: string, userId: string, isRecording: boolean, duration?: number) => {
      if (activeThread?._id === threadId && userId !== user?.id) {
        if (isRecording) {
          setIsRecordingIndicator(true);
          setRecordingUserId(userId);
          // Get user name from thread
          const thread = threads.find(t => t._id === threadId);
          const userName = typeof thread?.buyerId === 'object' && thread.buyerId !== null
            ? (thread.buyerId.fullName || 'Buyer')
            : 'Buyer';
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

    // Cleanup
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
      
      if (activeThread) {
        // Send stop typing and stop recording before leaving thread
        websocketService.sendTyping(activeThread._id, false);
        websocketService.sendRecording(activeThread._id, false);
        websocketService.leaveThread(activeThread._id);
      }
    };
  }, [activeThread, loadThreads, loadThreadMessages, threads, showToast, user?.id]);

  // Load inbox stats (for header pills and empty state)
  const loadStats = useCallback(async () => {
    try {
      const data = await inboxAPI.getStats();
      setStats({
        totalThreads: data.totalThreads ?? 0,
        unreadThreads: data.unreadThreads ?? 0,
        activeThreads: data.activeThreads ?? 0,
        archivedThreads: data.archivedThreads ?? 0,
      });
    } catch {
      setStats({ totalThreads: 0, unreadThreads: 0, activeThreads: 0, archivedThreads: 0 });
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    loadStats();
  }, [loadStats, threads.length]);

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

  /**
   * Handle typing indicator with proper debounce
   * - Emits typing event when user starts typing (input not empty)
   * - Uses 400ms debounce before sending "stop typing" event
   * - Prevents flickering with proper state management
   */
  const handleTyping = () => {
    if (!activeThread) return;
    
    const hasContent = messageContent.trim().length > 0;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // If input has content, emit typing started event
    if (hasContent) {
      // Emit typing event: { senderId, receiverId, isTyping: true }
      websocketService.sendTyping(activeThread._id, true);
      
      typingTimeoutRef.current = setTimeout(() => {
        websocketService.sendTyping(activeThread._id, false);
      }, 2000);
    } else {
      websocketService.sendTyping(activeThread._id, false);
    }
  };

  const PRIMARY = '#f97316';
  const rfqCount = threads.filter((t) => t.type === 'rfq').length;
  const resolvedCount = threads.filter((t) => t.status === 'resolved').length;

  return (
    <div className="h-full flex flex-col -m-4 md:-m-6 lg:-m-8" style={{ background: 'var(--bg-page)' }}>
      {/* TIER 1 — Premium header */}
      <header
        className="flex items-center justify-between flex-wrap gap-3 px-5 sm:px-7 py-5 flex-shrink-0"
        style={{
          background: 'var(--card-bg)',
          padding: '20px 28px',
          boxShadow: '0 1px 0 var(--divider)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 12px rgba(249,115,22,0.35)' }}
          >
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              Inbox & RFQ Communications
            </h1>
            <p className="text-[13px] truncate" style={{ color: 'var(--text-muted)' }}>
              Central place for buyer messages, RFQs, and negotiation threads.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          <span className="rounded-full px-3.5 py-1.5 text-[12px] font-bold flex items-center gap-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-xs)' }}>
            💬 {stats?.totalThreads ?? threads.length} Messages
          </span>
          <span className="rounded-full px-3.5 py-1.5 text-[12px] font-bold flex items-center gap-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-xs)' }}>
            📋 {rfqCount} RFQs
          </span>
          <span className="rounded-full px-3.5 py-1.5 text-[12px] font-bold flex items-center gap-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-xs)' }}>
            🔔 {totalUnread} Unread
          </span>
          <span className="rounded-full px-3.5 py-1.5 text-[12px] font-bold flex items-center gap-1.5" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-xs)' }}>
            ✓ {resolvedCount} Resolved
          </span>
        </div>
        <motion.button
          type="button"
          onClick={() => { loadAvailableBuyers(); setShowNewThreadDialog(true); }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white border-0 cursor-pointer transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.40)' }}
          whileHover={{ boxShadow: '0 6px 20px rgba(249,115,22,0.5)' }}
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </motion.button>
      </header>

      {/* TIER 8 — Notification banner (dismissible) */}
      {totalUnread > 0 && !notificationBannerDismissed && (
        <div
          className="mx-4 mt-0 mb-0 rounded-[14px] px-4 py-3 flex items-center justify-between flex-wrap gap-2 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(234,88,12,0.06))', boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25)' }}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" style={{ color: PRIMARY }} />
            <span className="text-[13px] font-bold" style={{ color: PRIMARY }}>{totalUnread} new message{totalUnread !== 1 ? 's' : ''} from buyers</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="text-[13px] font-semibold" style={{ color: PRIMARY }}>View All →</button>
            <button type="button" onClick={() => setNotificationBannerDismissed(true)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* TIER 2 — Three column layout */}
      <div className="flex-1 flex min-h-0">
        {/* COLUMN 1 — Filter sidebar (200px) */}
        <aside
          className="hidden lg:flex flex-col w-[200px] flex-shrink-0 overflow-y-auto"
          style={{ background: 'var(--card-bg)', boxShadow: '1px 0 0 var(--divider)', height: 'calc(100vh - 140px)' }}
        >
          <div className="p-4 pr-3">
            <p className="text-[11px] uppercase tracking-wider px-2 pb-2" style={{ color: 'var(--text-faint)', letterSpacing: '0.8px' }}>📬 MAILBOX</p>
            {[
              { id: 'all' as const, label: 'All Messages', icon: MessageCircle, count: threads.length },
              { id: 'unread' as const, label: 'Unread', icon: Bell, count: totalUnread, pillColor: PRIMARY },
              { id: 'rfq' as const, label: 'RFQ Requests', icon: ClipboardList, count: rfqCount, pillColor: '#8b5cf6' },
              { id: 'negotiations' as const, label: 'Negotiations', icon: DollarSign, count: threads.filter((t) => t.type === 'order').length, pillColor: '#3b82f6' },
              { id: 'resolved' as const, label: 'Resolved', icon: CheckCircle2, count: resolvedCount, pillColor: '#22c55e' },
              { id: 'archived' as const, label: 'Archived', icon: Archive, count: threads.filter((t) => t.status === 'archived').length, pillColor: 'var(--text-muted)' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMailboxFilter(item.id)}
                className="w-full flex items-center gap-2 py-2.5 px-3 rounded-[10px] cursor-pointer transition-[0.15s] border-0 text-left"
                style={{
                  background: mailboxFilter === item.id ? 'var(--brand-tint)' : 'transparent',
                  color: mailboxFilter === item.id ? PRIMARY : 'var(--text-muted)',
                  boxShadow: mailboxFilter === item.id ? 'inset 4px 0 0 #f97316' : 'none',
                  fontWeight: mailboxFilter === item.id ? 600 : undefined,
                }}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: mailboxFilter === item.id ? PRIMARY : 'var(--text-muted)' }} />
                <span className="text-[14px] flex-1 truncate">{item.label}</span>
                {item.count > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white flex-shrink-0" style={{ background: item.pillColor || 'var(--text-muted)' }}>
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </button>
            ))}
            <div className="my-3 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--divider), transparent)' }} />
            <p className="text-[11px] uppercase tracking-wider px-2 pb-2" style={{ color: 'var(--text-faint)' }}>🏷️ LABELS</p>
            {['Urgent', 'Follow Up', 'VIP Buyer', 'Bulk Order', 'Negotiating'].map((label, i) => (
              <div key={label} className="flex items-center gap-2 py-1.5 px-3 rounded-[10px] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ['#ef4444','#f97316','#8b5cf6','#3b82f6','#f59e0b'][i] }} />
                <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 py-1.5 px-3 rounded-[10px] cursor-pointer border border-dashed" style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}>
              <Plus className="w-4 h-4" />
              <span className="text-[14px]">Add Label</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider px-2 pb-2 mt-4" style={{ color: 'var(--text-faint)' }}>⚡ QUICK FILTERS</p>
            <div className="flex flex-wrap gap-1.5">
              {['New Today', 'Has Attachments', 'Awaiting Reply', 'Price Negotiation', 'Bulk Orders'].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuickFilter(quickFilter === q ? null : q)}
                  className="rounded-full px-2.5 py-1 text-[11px] border-0 cursor-pointer"
                  style={{
                    background: quickFilter === q ? 'var(--brand-tint)' : 'var(--bg-secondary)',
                    color: quickFilter === q ? PRIMARY : 'var(--text-secondary)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* COLUMN 2 — Conversation list (320px) */}
        <div
          className={`flex flex-col w-full lg:w-[320px] flex-shrink-0 overflow-hidden ${activeThread ? 'hidden lg:flex' : 'flex'}`}
          style={{ background: 'var(--bg-page)', boxShadow: '1px 0 0 var(--divider)', height: 'calc(100vh - 140px)' }}
        >
          <div className="p-3 flex flex-col gap-2 flex-shrink-0">
            <div className="relative h-11">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: 'var(--text-faint)' }} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full pl-10 pr-4 rounded-xl border-0 outline-none text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                {(['all', 'buyers', 'unread', 'rfq'] as const).map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => setListFilterPill(pill)}
                    className="rounded-full px-3 py-1 text-[12px] font-medium border-0 cursor-pointer capitalize"
                    style={{
                      background: listFilterPill === pill ? `linear-gradient(135deg, ${PRIMARY}, #ea580c)` : 'var(--bg-secondary)',
                      color: listFilterPill === pill ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {pill}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSortOrder((o) => (o === 'newest' ? 'oldest' : 'newest'))} className="flex items-center gap-1 text-[12px] border-0 bg-transparent cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                {sortOrder === 'newest' ? 'Newest ↓' : 'Oldest ↑'}
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4" style={{ minHeight: 0 }}>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRIMARY }} />
              </div>
            ) : sortedThreads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-3 mt-4 p-10 rounded-[20px] text-center"
                style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="w-18 h-18 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.10)' }}>
                  <MessageCircle className="w-9 h-9" style={{ color: PRIMARY }} />
                </div>
                <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No conversations yet</p>
                <p className="text-[13px] mx-auto max-w-[240px] mb-6" style={{ color: 'var(--text-muted)' }}>
                  Messages from buyers, RFQ requests, and order negotiations will appear here.
                </p>
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => { loadAvailableBuyers(); setShowNewThreadDialog(true); }}
                    className="w-full py-3 rounded-xl font-semibold text-white border-0 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                  >
                    + Start New Conversation
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await inboxAPI.seedTestThreads();
                        await loadThreads();
                        showToast('Test threads created! You can now start chatting.', 'success');
                      } catch (error: any) {
                        showToast(error.message || 'Failed to create test threads', 'error');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full py-3 rounded-xl font-semibold border-0 cursor-pointer"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', boxShadow: '0 0 0 1.5px var(--divider)' }}
                  >
                    Create Test Thread
                  </button>
                </div>
              </motion.div>
            ) : (
              sortedThreads.map((thread) => {
                const isActive = thread._id === activeThread?._id;
                const buyer = typeof thread.buyerId === 'object' && thread.buyerId !== null ? thread.buyerId : null;
                const unread = (thread.sellerUnreadCount || 0) > 0;
                const typeBadge = thread.type === 'rfq' ? { label: 'RFQ', bg: '#8b5cf6' } : thread.type === 'order' ? { label: 'Order', bg: '#f59e0b' } : { label: 'Support', bg: '#22c55e' };
                return (
                  <motion.button
                    key={thread._id}
                    type="button"
                    onClick={() => loadThreadMessages(thread._id)}
                    className="w-full text-left mx-0 mb-2 px-4 py-3.5 rounded-[14px] cursor-pointer transition-all duration-150 border-0"
                    style={{
                      background: isActive ? 'var(--brand-tint)' : 'var(--card-bg)',
                      boxShadow: isActive ? '0 0 0 1.5px rgba(249,115,22,0.35), inset 4px 0 0 #f97316' : 'var(--shadow-xs)',
                    }}
                    whileHover={{ boxShadow: isActive ? undefined : 'var(--shadow-sm)', y: -1 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                          {buyer && buyer.avatarUrl && buyer.avatarUrl.trim() ? (
                            <img src={resolveAvatarUrl(buyer.avatarUrl) || ''} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            (buyer?.fullName || buyer?.email || 'B')[0].toUpperCase()
                          )}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {unread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIMARY }} />}
                            <span className="text-[14px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {buyer ? (buyer.fullName || buyer.email || 'Buyer') : 'Buyer'}
                            </span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white flex-shrink-0" style={{ background: typeBadge.bg }}>{typeBadge.label}</span>
                          </div>
                          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-faint)' }}><LiveTimestamp timestamp={thread.lastMessageAt} /></span>
                          {unread && (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white flex-shrink-0" style={{ background: PRIMARY }}>
                              {thread.sellerUnreadCount > 9 ? '9+' : thread.sellerUnreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {thread.subject ? `Re: ${thread.subject}` : thread.lastMessagePreview}
                        </p>
                        <div className="flex items-center justify-between gap-1 mt-1">
                          <p className="text-[12px] line-clamp-2 truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                            {(() => {
                              const ind = getThreadIndicators(thread._id).find((i: ChatIndicatorType) => i.isTyping || i.isRecording);
                              if (ind) return <ChatListIndicator isTyping={ind.isTyping} isRecording={ind.isRecording} recordingDuration={ind.recordingDuration} userName={ind.userName} className="truncate" />;
                              const preview = thread.lastMessagePreview || '—';
                              return preview.length > 50 ? preview.slice(0, 50) + '…' : preview;
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 3 — Chat / Message panel (flex:1) */}
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 ${activeThread ? 'flex' : 'hidden lg:flex'}`} style={{ background: 'var(--bg-page)', height: 'calc(100vh - 140px)' }}>
          {activeThread ? (
            <>
              {/* Chat header — TIER 5 */}
              <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ background: 'var(--card-bg)', boxShadow: '0 1px 0 var(--divider)' }}>
                <button type="button" onClick={() => { setActiveThread(null); setMessages([]); }} className="lg:hidden p-2 rounded-lg flex-shrink-0" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }} aria-label="Back">
                  <X className="w-5 h-5" />
                </button>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                    {typeof activeThread.buyerId === 'object' && activeThread.buyerId !== null && activeThread.buyerId.avatarUrl && activeThread.buyerId.avatarUrl.trim() ? (
                      <img src={resolveAvatarUrl(activeThread.buyerId.avatarUrl) || ''} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      (typeof activeThread.buyerId === 'object' && activeThread.buyerId !== null ? (activeThread.buyerId.fullName || activeThread.buyerId.email || 'B') : 'B')[0].toUpperCase()
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {typeof activeThread.buyerId === 'object' && activeThread.buyerId !== null ? activeThread.buyerId.fullName : 'Buyer'}
                  </p>
                  {isTyping && typingUserId ? (
                    <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>{typingUserName || 'Buyer'} is typing...</p>
                  ) : (
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Online now</p>
                  )}
                </div>
                {activeThread.relatedOrderId && (
                  <span className="rounded-full px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 flex-shrink-0" style={{ background: 'var(--brand-tint)', color: PRIMARY }}>
                    📦 Order #{String(activeThread.relatedOrderId).slice(-6)}
                  </span>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button type="button" onClick={() => inboxAPI.updateThread(activeThread._id, { status: 'resolved' }).then(() => loadThreads())} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border-0 cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved
                  </button>
                  <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}><Phone className="w-4 h-4" /></button>
                  <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}><Video className="w-4 h-4" /></button>
                  <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}><Pin className="w-4 h-4" /></button>
                  <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}><MoreHorizontal className="w-4 h-4" /></button>
                </div>
              </div>
              {activeThread.type === 'rfq' && (
                <div className="px-6 py-2.5 flex items-center justify-between flex-shrink-0" style={{ background: 'rgba(245,158,11,0.10)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.25)' }}>
                  <span className="text-[13px] font-medium">📋 This is an RFQ Request</span>
                  <button type="button" className="text-[12px] font-semibold" style={{ color: PRIMARY }}>View RFQ Details →</button>
                </div>
              )}

                {/* Messages area — TIER 5 */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-5 sm:px-6 py-5 space-y-3 min-h-0 relative [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full"
                  style={{ background: 'var(--bg-page)' }}
                >
                  {messages.map((message) => {
                    const isSeller = message.senderType === 'seller';
                    const isDeleted = message.isDeleted;
                    
                    return (
                      <div
                        key={message._id}
                        id={`message-${message._id}`}
                        className={`group flex items-start gap-1 sm:gap-2 max-w-[90%] sm:max-w-[85%] md:max-w-xl ${isSeller ? 'ml-auto justify-end' : ''}`}
                      >
                        {!isSeller && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 overflow-hidden">
                            {typeof message.senderId === 'object' && message.senderId.avatarUrl && message.senderId.avatarUrl.trim() ? (
                              <img
                                src={resolveAvatarUrl(message.senderId.avatarUrl) || message.senderId.avatarUrl}
                                alt={message.senderId.fullName || 'Buyer'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // If profile image fails to load, show first letter (avatar)
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const name = typeof message.senderId === 'object' ? (message.senderId.fullName || message.senderId.email || 'U') : 'U';
                                    parent.textContent = name[0].toUpperCase();
                                  }
                                }}
                              />
                            ) : (
                              // No profile image, use first letter (avatar)
                              (typeof message.senderId === 'object' 
                                ? (message.senderId.fullName || message.senderId.email || 'U')[0].toUpperCase()
                                : 'U')
                            )}
                </div>
                        )}
                        <div 
                          className="flex flex-col gap-1"
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
                              
                              if (moved && deltaX > 50 && !isSeller) {
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
                          {message.replyTo && (
                            <div className={`mb-2 px-2 py-1.5 rounded-lg border-l-4 ${
                              isSeller 
                                ? 'bg-white/30 dark:bg-white/10 border-white/50' 
                                : 'bg-gray-100 dark:bg-gray-700/50 border-red-500'
                            }`}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Reply className={`w-3 h-3 ${isSeller ? 'text-white/80' : 'text-red-500'}`} />
                                <span className={`text-[10px] font-semibold ${isSeller ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {typeof message.replyTo === 'object' && (message.replyTo as any).senderId 
                                    ? (typeof (message.replyTo as any).senderId === 'object' 
                                        ? (message.replyTo as any).senderId.fullName || 'User'
                                        : 'User')
                                    : 'You'}
                                </span>
                </div>
                              <p className={`text-[11px] line-clamp-2 ${isSeller ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                                {typeof message.replyTo === 'object' 
                                  ? ((message.replyTo as any).content || ((message.replyTo as any).attachments && (message.replyTo as any).attachments.length > 0 ? '📎 Attachment' : 'Message'))
                                  : 'Message'}
                              </p>
              </div>
                          )}
                          <div
                            className={`px-3 py-2 rounded-2xl text-xs shadow-sm ${
                              isSeller
                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white rounded-br-sm'
                                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                            }`}
                          >
                            {/* Sender name with avatar for received messages */}
                            {!isSeller && typeof message.senderId === 'object' && (
                              <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-gray-200 dark:border-gray-700">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0 overflow-hidden">
                                  {message.senderId.avatarUrl && message.senderId.avatarUrl.trim() ? (
                                    <img
                                      src={message.senderId.avatarUrl}
                                      alt={message.senderId.fullName || 'Buyer'}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        // If image fails to load, show first letter (avatar)
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          const name = message.senderId.fullName || message.senderId.email || 'B';
                                          parent.textContent = name[0].toUpperCase();
                                        }
                                      }}
                                    />
                                  ) : (
                                    // No profile image, use first letter (avatar)
                                    (message.senderId.fullName || message.senderId.email || 'B')[0].toUpperCase()
                                  )}
                </div>
                                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                                  {message.senderId.fullName || 'Buyer'}
                                </span>
              </div>
                            )}
                            {isDeleted ? (
                              <span className="italic opacity-60">This message was deleted</span>
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
                                className="w-full bg-transparent border-none outline-none"
                                autoFocus
                              />
                            ) : (
                              <>
                                {/* Only show text content if it exists and is not just placeholder */}
                                {message.content && message.content.trim() && message.content !== '📎 Attachment' && (
                                  <p>{message.content}</p>
                                )}
                                {/* Show attachments */}
                                {message.attachments && message.attachments.length > 0 && message.attachments.map((att, idx) => (
                                  <div key={idx} className="mt-2">
                                    {att.type === 'voice' ? (
                                      <div 
                                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                                          isPlaying(message._id, idx)
                                            ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500'
                                            : isInSequence(message._id, idx)
                                            ? 'bg-red-50 dark:bg-red-900/10 border border-red-300 dark:border-red-700'
                                            : 'bg-black/20 dark:bg-white/10'
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
                                              ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-lg'
                                              : 'bg-red-500 hover:bg-red-600'
                                          }`}
                                          title={isPlaying(message._id, idx) ? 'Pause playback' : 'Play voice note (autoplay enabled)'}
                                        >
                                          {isPlaying(message._id, idx) ? (
                                            <>
                                              <X className="w-4 h-4" />
                                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full animate-ping" />
                                            </>
                                          ) : (
                                            <Play className="w-4 h-4 ml-0.5" />
                                          )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          {/* Interactive waveform with scrubbing */}
                                          <VoiceWaveform
                                            duration={att.duration || (playingState?.messageId === message._id && playingState?.attachmentIndex === idx ? playingState.duration : 0)}
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
                                            waveformColor="rgb(239 68 68)" // red-500
                                            progressColor="rgb(220 38 38)" // red-600
                                          />
                                          <div className="flex items-center gap-2 justify-between">
                                            <span className="text-[10px] text-gray-600 dark:text-gray-400">
                                              {att.duration ? `${Math.floor(att.duration)}s` : 'Voice'}
                                            </span>
                                            {isInSequence(message._id, idx) && !isPlaying(message._id, idx) && (
                                              <span className="text-[8px] text-red-500 dark:text-red-400 opacity-75">
                                                (in queue)
                                              </span>
                                            )}
                                          </div>
                                          {/* Hidden audio element for backward compatibility */}
                                          <audio 
                                            id={`audio-${message._id}-${idx}`}
                                            src={getFileUrl(att.path)} 
                                            className="hidden"
                                            preload="auto"
                                            crossOrigin="anonymous"
                                          />
                                        </div>
                                      </div>
                                    ) : att.type === 'image' ? (
                                      <div className="mt-2 -mx-1 -my-1 first:mt-0">
                                        <img
                                          src={getFileUrl(att.path)}
                                          alt={att.originalName}
                                          className="max-w-[200px] sm:max-w-xs rounded-xl cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                          onClick={() => setLightboxImage(getFileUrl(att.path))}
                                          loading="lazy"
                                          onError={(e) => {
                                            console.error('Image load error:', att.path);
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                </div>
                                    ) : (
                                      <a
                                        href={getFileUrl(att.path)}
                                        download={att.originalName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors mt-2"
                                        onClick={(e) => {
                                          // Force download
                                          const link = document.createElement('a');
                                          link.href = getFileUrl(att.path);
                                          link.download = att.originalName;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          e.preventDefault();
                                        }}
                                      >
                                        <FileText className="w-4 h-4 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <span className="text-[10px] font-medium block truncate">{att.originalName}</span>
                                          {att.size && (
                                            <span className="text-[9px] text-gray-500 dark:text-gray-400">
                                              {(att.size / 1024).toFixed(1)} KB
                                            </span>
                                          )}
              </div>
                                      </a>
                                    )}
                                  </div>
                                ))}
                                {message.reactions.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {message.reactions.map((reaction, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded"
                                      >
                                        {reaction.emoji}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className={`flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 ${isSeller ? 'justify-end' : 'justify-start'}`}>
                            <span>{new Date(message.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                            {message.isEdited && <span className="italic opacity-75">(edited)</span>}
                            {isSeller && (() => {
                              const isFailed = message._id.startsWith('temp-') && failedMessageIds.has(message._id);
                              const status = message.status || 'sending';
                              if (isFailed) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleRetryFailedMessage(message)}
                                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                                    title="Tap to retry"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Tap to retry</span>
                                  </button>
                                );
                              }
                              if (status === 'sending') {
                                return <Clock className="w-3 h-3 opacity-75 transition-opacity duration-200" style={{ color: 'var(--text-muted)' }} />;
                              }
                              if (status === 'sent') {
                                return <Check className="w-3 h-3 opacity-75 transition-opacity duration-200" style={{ color: 'var(--text-muted)' }} />;
                              }
                              if (status === 'delivered') {
                                return (
                                  <span className="inline-flex opacity-75 transition-opacity duration-200" style={{ color: 'var(--text-muted)' }}>
                                    <Check className="w-3 h-3" /><Check className="w-3 h-3 -ml-1.5" />
                                  </span>
                                );
                              }
                              if (status === 'read') {
                                return (
                                  <span className="inline-flex opacity-100 transition-opacity duration-200 text-[#3b82f6]">
                                    <Check className="w-3 h-3" /><Check className="w-3 h-3 -ml-1.5" />
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {isSeller && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                  onClick={() => handleReactToMessage(message, '👍')}
                                  className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
                                  title="React"
                                >
                                  <Smile className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setReplyTo(message)}
                                  className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
                                  title="Reply"
                                >
                                  <Reply className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingMessage(message)}
                                  className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message)}
                                  className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                </div>
              </div>
                        {isSeller && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 overflow-hidden">
                            {user?.avatar_url && user.avatar_url.trim() ? (
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
                                    const name = user?.full_name || user?.email || 'S';
                                    parent.textContent = name[0].toUpperCase();
                                  }
                                }}
                              />
                            ) : (
                              // No profile image, use first letter (avatar)
                              (user?.full_name || user?.email || 'S')[0].toUpperCase()
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Typing indicator - WhatsApp-style bubble (buyer side), 3 animated dots */}
                  {isTyping && typingUserId && (
                    <div className="flex items-center gap-2 justify-start py-2 animate-[fadeIn_0.2s_ease-out]">
                      <div
                        className="flex items-center gap-1.5 px-[18px] py-[14px] w-16 rounded-[4px_16px_16px_16px]"
                        style={{ background: 'var(--card-bg)' }}
                      >
                        <span className="inbox-typing-dot" />
                        <span className="inbox-typing-dot" />
                        <span className="inbox-typing-dot" />
                      </div>
                    </div>
                  )}
                  {isRecordingIndicator && recordingUserId && (
                    <div className="flex items-center gap-2 justify-start py-2">
                      <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-[11px] text-gray-800 dark:text-gray-100 flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          Recording voice note... {recordingDurationIndicator > 0 && `${formatRecordingDuration(recordingDurationIndicator)}`}
                        </span>
                      </div>
                    </div>
                  )}
                  {isSelectingFile && selectingFileUserId && (
                    <div className="flex items-center gap-2 justify-start py-2">
                      <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-[11px] text-gray-800 dark:text-gray-100 flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-500 animate-pulse" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          Selecting a file{selectingFileName ? `: ${selectingFileName}` : '...'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                  {/* Scroll to bottom FAB */}
                  {showScrollBtn && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      type="button"
                      onClick={() => scrollToBottom('smooth')}
                      className="absolute bottom-4 right-6 w-10 h-10 rounded-full flex items-center justify-center border-0 cursor-pointer shadow-lg hover:scale-105 transition-transform z-10"
                      style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-sm)' }}
                      aria-label="Scroll to bottom"
                    >
                      <ChevronDown className="w-5 h-5" style={{ color: PRIMARY }} />
                    </motion.button>
                  )}
                  {/* New message pill when scrolled up */}
                  {newMessageAlert && newMessageFromName && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="button"
                      onClick={() => scrollToBottom('smooth')}
                      className="absolute bottom-4 left-1/2 rounded-full px-4 py-2 text-sm font-bold text-white border-0 cursor-pointer z-10 animate-[inboxPillBounce_1.5s_ease-in-out_infinite]"
                      style={{ background: '#f97316', boxShadow: '0 4px 16px rgba(249,115,22,0.40)' }}
                    >
                      ↓ New message from {newMessageFromName}
                    </motion.button>
                  )}
                </div>

                {/* Composer - WhatsApp-style: sticky bottom, shadow line, inner container with focus ring */}
                <div
                  className="sticky bottom-0 py-3 px-4 flex-shrink-0"
                  style={{ background: 'var(--card-bg)', boxShadow: '0 -1px 0 var(--divider)' }}
                >
                  {/* Recording Indicator - Show above input area when OTHER user is recording (receiver sees this) */}
                  {isRecordingIndicator && recordingUserId && (
                    <ChatIndicator 
                      status="recording" 
                      userName={recordingUserName || (typeof activeThread?.buyerId === 'object' ? (activeThread.buyerId.fullName || 'Buyer') : 'Buyer')}
                      duration={recordingDurationIndicator}
                      position="above"
                      className="mb-2"
                    />
                  )}
                  {replyTo && (
                    <div className="mb-2 p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg border-l-4 border-red-500 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Reply className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
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
                  {/* Upload Progress */}
                  {Array.from(uploadingFiles.entries()).map(([fileId, file]) => (
                    <div key={fileId} className="mb-2">
                      <UploadProgress
                        fileName={file.name}
                        progress={uploadProgress.get(fileId) || 0}
                        error={uploadErrors.get(fileId)}
                        onRetry={() => retryUpload(fileId)}
                        onCancel={() => {
                          setUploadingFiles(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(fileId);
                            return newMap;
                          });
                          setSelectedFiles(prev => prev.filter(f => f !== file));
                        }}
                      />
                </div>
                  ))}
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
                    <input
                      ref={voiceInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {/* Recording Mode UI - Show SEND button for voice note */}
                    {isRecording ? (
                      <>
                        <button
                          onClick={cancelRecording}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500 flex-shrink-0"
                          title="Cancel recording"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="flex-1 flex items-center justify-between bg-gray-100 dark:bg-gray-800 border border-red-500 rounded-lg px-4 py-3">
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
                                
                                if (recordedFile && activeThread) {
                                  // Auto-upload and send the voice note
                                  try {
                                    setSending(true);
                                    const uploaded = await inboxAPI.uploadFiles(
                                      [recordedFile],
                                      currentDuration,
                                      (progress) => {
                                        setUploadProgress(prev => new Map(prev).set('voice-sending', progress));
                                      }
                                    );
                                    
                                    // Send message with voice note only
                                    if (uploaded.length > 0) {
                                      await inboxAPI.sendMessage(activeThread._id, {
                                        content: '',
                                        attachments: uploaded,
                                      });
                                      
                                      // Clear voice note files and reset UI
                                      setSelectedFiles(prev => prev.filter(f => f !== recordedFile));
                                      setUploadedAttachments([]);
                                      setRecordingDuration(0);
                                      setUploadProgress(new Map());
                                      
                                      // No reload - new message will appear via WebSocket or optimistic update
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
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex-shrink-0"
                            title="Send voice note"
                          >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Normal Mode UI - Inner container: rounded-24, focus-within orange ring */}
                        <div
                          className="inbox-input-wrap flex-1 relative overflow-hidden rounded-3xl flex flex-col transition-shadow duration-200 py-2 pl-4 pr-2"
                          style={{
                            background: 'var(--bg-secondary)',
                            boxShadow: '0 0 0 1.5px var(--divider)',
                          }}
                        >
                          {/* Media Preview - WhatsApp Style: Show inside text field area */}
                          {(selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f)).length > 0 || uploadedAttachments.length > 0) && (
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
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center border border-gray-300 dark:border-gray-600">
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
                                {selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f) && !uploadedAttachments.some(a => a.originalName === f.name)).map((file, idx) => (
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
                                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center border border-gray-300 dark:border-gray-600">
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
                          {/* Text Input Area - Enter = send, Shift+Enter = new line */}
                          <div className="relative flex items-center">
                            <textarea
                              ref={messageInputRef}
                              rows={1}
                              placeholder={
                                isRecording
                                  ? `Recording... ${formatRecordingDuration(recordingDuration)}`
                                  : selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f)).length > 0 || uploadedAttachments.length > 0
                                    ? "Add a caption (optional)"
                                    : "Message..."
                              }
                              value={messageContent}
                              onChange={(e) => {
                                const textarea = e.target;
                                setMessageContent(textarea.value);
                                textarea.style.height = 'auto';
                                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
                                handleTyping();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (messageContent.trim() || uploadedAttachments.length > 0 || selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f)).length > 0) {
                                    handleSendMessage();
                                  }
                                }
                              }}
                              className={`w-full px-3 py-2 pr-20 bg-transparent text-sm focus:outline-none resize-none overflow-y-auto transition-colors ${
                                isRecording
                                  ? 'text-red-600 dark:text-red-400 placeholder-red-400 dark:placeholder-red-500 border-2 border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
                                  : (selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f)).length > 0 || uploadedAttachments.length > 0) && !messageContent.trim()
                                    ? 'text-red-500 dark:text-red-400 placeholder-red-400 dark:placeholder-red-500 border-red-300 dark:border-red-600'
                                    : 'text-gray-900 dark:text-white'
                              }`}
                              style={{ minHeight: 24, maxHeight: 120 }}
                              disabled={isRecording}
                            />
                            {/* Icons inside textarea - Show when no media or show alongside media */}
                            {!messageContent.trim() && uploadedAttachments.length === 0 && selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f)).length === 0 && (
                              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                {/* Attach - 32px, hover orange */}
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border-0 bg-transparent transition-colors active:scale-95"
                                  style={{ color: 'var(--text-muted)' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                  title="Attach file"
                                >
                                  <Paperclip className="w-4 h-4" />
                                </button>
                                {/* Image - 32px, hover orange */}
                                <button
                                  type="button"
                                  onClick={() => imageInputRef.current?.click()}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border-0 bg-transparent transition-colors active:scale-95"
                                  style={{ color: 'var(--text-muted)' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f97316'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                  title="Attach image"
                                >
                                  <ImageIcon className="w-4 h-4" />
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
                            {(selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f)).length > 0 || uploadedAttachments.length > 0) && (
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
                        {/* Send button - Always visible; disabled when empty, orange when has content (WhatsApp style) */}
                        {(() => {
                          const canSend = messageContent.trim() || uploadedAttachments.length > 0 || selectedFiles.filter(f => !Array.from(uploadingFiles.values()).includes(f)).length > 0;
                          return (
                            <button
                              type="button"
                              onClick={() => canSend && handleSendMessage()}
                              disabled={sending || !canSend}
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-all duration-200 ${
                                canSend
                                  ? 'bg-[#f97316] hover:bg-[#ea580c] text-white shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                                  : 'bg-transparent text-[var(--text-muted)] cursor-default'
                              } ${sending ? 'opacity-70 cursor-wait' : ''}`}
                              title={canSend ? 'Send message' : 'Enter a message'}
                            >
                              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                          );
                        })()}
                      </>
                    )}
          </div>
        </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 p-6" style={{ background: 'var(--bg-page)' }}>
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(124,58,237,0.08))' }}>
                  <MessageCircle className="w-12 h-12" style={{ color: PRIMARY }} />
                </div>
                <p className="text-[22px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Select a conversation</p>
                <p className="text-[14px] text-center max-w-[320px] mb-8" style={{ color: 'var(--text-muted)' }}>
                  Choose from the left to view messages or start a new chat with one of your buyers.
                </p>
                <div className="flex gap-4 mb-8 flex-wrap justify-center">
                  <div className="rounded-[14px] px-5 py-3.5 text-center min-w-[100px]" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-sm)' }}>
                    <p className="text-[20px] font-bold" style={{ color: PRIMARY }}>📬 {stats?.totalThreads ?? threads.length}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Total</p>
                  </div>
                  <div className="rounded-[14px] px-5 py-3.5 text-center min-w-[100px]" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-sm)' }}>
                    <p className="text-[20px] font-bold" style={{ color: PRIMARY }}>🔔 {totalUnread}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Unread</p>
                  </div>
                  <div className="rounded-[14px] px-5 py-3.5 text-center min-w-[100px]" style={{ background: 'var(--card-bg)', boxShadow: 'var(--shadow-sm)' }}>
                    <p className="text-[20px] font-bold" style={{ color: PRIMARY }}>⏱️ 2hr</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Avg Reply</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { loadAvailableBuyers(); setShowNewThreadDialog(true); }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white border-0 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.40)' }}
                >
                  Start New Conversation →
                </button>
              </div>
            )}
          </div>
        </div>

      {/* TIER 7 — New Conversation Modal (premium) */}
      <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <DialogContent className="sm:max-w-[480px] rounded-[24px] p-8 border-0 shadow-[var(--shadow-xl)]">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-[20px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              💬 New Conversation
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateThread} className="space-y-5" noValidate>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Search buyer or order</label>
              {loadingBuyers ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRIMARY }} />
                </div>
              ) : availableBuyers.length === 0 ? (
                <div className="w-full px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  No buyers available. Please try again later.
                </div>
              ) : (
                <select
                  value={newThreadBuyerId}
                  onChange={(e) => setNewThreadBuyerId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-0 text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  required
                  aria-required="true"
                >
                  <option value="">Select a buyer...</option>
                  {availableBuyers.map((buyer) => (
                    <option key={buyer._id} value={buyer._id}>
                      {buyer.fullName} ({buyer.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Conversation type</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'message' as const, label: '💬 Message' },
                  { value: 'rfq' as const, label: '📋 RFQ' },
                  { value: 'order' as const, label: '💰 Negotiate' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewThreadType(opt.value)}
                    className="rounded-full px-4 py-2 text-[12px] font-medium border-0 cursor-pointer transition-colors"
                    style={{
                      background: newThreadType === opt.value ? 'var(--brand-tint)' : 'var(--bg-secondary)',
                      color: newThreadType === opt.value ? PRIMARY : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Subject</label>
              <input
                type="text"
                value={newThreadSubject}
                onChange={(e) => setNewThreadSubject(e.target.value)}
                placeholder="What is this about?"
                className="w-full px-4 py-3 rounded-xl border-0 text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                required
                aria-required="true"
                minLength={3}
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Message (optional)</label>
              <textarea
                placeholder="Write your first message..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-0 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', minHeight: 100 }}
              />
            </div>
            <button
              type="submit"
              disabled={!newThreadSubject.trim() || !newThreadBuyerId || loadingBuyers || availableBuyers.length === 0 || creatingThread}
              className="w-full py-3 rounded-xl font-bold text-white border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 16px rgba(249,115,22,0.40)' }}
            >
              {loadingBuyers ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading...</>
              ) : creatingThread ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Creating...</>
              ) : availableBuyers.length === 0 ? (
                'No Buyers Available'
              ) : (
                'Start Conversation →'
              )}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxImage !== null}
        imageUrl={lightboxImage || ''}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
};

export default InboxPage;
