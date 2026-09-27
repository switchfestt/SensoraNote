import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Volume2, 
  Square, 
  Trash2, 
  Plus, 
  MessageSquare, 
  ArrowLeft, 
  PanelLeftClose, 
  PanelLeft, 
  Lightbulb, 
  BookOpen, 
  GraduationCap, 
  Layers,
  RotateCcw,
  Loader2,
  AlertCircle,
  Terminal,
  Quote,
  X,
  Mic,
  MicOff,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Maximize2,
  Download,
  Globe
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MobileLayout } from '../components/MobileLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useToast } from '../contexts/ToastContext';
import { AvatarImage } from '../components/ui/DefaultImages';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  data: string; // base64 string
  previewUrl?: string;
  text_content?: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  file?: {
    name: string;
    type: string;
    size?: number;
    data?: string;
    previewUrl?: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

const STORAGE_KEY = 'sensoranote_chat_sessions_v1';
const ACTIVE_SESSION_KEY = 'sensoranote_active_session_id';

// Subcomponent for Code Block with Copy Action
function ChatCodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 sm:my-3 rounded-xl sm:rounded-2xl overflow-hidden border border-gray-200/80 dark:border-white/10 bg-[#161822] text-slate-100 shadow-sm font-mono text-[11.5px] sm:text-[13px] max-w-full w-full">
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-[#1f2230] border-b border-white/5 text-slate-400 text-[10.5px] sm:text-[11px] select-none">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-300">
          <Terminal className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-blue-400" />
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
          title="Salin kode"
        >
          {copied ? (
            <>
              <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 sm:p-4 overflow-x-auto max-w-full custom-scrollbar">
        <pre className="leading-relaxed whitespace-pre font-mono select-text">{code}</pre>
      </div>
    </div>
  );
}

// Subcomponent for LaTeX Block Math Formula
function ChatFormulaBlock({ latex }: { latex: string }) {
  let html = '';
  try {
    html = katex.renderToString(latex.trim(), { displayMode: true, throwOnError: false });
  } catch {
    html = '';
  }

  return (
    <div className="my-2.5 sm:my-3 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 overflow-x-auto max-w-full text-center font-serif text-sm sm:text-base text-gray-900 dark:text-gray-100 select-text">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <code className="font-mono text-xs text-blue-600 dark:text-blue-400">{latex}</code>
      )}
    </div>
  );
}

export default function ChatbotPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('chatbot.title') + ' — ' + t('chatbot.subtitle'));
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Voice Recognition Hook
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: isVoiceSupported,
    error: voiceError,
  } = useVoiceRecognition();

  // Multi-key resilient session loader
  const loadSavedSessions = (userId?: string): ChatSession[] => {
    try {
      const keysToTry = [
        userId ? `sensoranote_chat_sessions_${userId}` : null,
        STORAGE_KEY,
        'sensoranote_chat_sessions',
        'bayu_chat_sessions',
        'sensora_chat_sessions',
      ].filter(Boolean) as string[];

      for (const k of keysToTry) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
      return [];
    } catch {
      return [];
    }
  };

  // Sessions state (persisted reliably in localStorage)
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    return loadSavedSessions();
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const savedActive = localStorage.getItem(ACTIVE_SESSION_KEY);
    return savedActive || null;
  });

  // Reload sessions if user logs in
  useEffect(() => {
    if (user?.id) {
      const userSessions = loadSavedSessions(user.id);
      if (userSessions.length > 0) {
        setSessions(userSessions);
        if (!activeSessionId || !userSessions.some((s) => s.id === activeSessionId)) {
          setActiveSessionId(userSessions[0].id);
        }
      }
    }
  }, [user?.id]);

  // Ensure active session is selected if available
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt?: string } | null>(null);
  
  // Default sidebar: closed on mobile (< 768px), open on desktop (>= 768px)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Active session object
  const currentSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = currentSession ? currentSession.messages : [];

  // Persist sessions safely (stripping massive base64 payload to prevent 5MB quota exhaustion)
  useEffect(() => {
    try {
      const lightweightSessions = sessions.map((s) => ({
        ...s,
        messages: s.messages.map((m) => ({
          ...m,
          file: m.file
            ? {
                name: m.file.name,
                type: m.file.type,
                size: m.file.size,
                previewUrl:
                  m.file.type?.startsWith('image/') && m.file.previewUrl && m.file.previewUrl.length < 40000
                    ? m.file.previewUrl
                    : undefined,
              }
            : undefined,
        })),
      }));

      const serialized = JSON.stringify(lightweightSessions);
      if (user?.id) {
        localStorage.setItem(`sensoranote_chat_sessions_${user.id}`, serialized);
      }
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.error('Failed to save sessions to localStorage:', e);
    }
  }, [sessions, user?.id]);

  // Persist active session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }, [activeSessionId]);


  // Handle voice errors
  useEffect(() => {
    if (voiceError) {
      showToast(voiceError, 'warning');
    }
  }, [voiceError]);

  // Keyboard shortcut to close lightbox with ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, attachedFile]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (isListening) {
        stopListening();
      }
    };
  }, []);

  // Starter Prompts
  const starterPrompts = [
    {
      icon: BookOpen,
      title: t('chatbot.starter_1'),
      prompt: t('chatbot.starter_1_prompt'),
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
    },
    {
      icon: Lightbulb,
      title: t('chatbot.starter_2'),
      prompt: t('chatbot.starter_2_prompt'),
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    },
    {
      icon: Layers,
      title: t('chatbot.starter_3'),
      prompt: t('chatbot.starter_3_prompt'),
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    },
    {
      icon: GraduationCap,
      title: t('chatbot.starter_4'),
      prompt: t('chatbot.starter_4_prompt'),
      color: 'from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    },
  ];

  // Create a new session
  const createNewSession = () => {
    window.speechSynthesis.cancel();
    setPlayingId(null);
    setErrorMessage(null);
    setAttachedFile(null);
    if (isListening) stopListening();

    const newId = 'session_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: t('chatbot.new_session_title'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Delete a session
  const deleteSession = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
    setSessionToDelete(null);
  };


  // Handle File Upload Select (Supports Image, PDF, Word DOC/DOCX, HTML, TXT, MD, CSV, JSON, etc.)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      showToast('Ukuran file maksimal 15MB.', 'warning');
      return;
    }

    const fileName = file.name;
    const fileType = file.type || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    const isImage = fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif', 'tiff', 'heic', 'heif', 'ico'].includes(extension);
    const isPdf = fileType === 'application/pdf' || extension === 'pdf';
    const isWord = fileType.includes('word') || ['doc', 'docx'].includes(extension);
    const isHtml = fileType === 'text/html' || ['html', 'htm'].includes(extension);

    const reader = new FileReader();

    if (isImage) {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedFile({
          name: fileName,
          size: file.size,
          type: fileType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
          data: result,
          previewUrl: result,
        });
        showToast(`Gambar "${fileName}" siap dianalisis 🖼️`, 'success');
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedFile({
          name: fileName,
          size: file.size,
          type: 'application/pdf',
          data: result,
        });
        showToast(`Dokumen PDF "${fileName}" siap dianalisis 📄`, 'success');
      };
      reader.readAsDataURL(file);
    } else if (isWord) {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAttachedFile({
          name: fileName,
          size: file.size,
          type: extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword',
          data: result,
        });
        showToast(`Dokumen Word "${fileName}" siap dianalisis 📘`, 'success');
      };
      reader.readAsDataURL(file);
    } else if (isHtml) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachedFile({
          name: fileName,
          size: file.size,
          type: 'text/html',
          data: '',
          text_content: text,
        });
        showToast(`Dokumen HTML "${fileName}" siap dianalisis 🌐`, 'success');
      };
      reader.readAsText(file);
    } else {
      // Text / Markdown / CSV / JSON / Code files
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachedFile({
          name: fileName,
          size: file.size,
          type: fileType || 'text/plain',
          data: '',
          text_content: text,
        });
        showToast(`Berkas "${fileName}" siap dianalisis 📝`, 'success');
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    const currentAttached = attachedFile;

    if ((!textToSend.trim() && !currentAttached) || isLoading) return;

    if (isListening) {
      stopListening();
    }

    setErrorMessage(null);

    let targetSessionId = activeSessionId;
    let currentMessages: Message[] = [];

    const promptTitle = textToSend.trim() || (currentAttached ? `File: ${currentAttached.name}` : 'Percakapan');

    // If no active session, create one immediately
    if (!targetSessionId || !sessions.some((s) => s.id === targetSessionId)) {
      targetSessionId = 'session_' + Date.now();
      const firstTitle = promptTitle.slice(0, 35) + (promptTitle.length > 35 ? '...' : '');
      const newSession: ChatSession = {
        id: targetSessionId,
        title: firstTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(targetSessionId);
    } else {
      const s = sessions.find((item) => item.id === targetSessionId);
      currentMessages = s ? s.messages : [];
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      file: currentAttached ? {
        name: currentAttached.name,
        type: currentAttached.type,
        size: currentAttached.size,
        data: currentAttached.data,
        previewUrl: currentAttached.previewUrl,
      } : undefined,
    };

    const updatedMessagesWithUser = [...currentMessages, userMsg];

    // Update session state with user message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === targetSessionId) {
          const isFirstMessage = s.messages.length === 0;
          return {
            ...s,
            title: isFirstMessage ? promptTitle.slice(0, 35) + (promptTitle.length > 35 ? '...' : '') : s.title,
            updatedAt: new Date().toISOString(),
            messages: updatedMessagesWithUser,
          };
        }
        return s;
      })
    );

    setInputMessage('');
    setAttachedFile(null);
    resetTranscript();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('bayu-token') || sessionStorage.getItem('bayu-token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Build conversation history format for API
      const historyPayload = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload: any = {
        message: textToSend.trim(),
        history: historyPayload,
      };

      if (currentAttached) {
        payload.file = {
          data: currentAttached.data,
          mime_type: currentAttached.type,
          name: currentAttached.name,
          text_content: currentAttached.text_content,
        };
      }

      const res = await axios.post(
        '/api/v1/chat/message',
        payload,
        { headers, withCredentials: true }
      );

      if (res.data?.status === 'success' && res.data?.reply) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === targetSessionId) {
              return {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, botMsg],
              };
            }
            return s;
          })
        );
      } else {
        throw new Error(res.data?.message || t('chatbot.error_generic'));
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errDetail = err?.response?.data?.message || err?.message || t('chatbot.error_generic');
      setErrorMessage(errDetail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  // Handle Finish Voice and Send immediately (never writes speech into inputMessage)
  const handleFinishVoiceAndSend = () => {
    if (isLoading) {
      showToast('Mohon tunggu bot selesai menjawab sebelum mengirim pesan suara.', 'warning');
      return;
    }

    const spoken = transcript.trim();

    stopListening();
    resetTranscript();

    if (!spoken && !attachedFile) {
      showToast('Tidak ada ucapan suara yang terdeteksi.', 'info');
      textareaRef.current?.focus();
      return;
    }

    // Directly send the spoken voice message without putting it in the input form!
    handleSendMessage(spoken);
  };

  // Handle Cancel Voice without sending
  const handleCancelVoice = () => {
    stopListening();
    resetTranscript();
    showToast('Rekaman suara dibatalkan.', 'info');
    textareaRef.current?.focus();
  };

  // Handle Voice Toggle (Clicking mic button while listening finishes and sends)
  const handleToggleVoice = () => {
    if (!isVoiceSupported) {
      showToast('Browser ini belum mendukung Speech Recognition. Gunakan Google Chrome atau Microsoft Edge.', 'warning');
      return;
    }

    if (isListening) {
      handleFinishVoiceAndSend();
    } else {
      resetTranscript();
      startListening();
      showToast('Mendengarkan... Silakan bicara 🎙️', 'info');
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Text-to-Speech handler
  const toggleSpeech = (id: string, text: string) => {
    if (playingId === id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      utteranceRef.current = null;
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text from Markdown, LaTeX, and code blocks for natural speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' Blok kode pemrograman ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' Rumus ')
      .replace(/\$[^$]*\$/g, ' ')
      .replace(/^[#*`_~>-]+\s*/gm, '')
      .replace(/[*#`_~]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;
    utterance.lang = 'id-ID';
    utterance.onend = () => {
      setPlayingId(null);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setPlayingId(null);
      utteranceRef.current = null;
    };

    setPlayingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Normalize any incoming HTML tags to standard Markdown
  const normalizeContent = (raw: string): string => {
    if (!raw) return '';
    return raw
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n')
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '### $1\n')
      .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '### $1\n')
      .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '### $1\n')
      .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
      .replace(/<hr\s*\/?>/gi, '\n---\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
      .replace(/<\/?(ul|ol|p|div|span)[^>]*>/gi, '')
      .replace(/\n{3,}/g, '\n\n');
  };

  // Helper for inline styles (bold, italic, code, inline LaTeX $...$)
  const formatInlineStyles = (text: string) => {
    const sanitized = text.replace(/<\/?(h[1-6]|strong|b|em|i|code|p|span|div)[^>]*>/gi, '');
    const parts = sanitized.split(/(\$[^\$]+?\$|\*\*[^*]+?\*\*|`[^`]+?`|\*[^*]+?\*)/g);

    return parts.map((part, index) => {
      // Inline LaTeX $...$
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2 && !part.startsWith('$$')) {
        const formula = part.slice(1, -1);
        try {
          const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
          return (
            <span 
              key={index} 
              className="inline-block max-w-full overflow-x-auto px-1 font-serif text-[14px] sm:text-[15px] text-blue-600 dark:text-blue-400 align-middle" 
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          );
        } catch {
          return <code key={index} className="text-xs bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded break-all">{part}</code>;
        }
      }

      // Bold **...**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={index} className="font-bold text-gray-900 dark:text-white break-words [overflow-wrap:anywhere]">{part.slice(2, -2)}</strong>;
      }

      // Inline Code `...`
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded-lg bg-gray-100 dark:bg-white/10 text-primary font-mono text-[12px] sm:text-[13px] border border-gray-200/50 dark:border-white/5 break-all">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Italic *...*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={index} className="italic text-gray-800 dark:text-gray-200 break-words [overflow-wrap:anywhere]">{part.slice(1, -1)}</em>;
      }

      return part;
    });
  };

  // Comprehensive Markdown & LaTeX Renderer
  const renderFormattedContent = (content: string) => {
    if (!content) return null;

    const normalized = normalizeContent(content);
    const blocks: React.ReactNode[] = [];
    const lines = normalized.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Multi-line Code Block: ```language
      if (trimmed.startsWith('```')) {
        const language = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // Skip closing ```
        blocks.push(
          <ChatCodeBlock 
            key={`code_${i}`} 
            language={language} 
            code={codeLines.join('\n')} 
          />
        );
        continue;
      }

      // 2. Block LaTeX Formula: $$ formula $$
      if (trimmed.startsWith('$$')) {
        if (trimmed.endsWith('$$') && trimmed.length > 2) {
          const latex = trimmed.slice(2, -2);
          blocks.push(<ChatFormulaBlock key={`formula_${i}`} latex={latex} />);
          i++;
          continue;
        } else {
          const formulaLines: string[] = [];
          i++;
          while (i < lines.length && !lines[i].trim().endsWith('$$')) {
            formulaLines.push(lines[i]);
            i++;
          }
          if (i < lines.length) {
            formulaLines.push(lines[i].replace(/\$\$$/, ''));
            i++;
          }
          blocks.push(<ChatFormulaBlock key={`formula_${i}`} latex={formulaLines.join('\n')} />);
          continue;
        }
      }

      // 3. Horizontal Divider: --- or ***
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        blocks.push(
          <hr 
            key={`hr_${i}`} 
            className="my-3 sm:my-4 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-white/15 to-transparent" 
          />
        );
        i++;
        continue;
      }

      // 4. Blockquote: > quote text
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [trimmed.replace(/^>\s?/, '')];
        i++;
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        blocks.push(
          <blockquote 
            key={`quote_${i}`}
            className="my-2.5 sm:my-3 pl-3 sm:pl-4 pr-2.5 sm:pr-3 py-2 sm:py-2.5 rounded-r-xl sm:rounded-r-2xl border-l-4 border-amber-500 bg-amber-50/60 dark:bg-amber-500/10 text-gray-700 dark:text-gray-300 text-[12.5px] sm:text-[13.5px] italic flex items-start gap-2 sm:gap-2.5 max-w-full overflow-hidden break-words [overflow-wrap:anywhere]"
          >
            <Quote className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1 min-w-0 break-words [overflow-wrap:anywhere]">
              {quoteLines.map((qLine, qIdx) => (
                <p key={qIdx} className="break-words [overflow-wrap:anywhere]">{formatInlineStyles(qLine)}</p>
              ))}
            </div>
          </blockquote>
        );
        continue;
      }

      // 5. Headings
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].replace(/\s*#+$/, '');

        if (level === 1) {
          blocks.push(
            <h2 key={`h1_${i}`} className="font-['Lexend_Deca'] font-black text-[16px] sm:text-[18px] text-gray-900 dark:text-white mt-3.5 sm:mt-4 mb-1.5 sm:mb-2 pb-1 sm:pb-1.5 border-b border-gray-200 dark:border-white/10 break-words [overflow-wrap:anywhere]">
              {formatInlineStyles(text)}
            </h2>
          );
        } else if (level === 2) {
          blocks.push(
            <h3 key={`h2_${i}`} className="font-['Lexend_Deca'] font-extrabold text-[15px] sm:text-[16.5px] text-blue-600 dark:text-blue-400 mt-3 sm:mt-4 mb-1 sm:mb-1.5 pb-1 border-b border-blue-100 dark:border-blue-500/20 break-words [overflow-wrap:anywhere]">
              {formatInlineStyles(text)}
            </h3>
          );
        } else if (level === 3) {
          blocks.push(
            <h4 key={`h3_${i}`} className="font-['Lexend_Deca'] font-bold text-[14px] sm:text-[15px] text-gray-900 dark:text-gray-100 mt-2.5 sm:mt-3 mb-1 break-words [overflow-wrap:anywhere]">
              {formatInlineStyles(text)}
            </h4>
          );
        } else {
          blocks.push(
            <h5 key={`h4_${i}`} className="font-['Lexend_Deca'] font-bold text-[13px] sm:text-[14px] text-blue-600 dark:text-blue-400 mt-2 sm:mt-2.5 mb-0.5 sm:mb-1 break-words [overflow-wrap:anywhere]">
              {formatInlineStyles(text)}
            </h5>
          );
        }
        i++;
        continue;
      }

      // 6. Bullet Lists
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        blocks.push(
          <div key={`bullet_${i}`} className="flex items-start gap-2 pl-1 sm:pl-2 my-0.5 sm:my-1 min-w-0 max-w-full">
            <span className="text-primary mt-1 text-[8px] sm:text-[9px] font-bold shrink-0">•</span>
            <span className="flex-1 text-[13.5px] sm:text-[14px] leading-relaxed break-words [overflow-wrap:anywhere] min-w-0">{formatInlineStyles(trimmed.substring(2))}</span>
          </div>
        );
        i++;
        continue;
      }

      // 7. Numbered Lists
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        blocks.push(
          <div key={`num_${i}`} className="flex items-start gap-2 pl-1 sm:pl-2 my-0.5 sm:my-1 min-w-0 max-w-full">
            <span className="text-primary font-bold text-[11px] sm:text-xs mt-0.5 min-w-[16px] sm:min-w-[18px] px-1 py-0.5 rounded bg-primary/10 text-center shrink-0">
              {numberedMatch[1]}
            </span>
            <span className="flex-1 text-[13.5px] sm:text-[14px] leading-relaxed break-words [overflow-wrap:anywhere] min-w-0">{formatInlineStyles(numberedMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // 8. Empty lines
      if (!trimmed) {
        blocks.push(<div key={`empty_${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // 9. Regular Paragraph
      blocks.push(
        <p key={`p_${i}`} className="leading-relaxed text-[13.5px] sm:text-[14.5px] break-words [overflow-wrap:anywhere]">
          {formatInlineStyles(line)}
        </p>
      );
      i++;
    }

    return <div className="space-y-1.5 select-text w-full max-w-full overflow-hidden break-words [overflow-wrap:anywhere]">{blocks}</div>;
  };

  return (
    <MobileLayout hideSidebar={true} hideTopNav={true} hideMobileTopNav={true} showBottomNav={false}>
      {/* Hidden File Input supporting all requested formats */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.html,.htm,.txt,.md,.json,.csv,.rtf,.xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,text/plain"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="fixed inset-0 h-[100dvh] w-full max-w-full flex bg-white dark:bg-[#0E0C17] text-gray-900 dark:text-gray-100 overflow-hidden font-['Manrope'] z-50 select-none md:select-auto">
        
        {/* MOBILE BACKDROP OVERLAY */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR: Riwayat Chat & Tombol Percakapan Baru */}
        <aside
          className={`
            fixed md:relative inset-y-0 left-0 z-40
            h-full bg-gray-50/95 dark:bg-[#141221] border-r border-gray-200/70 dark:border-white/5 
            flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden
            ${isSidebarOpen 
              ? 'w-72 sm:w-80 translate-x-0 shadow-2xl md:shadow-none' 
              : 'w-0 -translate-x-full md:translate-x-0 md:w-0'
            }
          `}
        >
          {/* Sidebar Top: Back to Home + Logo + Mobile Close */}
          <div className="p-3.5 sm:p-4 border-b border-gray-200/50 dark:border-white/5 flex items-center justify-between shrink-0 h-14">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-gray-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title={t('chatbot.back_to_home')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('chatbot.back_to_home')}</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sensora AI</span>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={t('chatbot.close_sidebar')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-3 shrink-0">
            <button
              onClick={createNewSession}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-['Lexend_Deca'] font-bold text-xs shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('chatbot.new_chat')}</span>
            </button>
          </div>

          {/* Sessions List (History) */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 custom-scrollbar">
            <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-400 font-['Lexend_Deca']">
              {t('chatbot.chat_history')}
            </div>

            {sessions.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{t('chatbot.no_history')}</p>
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      setErrorMessage(null);
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-primary font-bold shadow-xs'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                      <span className="truncate">{s.title}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all shrink-0 cursor-pointer"
                      title={t('chatbot.delete_chat')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer with Live Profile Photo */}
          <div className="p-3 sm:p-3.5 border-t border-gray-200/50 dark:border-white/5 bg-gray-100/50 dark:bg-[#110F1C] shrink-0 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 h-14">
            <div className="flex items-center gap-2.5 truncate">
              <AvatarImage 
                src={user?.avatar} 
                name={user?.name} 
                size={28} 
                className="ring-2 ring-primary/20 shadow-xs shrink-0" 
              />
              <span className="truncate font-bold font-['Manrope'] text-gray-800 dark:text-gray-200">{user?.name || t('chatbot.user')}</span>
            </div>
          </div>
        </aside>

        {/* MAIN CHAT AREA */}
        <main className="flex-1 h-full flex flex-col relative w-full min-w-0 max-w-full bg-white dark:bg-[#0E0C17] overflow-hidden">
          
          {/* Top Bar Navigation */}
          <header className="h-14 px-3 sm:px-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#0E0C17]/80 backdrop-blur-md z-10 w-full max-w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title={isSidebarOpen ? t('chatbot.close_sidebar') : t('chatbot.open_sidebar')}
              >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-['Lexend_Deca'] font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                    {currentSession?.title || t('chatbot.title')}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
              <button
                onClick={createNewSession}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title={t('chatbot.clear_chat')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('chatbot.clear_chat')}</span>
              </button>

              <button
                onClick={() => navigate('/home')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5"
                title={t('chatbot.back_to_home')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline">{t('chatbot.back_to_home')}</span>
              </button>
            </div>
          </header>

          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar w-full max-w-full mx-auto min-h-0 transition-all duration-300 ${
            isSidebarOpen ? 'max-w-4xl' : 'max-w-6xl 2xl:max-w-7xl'
          }`}>
            {messages.length === 0 ? (
              <div className="min-h-full my-auto flex flex-col items-center justify-center text-center p-2 sm:p-8 max-w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 flex items-center justify-center text-primary mb-2.5 sm:mb-4 shadow-sm shrink-0">
                  <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-lg sm:text-2xl font-['Lexend_Deca'] font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
                  {t('chatbot.welcome_title')}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4 sm:mb-8 font-['Manrope'] px-2">
                  {t('chatbot.welcome_subtitle')}
                </p>

                {/* Starter Prompts Grid */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full text-left transition-all ${
                  isSidebarOpen ? 'max-w-2xl' : 'max-w-4xl'
                }`}>
                  {starterPrompts.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (item.prompt.endsWith(': ')) {
                          setInputMessage(item.prompt);
                          textareaRef.current?.focus();
                        } else {
                          handleSendMessage(item.prompt);
                        }
                      }}
                      className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-[#161424] border border-gray-200/60 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500/40 hover:shadow-md transition-all group flex items-start gap-2.5 sm:gap-3 text-left cursor-pointer max-w-full"
                    >
                      <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br ${item.color} shrink-0 mt-0.5`}>
                        <item.icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-[13px] font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors font-['Lexend_Deca'] truncate">
                          {item.title}
                        </h3>
                        <p className="text-[10.5px] sm:text-[11.5px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {item.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isImageMsg = isUser && msg.file && (msg.file.type.startsWith('image/') || msg.file.previewUrl);

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2.5 sm:gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} group w-full max-w-full`}
                    >
                      {/* Avatar */}
                      <div className="shrink-0">
                        {isUser ? (
                          <AvatarImage 
                            src={user?.avatar} 
                            name={user?.name} 
                            size={32} 
                            className="rounded-xl shadow-xs ring-1 ring-primary/30" 
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[88%] sm:max-w-[80%] min-w-0 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        {isUser ? (
                          isImageMsg ? (
                            /* User Message with Image - Fitted tightly to image dimensions */
                            <div className="flex flex-col items-end max-w-full">
                              <div
                                onClick={() => setLightboxImage({ src: msg.file?.previewUrl || msg.file?.data!, alt: 'Lampiran Gambar' })}
                                className="relative group rounded-2xl overflow-hidden border border-white/25 shadow-md cursor-zoom-in transition-all hover:border-white/50 bg-black/20 w-fit max-w-[260px] sm:max-w-[340px]"
                              >
                                <img
                                  src={msg.file?.previewUrl || msg.file?.data}
                                  alt="Lampiran Gambar"
                                  className="max-h-72 sm:max-h-80 w-auto max-w-full object-contain rounded-2xl block transition-transform duration-300 group-hover:scale-[1.02]"
                                />
                                {/* Zoom Hover Overlay */}
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold font-['Manrope'] backdrop-blur-xs">
                                  <Maximize2 className="w-4 h-4" />
                                  <span>Perbesar</span>
                                </div>
                              </div>

                              {/* Text Message attached with Image */}
                              {msg.content && msg.content.trim() && !msg.content.startsWith('Tolong analisis file:') && (
                                <div className="mt-1.5 bg-primary text-white rounded-2xl rounded-tr-none px-3.5 py-2.5 shadow-sm max-w-full break-words [overflow-wrap:anywhere] select-text">
                                  <p className="whitespace-pre-wrap text-[13.5px] sm:text-[14.5px] leading-relaxed font-['Manrope']">
                                    {msg.content}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* User Message with Document or Plain Text */
                            <div className="bg-primary text-white rounded-2xl rounded-tr-none px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm max-w-full overflow-hidden break-words [overflow-wrap:anywhere] select-text w-fit">
                              {msg.file && (
                                <div className="mb-2.5 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-['Manrope'] font-bold border border-white/20 shadow-xs w-full">
                                  {msg.file.type === 'application/pdf' ? (
                                    <div className="w-8 h-8 rounded-lg bg-red-500/30 text-red-100 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  ) : msg.file.type.includes('word') || msg.file.name.endsWith('.docx') || msg.file.name.endsWith('.doc') ? (
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/30 text-blue-100 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  ) : msg.file.type.includes('html') || msg.file.name.endsWith('.html') || msg.file.name.endsWith('.htm') ? (
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/30 text-emerald-100 flex items-center justify-center shrink-0">
                                      <Globe className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-slate-500/30 text-slate-100 flex items-center justify-center shrink-0">
                                      <FileIcon className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-[12.5px] leading-tight">{msg.file.name}</p>
                                    <p className="text-[10px] text-white/80 font-normal mt-0.5">{msg.file.type.split('/')[1]?.toUpperCase() || 'BERKAS'}</p>
                                  </div>
                                </div>
                              )}
                              {msg.content && (
                                <p className="whitespace-pre-wrap text-[13.5px] sm:text-[14.5px] leading-relaxed font-['Manrope']">
                                  {msg.content}
                                </p>
                              )}
                            </div>
                          )
                        ) : (
                          /* AI Model Response Bubble */
                          <div className="bg-gray-50 dark:bg-[#161424] text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-white/5 rounded-2xl rounded-tl-none px-3.5 py-3 sm:px-4 sm:py-3.5 shadow-sm max-w-full overflow-hidden break-words [overflow-wrap:anywhere]">
                            <div className="max-w-full overflow-hidden">
                              {renderFormattedContent(msg.content)}
                            </div>
                          </div>
                        )}

                        {/* Actions for AI responses */}
                        {!isUser && (
                          <div className="flex items-center gap-1 sm:gap-1.5 mt-1 pl-1 text-[11px] sm:text-xs">
                            <button
                              onClick={() => toggleSpeech(msg.id, msg.content)}
                              className={`flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg transition-colors cursor-pointer ${
                                playingId === msg.id
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold'
                                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                              }`}
                              title={playingId === msg.id ? t('chatbot.stop_audio') : t('chatbot.play_audio')}
                            >
                              {playingId === msg.id ? (
                                <>
                                  <Square className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="currentColor" />
                                  <span>{t('chatbot.stop_audio')}</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                  <span>{t('chatbot.play_audio')}</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => copyToClipboard(msg.id, msg.content)}
                              className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title={t('chatbot.copy')}
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-bold">{t('chatbot.copied')}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                  <span>{t('chatbot.copy')}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2.5 sm:gap-3.5 max-w-full">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="bg-gray-50 dark:bg-[#161424] rounded-2xl rounded-tl-none border border-gray-200/50 dark:border-white/5 px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center gap-2 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 font-['Manrope'] font-medium">{t('chatbot.thinking')}</span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs sm:text-sm max-w-full">
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="font-bold font-['Lexend_Deca']">{t('chatbot.error_title')}</p>
                        <p className="leading-relaxed break-words [overflow-wrap:anywhere]">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <footer className="p-2 sm:p-4 border-t border-gray-100 dark:border-white/5 bg-white/95 dark:bg-[#0E0C17]/95 backdrop-blur-md shrink-0 w-full max-w-full z-20 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
            <div className={`mx-auto transition-all duration-300 w-full max-w-full ${
              isSidebarOpen ? 'max-w-4xl' : 'max-w-6xl 2xl:max-w-7xl'
            }`}>
              
              {/* Attached File Preview Chip */}
              {attachedFile && (
                <div className="mb-2 inline-flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-blue-50/90 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-gray-800 dark:text-gray-200 text-xs shadow-xs animate-in fade-in zoom-in duration-200 max-w-full">
                  {attachedFile.previewUrl ? (
                    <img
                      src={attachedFile.previewUrl}
                      alt={attachedFile.name}
                      className="w-10 h-10 object-cover rounded-xl shrink-0 border border-blue-300/40"
                    />
                  ) : attachedFile.type === 'application/pdf' ? (
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  ) : attachedFile.type.includes('word') || attachedFile.name.endsWith('.docx') || attachedFile.name.endsWith('.doc') ? (
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  ) : attachedFile.type.includes('html') || attachedFile.name.endsWith('.html') || attachedFile.name.endsWith('.htm') ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-primary flex items-center justify-center shrink-0">
                      <FileIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[12px] truncate max-w-[200px] sm:max-w-[300px]">{attachedFile.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {(attachedFile.size / 1024).toFixed(1)} KB • {attachedFile.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer ml-1 shrink-0"
                    title="Hapus lampiran"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Listening Live Transcript Banner */}
              {isListening && (
                <div className="mb-2 flex items-center justify-between gap-2 px-3 sm:px-3.5 py-2 rounded-2xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 border border-red-500/25 text-xs text-gray-800 dark:text-gray-200 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 hidden xs:inline sm:inline">{t('chatbot.listening')}</span>
                    <span className="truncate italic text-gray-700 dark:text-gray-300 font-medium">
                      {interimTranscript || transcript || t('chatbot.listening_placeholder')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCancelVoice}
                      className="px-2.5 py-1 rounded-lg bg-gray-200/80 dark:bg-white/10 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 text-[11px] font-medium text-gray-600 dark:text-gray-300 transition-colors cursor-pointer flex items-center gap-1"
                      title={t('chatbot.cancel')}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{t('chatbot.cancel')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFinishVoiceAndSend}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-600 active:scale-95 shadow-xs transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                      title={t('chatbot.finish')}
                    >
                      <span>{t('chatbot.finish')}</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Main Input Box */}
              <div className="relative flex items-end gap-1.5 sm:gap-2 bg-gray-50 dark:bg-[#161424] rounded-2xl border border-gray-200/80 dark:border-white/10 p-1.5 sm:p-2 shadow-sm focus-within:border-blue-500/60 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all max-w-full">
                
                {/* File Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className={`p-2 sm:p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    attachedFile
                      ? 'bg-blue-50 dark:bg-blue-500/20 text-primary'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-white/5'
                  }`}
                  title={t('chatbot.attach_file')}
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Voice Microphone Button */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  disabled={isLoading}
                  className={`p-2 sm:p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-white/5'
                  }`}
                  title={isListening ? t('chatbot.mic_finish') : t('chatbot.mic_start')}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Textarea Input */}
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleInputResize}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? t('chatbot.listening_input_placeholder')
                      : attachedFile
                      ? t('chatbot.file_input_placeholder')
                      : t('chatbot.input_placeholder')
                  }
                  rows={1}
                  disabled={isLoading}
                  className="w-full bg-transparent border-0 resize-none px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs sm:text-sm text-gray-800 dark:text-gray-100 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 custom-scrollbar max-h-24 sm:max-h-36 select-text"
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={(!inputMessage.trim() && !attachedFile) || isLoading}
                  className={`p-2 sm:p-2.5 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                    (inputMessage.trim() || attachedFile) && !isLoading
                      ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 cursor-pointer'
                      : 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  title={t('chatbot.send')}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </footer>

        </main>

        {/* Fullscreen Image Pop-up / Lightbox Modal */}
        {lightboxImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 select-none"
            onClick={() => setLightboxImage(null)}
          >
            <div 
              className="relative max-w-5xl max-h-[95vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar */}
              <div className="w-full flex items-center justify-between gap-3 text-white pb-3 px-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-['Manrope'] font-bold truncate max-w-xs sm:max-w-md">
                    {lightboxImage.alt || 'Pratinjau Gambar'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={lightboxImage.src}
                    download="gambar_sensora.png"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Unduh / Buka Gambar Asli"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setLightboxImage(null)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Tutup (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Lightbox Image Preview */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/50 max-h-[82vh] flex items-center justify-center">
                <img
                  src={lightboxImage.src}
                  alt={lightboxImage.alt || 'Full View'}
                  className="max-h-[82vh] max-w-full object-contain rounded-2xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Delete Session Dialog */}
        <ConfirmDialog
          isOpen={!!sessionToDelete}
          onOpenChange={(open) => !open && setSessionToDelete(null)}
          title={t('chatbot.delete_confirm_title')}
          description={t('chatbot.delete_confirm_desc')}
          onConfirm={() => sessionToDelete && deleteSession(sessionToDelete)}
          confirmText={t('chatbot.delete_confirm_btn')}
          cancelText={t('chatbot.cancel')}
          variant="danger"
        />

      </div>
    </MobileLayout>
  );
}
