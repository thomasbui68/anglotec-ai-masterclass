import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";
import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";

// Verified ElevenLabs voice IDs (from official docs)
const ELEVENLABS_VOICES = {
  rachel: { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Calm, professional female", accent: "American" },
  drew: { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew", description: "Confident male narrator", accent: "American" },
  clyde: { id: "2EiwWnXFnvU5JabPnv8n", name: "Clyde", description: "Mature, wise male", accent: "American" },
  paul: { id: "5Q0t7uMcjvnagumLfvZi", name: "Paul", description: "Warm, friendly male", accent: "American" },
  aria: { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", description: "Expressive, social media female", accent: "American" },
  roger: { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Confident, conversational male", accent: "American" },
  sarah: { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Soft, gentle female", accent: "American" },
  laura: { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Upbeat, young female", accent: "American" },
  charlie: { id: "IKne3meq5aSn9WoVJxw2", name: "Charlie", description: "Casual, conversational male", accent: "Australian" },
  george: { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm, old British male", accent: "British" },
  callum: { id: "N2lVS1wKmFZz96EQDPqD", name: "Callum", description: "Angry, serious male", accent: "Transatlantic" },
  river: { id: "SAz9YHcvj6E2gyTAhDjx", name: "River", description: "Confident, young American male", accent: "American" },
};

// Use Eleven Flash v2.5: 75ms latency, 32 languages, 50% cheaper
const DEFAULT_MODEL = "eleven_flash_v2_5";

// Cache directory
const CACHE_DIR = join(process.cwd(), "tts-cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

function getCacheKey(text: string, voiceId: string): string {
  return createHash("sha256").update(`${text}|${voiceId}`).digest("hex").slice(0, 24);
}

function getAudioPath(cacheKey: string): string {
  return join(CACHE_DIR, `${cacheKey}.mp3`);
}

function getAudioMetaPath(cacheKey: string): string {
  return join(CACHE_DIR, `${cacheKey}.json`);
}

async function callElevenLabs(text: string, voiceId: string, apiKey: string): Promise<Buffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
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
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export const ttsRouter = createRouter({
  // Get available voices
  voices: publicQuery.query(() => {
    return Object.entries(ELEVENLABS_VOICES).map(([key, v]) => ({
      key,
      ...v,
    }));
  }),

  // Check if TTS is available
  status: publicQuery.query(() => ({
    configured: !!env.elevenLabsApiKey,
    voices: Object.values(ELEVENLABS_VOICES).map((v) => v.name),
    model: DEFAULT_MODEL,
  })),

  // Generate TTS audio (mutation — creates audio)
  // Returns cache key. Client then fetches audio via GET /api/tts/:cacheKey
  generate: publicQuery
    .input(
      z.object({
        text: z.string().min(1).max(500),
        voiceKey: z.string().default("rachel"),
      })
    )
    .mutation(async ({ input }) => {
      const voiceConfig = ELEVENLABS_VOICES[input.voiceKey as keyof typeof ELEVENLABS_VOICES];
      if (!voiceConfig) throw new Error("Invalid voice key");

      const cacheKey = getCacheKey(input.text, voiceConfig.id);
      const audioPath = getAudioPath(cacheKey);
      const metaPath = getAudioMetaPath(cacheKey);

      // Return cached immediately
      if (existsSync(audioPath)) {
        return { cacheKey, cached: true, voice: voiceConfig.name };
      }

      // Check API key
      if (!env.elevenLabsApiKey) {
        throw new Error("ELEVENLABS_NOT_CONFIGURED");
      }

      try {
        const audioBuffer = await callElevenLabs(input.text, voiceConfig.id, env.elevenLabsApiKey);
        writeFileSync(audioPath, audioBuffer);
        writeFileSync(metaPath, JSON.stringify({ voice: voiceConfig.name, text: input.text, created: new Date().toISOString() }));

        return { cacheKey, cached: false, voice: voiceConfig.name };
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          throw new Error("ELEVENLABS_AUTH: Invalid API key. Please check your ElevenLabs API key.");
        }
        if (msg.includes("429")) {
          throw new Error("ELEVENLABS_QUOTA: Rate limit reached. Please wait a moment.");
        }
        if (msg.includes("quota") || msg.includes("limit")) {
          throw new Error("ELEVENLABS_QUOTA: Monthly character limit reached.");
        }
        throw new Error("TTS_FAILED: Could not generate speech. Please try again.");
      }
    }),

  // Check if audio exists in cache (for pre-flight checks)
  checkCache: publicQuery
    .input(z.object({ cacheKey: z.string() }))
    .query(({ input }) => {
      const audioPath = getAudioPath(input.cacheKey);
      const exists = existsSync(audioPath);
      let size = 0;
      if (exists) {
        try { size = statSync(audioPath).size; } catch { /* */ }
      }
      return { exists, size, url: exists ? `/api/tts/${input.cacheKey}.mp3` : null };
    }),
});

// Helper to serve cached audio files (used in Hono route, not tRPC)
export function serveTtsAudio(cacheKey: string): { data: Uint8Array; contentType: string } | null {
  const audioPath = getAudioPath(cacheKey);
  if (!existsSync(audioPath)) return null;
  try {
    const data = readFileSync(audioPath);
    return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), contentType: "audio/mpeg" };
  } catch {
    return null;
  }
}
