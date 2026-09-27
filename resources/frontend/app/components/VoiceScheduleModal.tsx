import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  RotateCcw,
  ArrowRight,
  Loader2,
  Calendar,
  AlertCircle,
  Volume2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Flame,
  Check,
} from 'lucide-react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useTranslation } from '../hooks/useTranslation';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

interface VoiceScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (scheduleData: any) => void;
  initialDate?: string;
}

export function VoiceScheduleModal({ isOpen, onClose, onSuccess, initialDate }: VoiceScheduleModalProps) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'id' ? 'id-ID' : language;
  const { showToast } = useToast();
  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: voiceError,
  } = useVoiceRecognition();

  const formatLocalDate = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [targetDate, setTargetDate] = useState<string>(() => initialDate || formatLocalDate(new Date()));
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isSavingConfirmation, setIsSavingConfirmation] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Modal Step: 'record' | 'confirm'
  const [step, setStep] = useState<'record' | 'confirm'>('record');
  const [previewData, setPreviewData] = useState<{
    summary: string;
    items: any[];
    raw_prompt?: string;
    target_date?: string;
    date?: string;
  } | null>(null);

  useEffect(() => {
    let timer: any;
    if (isListening) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isListening]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (initialDate) {
      setTargetDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      resetTranscript();
      setRecordingSeconds(0);
      setStep('record');
      setPreviewData(null);
    } else {
      document.body.style.overflow = '';
      stopListening();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Step 1: Parse and show preview for confirmation
  const handleParseAndPreview = async () => {
    const fullText = transcript.trim();
    if (!fullText) {
      showToast(t('schedule.modal_empty_voice'), 'warning');
      return;
    }

    stopListening();
    setIsProcessingAI(true);

    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const token = localStorage.getItem('bayu-token') || sessionStorage.getItem('bayu-token');
      const res = await axios.post(
        '/api/v1/schedule/parse-voice',
        {
          prompt: fullText,
          target_date: targetDate,
          current_time: currentTime,
          preview_only: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.status === 'success' && res.data.data) {
        if (res.data.data.target_date || res.data.data.date) {
          setTargetDate(res.data.data.target_date || res.data.data.date);
        }
        setPreviewData(res.data.data);
        setStep('confirm');
      }
    } catch (err: any) {
      console.error('Failed to parse voice schedule:', err);
      const errMsg = err.response?.data?.message || 'Gagal memproses jadwal suara. Pastikan koneksi internet stabil.';
      showToast(errMsg, 'error');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Step 2: Confirm and save to database
  const handleSaveConfirmed = async () => {
    if (!previewData) return;

    setIsSavingConfirmation(true);
    try {
      const finalDate = previewData.target_date || previewData.date || targetDate;
      const token = localStorage.getItem('bayu-token') || sessionStorage.getItem('bayu-token');
      const res = await axios.post(
        '/api/v1/schedule/confirm',
        {
          date: finalDate,
          items: previewData.items,
          summary: previewData.summary,
          raw_prompt: previewData.raw_prompt || transcript,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.status === 'success') {
        showToast(t('schedule.modal_save_success'), 'success');
        onSuccess({ ...res.data.data, date: finalDate, target_date: finalDate });
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to save confirmed schedule:', err);
      showToast(t('schedule.modal_save_error'), 'error');
    } finally {
      setIsSavingConfirmation(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3.5 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="bg-white dark:bg-[#181624] w-full max-w-lg rounded-[28px] sm:rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 text-white shadow-md shadow-primary/20 shrink-0">
              {step === 'confirm' ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-['Lexend_Deca'] font-extrabold text-[16px] sm:text-[17px] text-gray-900 dark:text-gray-100">
                {step === 'confirm' ? t('schedule.modal_confirm_title') : t('schedule.modal_record_title')}
              </h3>
              <p className="text-[12px] font-['Manrope'] text-gray-500 dark:text-gray-400 font-medium">
                {step === 'confirm' ? t('schedule.modal_confirm_desc') : t('schedule.modal_record_desc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          
          {step === 'record' ? (
            /* STEP 1: RECORD & TRANSCRIPT */
            <>
              {/* Target Date Picker */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#13111C] rounded-2xl border border-gray-200/80 dark:border-white/5">
                <span className="text-[12.5px] font-['Manrope'] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary shrink-0" /> {t('schedule.modal_date_label')}
                </span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-white dark:bg-[#1C1A29] px-3 py-1.5 rounded-xl text-[12.5px] font-['Manrope'] font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Interactive Mic Recorder */}
              <div className="flex flex-col items-center justify-center py-6 sm:py-7 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-white/[0.02] dark:to-transparent rounded-3xl border border-blue-50 dark:border-white/5 space-y-2">
                <div className="relative flex items-center justify-center">
                  {/* Outer Pulsing Waves */}
                  {isListening && (
                    <>
                      <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping" />
                      <div className="absolute w-36 h-36 rounded-full bg-rose-500/10 animate-pulse" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleListening}
                    disabled={isProcessingAI || !isSupported}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105 shadow-rose-500/30'
                        : 'bg-gradient-to-tr from-primary to-indigo-500 text-white hover:scale-105 active:scale-95 shadow-primary/30'
                    } ${(!isSupported || isProcessingAI) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isListening ? t('schedule.modal_stop_record') : t('schedule.modal_start_record')}
                  >
                    <Mic className={`w-8 h-8 ${isListening ? 'animate-pulse' : ''}`} />
                  </button>
                </div>

                {isListening && (
                  <div className="text-center pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold font-['Manrope'] bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                      <span>{t('schedule.modal_recording')} {formatTimer(recordingSeconds)}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Voice Error Notice */}
              {voiceError && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-[12.5px] font-['Manrope'] text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{voiceError}</span>
                </div>
              )}

              {/* Live Transcript & Editable Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12.5px] font-['Manrope'] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-primary" />
                    {t('schedule.modal_transcript_label')}
                  </label>
                  {transcript && (
                    <button
                      type="button"
                      onClick={resetTranscript}
                      className="text-[12px] font-['Manrope'] font-semibold text-gray-400 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder={t('schedule.modal_transcript_placeholder')}
                    rows={4}
                    className="w-full p-3.5 sm:p-4 rounded-2xl bg-gray-50 dark:bg-[#13111C] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 text-[13px] sm:text-[13.5px] font-['Manrope'] leading-relaxed focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all resize-none placeholder-gray-400 dark:placeholder-gray-600"
                  />
                </div>
              </div>
            </>
          ) : (
            /* STEP 2: CONFIRMATION / PREVIEW */
            <div className="space-y-4">
              {/* Target Date Badge */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-[12.5px] font-['Manrope'] font-bold text-primary">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> {t('schedule.modal_target_date')}</span>
                <span className="font-extrabold">{new Date(targetDate + 'T00:00:00').toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>

              {/* Focus Summary Card */}
              {previewData?.summary && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-white/5 dark:to-transparent border border-blue-100 dark:border-white/10 space-y-1">
                  <p className="text-[11.5px] font-['Lexend_Deca'] font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> {t('schedule.modal_ai_focus')}
                  </p>
                  <p className="text-[13px] font-['Manrope'] text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    "{previewData.summary}"
                  </p>
                </div>
              )}

              {/* Extracted Slots List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[12.5px] font-['Manrope'] font-bold text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> {t('schedule.modal_activities_found')}</span>
                  <span className="text-primary font-extrabold">{t('schedule.modal_activities_count', { count: previewData?.items?.length || 0 })}</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {previewData?.items?.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/10"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20 text-primary font-['Lexend_Deca'] font-extrabold text-[11px] shrink-0">
                          {it.time_start} - {it.time_end}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-['Lexend_Deca'] font-bold text-[13px] text-gray-900 dark:text-gray-100 truncate">
                            {it.title}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold font-['Manrope'] px-1.5 py-0.2 rounded bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                              {it.category}
                            </span>
                            {it.priority === 'tinggi' && (
                              <span className="text-[9.5px] font-bold text-rose-500 flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" /> {t('schedule.modal_priority')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
          {step === 'record' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessingAI}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-[13.5px] font-['Manrope'] font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer text-center"
              >
                {t('chatbot.cancel')}
              </button>

              <button
                type="button"
                onClick={handleParseAndPreview}
                disabled={isProcessingAI || !transcript.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-[13.5px] font-['Manrope'] font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('schedule.modal_analyzing')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('schedule.plan_now')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('record')}
                disabled={isSavingConfirmation}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-['Manrope'] font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('schedule.modal_back_edit')}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveConfirmed}
                disabled={isSavingConfirmation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13.5px] font-['Manrope'] font-bold shadow-lg shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingConfirmation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('schedule.modal_saving')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t('schedule.modal_confirm_save')}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
