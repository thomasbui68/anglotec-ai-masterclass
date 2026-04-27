import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { serveTtsAudio } from "./ttsRouter";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Direct TTS audio serving (cached MP3 files)
app.get("/api/tts/:cacheKey.mp3", (c) => {
  const cacheKey = c.req.param("cacheKey");
  if (!cacheKey) {
    return c.json({ error: "Missing cache key" }, 400);
  }
  const audio = serveTtsAudio(cacheKey);
  if (!audio) {
    return c.json({ error: "Audio not found" }, 404);
  }
  c.header("Content-Type", audio.contentType);
  c.header("Cache-Control", "public, max-age=86400");
  return c.body(audio.data.buffer as ArrayBuffer);
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
