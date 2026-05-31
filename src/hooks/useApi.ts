import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "./useAuth";
import { getCategories, getAllPrompts, getTotalPromptCount } from "@/lib/prompts-data";

// ===== PHRASES =====
export function usePrompts() {
  const { isReady } = useAuth();

  // tRPC queries — for cloud backend when available
  const categoriesQuery = trpc.prompt.categories.useQuery(undefined, {
    enabled: false, // Don't try tRPC on static deploy
    retry: 0,
  });

  const listQuery = trpc.prompt.list.useQuery(
    { page: 1, limit: 50 },
    { enabled: false, retry: 0 }
  );

  // Always use bundled prompt data (no localStorage)
  const categories = useMemo(() => getCategories(), []);
  const allPrompts = useMemo(() => getAllPrompts(), []);
  const totalCount = useMemo(() => getTotalPromptCount(), []);

  const prompts = useMemo(() => ({
    prompts: allPrompts.slice(0, 50),
    total: totalCount,
    page: 1,
    limit: 50,
  }), [allPrompts, totalCount]);

  const isLoading = false; // Bundled data loads instantly

  // Function to get prompts for a specific category
  const getPrompts = useCallback(
    (category?: string, search?: string, page?: number, limit?: number) => {
      let result = [...allPrompts];
      if (category && category !== "all") {
        result = result.filter((p) => p.category === category);
      }
      if (search) {
        const s = search.toLowerCase();
        result = result.filter((p) => p.prompt.toLowerCase().includes(s));
      }
      const p = page ?? 1;
      const l = limit ?? 50;
      const offset = (p - 1) * l;
      return {
        prompts: result.slice(offset, offset + l),
        total: result.length,
        page: p,
        limit: l,
      };
    },
    [allPrompts]
  );

  return useMemo(() => ({ categories, prompts: prompts.prompts, getPrompts, isLoading }),
    [categories, prompts.prompts, getPrompts, isLoading]);
}

// ===== PROGRESS =====
export function useProgress(_userId: number) {
  const { user } = useAuth();

  const statsQuery = trpc.progress.getStats.useQuery(undefined, {
    enabled: false, // Don't try tRPC on static deploy
    retry: 0,
  });

  const updateMutation = trpc.progress.update.useMutation();

  // Default stats — will show 3,000 total
  const [stats, setStats] = useState({
    total_prompts: 3000,
    mastered: 0,
    learning: 0,
    new_count: 3000,
    avg_mastery: 0,
    total_practices: 0,
    active_days: 0,
    last_active: null as string | null,
  });

  const update = useCallback(
    (promptId: number, status: string) => {
      // Update local stats for UI feedback
      setStats((prev) => {
        const next = { ...prev };
        if (status === "mastered") {
          next.mastered = Math.min(prev.mastered + 1, prev.total_prompts);
          next.learning = Math.max(prev.learning - 1, 0);
        } else if (status === "learning") {
          next.learning = Math.min(prev.learning + 1, prev.total_prompts);
        }
        next.new_count = Math.max(prev.total_prompts - next.mastered - next.learning, 0);
        next.total_practices = prev.total_practices + 1;
        return next;
      });

      // Also try to update cloud if available
      try {
        updateMutation.mutate({
          promptId,
          status: status as "mastered" | "learning" | "new",
        });
      } catch {
        // Silently fail if no backend — local stats already updated
      }
    },
    [updateMutation]
  );

  const getAll = useCallback(() => [], []);

  return { stats, update, getAll, isLoading: false };
}

// ===== ACHIEVEMENTS =====
export function useAchievements(_userId: number) {
  const listQuery = trpc.achievement.list.useQuery(undefined, {
    enabled: false,
    retry: 0,
  });

  const achievements: any[] = [];

  return { achievements, isLoading: false };
}

// Legacy compatibility export
export function useApi() {
  return { token: null, userId: null as number | null };
}
