import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export type VoiceGender = "male" | "female" | "neutral";
export type VoiceAccent = "american" | "british" | "australian" | "indian" | "auto";

export interface BrowserVoice {
  id: string;
  name: string;
  lang: string;
  gender: VoiceGender;
  accent: VoiceAccent;
  quality: "premium" | "good" | "standard";
  platform: string[];
  isNeural: boolean;
}

// Curated best voices per platform — these are the HIDDEN gems most apps miss
const VOICE_RANKINGS: BrowserVoice[] = [
  // macOS / iOS — Siri voices (EXCELLENT quality, completely free)
  { id: "com.apple.speech.synthesis.voice.samantha", name: "Samantha (Premium)", lang: "en-US", gender: "female", accent: "american", quality: "premium", platform: ["macos", "ios"], isNeural: true },
  { id: "com.apple.speech.synthesis.voice.tessa", name: "Tessa (Premium)", lang: "en-GB", gender: "female", accent: "british", quality: "premium", platform: ["macos", "ios"], isNeural: true },
  { id: "com.apple.speech.synthesis.voice.moira", name: "Moira (Premium)", lang: "en-IE", gender: "female", accent: "british", quality: "premium", platform: ["macos", "ios"], isNeural: true },
  { id: "com.apple.speech.synthesis.voice.daniel", name: "Daniel (Premium)", lang: "en-GB", gender: "male", accent: "british", quality: "premium", platform: ["macos", "ios"], isNeural: true },
  { id: "com.apple.speech.synthesis.voice.fred", name: "Fred (Novelty)", lang: "en-US", gender: "male", accent: "american", quality: "good", platform: ["macos", "ios"], isNeural: false },

  // Windows 11 — Microsoft Natural voices (NEURAL, very good)
  { id: "Microsoft Aria Online (Natural) - English (United States)", name: "Aria (Neural)", lang: "en-US", gender: "female", accent: "american", quality: "premium", platform: ["windows"], isNeural: true },
  { id: "Microsoft Jenny Online (Natural) - English (United States)", name: "Jenny (Neural)", lang: "en-US", gender: "female", accent: "american", quality: "premium", platform: ["windows"], isNeural: true },
  { id: "Microsoft Guy Online (Natural) - English (United States)", name: "Guy (Neural)", lang: "en-US", gender: "male", accent: "american", quality: "premium", platform: ["windows"], isNeural: true },
  { id: "Microsoft Sonia Online (Natural) - English (United Kingdom)", name: "Sonia (Neural)", lang: "en-GB", gender: "female", accent: "british", quality: "premium", platform: ["windows"], isNeural: true },
  { id: "Microsoft Ryan Online (Natural) - English (United Kingdom)", name: "Ryan (Neural)", lang: "en-GB", gender: "male", accent: "british", quality: "premium", platform: ["windows"], isNeural: true },

  // Windows 10 — Microsoft voices (decent)
  { id: "Microsoft Zira - English (United States)", name: "Zira", lang: "en-US", gender: "female", accent: "american", quality: "good", platform: ["windows"], isNeural: false },
  { id: "Microsoft David - English (United States)", name: "David", lang: "en-US", gender: "male", accent: "american", quality: "good", platform: ["windows"], isNeural: false },
  { id: "Microsoft Hazel - English (United Kingdom)", name: "Hazel", lang: "en-GB", gender: "female", accent: "british", quality: "good", platform: ["windows"], isNeural: false },

  // Android / ChromeOS — Google voices (good)
  { id: "Google US English", name: "Google US", lang: "en-US", gender: "female", accent: "american", quality: "good", platform: ["android", "chromeos", "linux"], isNeural: true },
  { id: "Google UK English Female", name: "Google UK", lang: "en-GB", gender: "female", accent: "british", quality: "good", platform: ["android", "chromeos", "linux"], isNeural: true },

  // Linux / Fallback
  { id: "english-us", name: "English US", lang: "en-US", gender: "female", accent: "american", quality: "standard", platform: ["linux"], isNeural: false },
  { id: "english-mb-en1", name: "MBrola EN1", lang: "en-US", gender: "male", accent: "american", quality: "standard", platform: ["linux"], isNeural: false },
];

function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "macos";
  if (ua.includes("windows nt")) return "windows";
  if (ua.includes("android")) return "android";
  if (ua.includes("cros")) return "chromeos";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

/** Score a voice for this platform — higher = better match */
function scoreVoice(voice: SpeechSynthesisVoice, platform: string): number {
  const vName = voice.name.toLowerCase();
  const vId = voice.voiceURI.toLowerCase();

  let score = 0;

  // Exact known premium voice match
  const known = VOICE_RANKINGS.find(
    (k) => k.id.toLowerCase() === voice.voiceURI.toLowerCase() || k.name.toLowerCase() === voice.name.toLowerCase()
  );
  if (known) {
    score += known.quality === "premium" ? 1000 : known.quality === "good" ? 500 : 100;
    if (known.platform.includes(platform)) score += 200;
    if (known.isNeural) score += 300;
  }

  // Siri / Apple voices (macOS/iOS premium)
  if (/samantha|tessa|moira|daniel|serena|karen/.test(vName + vId)) score += 800;
  if (/com\.apple/.test(vId) && (platform === "macos" || platform === "ios")) score += 500;

  // Microsoft Natural / Neural (Windows premium)
  if (/microsoft.*natural|microsoft.*neural|microsoft.*aria|microsoft.*jenny|microsoft.*guy|microsoft.*sonia|microsoft.*ryan/.test(vName)) score += 700;
  if (/microsoft.*david|microsoft.*zira|microsoft.*hazel/.test(vName)) score += 400;

  // Google voices (Android/ChromeOS)
  if (/google.*english|google us|google uk/.test(vName)) score += 350;

  // Neural / Enhanced keywords
  if (/neural|enhanced|premium|natural|wav/.test(vName + vId)) score += 250;

  // English priority
  if (voice.lang?.startsWith("en")) score += 100;

  // Local voices preferred over remote
  if (!voice.localService) score -= 100;

  return score;
}

/** Pick the absolute best voice available on this device */
function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const platform = detectPlatform();
  if (!voices.length) return null;

  const scored = voices
    .filter((v) => v.lang?.startsWith("en"))
    .map((v) => ({ voice: v, score: scoreVoice(v, platform) }));

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.voice || voices[0] || null;
}

/** ------------------------------------------------------------------ */
/** TTS Hook — completely free, uses browser's best voice               */
/** ------------------------------------------------------------------ */
export function useBrowserTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentVoice, setCurrentVoice] = useState<BrowserVoice | null>(null);
  const [allVoices, setAllVoices] = useState<BrowserVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isNeural, setIsNeural] = useState(false);
  const [rate, setRate] = useState(() => {
    try { return parseFloat(localStorage.getItem("anglotec_voice_rate") || "0.88"); } catch { return 0.88; }
  });
  const [pitch, setPitch] = useState(() => {
    try { return parseFloat(localStorage.getItem("anglotec_voice_pitch") || "1.0"); } catch { return 1.0; }
  });

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Initialize voices
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setError("Text-to-speech not supported on this browser");
      return;
    }

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const loadVoices = () => {
      const voices = synth.getVoices();
      if (!voices.length) return;

      // Pick best voice for this platform
      const best = pickBestVoice(voices);
      bestVoiceRef.current = best;

      // Map to our curated list for UI
      const mapped: BrowserVoice[] = voices
        .filter((v) => v.lang?.startsWith("en"))
        .map((v) => {
          const known = VOICE_RANKINGS.find(
            (k) => k.id.toLowerCase() === v.voiceURI.toLowerCase() || k.name.toLowerCase() === v.name.toLowerCase()
          );
          if (known) return { ...known, id: v.voiceURI, name: known.name };
          return {
            id: v.voiceURI,
            name: v.name,
            lang: v.lang || "en-US",
            gender: "neutral",
            accent: "auto",
            quality: "standard",
            platform: [detectPlatform()],
            isNeural: /neural|natural|enhanced|premium/.test(v.name.toLowerCase()),
          };
        });

      // Deduplicate by ID
      const seen = new Set<string>();
      const unique = mapped.filter((v) => {
        if (seen.has(v.id)) return false;
        seen.add(v.id);
        return true;
      });

      setAllVoices(unique);

      // Determine if current voice is neural/premium
      const isPremium = best ? scoreVoice(best, detectPlatform()) > 500 : false;
      setIsNeural(isPremium);

      // Load saved preference or use best
      try {
        const savedId = localStorage.getItem("anglotec_browser_voice_id");
        const savedVoice = savedId ? unique.find((v) => v.id === savedId) : null;
        setCurrentVoice(savedVoice || unique[0] || null);
      } catch {
        setCurrentVoice(unique[0] || null);
      }

      setIsReady(true);
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    // Chrome sometimes needs a nudge
    if (synth.getVoices().length === 0) {
      setTimeout(loadVoices, 500);
    }

    return () => {
      synth.cancel();
      synth.onvoiceschanged = null;
    };
  }, []);

  const selectVoice = useCallback((id: string) => {
    const voice = allVoices.find((v) => v.id === id);
    if (!voice) return;
    setCurrentVoice(voice);
    setIsNeural(voice.quality === "premium" || voice.isNeural);
    try { localStorage.setItem("anglotec_browser_voice_id", id); } catch { /* */ }
  }, [allVoices]);

  const stop = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setError(null);
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!synthRef.current || !text.trim()) {
        onEnd?.();
        return;
      }

      stop();
      setError(null);

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Use selected voice or best available
      const targetId = currentVoice?.id;
      const voices = synthRef.current.getVoices();
      const voice = targetId ? voices.find((v) => v.voiceURI === targetId) : null;
      const chosen = voice || bestVoiceRef.current || voices[0];
      if (chosen) utterance.voice = chosen;

      // User-adjustable settings for clarity
      utterance.rate = rate;     // Default 0.88 = slightly slower = clearer
      utterance.pitch = pitch;   // Default 1.0 = natural
      utterance.volume = 1.0;    // Full

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        if (e.error !== "canceled") {
          setError(`Voice error: ${e.error}`);
        }
        onEnd?.();
      };

      synthRef.current.speak(utterance);
    },
    [currentVoice, stop]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    speak,
    stop,
    isSpeaking,
    isReady,
    currentVoice,
    selectVoice,
    voices: allVoices,
    hasConfig: isReady && allVoices.length > 0,
    error,
    clearError,
    voiceQuality: isNeural ? ("premium" as const) : ("standard" as const),
    currentVoiceName: currentVoice?.name || "Default",
    isNeural,
    platform: detectPlatform(),
    rate,
    setRate: (r: number) => { setRate(r); try { localStorage.setItem("anglotec_voice_rate", String(r)); } catch {} },
    pitch,
    setPitch: (p: number) => { setPitch(p); try { localStorage.setItem("anglotec_voice_pitch", String(p)); } catch {} },
  };
}

/** ------------------------------------------------------------------ */
/** STT Hook — completely free, uses browser's speech recognition      */
/** ------------------------------------------------------------------ */
export function useBrowserSTT() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported. Try Chrome, Edge, or Safari.");
      return;
    }
    setIsSupported(true);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "no-speech") {
        setError("No speech detected. Try speaking louder.");
      } else if (event.error === "audio-capture") {
        setError("No microphone found.");
      } else if (event.error === "not-allowed") {
        setError("Microphone permission denied.");
      } else {
        setError(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (e: any) {
      setError(`Cannot start: ${e.message}`);
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => setTranscript(""), []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    isSupported,
    error,
  };
}
