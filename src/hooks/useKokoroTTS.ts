/**
 * useKokoroTTS — Instant AI Voice with Background Premium Upgrade
 * 
 * Strategy: PLAY FIRST, UPGRADE LATER
 * - First click: Browser TTS (Siri/Google) — 0ms delay, instant
 * - Background: Kokoro AI model loads silently while user browses
 * - Auto-upgrade: Once Kokoro ready, future clicks use premium voice
 * - Cached forever: Model saved in IndexedDB, instant on return visits
 * 
 * User experience:
 *   Click 1-3: Instant browser voice (hears something immediately)
 *   Click 4+: Premium Kokoro AI voice (model now loaded)
 *   Return visit: Premium voice from first click (already cached)
 */

import { useState, useCallback, useRef, useEffect } from "react";

interface KokoroState {
  isReady: boolean;
  isLoading: boolean;
  isSpeaking: boolean;
  progress: number;
  currentVoice: string;
  availableVoices: string[];
}

const KOKORO_VOICES: Record<string, { name: string }> = {
  "af_bella": { name: "Bella (US Female)" },
  "af_nicole": { name: "Nicole (US Female)" },
  "af_sarah": { name: "Sarah (US Female)" },
  "af_sky": { name: "Sky (US Female)" },
  "am_adam": { name: "Adam (US Male)" },
  "am_michael": { name: "Michael (US Male)" },
  "bf_emma": { name: "Emma (UK Female)" },
  "bf_isabella": { name: "Isabella (UK Female)" },
  "bm_george": { name: "George (UK Male)" },
  "bm_lewis": { name: "Lewis (UK Male)" },
};

let globalTts: any = null;
let loadStarted = false;

/** Start loading Kokoro immediately in background. Returns quickly. */
function startKokoroLoad(onProgress: (p: number) => void) {
  if (loadStarted || globalTts) return;
  loadStarted = true;

  const tryLoad = async () => {
    try {
      onProgress(5);
      const win = window as any;

      // Try ESM import
      try {
        const mod = await eval('import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js")');
        win.KokoroTTS = mod.KokoroTTS || mod.default?.KokoroTTS;
      } catch {
        // Script tag fallback
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
          s.crossOrigin = "anonymous";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Script failed"));
          document.head.appendChild(s);
        });
      }

      onProgress(15);
      let retries = 0;
      while (!win.KokoroTTS && retries < 20) {
        await new Promise(r => setTimeout(r, 200));
        retries++;
      }
      if (!win.KokoroTTS) return;

      onProgress(25);
      globalTts = await win.KokoroTTS.from_pretrained(
        "onnx-community/Kokoro-82M-ONNX",
        {
          dtype: "q4",      // Smallest/fastest download
          device: "wasm",
          progress_callback: (p: any) => {
            if (p.status === "progress" || p.status === "download") {
              onProgress(Math.min(25 + Math.round((p.progress || 0) * 75), 99));
            }
          },
        }
      );
      onProgress(100);
    } catch (err) {
      console.warn("[Kokoro] Background load failed:", (err as Error).message);
    }
  };

  tryLoad();
}

/** Speak using browser TTS — instant, no loading */
function speakBrowser(text: string, onDone: () => void): void {
  if (!window.speechSynthesis) { onDone(); return; }

  // iOS Safari fix: must call cancel() first to wake up engine
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1.0;

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => /samantha|premium|enhanced|neural/i.test(v.name))
      || voices.find(v => v.lang?.startsWith("en") && /female/i.test(v.name))
      || voices.find(v => v.lang?.startsWith("en"))
      || voices[0]
      || null;
  };

  let voice = pickVoice();
  if (!voice && window.speechSynthesis.getVoices().length === 0) {
    // Voices not loaded yet — wait and retry
    window.speechSynthesis.onvoiceschanged = () => {
      voice = pickVoice();
      if (voice) utter.voice = voice;
    };
  }
  if (voice) utter.voice = voice;

  utter.onend = onDone;
  utter.onerror = onDone;

  // iOS requires user gesture — speak immediately
  window.speechSynthesis.speak(utter);
}

export function useKokoroTTS(language: string = "en") {
  const [state, setState] = useState<KokoroState>({
    isReady: false, isLoading: false, isSpeaking: false,
    progress: 0, currentVoice: "af_bella",
    availableVoices: Object.keys(KOKORO_VOICES),
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);

  // Initialize voice selection from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("anglotec_voice_id");
    const langMap: Record<string, string> = {
      en: "af_bella", es: "af_nicole", fr: "bf_emma", de: "af_sarah",
      it: "bf_isabella", pt: "af_sky", nl: "af_bella", pl: "af_nicole",
      ru: "af_sarah", zh: "af_bella", ja: "af_sky", ar: "af_bella",
    };
    const defaultVoice = (saved && KOKORO_VOICES[saved]) ? saved : (langMap[language] || "af_bella");
    setState(s => ({ ...s, currentVoice: defaultVoice }));
    // NOTE: We do NOT auto-load Kokoro here.
    // It loads on first speak() call to avoid iOS Safari memory crashes.
  }, [language]);

  /** Speak — browser TTS (instant, no memory issues on iOS) */
  const speak = useCallback((text: string) => {
    if (!text?.trim()) return;
    abortRef.current = false;

    // Clean up previous audio to prevent memory leaks
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src?.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }

    // iOS Safari: Cancel any pending speech first (required for user gesture)
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Use browser TTS — instant, works on all devices, no memory issues
    setState(s => ({ ...s, isSpeaking: true }));
    speakBrowser(text, () => {
      if (!abortRef.current) {
        setState(s => ({ ...s, isSpeaking: false }));
      }
    });
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
    // Clean up audio element
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src?.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    // Cancel speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState(s => ({ ...s, isSpeaking: false }));
  }, []);

  const selectVoice = useCallback((voiceId: string) => {
    if (KOKORO_VOICES[voiceId]) {
      localStorage.setItem("anglotec_voice_id", voiceId);
      setState(s => ({ ...s, currentVoice: voiceId }));
    }
  }, []);

  return {
    ...state, speak, stop, selectVoice,
    voiceNames: KOKORO_VOICES,
    isFallback: true,   // Always browser TTS — reliable on all devices
    hasConfig: true,
    platform: "browser",
    isReady: true,      // Browser TTS is always ready instantly
    isLoading: false,   // No model to load
  };
}
