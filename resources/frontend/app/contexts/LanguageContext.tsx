import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import idTranslations from '../locales/id.json';
import { safeLocalStorage } from '../utils/safeStorage';

// Top 20 Most Spoken Languages
export type LanguageCode = string;
export type LanguagePreference = string;

interface LanguageContextType {
  language: LanguagePreference;
  resolvedLanguage: LanguageCode;
  setLanguage: (lang: LanguagePreference) => void;
  translations: any;
  loading: boolean;
}

const SUPPORTED_LANGUAGES: LanguageCode[] = [
  'id', 'en', 'en-US', 'en-GB', 'zh', 'zh-TW', 'ja', 'ko', 'es', 'fr',
  'de', 'it', 'pt', 'ru', 'ar', 'hi', 'bn', 'ur', 'tr', 'vi',
  'th', 'nl', 'pl', 'ms', 'af', 'am', 'cs', 'da', 'el', 'fa',
  'fi', 'he', 'hu', 'km', 'lo', 'my', 'ne', 'pa', 'ro', 'si',
  'sv', 'sw', 'tl', 'uk', 'zu'
];

function detectSystemLanguage(): LanguageCode {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'id';

  const candidates: string[] = [];
  try {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      candidates.push(...navigator.languages);
    }
    if (navigator.language) {
      candidates.push(navigator.language);
    }
    if ((navigator as any).userLanguage) {
      candidates.push((navigator as any).userLanguage);
    }
    if ((navigator as any).browserLanguage) {
      candidates.push((navigator as any).browserLanguage);
    }
  } catch (e) {}

  for (const cand of candidates) {
    if (!cand || typeof cand !== 'string') continue;
    const clean = cand.trim().toLowerCase().replace(/_/g, '-');

    // 1. Exact match (case-insensitive, e.g. 'en-US', 'zh-TW', 'en-GB', 'id')
    const exact = SUPPORTED_LANGUAGES.find(l => l.toLowerCase() === clean);
    if (exact) return exact;

    // 2. Prefix match (e.g. 'id-ID' -> 'id', 'en-AU' -> 'en', 'es-ES' -> 'es', 'zh-CN' -> 'zh')
    const prefix = clean.split('-')[0];
    const prefixMatch = SUPPORTED_LANGUAGES.find(l => l.toLowerCase() === prefix);
    if (prefixMatch) return prefixMatch;
  }

  // Default to Indonesian if no match
  return 'id';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguagePreference>(() => {
    if (typeof window === 'undefined') return 'id';
    const stored = safeLocalStorage.getItem('bayu-lang') as LanguagePreference | null;
    return stored && stored !== 'system' ? stored : 'id';
  });

  const [resolvedLanguage, setResolvedLanguage] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') return 'id';
    const stored = safeLocalStorage.getItem('bayu-lang') as LanguagePreference | null;
    return stored && stored !== 'system' ? stored : 'id';
  });
  const [translations, setTranslations] = useState<any>(idTranslations);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let resolved: LanguageCode;
    if (language === 'system') {
      resolved = detectSystemLanguage();
    } else {
      resolved = language;
    }
    setResolvedLanguage(resolved);
    safeLocalStorage.setItem('bayu-lang', language);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('lang', resolved);
      document.documentElement.dir = 'ltr';
    }
  }, [language]);

  // Load translations from Backend Translation API
  useEffect(() => {
    if (resolvedLanguage === 'id') {
      setTranslations(idTranslations);
      return;
    }

    setLoading(true);
    
    // Fetch locally bundled json file from frontend locales
    import(`../locales/${resolvedLanguage}.json`)
      .then((module) => {
        setTranslations(module.default);
      })
      .catch((err) => {
        console.warn(`Translation file for ${resolvedLanguage} not found. Falling back to Indonesian.`);
        setTranslations(idTranslations);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [resolvedLanguage]);

  useEffect(() => {
    if (language !== 'system') return;

    const handleLanguageChange = () => {
      setResolvedLanguage(detectSystemLanguage());
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, [language]);

  const setLanguage = (newLang: LanguagePreference) => {
    setLanguageState(newLang);
  };

  return (
    <LanguageContext.Provider value={{ language, resolvedLanguage, setLanguage, translations, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export { SUPPORTED_LANGUAGES };
