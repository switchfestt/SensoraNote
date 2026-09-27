import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Declaration for Web Speech API types
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

const SPEECH_LANG_MAP: Record<string, string> = {
  id: 'id-ID',
  en: 'en-US',
  'en-GB': 'en-GB',
  'en-US': 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ru: 'ru-RU',
  ar: 'ar-SA',
  hi: 'hi-IN',
  bn: 'bn-BD',
  ur: 'ur-PK',
  tr: 'tr-TR',
  vi: 'vi-VN',
  th: 'th-TH',
  nl: 'nl-NL',
  pl: 'pl-PL',
  ms: 'ms-MY',
  af: 'af-ZA',
  am: 'am-ET',
  cs: 'cs-CZ',
  da: 'da-DK',
  el: 'el-GR',
  fa: 'fa-IR',
  fi: 'fi-FI',
  he: 'he-IL',
  hu: 'hu-HU',
  km: 'km-KH',
  lo: 'lo-LA',
  my: 'my-MM',
  ne: 'ne-NP',
  pa: 'pa-IN',
  ro: 'ro-RO',
  si: 'si-LK',
  sv: 'sv-SE',
  sw: 'sw-KE',
  tl: 'fil-PH',
  uk: 'uk-UA',
  zu: 'zu-ZA',
};

export function useVoiceRecognition(initialLanguage?: string) {
  const { resolvedLanguage } = useLanguage();
  
  // Default to initialLanguage if provided, else resolved language mapping, fallback to id-ID
  const [voiceLang, setVoiceLang] = useState<string>(() => {
    if (initialLanguage) return initialLanguage;
    return SPEECH_LANG_MAP[resolvedLanguage] || 'id-ID';
  });

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as IWindow;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  });

  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);
  
  const accumulatedFinalRef = useRef('');

  // Keep voiceLang updated when resolvedLanguage changes if not manually set
  useEffect(() => {
    if (!initialLanguage && resolvedLanguage) {
      const mapped = SPEECH_LANG_MAP[resolvedLanguage] || 'id-ID';
      setVoiceLang(mapped);
    }
  }, [resolvedLanguage, initialLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const createRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as IWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      setError('Browser ini belum mendukung Web Speech Recognition. Gunakan Google Chrome atau Microsoft Edge.');
      return null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = voiceLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let sessionInterim = '';

        // resultIndex marks the first changed result. Re-reading all results
        // appends prior final phrases again on Android Chrome and Edge.
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = (result[0]?.transcript || '').trim();
          if (!text) continue;

          if (result.isFinal) {
            accumulatedFinalRef.current = [accumulatedFinalRef.current, text].filter(Boolean).join(' ').trim();
          } else {
            sessionInterim = sessionInterim ? `${sessionInterim} ${text}` : text;
          }
        }

        setTranscript(accumulatedFinalRef.current);
        setInterimTranscript(sessionInterim.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'no-speech') {
          // Normal silence, keep session active
          return;
        }
        if (event.error === 'aborted') {
          // Normal stop initiated by user
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          shouldKeepListeningRef.current = false;
          setError('Akses mikrofon tidak diizinkan. Mohon izinkan mikrofon di pengaturan browser Anda.');
          setIsListening(false);
          return;
        }
        if (event.error === 'network') {
          setError('Koneksi layanan suara terputus. Pastikan koneksi internet Anda aktif.');
          return;
        }
        if (event.error === 'audio-capture') {
          setError('Mikrofon tidak terdeteksi. Pastikan mikrofon terpasang dan tidak digunakan aplikasi lain.');
          setIsListening(false);
          shouldKeepListeningRef.current = false;
          return;
        }
        setError(`Info suara: ${event.error}`);
      };

      recognition.onend = () => {
        setInterimTranscript('');
        setTranscript(accumulatedFinalRef.current);

        if (shouldKeepListeningRef.current) {
          // Auto-restart immediately with a fresh SpeechRecognition instance
          try {
            const nextRec = createRecognition();
            if (nextRec) {
              recognitionRef.current = nextRec;
              nextRec.start();
            }
          } catch (e) {
            setTimeout(() => {
              if (shouldKeepListeningRef.current) {
                try {
                  const retryRec = createRecognition();
                  if (retryRec) {
                    recognitionRef.current = retryRec;
                    retryRec.start();
                  }
                } catch (err) {
                  setIsListening(false);
                }
              }
            }, 60);
          }
        } else {
          setIsListening(false);
        }
      };

      return recognition;
    } catch (e: any) {
      console.error('Error creating SpeechRecognition:', e);
      setIsSupported(false);
      setError('Gagal menginisialisasi Speech Recognition.');
      return null;
    }
  }, [voiceLang]);

  const startListening = useCallback(() => {
    setError(null);
    shouldKeepListeningRef.current = true;

    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setError('Pengenalan suara membutuhkan koneksi aman HTTPS.');
      return;
    }

    // Stop existing instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const rec = createRecognition();
    if (!rec) return;

    recognitionRef.current = rec;

    try {
      rec.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('Failed to start recognition immediately:', err);
      if (err.name === 'InvalidStateError') {
        setIsListening(true);
      } else {
        setError('Gagal memulai rekaman mikrofon. Coba lagi.');
        setIsListening(false);
      }
    }
  }, [createRecognition]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setTranscript(accumulatedFinalRef.current);
    setInterimTranscript('');
    setIsListening(false);
  }, []);

  const handleSetTranscript = useCallback((textOrUpdater: string | ((prev: string) => string)) => {
    setTranscript((prev) => {
      const updated = typeof textOrUpdater === 'function' ? textOrUpdater(prev) : textOrUpdater;
      accumulatedFinalRef.current = updated;
      return updated;
    });
  }, []);

  const resetTranscript = useCallback(() => {
    accumulatedFinalRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const toggleLanguage = useCallback(() => {
    setVoiceLang((prev) => (prev === 'id-ID' ? 'en-US' : 'id-ID'));
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    setTranscript: handleSetTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
    voiceLang,
    setVoiceLang,
    toggleLanguage,
  };
}
