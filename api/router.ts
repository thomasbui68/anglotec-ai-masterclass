import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./authRouter";
import { phraseRouter } from "./phraseRouter";
import { progressRouter } from "./progressRouter";
import { achievementRouter } from "./achievementRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  phrase: phraseRouter,
  progress: progressRouter,
  achievement: achievementRouter,
});

export type AppRouter = typeof appRouter;
