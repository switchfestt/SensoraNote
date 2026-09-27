import { useDocumentTitle } from '../hooks/useDocumentTitle';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValue } from 'motion/react';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';
import { ScrollToTop } from '../components/scroll-to-top';
import { AuthModal } from '../components/auth-modal';
import { BrutalistLoader } from '../components/brutalist-loader';
import ApplicationLogo from '../components/ApplicationLogo';
import AccordionGallery from '../components/AccordionGallery';
import BorderGlow from '../components/BorderGlow';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { safeSessionStorage } from '../utils/safeStorage';
import { Navigate } from 'react-router';
import {
  BookOpen, Search, Shield, Zap, ArrowRight,
  Globe, Users, Star, CheckCircle2, Layers,
  PenTool, Flame, Trophy, Eye, Bookmark, Sparkles,
  Code, Award, Share2, CornerDownRight, Terminal,
  Shuffle, CalendarClock, Mic, Languages, ChevronDown,
  Bot, Volume2, Ear, Sliders, PersonStanding, Printer, ScanText, FileText
} from 'lucide-react';
import { mataPelajaran } from '../data/mockData';
import katex from 'katex';
import 'katex/dist/katex.min.css';
/* ===================================================
   DATA: Multilingual "Education" words
   =================================================== */
const MULTI_LANG_TEXTS = [
  { code: 'ID', flagImg: 'https://flagcdn.com/w80/id.png', flag: '🇮🇩', lang: 'Bahasa Indonesia', text: `Catat Cerdas,\nBagikan Idimu\nDi Sini!`, badge: 'BAHASA INDONESIA AKTIF' },
  { code: 'EN', flagImg: 'https://flagcdn.com/w80/us.png', flag: '🇺🇸', lang: 'English (US)', text: `Transform Notes,\nShare Your Mind\nRight Here!`, badge: 'GLOBAL ENGLISH ACTIVE' },
  { code: 'JA', flagImg: 'https://flagcdn.com/w80/jp.png', flag: '🇯🇵', lang: '日本語 (Japanese)', text: `ノートを整理し、\n知恵を分かち合おう\n今ここで！`, badge: '日本語モードが有効' },
  { code: 'AR', flagImg: 'https://flagcdn.com/w80/sa.png', flag: '🇸🇦', lang: 'العربية (Arabic)', text: `دوّن ملاحظاتك،\nوشارك أفكارك الذكية\nهنا الآن!`, badge: 'اللغة العربية نشطة' },
  { code: 'ES', flagImg: 'https://flagcdn.com/w80/es.png', flag: '🇪🇸', lang: 'Español', text: `¡Toma notas,\ncomparte tus ideas\naquí hoy!`, badge: 'ESPAÑOL ACTIVO' },
  { code: 'FR', flagImg: 'https://flagcdn.com/w80/fr.png', flag: '🇫🇷', lang: 'Français', text: `Prenez des notes,\npartagez vos idées\nici maintenant !`, badge: 'FRANÇAIS ACTIF' },
  { code: 'DE', flagImg: 'https://flagcdn.com/w80/de.png', flag: '🇩🇪', lang: 'Deutsch', text: `Notizen erfassen,\nWissen austauschen\ngenau hier!`, badge: 'DEUTSCH AKTIV' },
  { code: 'KO', flagImg: 'https://flagcdn.com/w80/kr.png', flag: '🇰🇷', lang: '한국어 (Korean)', text: `스마트하게 기록하고,\n지식을 공유하세요\n바로 여기서!`, badge: '한국어 모드 활성화' },
  { code: 'ZH', flagImg: 'https://flagcdn.com/w80/cn.png', flag: '🇨🇳', lang: '简体中文 (Chinese)', text: `智能整理笔记，\n在这里分享\n你的灵感！`, badge: '简体中文模式已启用' },
  { code: 'ZU', flagImg: 'https://flagcdn.com/w80/za.png', flag: '🇿🇦', lang: 'isiZulu', text: `Sawubona,\nYabelana ngamanothi akho\nLapha!`, badge: 'IZILIMI EZININGI IYASEBENZA' }
];

/* ===================================================
   COMPONENT: Slot Machine Flag Reel (Light Theme)
   =================================================== */
function Reel({ activeIndex, delay }: { activeIndex: number; delay: number }) {
  return (
    <div className="relative h-16 w-16 overflow-hidden bg-[#FAF6EE] border-2 border-[#D4C3AC] rounded-2xl flex items-center justify-center shadow-[inset_0_4px_16px_rgba(0,0,0,0.06)]">
      {/* 3D Vignette Overlay for curved cylinder effect */}
      <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#FAF6EE] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#FAF6EE] to-transparent z-10 pointer-events-none" />
      
      {/* Centered Slot Highlight Area */}
      <div className="absolute inset-y-2.5 inset-x-0 bg-blue-500/10 border-y border-blue-500/30 pointer-events-none z-10" />
      {/* Centered Slot Laser Line */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent pointer-events-none z-10 -translate-y-1/2 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />

      <motion.div
        className="absolute top-0 left-0 w-full flex flex-col items-center justify-start"
        animate={{ y: -activeIndex * 64 }}
        transition={{
          type: "spring",
          stiffness: 110,
          damping: 13,
          mass: 0.7,
          delay: delay
        }}
      >
        {MULTI_LANG_TEXTS.map((lang, idx) => (
          <div key={idx} className="h-16 w-16 flex items-center justify-center select-none">
            <img 
              src={lang.flagImg} 
              alt={lang.code} 
              className="w-10 h-7 object-cover rounded-md shadow-md border border-[#D4C3AC] transform group-hover/slot:scale-105 transition-transform" 
              loading="lazy"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ===================================================
   COMPONENT: Infinite Scroll Marquee Row (Light Theme)
   =================================================== */
function MarqueeRow({ items, direction = 'left', speed = 30 }: { items: string[]; direction?: 'left' | 'right'; speed?: number }) {
  const duplicatedItems = [...items, ...items];
  
  return (
    <div className="flex w-full overflow-hidden py-1 relative">
      <motion.div
        className="flex gap-4 whitespace-nowrap"
        animate={{
          x: direction === 'left' ? ["0%", "-50%"] : ["-50%", "0%"]
        }}
        transition={{
          ease: "linear",
          duration: speed,
          repeat: Infinity,
        }}
      >
        {duplicatedItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm backdrop-blur-xl text-sm font-bold text-slate-700 hover:border-blue-400/50 transition-all duration-300 select-none"
          >
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  );
}



/* ===================================================
   COMPONENT: Subtle Paper Texture Background Element (Lightweight)
   =================================================== */
function GrainNoise() {
  return null;
}

/* ===================================================
   COMPONENT: Text Scroll Highlight Reveal (Motto Style) — Light
   =================================================== */
function ScrollRevealText() {
  const { t } = useTranslation();
  const text = t('landing.philosophy_text') || "Kami percaya bahwa pendidikan terbaik lahir dari kolaborasi. SensoraNote hadir untuk membantu Anda menyusun gagasan, berbagi wawasan, dan tumbuh bersama dalam komunitas belajar yang saling mendukung.";

  return (
    <div id="visi-misi" className="relative py-20 md:py-36 bg-[#FAF6EE] flex items-center justify-center border-t-2 border-dashed border-[#D4C3AC] overflow-hidden">
      {/* Dot Grid Paper Background */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#C5B39B 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Decorative radial lighting behind text */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-[0.08] pointer-events-none"
           style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 60%)' }} />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
        {/* Notebook Sticker Badge Tag */}
        <div className="block mb-6">
          <span className="inline-block px-3.5 py-1.5 bg-[#FFFDF7] border border-[#4A2E1B]/30 shadow-[2px_2px_0px_#4A2E1B] rounded-md -rotate-1 text-xs font-mono font-extrabold text-blue-700 uppercase tracking-widest">
            ✏️ {t('landing.philosophy_vision') || 'VISI KAMI'}
          </span>
        </div>

        <motion.h3 
          className="font-display font-black tracking-tight leading-[1.35] text-center text-slate-900" 
          style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.5rem)' }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {text}
        </motion.h3>

        {/* Notebook Paper Motto Card Tag */}
        <motion.div 
          className="mt-8 md:mt-12 inline-flex items-center gap-3 text-xs md:text-sm font-mono font-extrabold text-[#3D2314] bg-[#FFFDF7] border-2 border-[#4A2E1B]/30 shadow-[4px_4px_0px_#4A2E1B] px-5 py-3 rounded-2xl relative"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Corner Washi Tape Pin Accent */}
          <div className="absolute -top-1.5 left-6 w-8 h-3.5 bg-[#E8DCC4] border-x border-[#C5B39B] rotate-[-3deg] pointer-events-none" />

          <CornerDownRight className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{t('landing.philosophy_motto') || 'Filosofi SensoraNote — Belajar, Berbagi, Tumbuh Bersama'}</span>
        </motion.div>
      </div>
    </div>
  );
}

/* ===================================================
   COMPONENT: Cyberpunk Scramble/Morphing Text Effect
   =================================================== */
function MorphingText({ text, className = "" }: { text: string; className?: string }) {
  const [displayVal, setDisplayVal] = useState(text);
  const prevTextRef = useRef(text);

  useEffect(() => {
    let iterations = 0;
    const maxLen = Math.max(text.length, prevTextRef.current.length);
    const interval = setInterval(() => {
      setDisplayVal(() => {
        let result = "";
        for (let i = 0; i < maxLen; i++) {
          const targetChar = text[i] || "";
          
          if (targetChar === " " || targetChar === "\n" || targetChar === ":" || targetChar === "_" || targetChar === "-" || targetChar === "[" || targetChar === "]") {
            result += targetChar;
            continue;
          }

          if (i < iterations) {
            result += targetChar;
          } else {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*";
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        return result;
      });

      if (iterations >= maxLen) {
        clearInterval(interval);
        prevTextRef.current = text;
      }
      iterations += 0.5;
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{displayVal}</span>;
}

/* ===================================================
   COMPONENT: Interactive Count-Up Animation
   =================================================== */
function CountUp({ to, duration = 1.5 }: { to: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let frameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      setCount(Math.floor(easeProgress * to));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [to, duration]);

  return <span>{count}</span>;
}

/* ===================================================
   COMPONENT: Interactive Notebook Scribble Topic Warp Section (Light)
   =================================================== */
function TopicWarpSection({ openAuthModal }: { openAuthModal: (tab: 'login' | 'register') => void }) {
  const { t } = useTranslation();

  const TOPIC_CHIPS_1 = [
    "📐 Calculus", "🔬 Quantum Mechanics", "💻 Data Structures", "🧪 Organic Chemistry",
    "🧫 Microbiology", "🤖 Machine Learning", "🌌 Astrophysics", "🧬 Genetics",
    "📐 Geometry", "📚 Linguistics", "🏛️ World History", "🌍 Sociology", "🔥 Thermodynamics",
    "数学", "量子力学", "アルゴリズム", "有機化学", "微生物学"
  ];

  const TOPIC_CHIPS_2 = [
    "대수학", "생물학", "화학", "데이터 구조", "Álgebra", "Biología Celular",
    "الخوارزميات", "الهندسة", "Physique", "Astronomie", "Relativität", "Künstliche Intelligenz",
    "Геометрия", "Анатомия", "रसायन विज्ञान", "Algoritma", "Filsafat", "Kriptografi", "Struktur Data"
  ];

  return (
    <div className="relative py-16 md:py-24 w-full bg-[#FAF6EE] border-t-2 border-b-2 border-dashed border-[#D4C3AC] overflow-hidden select-none">
      {/* Hand-drawn notebook dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#C5B39B 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Ambient color aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[25vw] bg-gradient-to-r from-blue-300/20 via-indigo-300/20 to-amber-300/20 blur-3xl pointer-events-none" />

      {/* Floating Notebook Doodle Accents */}
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-8 left-10 text-amber-700/30 text-2xl font-mono pointer-events-none hidden md:block"
      >
        ✦ ⚛️
      </motion.div>
      <motion.div
        animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 right-12 text-blue-700/30 text-2xl font-mono pointer-events-none hidden md:block"
      >
        💡 ∫ f(x)
      </motion.div>

      {/* Hand-Drawn Taped Notebook Scribble Card Header */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 mb-12 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative inline-block group"
        >
          {/* Decorative Washi Tape Pins at Top Corners */}
          <div className="absolute -top-3 left-4 w-12 h-5 bg-[#E3D7C5]/80 border-x border-[#C5B39B] rotate-[-5deg] z-20 shadow-2xs pointer-events-none" />
          <div className="absolute -top-3 right-4 w-12 h-5 bg-[#E3D7C5]/80 border-x border-[#C5B39B] rotate-[5deg] z-20 shadow-2xs pointer-events-none" />

          {/* Notebook Sticky Note Card */}
          <div className="relative px-8 py-4 rounded-2xl bg-[#FFFDF7] border-2 border-[#4A2E1B]/40 shadow-[5px_5px_0px_#4A2E1B] -rotate-1 group-hover:rotate-0 transition-transform duration-300 flex items-center justify-center">
            <h3 className="font-serif italic text-[#3D2314] text-xl md:text-3xl font-extrabold tracking-wide">
              {t('landing.and_many_more') || 'dan masih banyak lagi topik lainnya...'}
            </h3>

            {/* Hand-Drawn Scribble Underline SVG Path */}
            <svg className="absolute -bottom-3 left-6 right-6 w-[88%] h-3.5 text-blue-600/80 pointer-events-none" viewBox="0 0 200 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M 3 6 Q 50 1, 100 8 T 197 4" />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* GPU Accelerated Smooth Tickers */}
      <div className="relative w-full overflow-hidden flex flex-col gap-5">
        <MarqueeRow items={TOPIC_CHIPS_1} direction="left" speed={35} />
        <MarqueeRow items={TOPIC_CHIPS_2} direction="right" speed={40} />
      </div>
    </div>
  );
}

/* ===================================================
   COMPONENT: Interactive Landing Page (Light Theme)
   =================================================== */
export function LandingPageLight() {
    const { t } = useTranslation();
    const { user, isLoading: isAuthLoading } = useAuth();
    useDocumentTitle(t('titles.welcome'));

    if (!isAuthLoading && user) {
      return <Navigate to="/home" replace />;
    }

  const SUBJECTS = [
    { name: t('landing.subj_math_name') || 'Matematika', icon: '📐', desc: t('landing.subj_math_desc') || 'Rumus LaTeX & Kalkulus kompleks kini gampang dipahami.', tags: [t('landing.subj_math_tag1') || 'Formula LaTeX', t('landing.subj_math_tag2') || 'Kalkulus & Aljabar', t('landing.subj_math_tag3') || 'Metode Pembuktian'] },
    { name: t('landing.subj_science_name') || 'Sains', icon: '🔬', desc: t('landing.subj_science_desc') || 'Dari hukum termodinamika hingga struktur sel biologi.', tags: [t('landing.subj_science_tag1') || 'Hukum Fisika', t('landing.subj_science_tag2') || 'Struktur Sel Biologi', t('landing.subj_science_tag3') || 'Reaksi Kimia'] },
    { name: t('landing.subj_lang_name') || 'Bahasa', icon: '📚', desc: t('landing.subj_lang_desc') || 'Analisis tata bahasa, prosa, dan retorika linguistik.', tags: [t('landing.subj_lang_tag1') || 'Tata Bahasa', t('landing.subj_lang_tag2') || 'Linguistik', t('landing.subj_lang_tag3') || 'Prosa & Retorika'] },
    { name: t('landing.subj_social_name') || 'Sosial', icon: '🌍', desc: t('landing.subj_social_desc') || 'Peta tektonik, demografi, dan struktur sosiologi masyarakat.', tags: [t('landing.subj_social_tag1') || 'Geografi', t('landing.subj_social_tag2') || 'Demografi Penduduk', t('landing.subj_social_tag3') || 'Struktur Sosiologi'] },
    { name: t('landing.subj_coding_name') || 'Coding', icon: '💻', desc: t('landing.subj_coding_desc') || 'Catat snippet kode, dokumentasi API, dan logika algoritma.', tags: [t('landing.subj_coding_tag1') || 'Snippet Kode', t('landing.subj_coding_tag2') || 'Logika Algoritma', t('landing.subj_coding_tag3') || 'Struktur Data'] },
    { name: t('landing.subj_history_name') || 'Sejarah', icon: '🏛️', desc: t('landing.subj_history_desc') || 'Garis waktu peradaban, arsip sejarah, dan peninggalan kuno.', tags: [t('landing.subj_history_tag1') || 'Garis Waktu Peradaban', t('landing.subj_history_tag2') || 'Arsip Sejarah', t('landing.subj_history_tag3') || 'Peninggalan Kuno'] },
  ];

  const COCKPIT_FEATURES = [
    {
      id: 'latex',
      title: t('landing.cockpit_latex_title') || 'LaTeX Rich Editor',
      badge: t('landing.cockpit_latex_badge') || 'Formula Cerdas',
      icon: Code,
      color: '#2563eb',
      desc: t('landing.cockpit_latex_desc') || 'Tulis rumus matematika dan sains seindah jurnal akademis profesional menggunakan render engine KaTeX berkecepatan tinggi.',
      mockupType: 'editor',
    },
    {
      id: 'verification',
      title: t('landing.cockpit_verif_title') || 'Pakar Verified',
      badge: t('landing.cockpit_verif_badge') || 'Jaminan Akurasi',
      icon: Award,
      color: '#10B981',
      desc: t('landing.cockpit_verif_desc') || 'Setiap catatan krusial dapat ditinjau oleh pakar bidang studi atau guru terverifikasi untuk memastikan kebenaran rumus dan konsep.',
      mockupType: 'badge',
    },
    {
      id: 'search',
      title: t('landing.cockpit_search_title') || 'Pencarian Instan',
      badge: t('landing.cockpit_search_badge') || 'Sub-second Index',
      icon: Search,
      color: '#3B82F6',
      desc: t('landing.cockpit_search_desc') || 'Cari kata kunci, topik, bahkan rumus LaTeX spesifik di seluruh catatan komunitas secara instan secepat kedipan mata.',
      mockupType: 'search',
    },
    {
      id: 'community',
      title: t('landing.cockpit_comm_title') || 'Habit & Streak',
      badge: t('landing.cockpit_comm_badge') || 'Fokus Harian',
      icon: Flame,
      color: '#EF4444',
      desc: t('landing.cockpit_comm_desc') || 'Bangun kebiasaan belajar harian yang konsisten bersama ribuan pelajar lain dengan sistem streak interaktif dan reward eksklusif.',
      mockupType: 'streak',
    }
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [activeWord, setActiveWord] = useState(0);
  const [activeSubject, setActiveSubject] = useState(0);
  const [activeCockpitTab, setActiveCockpitTab] = useState('latex');

  // Scroll lock during loading state to prevent scroll glitching
  useEffect(() => {
    if (isLoading) {
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLoading]);

  // Clear layout entrance animation flag when landing page mounts to reset session entry animation state
  useEffect(() => {
    safeSessionStorage.removeItem('has_animated_session_entry');
  }, []);

  // Smooth scroll to hash on load or redirection
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, []);
  
  // Custom cursor tracker coordinates for Hero glowing orb
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const heroRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }, [mouseX, mouseY]);

  // Spring-smoothed values for smooth floating lag effect
  const glowX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const glowY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  // 3D Card tilt motion hooks
  const cardRef = useRef<HTMLDivElement>(null);
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);

  const cardRotateX = useTransform(cardY, [-0.5, 0.5], [12, -12]);
  const cardRotateY = useTransform(cardX, [-0.5, 0.5], [-12, 12]);

  const springRotateX = useSpring(cardRotateX, { stiffness: 200, damping: 25 });
  const springRotateY = useSpring(cardRotateY, { stiffness: 200, damping: 25 });

  // Glare follow overlay
  const glareLeft = useTransform(cardX, [-0.5, 0.5], ["-20%", "80%"]);
  const glareTop = useTransform(cardY, [-0.5, 0.5], ["-20%", "80%"]);
  const springGlareLeft = useSpring(glareLeft, { stiffness: 200, damping: 25 });
  const springGlareTop = useSpring(glareTop, { stiffness: 200, damping: 25 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left - width / 2;
    const mouseYVal = e.clientY - rect.top - height / 2;
    cardX.set(mouseXVal / width);
    cardY.set(mouseYVal / height);
  };

  const handleCardMouseLeave = () => {
    cardX.set(0);
    cardY.set(0);
  };

  // Language Slot Card 3D hooks
  const slotCardRef = useRef<HTMLDivElement>(null);
  const slotCardX = useMotionValue(0);
  const slotCardY = useMotionValue(0);
  const slotCardRotateX = useTransform(slotCardY, [-0.5, 0.5], [10, -10]);
  const slotCardRotateY = useTransform(slotCardX, [-0.5, 0.5], [-10, 10]);
  const springSlotRotateX = useSpring(slotCardRotateX, { stiffness: 200, damping: 25 });
  const springSlotRotateY = useSpring(slotCardRotateY, { stiffness: 200, damping: 25 });

  const handleSlotCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!slotCardRef.current) return;
    const rect = slotCardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left - width / 2;
    const mouseYVal = e.clientY - rect.top - height / 2;
    slotCardX.set(mouseXVal / width);
    slotCardY.set(mouseYVal / height);
  };

  const handleSlotCardMouseLeave = () => {
    slotCardX.set(0);
    slotCardY.set(0);
  };

  // Subject Card 3D hooks
  const subCardRef = useRef<HTMLDivElement>(null);
  const subCardX = useMotionValue(0);
  const subCardY = useMotionValue(0);

  const subCardRotateX = useTransform(subCardY, [-0.5, 0.5], [10, -10]);
  const subCardRotateY = useTransform(subCardX, [-0.5, 0.5], [-10, 10]);

  const springSubRotateX = useSpring(subCardRotateX, { stiffness: 200, damping: 25 });
  const springSubRotateY = useSpring(subCardRotateY, { stiffness: 200, damping: 25 });

  const handleSubCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!subCardRef.current) return;
    const rect = subCardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left - width / 2;
    const mouseYVal = e.clientY - rect.top - height / 2;
    subCardX.set(mouseXVal / width);
    subCardY.set(mouseYVal / height);
  };

  const handleSubCardMouseLeave = () => {
    subCardX.set(0);
    subCardY.set(0);
  };

  // CTA Card 3D hooks
  const ctaCardRef = useRef<HTMLDivElement>(null);
  const ctaCardX = useMotionValue(0);
  const ctaCardY = useMotionValue(0);
  const ctaCardRotateX = useTransform(ctaCardY, [-0.5, 0.5], [6, -6]);
  const ctaCardRotateY = useTransform(ctaCardX, [-0.5, 0.5], [-6, 6]);
  const springCtaRotateX = useSpring(ctaCardRotateX, { stiffness: 200, damping: 25 });
  const springCtaRotateY = useSpring(ctaCardRotateY, { stiffness: 200, damping: 25 });

  const handleCtaCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ctaCardRef.current) return;
    const rect = ctaCardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left - width / 2;
    const mouseYVal = e.clientY - rect.top - height / 2;
    ctaCardX.set(mouseXVal / width);
    ctaCardY.set(mouseYVal / height);
  };

  const handleCtaCardMouseLeave = () => {
    ctaCardX.set(0);
    ctaCardY.set(0);
  };

  // Rotating Multilingual texts
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWord((prev) => (prev + 1) % MULTI_LANG_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Rotating Subjects Autoplay (Eksplorasi Topik)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSubject((prev) => (prev + 1) % SUBJECTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  // Rotating Cockpit Features Autoplay (Fitur Inti)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCockpitTab((prev) => {
        const currentIndex = COCKPIT_FEATURES.findIndex(f => f.id === prev);
        const nextIndex = (currentIndex + 1) % COCKPIT_FEATURES.length;
        return COCKPIT_FEATURES[nextIndex].id;
      });
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const openAuthModal = useCallback((tab: 'login' | 'register') => {
    setAuthTab(tab);
    setShowAuthModal(true);
  }, []);

  const currentSubject = SUBJECTS[activeSubject];
  const activeCockpit = COCKPIT_FEATURES.find(f => f.id === activeCockpitTab) || COCKPIT_FEATURES[0];

  return (
    <div className="font-sans text-[#3D2314] bg-[#FAF6EE] min-h-screen overflow-x-clip selection:bg-blue-600/20 selection:text-blue-900">
      <AnimatePresence>
        {isLoading && (
          <BrutalistLoader theme="light" key="loader" onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      <Navbar theme="light" isLoading={isLoading} />
      <ScrollToTop />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab={authTab}
      />

      {/* =============================================
          1. KINETIC HERO SECTION (Motto-Godly Aesthetics)
          ============================================= */}
      <section 
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative min-h-[100vh] lg:min-h-[105vh] flex flex-col items-center justify-center pt-28 md:pt-44 lg:pt-48 pb-20 md:pb-32 lg:pb-36 bg-[#FAF6EE] overflow-hidden"
      >
        {/* Playful Animated Educational Scrapbook Hook Backdrop */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* 1. Lined Blueprint & Dot Grid Canvas */}
          <div 
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(#C5B39B 1.5px, transparent 1.5px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* 2. Playful Brand Blue Gradient Aura Beams */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[70vw] h-[500px] bg-gradient-to-tr from-blue-500/15 via-sky-400/10 to-cyan-400/10 blur-[130px] rounded-full animate-pulse-slow" />
          <div className="absolute bottom-0 left-10 w-96 h-96 bg-blue-300/15 blur-[120px] rounded-full animate-pulse-slow" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-sky-300/15 blur-[120px] rounded-full animate-pulse-slow" />

          {/* 3. Delicate Animated Scribble Lines & Dashed Educational Motifs */}
          <svg className="absolute inset-0 w-full h-full text-blue-600/30" xmlns="http://www.w3.org/2000/svg" fill="none">
            {/* Upper Delicate Scribble Wave */}
            <motion.path 
              d="M 1600 140 C 1200 40, 900 260, 500 120 C 200 -20, -100 220, -300 140" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeDasharray="8 8"
              strokeLinecap="round"
              animate={{ 
                strokeDashoffset: [0, -160],
                opacity: [0.15, 0.5, 0.5, 0.15]
              }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />
            
            {/* Center Delicate Loop Scribble (Flowing to the OPPOSITE direction - Rightwards!) */}
            <motion.path 
              d="M -200 400 C 100 300, 400 600, 700 420 C 1000 240, 1300 480, 1700 360" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeDasharray="10 6"
              strokeLinecap="round"
              animate={{ 
                strokeDashoffset: [0, -160],
                opacity: [0.15, 0.45, 0.45, 0.15]
              }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear", delay: 1 }}
            />

            {/* Lower Delicate Scribble Stream */}
            <motion.path 
              d="M 1650 580 C 1250 680, 850 480, 450 640 C 150 780, -50 520, -350 600" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeDasharray="8 8"
              strokeLinecap="round"
              animate={{ 
                strokeDashoffset: [0, -160],
                opacity: [0.15, 0.5, 0.5, 0.15]
              }}
              transition={{ repeat: Infinity, duration: 7, ease: "linear", delay: 2 }}
            />

          </svg>

          {/* 4. Flowing Educational Motifs */}
          <div className="absolute top-24 md:top-28 left-0 right-0 w-full overflow-hidden pointer-events-none select-none h-10">
            <motion.div
              initial={{ x: '100vw' }}
              animate={{ x: '-400px' }}
              transition={{ repeat: Infinity, duration: 70, ease: "linear", delay: 0 }}
              className="absolute left-0 text-blue-600/40 font-serif text-sm md:text-base font-bold whitespace-nowrap"
            >
              ∫ f(x)dx = F(b) - F(a)
            </motion.div>

            <motion.div
              initial={{ x: '100vw' }}
              animate={{ x: '-300px' }}
              transition={{ repeat: Infinity, duration: 70, ease: "linear", delay: 35 }}
              className="absolute left-0 text-blue-600/40 font-mono text-sm md:text-base font-bold whitespace-nowrap"
            >
              E = m · c²
            </motion.div>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 w-full overflow-hidden pointer-events-none select-none h-12">
            <motion.div
              initial={{ x: '-200px' }}
              animate={{ x: '100vw' }}
              transition={{ repeat: Infinity, duration: 65, ease: "linear", delay: 0 }}
              className="absolute left-0 text-blue-600/35 flex items-center"
            >
              <svg className="w-10 h-10 md:w-12 md:h-12" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <ellipse cx="24" cy="24" rx="20" ry="7" transform="rotate(30 24 24)" />
                <ellipse cx="24" cy="24" rx="20" ry="7" transform="rotate(-30 24 24)" />
                <circle cx="24" cy="24" r="3" fill="currentColor" />
              </svg>
            </motion.div>

            <motion.div
              initial={{ x: '-250px' }}
              animate={{ x: '100vw' }}
              transition={{ repeat: Infinity, duration: 65, ease: "linear", delay: 32.5 }}
              className="absolute left-0 text-blue-600/35 flex items-center"
            >
              <svg className="w-12 h-8 md:w-14 md:h-9" viewBox="0 0 80 50" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M 0 10 Q 20 0, 40 10 L 40 40 Q 20 30, 0 40 Z M 40 10 Q 60 0, 80 10 L 80 40 Q 60 30, 40 40 Z" />
              </svg>
            </motion.div>
          </div>

          <div className="absolute bottom-20 md:bottom-24 left-0 right-0 w-full overflow-hidden pointer-events-none select-none h-10">
            <motion.div
              initial={{ x: '100vw' }}
              animate={{ x: '-300px' }}
              transition={{ repeat: Infinity, duration: 60, ease: "linear", delay: 0 }}
              className="absolute left-0 text-blue-600/35 flex items-center"
            >
              <svg className="w-12 h-9 md:w-14 md:h-10" viewBox="0 0 56 38" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="0" y="0" width="56" height="38" rx="8" />
                <path d="M 16 12 L 8 19 L 16 26 M 40 12 L 48 19 L 40 26 M 26 28 L 32 10" />
              </svg>
            </motion.div>

            <motion.div
              initial={{ x: '100vw' }}
              animate={{ x: '-300px' }}
              transition={{ repeat: Infinity, duration: 60, ease: "linear", delay: 30 }}
              className="absolute left-0 text-blue-600/40 font-serif text-sm md:text-base font-bold whitespace-nowrap"
            >
              ∑_(i=1)^n a_i
            </motion.div>
          </div>
        </div>

        <GrainNoise />

        {/* Interactive Mouse-Tracking Glowing Follower */}
        <motion.div 
          className="absolute w-[35vw] h-[35vw] rounded-full blur-[100px] bg-gradient-to-tr from-blue-200 to-indigo-200 pointer-events-none opacity-40"
          style={{
            left: glowX,
            top: glowY,
            x: '-50%',
            y: '-50%'
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full flex flex-col items-center text-center">
          {/* Punchy Clean Title */}
          <h1 className="font-display font-extrabold tracking-tight leading-[1.15] flex flex-col items-center max-w-4xl">
            <motion.span 
              initial={{ opacity: 0, y: 40 }}
              animate={!isLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="block text-[#3D2314] font-black"
              style={{ fontSize: 'clamp(2.25rem, 6.5vw, 4.75rem)' }}
            >
              {t('landing.hero_title_1') || 'Transform Your Notes'}
            </motion.span>
            
            <motion.span 
              initial={{ opacity: 0, y: 40 }}
              animate={!isLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="block text-blue-600 font-black drop-shadow-[0_3px_0px_#1d4ed8] mt-1"
              style={{ fontSize: 'clamp(2.25rem, 6.5vw, 4.75rem)' }}
            >
              {t('landing.hero_title_2') || 'With AI Intelligence'}
            </motion.span>

            <motion.span 
              initial={{ opacity: 0, y: 40 }}
              animate={!isLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="block tracking-normal font-serif text-[#594429] mt-6 max-w-2xl px-4 leading-relaxed font-medium"
              style={{ fontSize: 'clamp(1rem, 1.6vw, 1.25rem)' }}
            >
              {t('landing.hero_desc') || 'Pindai catatan dengan AI OCR cerdas, konversi instan ke huruf Braille, atur jadwal belajar dengan AI Planner, dan pelajari materi dalam 45 bahasa.'}
            </motion.span>
          </h1>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={!isLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto px-4"
          >
            <button
              onClick={() => openAuthModal('register')}
              className="w-full sm:w-auto cursor-pointer relative inline-flex items-center justify-center gap-3 px-8 py-3.5 sm:px-10 sm:py-4 rounded-2xl font-mono font-extrabold text-sm uppercase text-white bg-blue-600 hover:bg-blue-700 border-2 border-blue-400/40 shadow-[4px_4px_0px_#1e3a8a] active:translate-y-0.5 transition-all group overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t('landing.hero_btn_start') || 'Mulai Belajar'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out" />
            </button>

            <button
              onClick={() => openAuthModal('login')}
              className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-8 py-3.5 sm:px-10 sm:py-4 rounded-2xl font-mono font-bold text-sm uppercase text-[#3D2314] bg-[#FFFDF7] border-2 border-[#4A2E1B]/30 shadow-[4px_4px_0px_#4A2E1B] hover:bg-[#FAF6EE] active:translate-y-0.5 transition-all"
            >
              <span>{t('landing.hero_btn_explore') || 'Telusuri Catatan'}</span>
            </button>
          </motion.div>

          {/* Prominent Aesthetic Floating Scroll Mouse Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={!isLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-14 md:mt-18 flex flex-col items-center justify-center cursor-pointer select-none group"
            onClick={() => {
              const el = document.getElementById('eksplorasi-topik');
              if (el) {
                if ((window as any).lenis) {
                  (window as any).lenis.scrollTo(el, { offset: -40, duration: 1.2 });
                } else {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }
            }}
          >
            {/* Mouse Body Pill */}
            <div className="w-8 h-12 rounded-full border-2 border-blue-600/80 bg-blue-50/80 backdrop-blur-md flex items-start justify-center p-1.5 shadow-[0_0_20px_rgba(37,99,235,0.25)] group-hover:border-blue-600 group-hover:shadow-[0_0_25px_rgba(37,99,235,0.45)] transition-all">
              <motion.div
                className="w-1.5 h-3 bg-blue-600 rounded-full shadow-[0_0_8px_#2563eb]"
                animate={{
                  y: [0, 16, 0],
                  opacity: [1, 0.2, 1]
                }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
            {/* Bouncing Chevron Accent */}
            <motion.div
              animate={{ y: [0, 6, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              className="mt-1.5 text-blue-600 group-hover:text-blue-700 transition-colors"
            >
              <ChevronDown className="w-5 h-5 stroke-[2.5]" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* =============================================
          2. THE CORE PHILOSOPHY TEXT SECTION (ScrollReveal)
          ============================================= */}
      <ScrollRevealText />

      {/* =============================================
          4 & 5. SEAMLESS SUBJECT EXPLORATION & TOPIC WARP
          ============================================= */}
      <div className="relative bg-[#FAF6EE] overflow-hidden border-t-2 border-dashed border-[#D4C3AC]">
        <GrainNoise />

        {/* Section 4: Interactive Subject Rotator (Transparent seamless background) */}
        <section id="eksplorasi-topik" className="relative py-12 md:py-24 bg-transparent">
          {/* Ambient backdrop glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full blur-[130px] opacity-[0.06] pointer-events-none"
               style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 60%)' }} />

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-16">
              <p className="text-xs md:text-sm font-semibold text-[#8C5828] tracking-[0.2em] uppercase mb-4">
                {t('landing.explore_badge') || 'EKSPLORASI TOPIK'}
              </p>
              <h2 className="font-display font-extrabold tracking-tight text-slate-900 text-3xl md:text-4xl leading-tight">
                {t('landing.explore_title') || 'Beragam Bidang Ilmu dalam Satu Platform.'}
              </h2>
            </div>

            {/* Interactive 3D Open Textbook Showcase Container */}
            <div className="mt-8 max-w-5xl mx-auto relative select-none" style={{ perspective: 1400 }}>
              
              {/* Textbook Binder Top Index Tabs (Color-coded Book Tabs) */}
              <div className="flex items-center justify-start md:justify-center gap-1.5 md:gap-3 px-4 overflow-x-auto no-scrollbar relative z-20 -mb-2">
                {SUBJECTS.map((sub, i) => {
                  const isActive = i === activeSubject;
                  const tabColors = [
                    'from-[#B45309] to-[#78350F] text-amber-50 shadow-amber-900/40 border-amber-400/40',
                    'from-[#047857] to-[#064E3B] text-emerald-50 shadow-emerald-900/40 border-emerald-400/40',
                    'from-[#7E22CE] to-[#581C87] text-purple-50 shadow-purple-900/40 border-purple-400/40',
                    'from-[#C2410C] to-[#7C2D12] text-orange-50 shadow-orange-900/40 border-orange-400/40',
                    'from-[#0284C7] to-[#0369A1] text-cyan-50 shadow-cyan-900/40 border-cyan-400/40',
                    'from-[#BE123C] to-[#881337] text-rose-50 shadow-rose-900/40 border-rose-400/40'
                  ];
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveSubject(i)}
                      className={`cursor-pointer relative px-3 py-2 md:px-5 md:py-2.5 rounded-t-2xl font-display font-bold text-xs md:text-sm tracking-wide transition-all duration-300 flex items-center gap-2 border-t border-l border-r ${
                        isActive
                          ? `bg-gradient-to-r ${tabColors[i % tabColors.length]} -translate-y-1 shadow-lg border-amber-200/50 z-30`
                          : 'bg-[#EADBC8] hover:bg-[#DFCBB4] text-[#4A2E1B] border-[#D4C3AC] z-10'
                      }`}
                    >
                      <span className="text-sm md:text-base">{sub.icon}</span>
                      <span className="whitespace-nowrap">{sub.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Open Hardcover Vintage Warm Leather Brown Cover Shell */}
              <div className="w-full bg-gradient-to-b from-[#4A2E1B] via-[#3B2212] to-[#2C180C] rounded-3xl p-3 md:p-6 shadow-[0_30px_70px_-10px_rgba(44,24,12,0.65)] border-2 border-[#D4AF37]/50 relative overflow-hidden group/book">
                
                {/* Gold Foil Stitched Corner Trim */}
                <div className="absolute top-2.5 left-2.5 w-8 h-8 border-t-2 border-l-2 border-[#E5C158] rounded-tl-xl pointer-events-none" />
                <div className="absolute top-2.5 right-2.5 w-8 h-8 border-t-2 border-r-2 border-[#E5C158] rounded-tr-xl pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5 w-8 h-8 border-b-2 border-l-2 border-[#E5C158] rounded-bl-xl pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 w-8 h-8 border-b-2 border-r-2 border-[#E5C158] rounded-br-xl pointer-events-none" />

                {/* Elegant Minimalist Crimson Satin Bookmark Ribbon Tag (No Text, Clean V-Notch Tail) */}
                <div className="absolute top-0 right-16 md:right-24 w-5 md:w-6 h-16 md:h-20 z-30 pointer-events-none flex flex-col items-center group-hover/book:translate-y-1 transition-transform duration-500 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]">
                  {/* Smooth Silk Ribbon Body */}
                  <div className="w-full flex-1 bg-gradient-to-r from-[#991b1b] via-[#dc2626] to-[#b91c1c] relative flex flex-col items-center justify-start pt-2 border-x border-[#fef08a]/30 shadow-inner">
                    <div className="w-3 h-0.5 bg-gradient-to-r from-[#d4af37] via-[#fef08a] to-[#d4af37] rounded-full shadow-xs opacity-90" />
                  </div>
                  {/* Crisp V-Notch Ribbon Tail Cut SVG */}
                  <svg className="w-5 md:w-6 h-3 md:h-3.5 text-[#b91c1c] -mt-[0.5px] shrink-0" viewBox="0 0 32 20" fill="currentColor">
                    <path d="M 0 0 L 16 12 L 32 0 L 32 20 L 0 20 Z" transform="rotate(180 16 10)" />
                  </svg>
                </div>

                {/* Open Book Double-Page Parchment Canvas */}
                <div className="w-full bg-[#FAF6EE] rounded-2xl border border-[#E0D4C3] p-5 md:p-10 relative min-h-[420px] md:min-h-[460px] flex flex-col md:flex-row items-stretch gap-8 md:gap-0 shadow-[inset_0_0_40px_rgba(74,46,27,0.1)] overflow-hidden">
                  
                  {/* Center Book Binding Spine & Drop Shadow Trough */}
                  <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-12 bg-gradient-to-r from-black/20 via-black/40 to-black/20 pointer-events-none z-20" />
                  <div className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-[#CBB9A1] pointer-events-none z-20" />

                  {/* LEFT PAGE: Chapter Stamp, Title, Description, Tags (Synchronized 3D Page Flip!) */}
                  <div className="w-full md:w-1/2 md:pr-10 relative min-h-[240px] md:min-h-full flex flex-col justify-between z-10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSubject}
                        initial={{ opacity: 0, x: 25 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -25 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full h-full flex flex-col justify-between"
                      >
                        <div>
                          {/* Chapter Stamp & Archive Seal */}
                          <div className="flex items-center justify-between mb-5 border-b border-[#E6D9C5] pb-3">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#F2E8D5] border border-[#D9C7AA] text-[#5C3D1E] font-mono text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                              <span>BAB 0{activeSubject + 1}</span>
                              <span className="text-[#D4AF37]">•</span>
                              <span>{currentSubject.name}</span>
                            </div>
                            <span className="text-[10px] text-[#8C7355] font-mono font-semibold uppercase tracking-widest">
                              SensoraNote Archival
                            </span>
                          </div>

                          {/* Title with Embossed Icon Badge */}
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FAF0DC] to-[#EBD9BA] border border-[#D9C29C] flex items-center justify-center text-3xl shadow-sm shrink-0">
                              {currentSubject.icon}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-[#8C5828] font-mono uppercase tracking-widest block mb-0.5">MODUL SUBJEK</span>
                              <h3 className="font-display font-black text-2xl md:text-4xl text-[#3D2314] tracking-tight leading-none">
                                {currentSubject.name}
                              </h3>
                            </div>
                          </div>

                          <p className="text-[#594429] mt-5 text-xs md:text-sm leading-relaxed font-serif text-justify">
                            {currentSubject.desc}
                          </p>
                        </div>

                        <div className="mt-6 md:mt-8">
                          {/* Topic Tags */}
                          <div className="flex flex-wrap gap-2 mb-6">
                            {currentSubject.tags?.map((tag, tIdx) => (
                              <span key={tIdx} className="text-xs font-bold text-[#4A351D] bg-[#F2EAD9] border border-[#D9CEB5] px-3.5 py-1.5 rounded-lg shadow-2xs hover:border-[#8C5828] transition-all">
                                #{tag}
                              </span>
                            ))}
                          </div>

                          {/* Primary CTA Button & Left Page Number */}
                          <div className="flex items-center justify-between border-t border-[#E6D9C5] pt-4">
                            <button
                              onClick={() => openAuthModal('register')}
                              className="cursor-pointer w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#593118] to-[#3D200E] hover:brightness-110 text-amber-50 font-bold text-xs shadow-md shadow-[#3D200E]/30 transition-all group border border-[#8C5828]/40"
                            >
                              <span>{t('landing.explore_notes_btn') || 'Buka Catatan'} {currentSubject.name}</span>
                              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <span className="hidden md:inline-block font-serif text-xs font-bold text-[#8C7355] italic">
                              - Hal. {activeSubject * 2 + 1} -
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* RIGHT PAGE WITH REALISTIC 3D PAGE FLIP TRANSITION */}
                  <div className="w-full md:w-1/2 md:pl-10 relative min-h-[240px] md:min-h-full flex flex-col justify-between z-10 border-t md:border-t-0 md:border-l border-[#E6D9C5] pt-6 md:pt-0">
                    {/* Red Margin Line on Left */}
                    <div className="hidden md:block absolute top-0 bottom-0 left-6 w-[1.5px] bg-[#E57373]/50 pointer-events-none z-10" />

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSubject}
                        initial={{ rotateY: -105, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 105, opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
                        className="w-full h-full flex flex-col justify-between bg-[#FAF6EE]/95 rounded-xl p-5 md:p-6 border border-[#E0D4C3] shadow-xl font-mono relative overflow-hidden"
                      >
                        {/* Dynamic 3D Page Turn Light Reflection & Shading Overlay */}
                        <motion.div 
                          key={`sheen-${activeSubject}`}
                          initial={{ opacity: 0.75, x: "-100%" }}
                          animate={{ opacity: 0, x: "100%" }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="absolute inset-0 bg-gradient-to-r from-black/20 via-white/50 to-transparent pointer-events-none z-30"
                        />
                        {/* Paper Lined Texture Background */}
                        <div 
                          className="absolute inset-0 opacity-20 pointer-events-none"
                          style={{
                            backgroundImage: 'linear-gradient(#A89A85 1px, transparent 1px)',
                            backgroundSize: '100% 26px'
                          }}
                        />

                        {/* Top Header info */}
                        <div className="flex items-center justify-between border-b border-[#E6D9C5] pb-3 text-[10px] text-[#8C7355] font-bold uppercase tracking-wider relative z-10">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            <span>VERIFIED CATATAN AKADEMIK</span>
                          </span>
                          <span className="text-[#8C5828] font-mono">FORMULA KA-TEX ENGINE</span>
                        </div>

                        {/* Rich Dynamic Notebook Preview Content */}
                        <div className="my-4 relative z-10 font-sans">
                          {activeSubject === 0 && ( // Matematika
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#3D2314]">
                                <span>// Teorema Kalkulus Integral</span>
                                <span className="text-[10px] text-[#B45309] font-mono">MAT-101</span>
                              </div>
                              <div 
                                className="p-4 rounded-xl bg-[#FAF6EE] border border-[#E2D6C3] text-slate-900 font-mono text-xs overflow-x-auto flex justify-center shadow-2xs"
                                dangerouslySetInnerHTML={{
                                  __html: katex.renderToString("\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)", { throwOnError: false, displayMode: true })
                                }}
                              />
                              <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[11px] text-[#92400E] leading-relaxed font-medium">
                                💡 <b>Catatan Penting:</b> Luas daerah di bawah kurva fungsi \(f(x)\) dari batas selang \(a\) sampai \(b\).
                              </div>
                            </div>
                          )}

                          {activeSubject === 1 && ( // Sains
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#3D2314]">
                                <span>// Hukum Kuantum & Kesetaraan Energi</span>
                                <span className="text-[10px] text-emerald-700 font-mono">PHY-202</span>
                              </div>
                              <div 
                                className="p-4 rounded-xl bg-[#FAF6EE] border border-[#E2D6C3] text-slate-900 font-mono text-xs overflow-x-auto flex justify-center shadow-2xs"
                                dangerouslySetInnerHTML={{
                                  __html: katex.renderToString("E = m \\cdot c^2 \\quad \\text{dan} \\quad \\hat{H}\\Psi = E\\Psi", { throwOnError: false, displayMode: true })
                                }}
                              />
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed font-medium">
                                ⚛️ <b>Persamaan Schrödinger:</b> Menggambarkan sifat gelombang elektron dalam medan potensial atom.
                              </div>
                            </div>
                          )}

                          {activeSubject === 2 && ( // Bahasa
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#3D2314]">
                                <span>// Analisis Semantik & Hermeneutika</span>
                                <span className="text-[10px] text-purple-700 font-mono">LING-301</span>
                              </div>
                              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-slate-800 text-xs leading-relaxed font-serif shadow-2xs">
                                <span className="float-left text-3xl font-bold font-serif leading-none mr-2 text-purple-700">"</span>
                                Bahasa adalah cermin kebudayaan dan pintu gerbang pemikiran kritis manusia dalam memahami struktur realitas.
                              </div>
                              <div className="p-3 rounded-lg bg-[#FAF6EE] border border-[#E2D6C3] text-[11px] text-[#594429] leading-relaxed font-mono">
                                📚 <b>Kosa Kata Kunci:</b> Sintaksis, Fonologi, Morfologi, Pragmatik.
                              </div>
                            </div>
                          )}

                          {activeSubject === 3 && ( // Sosial
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#3D2314]">
                                <span>// Makroekonomi & Model GDP</span>
                                <span className="text-[10px] text-orange-700 font-mono">ECON-102</span>
                              </div>
                              <div 
                                className="p-4 rounded-xl bg-[#FAF6EE] border border-[#E2D6C3] text-slate-900 font-mono text-xs overflow-x-auto flex justify-center shadow-2xs"
                                dangerouslySetInnerHTML={{
                                  __html: katex.renderToString("\\text{GDP} = C + I + G + (X - M)", { throwOnError: false, displayMode: true })
                                }}
                              />
                              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-[11px] text-orange-950 leading-relaxed font-medium">
                                📊 <b>Variabel Utama:</b> Konsumsi ($C$), Investasi ($I$), Pengeluaran Negara ($G$), Ekspor Netto ($X-M$).
                              </div>
                            </div>
                          )}

                          {activeSubject === 4 && ( // Coding
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#3D2314]">
                                <span>// Algoritma Pencarian Biner</span>
                                <span className="text-[10px] text-sky-700 font-mono">CS-404</span>
                              </div>
                              <div className="p-3.5 rounded-xl bg-[#1E1B18] border border-[#3D352E] text-emerald-400 font-mono text-[11px] overflow-x-auto shadow-md">
                                <div className="flex items-center justify-between border-b border-[#3D352E] pb-1.5 mb-2 text-[9px] text-amber-200/60">
                                  <span>binary_search.ts</span>
                                  <span className="text-amber-400">O(log N)</span>
                                </div>
                                <code>{`function binarySearch(arr: number[], target: number) {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    let mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n  }\n}`}</code>
                              </div>
                            </div>
                          )}

                          {activeSubject === 5 && ( // Sejarah
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-[#3D2314]">
                                <span>// Garis Waktu Sejarah Nusantara</span>
                                <span className="text-[10px] text-rose-700 font-mono">HIST-501</span>
                              </div>
                              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-slate-800 text-xs leading-relaxed font-serif shadow-2xs">
                                🏛️ <b>Linimasa Peradaban:</b><br />
                                1293 M: Berdirinya Kerajaan Majapahit<br />
                                1928 M: Sumpah Pemuda<br />
                                1945 M: Proklamasi Kemerdekaan Indonesia
                              </div>
                              <div className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E2D6C3] text-[11px] text-[#594429] font-mono">
                                📜 Arsip Digital Tersimpan & Terverifikasi
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Page Bottom Footer Navigation Controls */}
                        <div className="border-t border-[#E6D9C5] pt-3 flex items-center justify-between text-[10px] text-[#8C7355] font-bold font-mono relative z-10">
                          <button
                            onClick={() => setActiveSubject((prev) => (prev > 0 ? prev - 1 : SUBJECTS.length - 1))}
                            className="cursor-pointer hover:text-[#593118] transition-colors flex items-center gap-1"
                          >
                            <span>‹ Prev</span>
                          </button>

                          <span>HALAMAN {activeSubject + 1} DARI 6</span>

                          <button
                            onClick={() => setActiveSubject((prev) => (prev < SUBJECTS.length - 1 ? prev + 1 : 0))}
                            className="cursor-pointer hover:text-[#593118] transition-colors flex items-center gap-1"
                          >
                            <span>Next ›</span>
                          </button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </section>

        {/* Section 5: Topic Warp (Transparent seamless component) */}
        <TopicWarpSection openAuthModal={openAuthModal} />
      </div>

        {/* =============================================
            5.1. MULTILINGUAL NOTEBOOK SHOWCASE (Moved below TopicWarp)
            ============================================= */}
        <section className="relative py-12 md:py-24 bg-[#FAF6EE] overflow-hidden">
          <GrainNoise />
          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-stretch gap-12">
              
              {/* Left Box: Title and Language Cloud */}
              <div className="flex-1 flex flex-col justify-between">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                >
                  <div className="block mb-3">
                    <span className="inline-block px-3 py-1 bg-[#FFFDF7] border border-[#4A2E1B]/30 shadow-[2px_2px_0px_#4A2E1B] rounded-md -rotate-1 text-xs font-mono font-extrabold text-blue-700 uppercase tracking-widest">
                      🌐 {t('landing.multilang_badge') || 'AKSESIBILITAS GLOBAL'}
                    </span>
                  </div>
                  <div className="relative inline-block">
                    <h2 className="font-display font-extrabold tracking-tight leading-[1.1] text-slate-900 text-3xl md:text-5xl">
                      {t('landing.multilang_title_1') || 'Pembelajaran'}<br />
                      <span className="text-blue-600">{t('landing.multilang_title_2') || 'Tanpa Batas'}</span><br />
                      {t('landing.multilang_title_3') || 'Bahasa.'}
                    </h2>
                    {/* Hand-Drawn Scribble Underline SVG */}
                    <svg className="absolute -bottom-3 left-0 w-full h-3.5 text-blue-500/70 pointer-events-none" viewBox="0 0 200 12" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                      <path d="M 3 6 Q 50 1, 100 8 T 197 4" />
                    </svg>
                  </div>
                  <p className="text-slate-600 mt-6 max-w-md text-sm md:text-base leading-relaxed font-serif">
                    {t('landing.multilang_desc') || 'SensoraNote mendukung tampilan antarmuka dalam 20 pilihan bahasa yang dapat disesuaikan di pengaturan, memungkinkan pelajar dari berbagai belahan dunia untuk berkolaborasi dan belajar dengan nyaman.'}
                  </p>
                </motion.div>

                {/* Left Box: 3D Interactive Gaming Console with BorderGlow */}
                <div style={{ perspective: 1000 }}>
                  <motion.div
                    ref={slotCardRef}
                    onMouseMove={handleSlotCardMouseMove}
                    onMouseLeave={handleSlotCardMouseLeave}
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="mt-8 md:mt-12 max-w-md w-full origin-center select-none"
                    style={{
                      rotateX: springSlotRotateX,
                      rotateY: springSlotRotateY,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <BorderGlow className="w-full" backgroundColor="#FFFDF7" glowColor="226 71% 50%">
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-5 sm:p-6 rounded-3xl bg-[#FFFDF7] border-2 border-[#4A2E1B]/30 shadow-[6px_6px_0px_#4A2E1B] hover:shadow-[8px_8px_0px_#2563eb] relative group/slot overflow-hidden transition-shadow duration-300">
                        {/* Corner Washi Tape Pin */}
                        <div className="absolute -top-1 left-8 w-10 h-4 bg-[#E8DCC4] border-x border-[#C5B39B] rotate-[-3deg] z-20 pointer-events-none" />

                        {/* Reels Chamber on the Left */}
                        <div className="relative p-3.5 bg-[#FAF6EE] border-2 border-[#4A2E1B]/20 rounded-2xl shadow-inner flex gap-2 shrink-0">
                          <Reel activeIndex={activeWord} delay={0} />
                          <Reel activeIndex={activeWord} delay={0.12} />
                          <Reel activeIndex={activeWord} delay={0.24} />
                        </div>

                        {/* Info Panel & Notebook Stamp Spin Button */}
                        <div className="flex flex-col gap-3 justify-center items-center sm:items-start z-10 flex-1">
                          <div>
                            <span className="text-[9px] text-[#8C7355] font-bold uppercase tracking-wider block mb-0.5 text-center sm:text-left font-mono">{t('landing.active_language') || 'Bahasa Aktif'}</span>
                            <div className="flex items-center gap-2">
                              <img src={MULTI_LANG_TEXTS[activeWord].flagImg} alt="" className="w-5 h-3.5 rounded object-cover shadow-xs border border-[#D4C3AC]" />
                              <p className="text-base font-bold text-[#3D2314] leading-tight font-display">
                                {MULTI_LANG_TEXTS[activeWord].lang}
                              </p>
                            </div>
                          </div>
                          
                          {/* Notebook Stamp ACAK BAHASA Button */}
                          <motion.button
                            onClick={() => {
                              let randomIdx = Math.floor(Math.random() * MULTI_LANG_TEXTS.length);
                              if (randomIdx === activeWord) randomIdx = (randomIdx + 1) % MULTI_LANG_TEXTS.length;
                              setActiveWord(randomIdx);
                            }}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="cursor-pointer px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono font-extrabold text-xs shadow-[3px_3px_0px_#1e3a8a] hover:shadow-[4px_4px_0px_#2563eb] border-2 border-blue-400/40 transition-all flex items-center gap-2"
                            title="Acak Bahasa"
                          >
                            <Shuffle className="w-3.5 h-3.5 text-white" />
                            <span className="whitespace-nowrap font-mono font-bold text-xs">Acak Bahasa</span>
                          </motion.button>
                        </div>
                      </div>
                    </BorderGlow>
                  </motion.div>
                </div>
              </div>

              {/* Right Box: Big Interactive 3D Notebook Language Card */}
              <div className="flex-1 flex justify-center items-stretch" style={{ perspective: 1000 }}>
                <BorderGlow className="w-full h-full" backgroundColor="#FFFDF7" glowColor="226 71% 50%">
                  <motion.div
                    ref={cardRef}
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-full h-full min-h-[320px] md:min-h-[380px] bg-[#FFFDF7] rounded-3xl p-6 md:p-8 border-2 border-[#4A2E1B]/30 shadow-[8px_8px_0px_#4A2E1B] hover:shadow-[10px_10px_0px_#2563eb] relative overflow-hidden flex flex-col justify-between cursor-default origin-center select-none transition-shadow duration-300"
                    style={{
                      rotateX: springRotateX,
                      rotateY: springRotateY,
                      transformStyle: "preserve-3d",
                    }}
                  >
                    {/* Washi Tape Accent Top Right */}
                    <div className="absolute -top-1 right-8 w-12 h-4 bg-[#E8DCC4] border-x border-[#C5B39B] rotate-[4deg] z-20 pointer-events-none" />

                    {/* Dot Grid Paper Background */}
                    <div 
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: 'radial-gradient(#C5B39B 1.5px, transparent 1.5px)',
                        backgroundSize: '20px 20px'
                      }}
                    />

                    <div className="flex items-center justify-between relative z-10" style={{ transform: "translateZ(30px)" }}>
                      <div className="flex items-center gap-3">
                        <Globe className="w-8 h-8 text-blue-600 animate-pulse" />
                        <span className="text-sm font-bold text-blue-800 font-display">{MULTI_LANG_TEXTS[activeWord].lang}</span>
                      </div>
                      
                      {/* Notebook Code Tag with Country Flag */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl shadow-xs">
                        <img src={MULTI_LANG_TEXTS[activeWord].flagImg} alt="" className="w-4 h-3 rounded object-cover shadow-2xs" />
                        <span className="text-[10px] text-blue-700 font-extrabold tracking-widest font-mono uppercase">
                          LOCALE: {MULTI_LANG_TEXTS[activeWord].code}
                        </span>
                      </div>
                    </div>

                    {/* Huge dynamic text display */}
                    <div className="my-4 md:my-8 relative z-10 overflow-hidden h-[120px] md:h-[180px] flex items-center" style={{ transform: "translateZ(45px)" }}>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeWord}
                          initial={{ opacity: 0, y: 20, filter: "blur(6px)", scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                          exit={{ opacity: 0, y: -20, filter: "blur(6px)", scale: 0.96 }}
                          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          className="w-full text-left"
                        >
                          <h3 className="font-display font-black text-[#3D2314] tracking-tight leading-snug whitespace-pre-line" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
                            {MULTI_LANG_TEXTS[activeWord].text}
                          </h3>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="border-t border-[#E6D9C5] pt-4 md:pt-6 flex flex-col md:flex-row items-center gap-3 md:gap-0 md:justify-between text-[10px] sm:text-xs text-[#8C7355] font-semibold relative z-10 w-full font-mono" style={{ transform: "translateZ(30px)" }}>
                      {/* Dynamic scrolling badge */}
                      <span className="tracking-wider text-[#593118] font-bold uppercase transition-all duration-300">
                        {(MULTI_LANG_TEXTS[activeWord].badge || 'AKTIF MULTI-BAHASA').toUpperCase()}
                      </span>
                      
                      {/* Dynamic interactive count-up supported languages */}
                      <span className="flex items-center gap-1.5 text-blue-700 font-extrabold">
                        <Users className="w-4 h-4 text-blue-600" /> 
                        <span>
                          <CountUp to={45} /> Pilihan Bahasa Didukung
                        </span>
                      </span>
                    </div>
                  </motion.div>
                </BorderGlow>
              </div>

            </div>
          </div>
        </section>

      {/* =============================================
          6. CORE FEATURES BENTO GRID (Unifies Core features & Mockups)
          ============================================= */}
      <section className="relative py-12 md:py-24 bg-[#FAF6EE] overflow-hidden">
        <GrainNoise />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          
          {/* =============================================
              5.5. VISUAL SHOWCASE GALLERY
              ============================================= */}
          <motion.div 
            className="mb-16 md:mb-24 mt-2 md:mt-6 max-w-6xl mx-auto w-full"
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <AccordionGallery 
              badge={t('landing.gallery_badge') || 'INKLUSIVITAS 100%'}
              title={t('landing.gallery_title') || 'Pendidikan Tanpa Batasan.'}
            />
          </motion.div>

          {/* Header with Notebook Scribble Style */}
          <motion.div 
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 md:mb-16"
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="text-left">
              <span className="inline-block px-3 py-1 bg-[#FFFDF7] border border-[#4A2E1B]/30 shadow-[2px_2px_0px_#4A2E1B] rounded-md -rotate-1 text-xs font-mono font-extrabold text-blue-700 uppercase tracking-widest mb-3">
                ✏️ {t('landing.feature_badge') || 'FITUR INTI'}
              </span>
              <h2 className="font-display font-extrabold tracking-tight text-slate-900 text-3xl md:text-5xl leading-tight relative inline-block">
                {t('landing.feature_title') || 'Teknologi Di Balik SensoraNote.'}
                {/* Hand-Drawn Scribble Underline */}
                <svg className="absolute -bottom-3 left-0 w-full h-3 text-blue-500/70 pointer-events-none" viewBox="0 0 200 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M 3 6 Q 50 1, 100 8 T 197 4" />
                </svg>
              </h2>
            </div>
            <p className="text-slate-600 text-sm md:text-base max-w-sm text-left leading-relaxed font-serif">
              {t('landing.feature_desc') || 'Kami merancang ekosistem mencatat yang cerdas untuk membantumu menyusun, memverifikasi, dan menguasai setiap materi pelajaran dengan efektif.'}
            </p>
          </motion.div>

          {/* Bento Grid with Notebook Sticker Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Cell 1: LaTeX Rich Editor (Double Width) */}
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <BorderGlow className="w-full h-full min-h-[340px] md:min-h-[380px]" backgroundColor="#FFFDF7" glowColor="226 71% 50%">
                <div className="bg-[#FFFDF7] h-full rounded-[28px] p-5 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-2 border-[#4A2E1B]/30 shadow-[5px_5px_0px_#4A2E1B] hover:shadow-[6px_6px_0px_#2563eb] transition-shadow duration-300">
                  {/* Corner Washi Tape Pin */}
                  <div className="absolute -top-1 left-8 w-10 h-4 bg-[#E8DCC4] border-x border-[#C5B39B] rotate-[-3deg] z-20 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <Code className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] text-[#8C7355] font-bold uppercase tracking-widest font-mono">01 / {t('landing.feat1_badge') || 'RICH EDITOR'} 📝</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight leading-tight">{t('landing.feat1_title') || 'LaTeX Rich Editor & Cover Studio'}</h3>
                    <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-md font-medium">{t('landing.feat1_desc') || 'Tulis rumus matematika, kalkulus, dan sains seindah jurnal akademis profesional menggunakan render engine KaTeX berkecepatan tinggi dan potong sampul custom 16:9.'}</p>
                  </div>

                  {/* LaTeX Mockup Widget */}
                  <div className="mt-8 bg-[#FAF6EE] rounded-2xl p-4 sm:p-5 border-2 border-[#4A2E1B]/20 font-mono text-[11px] w-full shadow-inner relative z-10">
                    <div className="flex items-center justify-between border-b border-[#E6D9C5] pb-2.5 mb-3 text-[9px] text-[#8C7355] font-bold">
                      <span>{t('landing.mockup_latex_title') || 'LaTeX EDITOR ENGINE'}</span>
                      <span className="text-blue-600 animate-pulse">{t('landing.mockup_latex_status') || 'ACTIVE RENDERING'}</span>
                    </div>
                    <p className="text-emerald-700 font-bold">// {t('landing.mockup_latex_input') || 'Input KaTeX:'}</p>
                    <p className="text-slate-800 mt-0.5 font-semibold">{"$$\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}$$"}</p>
                    
                    <p className="text-emerald-700 font-bold mt-3">// {t('landing.mockup_latex_output') || 'Output Rendered:'}</p>
                    <div 
                      className="mt-2 p-3 sm:p-3.5 rounded-xl bg-white border border-[#D4C3AC] flex items-center justify-center text-slate-900 text-base font-display overflow-x-auto shadow-2xs"
                      dangerouslySetInnerHTML={{
                        __html: katex.renderToString("\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}", {
                          throwOnError: false,
                          displayMode: true
                        })
                      }}
                    />
                  </div>
                </div>
              </BorderGlow>
            </motion.div>

            {/* Cell 2: Verified Pakar (Standard Width) */}
            <motion.div 
              className="md:col-span-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <BorderGlow className="w-full h-full min-h-[340px] md:min-h-[380px]" backgroundColor="#1d4ed8" glowColor="226 71% 60%">
                <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] h-full rounded-[28px] p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden group border-2 border-blue-400/50 shadow-[5px_5px_0px_#1e3a8a]">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
                        <Award className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest font-mono">02 / {t('landing.feat2_badge') || 'VERIFIED ACCURACY'} 🎓</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-black text-white tracking-tight leading-tight">{t('landing.feat2_title') || 'Ditinjau Guru & Pakar'}</h3>
                    <p className="text-white/90 mt-2 text-sm leading-relaxed font-serif">
                      {t('landing.feat2_desc') || 'Tidak ada lagi keraguan materi salah. Belajar dengan tenang dari catatan tepercaya yang disetujui reviewer ahli.'}
                    </p>
                  </div>

                  {/* Expert Profile Mockup Widget */}
                  <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 w-full shadow-inner text-center relative z-10">
                    <h4 className="text-white font-display text-sm font-bold tracking-tight">Dr. Hermawan, M.T.</h4>
                    <p className="text-[10px] text-blue-100 mt-0.5 font-medium uppercase tracking-wider">{t('landing.mockup_verif_role') || 'Reviewer Ahli / Dosen Matematika'}</p>
                    <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 font-bold text-[9px] uppercase tracking-wider font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('landing.mockup_verif_status') || 'AKURASI: VERIFIED'}
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </motion.div>

            {/* Cell 3: AI Smart Study Planner & Speech-to-Text (Standard Width) */}
            <motion.div 
              className="md:col-span-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <BorderGlow className="w-full h-full min-h-[340px] md:min-h-[380px]" backgroundColor="#FFFDF7" glowColor="190 90% 50%">
                <div className="h-full bg-[#FFFDF7] rounded-[28px] p-5 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-2 border-[#4A2E1B]/30 shadow-[5px_5px_0px_#4A2E1B] hover:shadow-[6px_6px_0px_#0891b2] transition-shadow duration-300">
                  <div className="absolute -top-1 right-8 w-10 h-4 bg-[#E8DCC4] border-x border-[#C5B39B] rotate-[4deg] z-20 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                        <CalendarClock className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] text-[#8C7355] font-bold uppercase tracking-widest font-mono">03 / SMART SCHEDULE 📅</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight leading-tight">Perencana Jadwal AI</h3>
                    <p className="text-slate-600 mt-2 text-sm leading-relaxed font-serif">
                      Atur jadwal belajar cukup lewat komando suara (Speech-to-Text) dan cetak poster jadwal belajar visual HD yang siap ditempel.
                    </p>
                  </div>

                  {/* Voice Schedule Mockup Widget */}
                  <div className="mt-6 bg-[#FAF6EE] border-2 border-[#4A2E1B]/20 rounded-2xl p-4 flex flex-col gap-2.5 w-full shadow-inner relative z-10 font-mono text-left">
                    <div className="flex items-center gap-2 text-cyan-700 text-xs">
                      <div className="w-6 h-6 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-600">
                        <Mic className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <span className="truncate font-semibold">"Besok jam 7 pagi ada Fisika"</span>
                    </div>
                    <div className="p-2.5 bg-white border border-[#D4C3AC] rounded-xl flex items-center justify-between text-[11px] text-slate-800 shadow-2xs">
                      <span className="font-bold text-slate-900">07:00 • Fisika Kuantum</span>
                      <span className="text-cyan-700 font-bold text-[9px] uppercase px-1.5 py-0.5 bg-cyan-100 rounded">Poster HD ✨</span>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </motion.div>

            {/* Cell 4: Sensora AI Chatbot & Smart Tutor (Double Width) */}
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <BorderGlow className="w-full h-full min-h-[340px] md:min-h-[380px]" backgroundColor="#FFFDF7" glowColor="270 91% 65%">
                <div className="bg-[#FFFDF7] h-full rounded-[28px] p-5 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-2 border-[#4A2E1B]/30 shadow-[5px_5px_0px_#4A2E1B] hover:shadow-[6px_6px_0px_#9333ea] transition-shadow duration-300">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                        <Bot className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] text-[#8C7355] font-bold uppercase tracking-widest font-mono">04 / SMART TUTOR 🤖</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight leading-tight">Sensora AI Chatbot</h3>
                    <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-md font-serif font-medium">
                      Tanya jawab konsep pelajaran sulit, rangkum poin penting catatan, dan bedah soal bertahap bersama tutor AI yang menyimpan seluruh riwayat percakapanmu.
                    </p>
                  </div>

                  {/* AI Chatbot Mockup Widget */}
                  <div className="mt-6 bg-[#FAF6EE] rounded-2xl p-4 border-2 border-[#4A2E1B]/20 flex flex-col gap-2.5 text-xs font-mono w-full shadow-inner relative z-10">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">U</div>
                      <div className="bg-white border border-[#D4C3AC] rounded-xl p-2.5 text-slate-800 shadow-2xs">
                        "Bagaimana cara mudah memahami Hukum Termodinamika II?"
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">AI</div>
                      <div className="bg-purple-100/70 border border-purple-300 rounded-xl p-2.5 text-purple-950 flex-1 font-medium">
                        Kuncinya adalah <strong>Entropi</strong> (tingkat ketidakteraturan semesta yang selalu bertambah). Kalor mengalir spontan dari suhu tinggi ke rendah! ⚡
                      </div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </motion.div>

            {/* Cell 5: Scan Gambar Teks ke Huruf Braille (Double Width) */}
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <BorderGlow className="w-full h-full min-h-[340px] md:min-h-[380px]" backgroundColor="#FFFDF7" glowColor="38 92% 50%">
                <div className="bg-[#FFFDF7] h-full rounded-[28px] p-5 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-2 border-[#4A2E1B]/30 shadow-[5px_5px_0px_#4A2E1B] hover:shadow-[6px_6px_0px_#d97706] transition-shadow duration-300">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                        <ScanText className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] text-[#8C7355] font-bold uppercase tracking-widest font-mono">05 / OCR & BRAILLE EXPORT ⠃⠗</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight leading-tight">Scan Gambar Teks ke Huruf Braille</h3>
                    <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-md font-serif font-medium">
                      Pindai foto tulisan tangan & buku cetak menggunakan Computer Vision OCR cerdas, lalu konversi instan ke file fisik khusus cetak printer Braille untuk pelajar tunanetra.
                    </p>
                  </div>

                  {/* Braille Converter Mockup Widget */}
                  <div className="mt-6 bg-[#FAF6EE] rounded-2xl p-4 sm:p-5 border-2 border-[#4A2E1B]/20 w-full shadow-inner relative z-10 font-mono">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E6D9C5] text-[10px] text-slate-600">
                      <span>AI OCR SCANNER ➔ BRAILLE DOT CONVERTER</span>
                      <span className="text-amber-700 font-bold">READY TO PRINT</span>
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="text-xs text-slate-800">
                        <span className="text-slate-500">Teks Asli:</span> "SensoraNote" <br />
                        <span className="text-slate-500">Braille:</span> <span className="text-amber-700 text-sm tracking-widest font-serif font-bold">⠎⠑⠝⠎⠕⠗⠁⠝⠕⠞⠑</span>
                      </div>
                      <div className="px-3 py-2 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs">
                        <Printer className="w-3.5 h-3.5" /> Ekspor .BRF
                      </div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </motion.div>

            {/* Cell 6: Text-to-Speech (TTS) & Speech-to-Text (STT) (Standard Width) */}
            <motion.div 
              className="md:col-span-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
            >
              <BorderGlow className="w-full h-full min-h-[340px] md:min-h-[380px]" backgroundColor="#FFFDF7" glowColor="217 91% 60%">
                <div className="h-full bg-[#FFFDF7] rounded-[28px] p-5 sm:p-8 flex flex-col justify-between relative group overflow-hidden border-2 border-[#4A2E1B]/30 shadow-[5px_5px_0px_#4A2E1B] hover:shadow-[6px_6px_0px_#2563eb] transition-shadow duration-300">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <Ear className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] text-[#8C7355] font-bold uppercase tracking-widest font-mono">06 / AUDIO & VOICE 🎧</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight leading-tight">TTS Audio Podcast & STT</h3>
                    <p className="text-slate-600 mt-2 text-sm leading-relaxed font-serif">
                      Dengarkan seluruh isi catatan dalam format podcast audio interaktif dengan kecepatan suara fleksibel dan pengenal komando suara.
                    </p>
                  </div>

                  {/* Audio Podcast Mockup Widget */}
                  <div className="mt-6 bg-[#FAF6EE] border-2 border-[#4A2E1B]/20 rounded-2xl p-4 flex flex-col gap-2 w-full shadow-inner relative z-10 font-mono">
                    <div className="flex items-center justify-between text-[11px] text-blue-600 font-bold">
                      <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 animate-pulse" /> Podcast Audio</span>
                      <span className="text-slate-500 text-[10px]">Kecepatan 1.25x</span>
                    </div>
                    {/* Waveform graphic */}
                    <div className="flex items-center gap-1 h-6 py-1">
                      {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95, 30, 75, 55, 85].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-full" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </motion.div>

            {/* Cell 7: Sienna Accessibility Suite (Full Width Banner) */}
            <motion.div 
              className="md:col-span-3"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <BorderGlow className="w-full h-full min-h-[220px]" backgroundColor="#FFFDF7" glowColor="150 84% 60%">
                <div className="bg-[#FFFDF7] h-full rounded-[28px] p-5 sm:p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 relative group overflow-hidden border-2 border-[#4A2E1B]/30 shadow-[5px_5px_0px_#4A2E1B] hover:shadow-[6px_6px_0px_#059669] transition-shadow duration-300">
                  {/* Left: Icon + Symbol */}
                  <div className="flex flex-col items-center gap-3 relative z-10 shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <PersonStanding className="w-8 h-8" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 tracking-wider">SIENNA SUITE</span>
                  </div>

                  {/* Center & Right: Content & Widget Pills */}
                  <div className="flex-1 relative z-10 text-left">
                    <span className="text-[9px] text-[#8C7355] font-bold uppercase tracking-widest font-mono">07 / ACCESSIBILITY & INCLUSION ♿</span>
                    <h3 className="text-xl md:text-2xl font-display font-black text-slate-900 tracking-tight leading-tight mt-1">Menu Aksesibilitas Sienna Terintegrasi</h3>
                    <p className="text-slate-600 mt-2 text-sm leading-relaxed max-w-2xl font-serif">
                      Dirancang untuk seluruh pelajar tanpa kecuali: mode disleksia (OpenDyslexic), tema kontras tinggi adaptif, pembaca layar otomatis, penggaris fokus membaca (Reading Ruler), dan perbesaran kursor teks.
                    </p>
                    
                    {/* Interactive Feature Pills */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#D4C3AC] text-xs text-slate-800 font-mono flex items-center gap-1.5 shadow-2xs">
                        🔤 Font Disleksia
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#D4C3AC] text-xs text-slate-800 font-mono flex items-center gap-1.5 shadow-2xs">
                        🌓 Kontras Tinggi
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#D4C3AC] text-xs text-slate-800 font-mono flex items-center gap-1.5 shadow-2xs">
                        🔊 Pembaca Layar
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#D4C3AC] text-xs text-slate-800 font-mono flex items-center gap-1.5 shadow-2xs">
                        📏 Reading Focus Ruler
                      </span>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </motion.div>

          </div>
        </div>
      </section>

      {/* =============================================
          7. REFINED NOTEBOOK CTA SECTION (Bento Card Style)
          ============================================= */}
      <section className="relative py-20 md:py-32 bg-[#FAF6EE] overflow-hidden border-t-2 border-dashed border-[#D4C3AC]">
        {/* Hand-drawn notebook dot grid pattern */}
        <div 
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#C5B39B 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Ambient color glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[25vw] bg-gradient-to-r from-blue-400/15 via-indigo-400/15 to-cyan-400/15 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6" style={{ perspective: 1200 }}>
          {/* Main Card Shell with BorderGlow & 3D Tilt */}
          <BorderGlow className="w-full h-full" backgroundColor="#FFFDF7" glowColor="226 71% 50%">
            <motion.div 
              ref={ctaCardRef}
              onMouseMove={handleCtaCardMouseMove}
              onMouseLeave={handleCtaCardMouseLeave}
              className="bg-[#FFFDF7] rounded-3xl p-8 sm:p-12 md:p-16 border-2 border-[#4A2E1B]/30 shadow-[8px_8px_0px_#4A2E1B] hover:shadow-[12px_12px_0px_#2563eb] relative overflow-hidden flex flex-col items-center text-center cursor-default origin-center select-none transition-shadow duration-300"
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                rotateX: springCtaRotateX,
                rotateY: springCtaRotateY,
                transformStyle: "preserve-3d",
              }}
            >
              
              {/* Washi Tape Accent at Top Spine */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#E8DCC4] border-x border-[#C5B39B] rotate-[-1deg] shadow-2xs pointer-events-none z-20" />

              {/* Sticky Tag Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs mb-6" style={{ transform: "translateZ(25px)" }}>
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-widest font-mono">
                  {t('landing.cta_badge') || 'MULAI SEKARANG'}
                </span>
              </div>
              
              {/* Title with Scribble Underline */}
              <div className="relative mb-6 max-w-2xl" style={{ transform: "translateZ(35px)" }}>
                <h2 className="font-display font-black text-[#3D2314] tracking-tight leading-[1.15] text-3xl sm:text-4xl md:text-5xl">
                  {t('landing.cta_title_1') || 'Mulai Perjalanan'} <br className="hidden sm:inline" />
                  {t('landing.cta_title_2') || 'Belajarmu Hari Ini.'}
                </h2>
                {/* Hand-Drawn Scribble Underline SVG */}
                <svg className="w-full h-3.5 text-blue-500/70 mt-2 pointer-events-none" viewBox="0 0 200 12" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <path d="M 5 6 Q 50 1, 100 8 T 195 5" />
                </svg>
              </div>

              <p className="text-[#594429] text-sm md:text-base max-w-lg mx-auto mb-10 leading-relaxed font-serif" style={{ transform: "translateZ(20px)" }}>
                {t('landing.cta_desc') || 'Bergabunglah secara gratis dan temukan cara yang lebih terstruktur untuk mengatur catatan serta wawasan belajarmu.'}
              </p>

              {/* Primary Action Button */}
              <motion.button
                onClick={() => openAuthModal('register')}
                className="cursor-pointer relative inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-12 sm:py-5 rounded-2xl font-mono font-black text-sm sm:text-base text-white overflow-hidden shadow-xl shadow-blue-600/30 group border-2 border-blue-400/50"
                style={{ 
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  transform: "translateZ(45px)"
                }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <span className="relative z-10 flex items-center gap-2.5 tracking-wide font-mono uppercase font-extrabold">
                  {t('landing.cta_btn') || 'Mulai Belajar Sekarang'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>

              {/* Value Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs text-[#8C7355] font-bold font-mono uppercase tracking-widest border-t border-[#E6D9C5] pt-6 w-full max-w-md" style={{ transform: "translateZ(20px)" }}>
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-blue-600" /> {t('landing.value_free') || 'Gratis Selamanya'}</span>
                <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-blue-600" /> {t('landing.value_instant') || 'Setup Instan'}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-600" /> {t('landing.value_community') || 'Komunitas Aktif'}</span>
              </div>
            </motion.div>
          </BorderGlow>
        </div>
      </section>

      <Footer theme="light" />
    </div>
  );
}
