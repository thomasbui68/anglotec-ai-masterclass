/**
 * tRPC Provider — Stubbed
 *
 * The app now uses Supabase + Netlify Functions instead of tRPC.
 * This file remains as a compatibility stub so existing imports don't break.
 */

import type { ReactNode } from "react";

// Dummy trpc object that matches the expected API shape
export const trpc: any = {};

export function TRPCProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
