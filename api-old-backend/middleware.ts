import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

export const authedQuery = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error("Unauthorized");
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Requires at least Pro tier (active or trial)
export const proQuery = authedQuery.use(({ ctx, next }) => {
  if (!ctx.user.subscription.isPaid && ctx.user.subscription.tier === "free") {
    throw new Error("UPGRADE_REQUIRED: Pro subscription required to access this feature");
  }
  return next({ ctx });
});

// Requires Family tier or higher
export const familyQuery = authedQuery.use(({ ctx, next }) => {
  const tier = ctx.user.subscription.tier;
  if (tier !== "family" && tier !== "classroom") {
    throw new Error("UPGRADE_REQUIRED: Family plan required to access this feature");
  }
  return next({ ctx });
});

// Requires Classroom tier
export const classroomQuery = authedQuery.use(({ ctx, next }) => {
  if (ctx.user.subscription.tier !== "classroom") {
    throw new Error("UPGRADE_REQUIRED: Classroom plan required to access this feature");
  }
  return next({ ctx });
});
