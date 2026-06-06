/**
 * useKokoroTTS — Premium AI Voice powered by Kokoro (ONNX)
 * 
 * Replaces robotic browser TTS with a state-of-the-art neural voice.
 * - Free, no API keys, runs 100% in browser
 * - 82M parameter model — incredibly natural, human-like
 * - 10 voice characters (5 female, 5 male, US + UK)
 * 
 * Loading: ~50MB first time, cached in IndexedDB forever
 */

import { useState, useCallback, useRef, useEffect } from "react";

interface KokoroState {
  isReady: boolean;
  isLoading: boolean;
  isSpeaking: boolean;
  progress: number;
  error: string | null;
  currentVoice: string;
  availableVoices: string[];
}

const KOKORO_VOICES: Record<string, { name: string; gender: string; lang: string }> = {
  "af_bella": { name: "Bella (US Female)", gender: "female", lang: "en-US" },
  "af_nicole": { name: "Nicole (US Female)", gender: "female", lang: "en-US" },
  "af_sarah": { name: "Sarah (US Female)", gender: "female", lang: "en-US" },
  "af_sky": { name: "Sky (US Female)", gender: "female", lang: "en-US" },
  "am_adam": { name: "Adam (US Male)", gender: "male", lang: "en-US" },
  "am_michael": { name: "Michael (US Male)", gender: "male", lang: "en-US" },
  "bf_emma": { name: "Emma (UK Female)", gender: "female", lang: "en-GB" },
  "bf_isabella": { name: "Isabella (UK Female)", gender: "female", lang: "en-GB" },
  "bm_george": { name: "George (UK Male)", gender: "male", lang: "en-GB" },
  "bm_lewis": { name: "Lewis (UK Male)", gender: "male", lang: "en-GB" },
};

// Singletons
let globalTtsInstance: any = null;
let isLoadingGlobal = false;
let loadFailed = false;

/** Try to load Kokoro in background. Returns true if already loaded or loading started. */
async function loadKokoro(setProgress: (p: number) => void): Promise<boolean> {
  if (globalTtsInstance) return true;
  if (isLoadingGlobal) return false; // Already loading
  if (loadFailed) return false; // Already failed

  isLoadingGlobal = true;
  setProgress(5);

  try {
    // Method 1: Try ESM import from CDN
    setProgress(10);
    const win = window as any;

    // If already loaded by a previous page
    if (win.KokoroTTS) {
      setProgress(30);
    } else {
      // Load the script using a dynamic import approach
      setProgress(15);
      try {
        // Use dynamic import with eval to bypass TypeScript module resolution
        const module = await eval(
          'import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js")'
        );
        win.KokoroTTS = module.KokoroTTS || module.default?.KokoroTTS;
        setProgress(25);
      } catch (importErr) {
        // Fallback: load as script tag
        console.warn("[Kokoro] ESM import failed, trying script tag:", importErr);
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
          script.crossOrigin = "anonymous";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Script load failed"));
          document.head.appendChild(script);
        });
        setProgress(25);
      }
    }

    // Wait for KokoroTTS to be available
    let retries = 0;
    while (!win.KokoroTTS && retries < 30) {
      await new Promise(r => setTimeout(r, 300));
      retries++;
    }
    if (!win.KokoroTTS) {
      throw new Error("Voice engine not available after load");
    }

    setProgress(30);

    // Initialize the model
    globalTtsInstance = await win.KokoroTTS.from_pretrained(
      "onnx-community/Kokoro-82M-ONNX",
      {
        dtype: "q8",       // Quantized — smaller, faster download
        device: "wasm",    // Works on all devices including mobile
        progress_callback: (p: any) => {
          if (p.status === "progress" || p.status === "download") {
            const pct = Math.min(30 + Math.round((p.progress || 0) * 70), 99);
            setProgress(pct);
          }
        },
      }
    );

    setProgress(100);
    isLoadingGlobal = false;
    return true;

  } catch (err: any) {
    console.warn("[KokoroTTS] Load failed:", err.message);
    loadFailed = true;
    isLoadingGlobal = false;
    return false;
  }
}

export function useKokoroTTS(language: string = "en") {
  const [state, setState] = useState<KokoroState>({
    isReady: false,
    isLoading: false,
    isSpeaking: false,
    progress: 0,
    error: null,
    currentVoice: "af_bella",
    availableVoices: Object.keys(KOKORO_VOICES),
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Determine best default voice
  const getDefaultVoice = useCallback((): string => {
    const langMap: Record<string, string> = {
      en: "af_bella", es: "af_nicole", fr: "bf_emma", de: "af_sarah",
      it: "bf_isabella", pt: "af_sky", nl: "af_bella", pl: "af_nicole",
      ru: "af_sarah", zh: "af_bella", ja: "af_sky", ar: "af_bella",
    };
    return langMap[language] || "af_bella";
  }, [language]);

  // Auto-detect best browser voice for fallback
  const getBrowserVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    // Prefer premium voices
    return voices.find(v => /samantha|google.*english|microsoft.*natural/i.test(v.name))
      || voices.find(v => v.lang?.startsWith("en"))
      || voices[0]
      || null;
  }, []);

  // Initialize
  useEffect(() => {
    const savedVoice = localStorage.getItem("anglotec_voice_id");
    setState(s => ({
      ...s,
      currentVoice: (savedVoice && KOKORO_VOICES[savedVoice]) ? savedVoice : getDefaultVoice(),
    }));

    // Start loading Kokoro in background
    loadKokoro((progress: number) => {
      setState(s => ({ ...s, isLoading: progress < 100, progress }));
      if (progress >= 100) {
        setState(s => ({ ...s, isReady: true, isLoading: false }));
      }
    });

    // Ensure speechSynthesis is available
    if (window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, [getDefaultVoice]);

  // Speak text
  const speak = useCallback(async (text: string) => {
    if (!text?.trim()) return;
    abortRef.current = false;

    // Try Kokoro first if loaded
    if (globalTtsInstance) {
      try {
        setState(s => ({ ...s, isSpeaking: true }));
        const voiceId = state.currentVoice || "af_bella";
        const audioData = await globalTtsInstance.generate(text, { voice: voiceId });

        if (abortRef.current) return;

        // Handle different output formats
        let blob: Blob;
        if (audioData.toBlob) {
          blob = audioData.toBlob();
        } else if (audioData.blob) {
          blob = audioData.blob;
        } else if (audioData instanceof Blob) {
          blob = audioData;
        } else if (audioData instanceof ArrayBuffer) {
          blob = new Blob([audioData], { type: "audio/wav" });
        } else {
          // Unknown format — fall through to browser TTS
          throw new Error("Unknown audio format");
        }

        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          setState(s => ({ ...s, isSpeaking: false }));
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setState(s => ({ ...s, isSpeaking: false }));
        };

        await audio.play();
        return;
      } catch (err) {
        console.warn("[KokoroTTS] Speak failed, using fallback:", err);
        setState(s => ({ ...s, isSpeaking: false }));
      }
    }

    // Browser TTS fallback — works immediately
    if (window.speechSynthesis) {
      setState(s => ({ ...s, isSpeaking: true }));
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      const voice = getBrowserVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => setState(s => ({ ...s, isSpeaking: false }));
      utterance.onerror = () => setState(s => ({ ...s, isSpeaking: false }));

      window.speechSynthesis.speak(utterance);
    }
  }, [state.currentVoice, getBrowserVoice]);

  // Stop speaking
  const stop = useCallback(() => {
    abortRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState(s => ({ ...s, isSpeaking: false }));
  }, []);

  // Select voice
  const selectVoice = useCallback((voiceId: string) => {
    if (KOKORO_VOICES[voiceId]) {
      localStorage.setItem("anglotec_voice_id", voiceId);
      setState(s => ({ ...s, currentVoice: voiceId }));
    }
  }, []);

  return {
    ...state,
    speak,
    stop,
    selectVoice,
    voiceNames: KOKORO_VOICES,
    isFallback: !globalTtsInstance,
    hasConfig: true,
    platform: "kokoro",
  };
}
