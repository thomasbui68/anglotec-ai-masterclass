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

  // Start loading Kokoro IMMEDIATELY when hook mounts (background)
  useEffect(() => {
    const saved = localStorage.getItem("anglotec_voice_id");
    const langMap: Record<string, string> = {
      en: "af_bella", es: "af_nicole", fr: "bf_emma", de: "af_sarah",
      it: "bf_isabella", pt: "af_sky", nl: "af_bella", pl: "af_nicole",
      ru: "af_sarah", zh: "af_bella", ja: "af_sky", ar: "af_bella",
    };
    const defaultVoice = (saved && KOKORO_VOICES[saved]) ? saved : (langMap[language] || "af_bella");
    setState(s => ({ ...s, currentVoice: defaultVoice }));

    // Begin background load NOW — don't wait for user click
    setState(s => ({ ...s, isLoading: true }));
    startKokoroLoad((progress: number) => {
      setState(s => ({ ...s, isLoading: progress < 100, progress, isReady: progress >= 100 }));
    });
  }, [language]);

  /** Speak — instant browser voice first, Kokoro when ready */
  const speak = useCallback((text: string) => {
    if (!text?.trim()) return;
    abortRef.current = false;

    // If Kokoro is ready — use it (premium path)
    if (globalTts) {
      setState(s => ({ ...s, isSpeaking: true }));

      const doKokoro = async () => {
        try {
          const voiceId = state.currentVoice || "af_bella";
          const audioData = await Promise.race([
            globalTts.generate(text, { voice: voiceId }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
          ]);

          if (abortRef.current) return;

          let blob: Blob;
          if ((audioData as any).toBlob) blob = (audioData as any).toBlob();
          else if ((audioData as any).blob) blob = (audioData as any).blob;
          else if (audioData instanceof Blob) blob = audioData;
          else if (audioData instanceof ArrayBuffer) blob = new Blob([audioData], { type: "audio/wav" });
          else if (audioData && typeof (audioData as any).arrayBuffer === "function") {
            blob = new Blob([await (audioData as any).arrayBuffer()], { type: "audio/wav" });
          } else throw new Error("Bad format");

          if (blob.size === 0) throw new Error("Empty");

          const url = URL.createObjectURL(blob);
          if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }

          const audio = new Audio(url);
          audioRef.current = audio;

          const autoReset = setTimeout(() => { URL.revokeObjectURL(url); setState(s => ({ ...s, isSpeaking: false })); }, 25000);
          audio.onended = () => { clearTimeout(autoReset); URL.revokeObjectURL(url); setState(s => ({ ...s, isSpeaking: false })); };
          audio.onerror = () => { clearTimeout(autoReset); URL.revokeObjectURL(url); setState(s => ({ ...s, isSpeaking: false })); };

          await audio.play();
        } catch {
          // Kokoro failed — fall through to instant browser TTS
          if (!abortRef.current) speakBrowser(text, () => setState(s => ({ ...s, isSpeaking: false })));
          else setState(s => ({ ...s, isSpeaking: false }));
        }
      };

      doKokoro();
      return;
    }

    // Kokoro not loaded yet — use instant browser TTS
    setState(s => ({ ...s, isSpeaking: true }));
    speakBrowser(text, () => setState(s => ({ ...s, isSpeaking: false })));
  }, [state.currentVoice]);

  const stop = useCallback(() => {
    abortRef.current = true;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
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
    isFallback: !globalTts,
    hasConfig: true,
    platform: "kokoro",
  };
}
