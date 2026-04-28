import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface ElevenLabsVoice {
  key: string;
  id: string;
  name: string;
  description: string;
  accent: string;
}

// Verified ElevenLabs voices (official voice IDs)
const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { key: "rachel", id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm, professional female", accent: "American" },
  { key: "drew", id: "29vD33N1CtxCmqQRPOHJ", name: "Drew", description: "Confident male narrator", accent: "American" },
  { key: "clyde", id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde", description: "Mature, wise male", accent: "American" },
  { key: "paul", id: "5Q0t7uMcjvnagumLfvZi", name: "Paul", description: "Warm, friendly male", accent: "American" },
  { key: "aria", id: "9BWtsMINqrJLrRacOk9x", name: "Aria", description: "Expressive, social media female", accent: "American" },
  { key: "roger", id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Confident, conversational male", accent: "American" },
  { key: "sarah", id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Soft, gentle female", accent: "American" },
  { key: "laura", id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Upbeat, young female", accent: "American" },
  { key: "charlie", id: "IKne3meq5aSn9WoVJxw2", name: "Charlie", description: "Casual, conversational male", accent: "Australian" },
  { key: "george", id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm, old British male", accent: "British" },
  { key: "callum", id: "N2lVS1wKmFZz96EQDPqD", name: "Callum", description: "Angry, serious male", accent: "Transatlantic" },
  { key: "river", id: "SAz9YHcvj6E2gyTAhDjx", name: "River", description: "Confident, young American male", accent: "American" },
];

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "sk_516326ca069ec1c5617bc2c68b44cefc2c2c14083c200bf6";
const DEFAULT_MODEL = "eleven_flash_v2_5";

// In-memory blob URL cache
const blobCache = new Map<string, string>();

function getCacheKey(text: string, voiceId: string): string {
  return `tts_${voiceId}_${text.slice(0, 120).replace(/\s+/g, "_")}`;
}

interface VoiceResult {
  url: string | null;
  error: string | null;
  errorCode?: string;
}

/** Classify ElevenLabs HTTP errors into human-readable messages */
function classifyVoiceError(status: number, body: string): { message: string; code: string } {
  const bodyLower = body.toLowerCase();
  if (status === 401) return { message: "ElevenLabs API key is invalid or expired", code: "AUTH" };
  if (status === 429) return { message: "ElevenLabs rate limit exceeded — too many requests", code: "RATE_LIMIT" };
  if (status === 402 || bodyLower.includes("quota")) return { message: "ElevenLabs subscription quota/credits exhausted", code: "QUOTA" };
  // Specific error: free users can't use library voices via API
  if (bodyLower.includes("free users cannot use library voices") || bodyLower.includes("library voices")) {
    return { message: "Free ElevenLabs plan cannot use premium voices via API. Upgrade to Starter (~£4/mo) at elevenlabs.io/pricing", code: "FREE_PLAN_LIBRARY" };
  }
  if (status >= 500) return { message: `ElevenLabs server error (${status})`, code: "SERVER" };
  if (status === 422) return { message: "Invalid voice ID or text too long", code: "INVALID" };
  return { message: `ElevenLabs error (HTTP ${status})`, code: "UNKNOWN" };
}

/** Store voice error for bug reporting */
function recordVoiceError(status: number, message: string, code: string, voiceId: string) {
  try {
    const entry = { status, message, code, voiceId, date: new Date().toISOString() };
    const history = JSON.parse(localStorage.getItem("__voice_errors__") || "[]");
    history.push(entry);
    localStorage.setItem("__voice_errors__", JSON.stringify(history.slice(-20)));
    localStorage.setItem("__last_voice_error__", JSON.stringify(entry));
  } catch { /* storage full */ }
}

/** Call ElevenLabs API directly from browser — with retry and detailed error reporting */
async function generateElevenLabsAudio(text: string, voiceId: string, attempt: number = 0): Promise<VoiceResult> {
  if (!API_KEY) {
    return { url: null, error: "No ElevenLabs API key configured. Voice will use browser TTS.", errorCode: "NO_KEY" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        model_id: DEFAULT_MODEL,
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const { message, code } = classifyVoiceError(response.status, body);

      // Retry on transient errors: rate limit (429) and server errors (5xx)
      if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
        const delayMs = (attempt + 1) * 2000;
        await new Promise(r => setTimeout(r, delayMs));
        return generateElevenLabsAudio(text, voiceId, attempt + 1);
      }

      recordVoiceError(response.status, message, code, voiceId);
      return { url: null, error: `${message}. ${getFixMessage(code)}`, errorCode: code };
    }

    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), error: null };
  } catch (e: any) {
    let message: string;
    let code: string;

    if (e.name === "AbortError") {
      message = "Voice request timed out after 12 seconds";
      code = "TIMEOUT";
    } else if (e.message?.includes("network") || e.message?.includes("Failed to fetch")) {
      message = "Cannot reach ElevenLabs — network error";
      code = "NETWORK";
    } else {
      message = `Voice request failed: ${e.message || "Unknown error"}`;
      code = "UNKNOWN";
    }

    // Retry on network/timeout errors (max 2 retries)
    if (attempt < 2 && (code === "TIMEOUT" || code === "NETWORK")) {
      const delayMs = (attempt + 1) * 2000;
      await new Promise(r => setTimeout(r, delayMs));
      return generateElevenLabsAudio(text, voiceId, attempt + 1);
    }

    recordVoiceError(0, message, code, voiceId);
    return { url: null, error: `${message}. ${getFixMessage(code)}`, errorCode: code };
  }
}

function getFixMessage(code: string): string {
  const fixes: Record<string, string> = {
    AUTH: "Check your API key in Settings > Voice & Audio.",
    RATE_LIMIT: "Wait a minute and try again.",
    QUOTA: "Add more credits at elevenlabs.io/subscription.",
    FREE_PLAN_LIBRARY: "Upgrade to Starter plan (~£4/mo) at elevenlabs.io/pricing to enable premium voices.",
    SERVER: "ElevenLabs servers are temporarily down. Retry shortly.",
    INVALID: "Try a different voice in Settings.",
    TIMEOUT: "Check your internet connection and try again.",
    NETWORK: "Check your internet connection.",
    NO_KEY: "Add an API key in Settings > Voice & Audio for premium voice.",
    UNKNOWN: "Check Settings > Voice & Audio for configuration.",
  };
  return fixes[code] || "Check your settings and try again.";
}

/** Browser Web Speech API fallback */
function speakBrowserTTS(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.0;

  // Pick best available browser voice
  const voices = synth.getVoices();
  const best = voices.find((v) =>
    /samantha|karen|daniel|moira|tessa|serena|siri|fred/i.test(v.name)
  ) || voices.find((v) =>
    /microsoft.*natural|microsoft.*neural|microsoft.*aria|microsoft.*jenny/i.test(v.name.toLowerCase())
  ) || voices.find((v) =>
    /google.*english|google us/i.test(v.name.toLowerCase())
  ) || voices.find((v) => v.lang?.startsWith("en"));

  if (best) utterance.voice = best;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  synth.cancel();
  synth.speak(utterance);
}

export function useElevenLabsTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentVoice, setCurrentVoice] = useState<string>("rachel");
  const [error, setError] = useState<string | null>(null);
  const [hasConfig] = useState(() => !!API_KEY);
  const lastErrorToast = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("anglotec_tts_voice_key");
      if (saved && ELEVENLABS_VOICES.some((v) => v.key === saved)) {
        setCurrentVoice(saved);
      }
    } catch { /* */ }
    setIsReady(true);
  }, []);

  const selectVoice = useCallback((key: string) => {
    if (!ELEVENLABS_VOICES.some((v) => v.key === key)) return;
    setCurrentVoice(key);
    setError(null);
    try { localStorage.setItem("anglotec_tts_voice_key", key); } catch { /* */ }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setError(null);
  }, []);

  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      if (!text.trim()) { onEnd?.(); return; }

      stop();
      setError(null);

      const voiceConfig = ELEVENLABS_VOICES.find((v) => v.key === currentVoice) || ELEVENLABS_VOICES[0];
      const cacheKey = getCacheKey(text, voiceConfig.id);

      // Check in-memory cache
      let audioUrl = blobCache.get(cacheKey);
      let voiceError: string | null = null;
      let errorCode: string | undefined;

      // Generate if not cached
      if (!audioUrl) {
        const result = await generateElevenLabsAudio(text, voiceConfig.id);
        if (result.url) {
          audioUrl = result.url;
          blobCache.set(cacheKey, result.url);
        }
        voiceError = result.error;
        errorCode = result.errorCode;
      }

      // Play ElevenLabs audio
      if (audioUrl) {
        setError(null);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
          onEnd?.();
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          audioRef.current = null;
          const errMsg = "Audio playback failed — falling back to browser voice";
          setError(errMsg);
          speakBrowserTTS(text, onEnd);
        };

        try {
          await audio.play();
        } catch {
          speakBrowserTTS(text, onEnd);
        }
        return;
      }

      // ElevenLabs failed — record error, show user, then fallback
      if (voiceError) {
        setError(voiceError);

        // Toast the error (max once per 30 seconds to avoid spam)
        const now = Date.now();
        if (now - lastErrorToast.current > 30000) {
          lastErrorToast.current = now;
          toast.error("Premium voice unavailable: " + voiceError, {
            duration: 8000,
            id: "voice-error",
            icon: "⚠️",
          });
        }
      }

      // Always fall back to browser TTS so user still hears something
      speakBrowserTTS(text, onEnd);
    },
    [currentVoice, stop]
  );

  const voices = ELEVENLABS_VOICES;
  const currentVoiceName = voiceConfigByKey(currentVoice)?.name || "Rachel";

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isReady,
    currentVoice,
    selectVoice,
    voices,
    hasConfig,
    error,
    clearError,
    voiceQuality: "premium" as const,
    currentVoiceName,
  };
}

function voiceConfigByKey(key: string): ElevenLabsVoice | undefined {
  return ELEVENLABS_VOICES.find((v) => v.key === key);
}
