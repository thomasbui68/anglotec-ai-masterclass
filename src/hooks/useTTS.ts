import { useState, useEffect, useCallback, useRef } from "react";

export type TTSEngine = "responsiveVoice" | "webSpeech" | "none";

interface TTSVoice {
  id: string;
  name: string;
  lang: string;
  quality: number;
}

const PREFERRED_VOICE_PATTERNS = [
  { pattern: /samantha/i, score: 10 },
  { pattern: /google us english/i, score: 9 },
  { pattern: /microsoft.*natural/i, score: 9 },
  { pattern: /microsoft.*neural/i, score: 9 },
  { pattern: /premium/i, score: 8 },
  { pattern: /enhanced/i, score: 8 },
  { pattern: /google uk english/i, score: 8 },
  { pattern: /microsoft/i, score: 7 },
  { pattern: /english.*united states/i, score: 6 },
  { pattern: /us english/i, score: 6 },
  { pattern: /english/i, score: 5 },
];

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  for (const pref of PREFERRED_VOICE_PATTERNS) {
    if (pref.pattern.test(name)) return pref.score;
  }
  return voice.lang?.toLowerCase().startsWith("en") ? 3 : 1;
}

function getBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const scored = voices.map((v) => ({ voice: v, score: scoreVoice(v) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].voice;
}

function loadVoicePreference(): string | null {
  try {
    return localStorage.getItem("anglotec_tts_voice");
  } catch {
    return null;
  }
}

function saveVoicePreference(voiceName: string) {
  try {
    localStorage.setItem("anglotec_tts_voice", voiceName);
  } catch {
    // ignore
  }
}

function loadSavedNumber(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v ? parseFloat(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

/** Estimate speech duration in ms for safety timeout */
function estimateDuration(text: string, rate: number): number {
  const avgCharsPerSecond = 13 * rate;
  return Math.max(3000, Math.round((text.length / avgCharsPerSecond) * 1000) + 2000);
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [engine, setEngine] = useState<TTSEngine>("none");
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState<number>(0.85);
  const [pitch, setPitch] = useState<number>(1);

  // ResponsiveVoice state: just tracks if script loaded (not if it works)
  const rvLoadedRef = useRef(false);
  const rvFailedRef = useRef(false);

  const webSpeechVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rvFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentOnEndRef = useRef<(() => void) | undefined>(undefined);

  // ---- Cleanup helpers ----
  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const clearRvFallbackTimer = useCallback(() => {
    if (rvFallbackTimerRef.current) {
      clearTimeout(rvFallbackTimerRef.current);
      rvFallbackTimerRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    clearSafetyTimer();
    clearRvFallbackTimer();
    setIsSpeaking(false);
    const onEnd = currentOnEndRef.current;
    currentOnEndRef.current = undefined;
    onEnd?.();
  }, [clearSafetyTimer, clearRvFallbackTimer]);

  // ---- Web Speech API: always initialize ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setIsReady(true);
      return;
    }

    const synth = window.speechSynthesis;

    const initVoices = () => {
      const available = synth.getVoices();
      if (!available.length) return;

      webSpeechVoicesRef.current = available;

      const ttsVoices: TTSVoice[] = available.map((v) => ({
        id: v.name,
        name: v.name,
        lang: v.lang,
        quality: scoreVoice(v),
      }));
      ttsVoices.sort((a, b) => b.quality - a.quality);
      setVoices(ttsVoices);

      const saved = loadVoicePreference();
      let bestVoice: SpeechSynthesisVoice | null = null;
      if (saved) {
        bestVoice = available.find((v) => v.name === saved) || null;
      }
      if (!bestVoice) {
        bestVoice = getBestVoice(available);
      }
      if (bestVoice) {
        setSelectedVoice(bestVoice.name);
      }

      // Mark Web Speech ready
      setEngine((prev) => {
        if (prev === "none") {
          setIsReady(true);
          return "webSpeech";
        }
        setIsReady(true);
        return prev;
      });
    };

    synth.onvoiceschanged = initVoices;
    initVoices();

    const forceLoad = setTimeout(() => {
      if (webSpeechVoicesRef.current.length === 0) {
        initVoices();
      }
    }, 500);

    return () => {
      clearTimeout(forceLoad);
      synth.onvoiceschanged = null;
    };
  }, []);

  // ---- ResponsiveVoice: load script only ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).responsiveVoice) {
      rvLoadedRef.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://code.responsivevoice.org/responsivevoice.js";
    script.async = true;

    script.onload = () => {
      const rv = (window as any).responsiveVoice;
      if (rv && rv.speak) {
        rvLoadedRef.current = true;
      }
    };

    document.head.appendChild(script);
  }, []);

  // ---- Stop/cancel all speech ----
  const stop = useCallback(() => {
    clearSafetyTimer();
    clearRvFallbackTimer();

    try {
      const rv = (window as any).responsiveVoice;
      if (rv && rv.cancel) rv.cancel();
    } catch {
      // ignore
    }

    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }

    setIsSpeaking(false);
    const onEnd = currentOnEndRef.current;
    currentOnEndRef.current = undefined;
    onEnd?.();
  }, [clearSafetyTimer, clearRvFallbackTimer]);

  // ---- Web Speech speak (reliable fallback) ----
  const speakWebSpeech = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!("speechSynthesis" in window)) {
        onEnd?.();
        return;
      }

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.pitch = pitch;

      if (selectedVoice) {
        const voice = webSpeechVoicesRef.current.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        resetState();
      };

      utterance.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("Web Speech TTS error:", e.error);
        }
        resetState();
      };

      // Safety timeout: max estimated duration + 3s buffer
      const maxDuration = estimateDuration(text, rate) + 3000;
      safetyTimerRef.current = setTimeout(() => {
        if (isSpeaking) {
          try { synth.cancel(); } catch { /* ignore */ }
          resetState();
        }
      }, maxDuration);

      currentOnEndRef.current = onEnd;

      // Small delay after cancel to avoid browser race conditions
      setTimeout(() => {
        try {
          synth.cancel();
          synth.speak(utterance);
        } catch (err) {
          console.warn("Web Speech speak failed:", err);
          resetState();
        }
      }, 50);
    },
    [selectedVoice, rate, pitch, isSpeaking, resetState]
  );

  // ---- ResponsiveVoice speak (enhancement, with live fallback) ----
  const speakResponsiveVoice = useCallback(
    (text: string, onEnd?: () => void) => {
      const rv = (window as any).responsiveVoice;
      if (!rv || !rv.speak || rvFailedRef.current) {
        speakWebSpeech(text, onEnd);
        return;
      }

      let started = false;
      currentOnEndRef.current = onEnd;

      // Fallback timer: if RV doesn't call onstart within 1.5s, it's not working
      rvFallbackTimerRef.current = setTimeout(() => {
        if (!started) {
          rvFailedRef.current = true; // Mark RV as failed for future calls
          try { rv.cancel?.(); } catch { /* ignore */ }
          speakWebSpeech(text, onEnd);
        }
      }, 1500);

      // Safety timer: if RV starts but never ends, force reset after max duration
      const maxDuration = estimateDuration(text, rate) + 5000;
      safetyTimerRef.current = setTimeout(() => {
        if (isSpeaking) {
          try { rv.cancel?.(); } catch { /* ignore */ }
          resetState();
        }
      }, maxDuration);

      try {
        rv.speak(text, "US English Female", {
          rate,
          pitch,
          onstart: () => {
            started = true;
            setIsSpeaking(true);
          },
          onend: () => {
            resetState();
          },
        });
      } catch (err) {
        console.warn("ResponsiveVoice speak failed:", err);
        rvFailedRef.current = true;
        clearRvFallbackTimer();
        speakWebSpeech(text, onEnd);
      }
    },
    [rate, isSpeaking, resetState, clearRvFallbackTimer, speakWebSpeech]
  );

  // ---- Main speak entry point ----
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!text.trim()) {
        onEnd?.();
        return;
      }

      stop();

      if (!isReady) {
        setTimeout(() => {
          speakWebSpeech(text, onEnd);
        }, 300);
        return;
      }

      // Try ResponsiveVoice if loaded; otherwise go straight to Web Speech
      if (rvLoadedRef.current && !rvFailedRef.current) {
        speakResponsiveVoice(text, onEnd);
      } else {
        speakWebSpeech(text, onEnd);
      }
    },
    [isReady, stop, speakWebSpeech, speakResponsiveVoice]
  );

  // ---- Voice / rate / pitch controls ----
  const selectVoice = useCallback((voiceName: string) => {
    setSelectedVoice(voiceName);
    saveVoicePreference(voiceName);
  }, []);

  const setSpeechRate = useCallback((newRate: number) => {
    const clamped = Math.max(0.5, Math.min(1.5, newRate));
    setRate(clamped);
    saveNumber("anglotec_tts_rate", clamped);
  }, []);

  const setSpeechPitch = useCallback((newPitch: number) => {
    const clamped = Math.max(0.5, Math.min(2, newPitch));
    setPitch(clamped);
    saveNumber("anglotec_tts_pitch", clamped);
  }, []);

  // Load saved rate/pitch on mount
  useEffect(() => {
    setRate(loadSavedNumber("anglotec_tts_rate", 0.85));
    setPitch(loadSavedNumber("anglotec_tts_pitch", 1));
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isReady,
    engine,
    voices,
    selectedVoice,
    selectVoice,
    rate,
    setSpeechRate,
    pitch,
    setSpeechPitch,
    responsiveVoiceLoaded: rvLoadedRef.current && !rvFailedRef.current,
  };
}

export default useTTS;
