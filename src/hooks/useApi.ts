import { useState, useCallback, useMemo } from "react";
import { getCategories, getAllPrompts, getTotalPromptCount } from "@/lib/prompts-data";

// ===== PROMPTS =====
export function usePrompts() {
  // Always use bundled prompt data (no backend needed)
  const categories = useMemo(() => getCategories(), []);
  const allPrompts = useMemo(() => getAllPrompts(), []);
  const totalCount = useMemo(() => getTotalPromptCount(), []);

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

  return useMemo(() => ({ categories, prompts: allPrompts.slice(0, 50), getPrompts, isLoading }),
    [categories, allPrompts, getPrompts, isLoading]);
}

// ===== PROGRESS =====
export function useProgress(_userId: string | number) {
  // Default stats — will show 9,000 total
  const [stats, setStats] = useState({
    total_prompts: 9000,
    mastered: 0,
    learning: 0,
    new_count: 9000,
    avg_mastery: 0,
    total_practices: 0,
    active_days: 0,
    last_active: null as string | null,
  });

  const update = useCallback(
    (_promptId: number, status: string) => {
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
    },
    []
  );

  const getAll = useCallback(() => [], []);

  return { stats, update, getAll, isLoading: false };
}

// ===== ACHIEVEMENTS =====
export function useAchievements(_userId: string | number) {
  return { achievements: [] as any[], isLoading: false };
}

// Legacy compatibility export
export function useApi() {
  return { token: null, userId: null as number | null };
}
