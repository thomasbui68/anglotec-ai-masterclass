import { useState, useEffect, useCallback, useRef } from "react";

export type TTSEngine = "responsiveVoice" | "webSpeech" | "none";

export interface TTSVoice {
  id: string;
  name: string;
  lang: string;
  quality: number;
  category: "premium" | "enhanced" | "standard";
}

// ── Voice scoring: only the best voices get top marks ──
const PREMIUM_PATTERNS = [
  // Apple Siri voices — absolute best quality
  { pattern: /samantha/i, score: 10, category: "premium" as const },
  { pattern: /karen/i, score: 10, category: "premium" as const },
  { pattern: /daniel/i, score: 10, category: "premium" as const },
  { pattern: /moira/i, score: 10, category: "premium" as const },
  { pattern: /tessa/i, score: 10, category: "premium" as const },
  { pattern: /serena/i, score: 10, category: "premium" as const },
  { pattern: /siri/i, score: 10, category: "premium" as const },
  { pattern: /fred/i, score: 10, category: "premium" as const },
  // Google premium voices
  { pattern: /google us english/i, score: 9, category: "premium" as const },
  { pattern: /google uk english/i, score: 9, category: "premium" as const },
  { pattern: /google.*premium/i, score: 9, category: "premium" as const },
  // Microsoft natural / neural — very high quality
  { pattern: /microsoft.*natural/i, score: 9, category: "premium" as const },
  { pattern: /microsoft.*neural/i, score: 9, category: "premium" as const },
  { pattern: /microsoft.*aria/i, score: 9, category: "premium" as const },
  { pattern: /microsoft.*jenny/i, score: 9, category: "premium" as const },
  { pattern: /microsoft.*sonia/i, score: 9, category: "premium" as const },
  { pattern: /microsoft.*libby/i, score: 9, category: "premium" as const },
  // Android premium voices
  { pattern: /premium/i, score: 8, category: "enhanced" as const },
  { pattern: /enhanced/i, score: 8, category: "enhanced" as const },
  { pattern: /high.*quality/i, score: 8, category: "enhanced" as const },
  // Standard Microsoft voices
  { pattern: /microsoft.*david/i, score: 7, category: "enhanced" as const },
  { pattern: /microsoft.*zira/i, score: 7, category: "enhanced" as const },
  { pattern: /microsoft.*mark/i, score: 7, category: "enhanced" as const },
  { pattern: /microsoft.*heera/i, score: 7, category: "enhanced" as const },
  { pattern: /microsoft/i, score: 6, category: "enhanced" as const },
  // Google standard
  { pattern: /google/i, score: 6, category: "enhanced" as const },
  // iOS other voices
  { pattern: /alex/i, score: 6, category: "enhanced" as const },
  { pattern: /victoria/i, score: 6, category: "enhanced" as const },
  // Generic English
  { pattern: /english.*united states/i, score: 5, category: "standard" as const },
  { pattern: /us english/i, score: 5, category: "standard" as const },
  { pattern: /english/i, score: 4, category: "standard" as const },
];

function analyzeVoice(voice: SpeechSynthesisVoice): { score: number; category: "premium" | "enhanced" | "standard" } {
  const name = voice.name.toLowerCase();
  for (const pref of PREMIUM_PATTERNS) {
    if (pref.pattern.test(name)) return { score: pref.score, category: pref.category };
  }
  // English voices get a small bonus
  if (voice.lang?.toLowerCase().startsWith("en")) {
    return { score: 3, category: "standard" };
  }
  return { score: 1, category: "standard" };
}

function getBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const scored = voices.map((v) => ({ voice: v, ...analyzeVoice(v) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].voice;
}

// ── Text preprocessing for natural-sounding speech ──
function preprocessText(text: string): string {
  return (
    text
      // Add pause after commas
      .replace(/,\s*/g, ", ")
      // Ensure periods have space after
      .replace(/\.\s*/g, ". ")
      // Clean up multiple spaces
      .replace(/\s{2,}/g, " ")
      // Trim
      .trim()
  );
}

// ── localStorage helpers ──
function loadStr(key: string, fallback: string | null): string | null {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStr(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function loadNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? parseFloat(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveNum(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
}

// ── Estimate speech duration ──
function estimateDurationMs(text: string, rate: number): number {
  // ~13 chars per second at rate 1.0
  const charsPerSec = 13 * rate;
  return Math.max(3000, Math.round((text.length / charsPerSec) * 1000) + 2000);
}

// ── Hook ──
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [engine, setEngine] = useState<TTSEngine>("none");
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [rate, setRate] = useState<number>(0.82);
  const [pitch, setPitch] = useState<number>(1.0);
  const [volume, setVolumeState] = useState<number>(1.0);

  const webSpeechVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentOnEndRef = useRef<(() => void) | undefined>(undefined);
  const speakingRef = useRef(false);

  // Keep ref in sync with state
  speakingRef.current = isSpeaking;

  const clearSafety = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const resetSpeaking = useCallback(() => {
    clearSafety();
    setIsSpeaking(false);
    const onEnd = currentOnEndRef.current;
    currentOnEndRef.current = undefined;
    onEnd?.();
  }, [clearSafety]);

  // ── Initialize Web Speech API ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setIsReady(true);
      return;
    }

    const synth = window.speechSynthesis;
    let cancelled = false;

    const initVoices = () => {
      if (cancelled) return;
      const available = synth.getVoices();
      if (!available.length) return;

      webSpeechVoicesRef.current = available;

      const ttsVoices: TTSVoice[] = available.map((v) => {
        const analysis = analyzeVoice(v);
        return {
          id: v.name,
          name: v.name,
          lang: v.lang,
          quality: analysis.score,
          category: analysis.category,
        };
      });

      // Sort by quality descending
      ttsVoices.sort((a, b) => b.quality - a.quality);
      setVoices(ttsVoices);

      // Select best voice (or saved preference)
      const saved = loadStr("anglotec_tts_voice", null);
      let best: SpeechSynthesisVoice | null = null;
      if (saved) {
        best = available.find((v) => v.name === saved) || null;
      }
      if (!best) {
        best = getBestVoice(available);
      }
      if (best && !cancelled) {
        setSelectedVoice(best.name);
      }

      if (!cancelled) {
        setEngine((prev) => {
          if (prev === "none") {
            setIsReady(true);
            return "webSpeech";
          }
          setIsReady(true);
          return prev;
        });
      }
    };

    synth.onvoiceschanged = initVoices;
    initVoices();

    // Chrome sometimes needs a second call
    const retryTimer = setTimeout(() => {
      if (webSpeechVoicesRef.current.length === 0 && !cancelled) {
        initVoices();
      }
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      synth.onvoiceschanged = null;
    };
  }, []);

  // ── Stop/cancel all speech ──
  const stop = useCallback(() => {
    clearSafety();
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* ignore */
    }
    setIsSpeaking(false);
    const onEnd = currentOnEndRef.current;
    currentOnEndRef.current = undefined;
    onEnd?.();
  }, [clearSafety]);

  // ── Speak (single unified high-quality path) ──
  const speak = useCallback(
    (rawText: string, onEnd?: () => void) => {
      if (!rawText.trim()) {
        onEnd?.();
        return;
      }

      // Cancel any ongoing speech first
      stop();

      const text = preprocessText(rawText);

      // If not ready yet, queue it
      if (!isReady) {
        setTimeout(() => {
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = "en-US";
            u.rate = 0.82;
            u.pitch = 1.0;
            u.onend = () => onEnd?.();
            u.onerror = () => onEnd?.();
            window.speechSynthesis.speak(u);
          } else {
            onEnd?.();
          }
        }, 500);
        return;
      }

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Pick the best available voice
      if (selectedVoice && webSpeechVoicesRef.current.length) {
        const voice = webSpeechVoicesRef.current.find((v) => v.name === selectedVoice);
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        resetSpeaking();
      };

      utterance.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("TTS error:", e.error);
        }
        resetSpeaking();
      };

      // Safety timeout
      const maxMs = estimateDurationMs(text, rate) + 4000;
      safetyTimerRef.current = setTimeout(() => {
        if (speakingRef.current) {
          try { synth.cancel(); } catch { /* */ }
          resetSpeaking();
        }
      }, maxMs);

      currentOnEndRef.current = onEnd;

      // Small delay to ensure clean state
      setTimeout(() => {
        try {
          synth.cancel();
          synth.speak(utterance);
        } catch {
          resetSpeaking();
        }
      }, 60);
    },
    [isReady, stop, selectedVoice, rate, pitch, volume, resetSpeaking]
  );

  // ── Controls ──
  const selectVoice = useCallback((voiceName: string) => {
    setSelectedVoice(voiceName);
    saveStr("anglotec_tts_voice", voiceName);
  }, []);

  const setSpeechRate = useCallback((newRate: number) => {
    const clamped = Math.max(0.5, Math.min(1.5, newRate));
    setRate(clamped);
    saveNum("anglotec_tts_rate", clamped);
  }, []);

  const setSpeechPitch = useCallback((newPitch: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, newPitch));
    setPitch(clamped);
    saveNum("anglotec_tts_pitch", clamped);
  }, []);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0.1, Math.min(1.0, newVol));
    setVolumeState(clamped);
    saveNum("anglotec_tts_volume", clamped);
  }, []);

  // Load saved preferences
  useEffect(() => {
    setRate(loadNum("anglotec_tts_rate", 0.82));
    setPitch(loadNum("anglotec_tts_pitch", 1.0));
    setVolumeState(loadNum("anglotec_tts_volume", 1.0));
  }, []);

  // ── Premium voices helper (for UI) ──
  const premiumVoices = voices.filter((v) => v.category === "premium");
  const enhancedVoices = voices.filter((v) => v.category === "enhanced");
  const currentVoice = voices.find((v) => v.id === selectedVoice);
  const voiceQuality = currentVoice?.category || "standard";

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
    volume,
    setVolume,
    // Premium helpers
    premiumVoices,
    enhancedVoices,
    currentVoice,
    voiceQuality,
  };
}

export default useTTS;
