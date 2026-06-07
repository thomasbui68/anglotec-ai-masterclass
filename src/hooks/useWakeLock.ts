/**
 * useWakeLock — Prevents screen from sleeping during practice
 * 
 * Uses the Wake Lock API (supported on iOS Safari 16.4+, Chrome 84+, Edge 84+)
 * Automatically requests lock when user starts practicing, releases on pause/exit.
 */

import { useEffect, useRef, useCallback } from "react";

export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        console.log("[WakeLock] Screen kept awake");
      }
    } catch (err) {
      // Wake Lock may fail silently (e.g., if page not visible) — that's fine
      console.log("[WakeLock] Not available or denied:", (err as Error).message);
    }
  }, []);

  const release = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("[WakeLock] Released");
      }
    } catch {
      // Already released or not available
    }
  }, []);

  // Auto-release when page becomes hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      } else if (!document.hidden) {
        // Re-acquire when page becomes visible again
        request();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      release();
    };
  }, [request, release]);

  return { request, release };
}
