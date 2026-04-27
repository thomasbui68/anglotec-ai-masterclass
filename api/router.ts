import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./authRouter";
import { phraseRouter } from "./phraseRouter";
import { progressRouter } from "./progressRouter";
import { achievementRouter } from "./achievementRouter";
import { subscriptionRouter } from "./subscriptionRouter";
import { familyRouter } from "./familyRouter";
import { sessionRouter } from "./sessionRouter";
import { ttsRouter } from "./ttsRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  phrase: phraseRouter,
  progress: progressRouter,
  achievement: achievementRouter,
  subscription: subscriptionRouter,
  family: familyRouter,
  session: sessionRouter,
  tts: ttsRouter,
});

export type AppRouter = typeof appRouter;
