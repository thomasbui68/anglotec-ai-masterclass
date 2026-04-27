import { useState, useEffect, useCallback, useRef } from "react";

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

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
const DEFAULT_MODEL = "eleven_flash_v2_5";

// In-memory blob URL cache
const blobCache = new Map<string, string>();

function getCacheKey(text: string, voiceId: string): string {
  return `tts_${voiceId}_${text.slice(0, 120).replace(/\s+/g, "_")}`;
}

/** Call ElevenLabs API directly from browser */
async function generateElevenLabsAudio(text: string, voiceId: string): Promise<string | null> {
  if (!API_KEY) return null;

  try {
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
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "");
      if (err.includes("quota") || response.status === 429) {
        throw new Error("QUOTA");
      }
      if (response.status === 401) {
        throw new Error("AUTH");
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    const msg = (e as Error).message || "";
    console.warn("ElevenLabs direct call failed:", msg);
    return null;
  }
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

      // Generate if not cached
      if (!audioUrl) {
        const generated = await generateElevenLabsAudio(text, voiceConfig.id);
        if (generated) {
          audioUrl = generated;
          blobCache.set(cacheKey, generated);
        }
      }

      // Play ElevenLabs audio
      if (audioUrl) {
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
          // Fallback to browser on error
          speakBrowserTTS(text, onEnd);
        };

        try {
          await audio.play();
        } catch {
          // Autoplay blocked or other issue
          speakBrowserTTS(text, onEnd);
        }
        return;
      }

      // ElevenLabs failed completely — use browser fallback
      speakBrowserTTS(text, onEnd);
    },
    [currentVoice, stop]
  );

  const voices = ELEVENLABS_VOICES;
  const currentVoiceName = voiceConfigByKey(currentVoice)?.name || "Rachel";

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
    voiceQuality: "premium" as const,
    currentVoiceName,
  };
}

function voiceConfigByKey(key: string): ElevenLabsVoice | undefined {
  return ELEVENLABS_VOICES.find((v) => v.key === key);
}
