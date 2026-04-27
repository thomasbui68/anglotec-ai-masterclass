import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";

export interface ElevenLabsVoice {
  key: string;
  id: string;
  name: string;
  description: string;
  accent: string;
}

// In-memory cache of Audio URLs
const audioUrlCache = new Map<string, string>();

function getCacheKey(text: string, voiceKey: string): string {
  return `tts_${voiceKey}_${text.slice(0, 100).replace(/\s+/g, "_")}`;
}

export function useElevenLabsTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentVoice, setCurrentVoice] = useState<string>("rachel");
  const [error, setError] = useState<string | null>(null);
  const [hasConfig, setHasConfig] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check TTS availability
  const statusQuery = trpc.tts.status.useQuery(undefined, { retry: false });
  const voicesQuery = trpc.tts.voices.useQuery(undefined, { retry: false });

  // Generate audio mutation
  const generateMutation = trpc.tts.generate.useMutation();

  // Load saved voice preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("anglotec_tts_voice_key");
      if (saved) setCurrentVoice(saved);
    } catch { /* */ }
  }, []);

  // Set ready state
  useEffect(() => {
    if (statusQuery.data || statusQuery.isError) {
      setHasConfig(!!statusQuery.data?.configured);
      setIsReady(true);
    }
  }, [statusQuery.data, statusQuery.isError]);

  const selectVoice = useCallback((key: string) => {
    setCurrentVoice(key);
    try { localStorage.setItem("anglotec_tts_voice_key", key); } catch { /* */ }
  }, []);

  // Stop any playing audio
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Also stop browser TTS fallback
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Main speak function
  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      if (!text.trim()) { onEnd?.(); return; }

      // Stop any ongoing speech
      stop();
      setError(null);

      const cacheKey = getCacheKey(text, currentVoice);

      // Check in-memory cache first
      let audioUrl = audioUrlCache.get(cacheKey);

      // Check localStorage for cached blob URLs
      if (!audioUrl) {
        try {
          const cachedUrl = localStorage.getItem(`tts_url_${cacheKey}`);
          if (cachedUrl) audioUrl = cachedUrl;
        } catch { /* */ }
      }

      // If not cached, generate via API
      if (!audioUrl) {
        try {
          const result = await generateMutation.mutateAsync({
            text: text.slice(0, 500),
            voiceKey: currentVoice,
          });

          if (result.cacheKey) {
            audioUrl = `/api/tts/${result.cacheKey}.mp3`;
            audioUrlCache.set(cacheKey, audioUrl);
            try {
              localStorage.setItem(`tts_url_${cacheKey}`, audioUrl);
            } catch { /* */ }
          }
        } catch (err: any) {
          const message = err.message || "";
          if (message.includes("ELEVENLABS_NOT_CONFIGURED")) {
            setError("ElevenLabs not configured. Add your API key to enable premium voices.");
          } else if (message.includes("ELEVENLABS_AUTH")) {
            setError("Invalid ElevenLabs API key. Please check your configuration.");
          } else if (message.includes("ELEVENLABS_QUOTA")) {
            setError("Monthly voice quota reached. Please upgrade your ElevenLabs plan.");
          } else {
            setError("Voice generation failed. Using browser fallback.");
          }
          // Fallback to browser TTS
          fallbackToBrowserTTS(text, onEnd);
          return;
        }
      }

      // Play the audio
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
          onEnd?.();
        };

        try {
          await audio.play();
        } catch {
          // Autoplay blocked — fallback
          fallbackToBrowserTTS(text, onEnd);
        }
      } else {
        fallbackToBrowserTTS(text, onEnd);
      }
    },
    [currentVoice, generateMutation, stop]
  );

  const voices = (voicesQuery.data || []) as ElevenLabsVoice[];

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
  };
}

// Fallback to browser Web Speech API
function fallbackToBrowserTTS(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.pitch = 1;
  const voices = synth.getVoices();
  const preferred = voices.find(v => /samantha|karen|microsoft.*natural|google.*english/i.test(v.name));
  if (preferred) utterance.voice = preferred;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.cancel();
  synth.speak(utterance);
}
