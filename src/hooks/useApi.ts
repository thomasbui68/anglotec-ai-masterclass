import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { localPhrases, localProgress, localAchievements } from "@/lib/local-db";
import { useAuth } from "./useAuth";

// Re-export local-db helpers for direct access if needed
export { localPhrases, localProgress, localAchievements } from "@/lib/local-db";

// ===== PHRASES =====
export function usePhrases() {
  const { mode, isReady, isAuthenticated } = useAuth();
  const isLocal = mode === "local" || mode === "unknown";

  // tRPC queries — only when authenticated and in cloud mode
  const categoriesQuery = trpc.phrase.categories.useQuery(undefined, {
    enabled: isReady && !isLocal,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const listQuery = trpc.phrase.list.useQuery(
    { page: 1, limit: 50 },
    {
      enabled: isReady && !isLocal && isAuthenticated,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Local data state — populated when in local mode or not authenticated
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [localPhrasesData, setLocalPhrasesData] = useState({
    phrases: [] as any[],
    total: 0,
    page: 1,
    limit: 50,
  });

  // Populate local data when mode is local or not authenticated
  useEffect(() => {
    if ((isLocal || !isAuthenticated) && isReady) {
      try {
        setLocalCategories(localPhrases.getCategories());
        setLocalPhrasesData(localPhrases.getAll(undefined, undefined, 1, 50));
      } catch (e) {
        console.error("Failed to load local phrases:", e);
      }
    }
  }, [isLocal, isReady, isAuthenticated]);

  // Cloud error fallback — if tRPC errors, use local data
  const cloudError = categoriesQuery.isError || listQuery.isError;
  const useLocalData = isLocal || !isAuthenticated || cloudError;

  const categories = useMemo(() => {
    if (useLocalData) return localCategories;
    return categoriesQuery.data ?? [];
  }, [useLocalData, localCategories, categoriesQuery.data]);

  const phrases = useMemo(() => {
    if (useLocalData) return localPhrasesData;
    return listQuery.data ?? { phrases: [] as any[], total: 0, page: 1, limit: 50 };
  }, [useLocalData, localPhrasesData, listQuery.data]);

  const isLoading = isReady && !isLocal && !cloudError && categoriesQuery.isLoading;

  // Function to get phrases for a specific category (client-side filter in cloud mode)
  const getPhrases = useCallback(
    (category?: string, search?: string, page?: number, limit?: number) => {
      if (useLocalData) {
        return localPhrases.getAll(category, search, page, limit);
      }
      // Cloud mode: client-side filter the cached data
      const all = listQuery.data ?? { phrases: [] as any[], total: 0, page: 1, limit: 50 };
      let result = [...all.phrases];
      if (category && category !== "all") {
        result = result.filter((p: any) => p.category === category);
      }
      if (search) {
        const s = search.toLowerCase();
        result = result.filter((p: any) => p.english.toLowerCase().includes(s));
      }
      const p = page ?? 1;
      const l = limit ?? 50;
      const offset = (p - 1) * l;
      return {
        phrases: result.slice(offset, offset + l),
        total: result.length,
        page: p,
        limit: l,
      };
    },
    [useLocalData, listQuery.data]
  );

  return { categories, phrases: phrases.phrases, getPhrases, isLoading };
}

// ===== PROGRESS =====
export function useProgress(_userId: number) {
  const { mode, isReady, user } = useAuth();
  const isLocal = mode === "local" || mode === "unknown";

  const statsQuery = trpc.progress.getStats.useQuery(undefined, {
    enabled: isReady && !isLocal && !!user,
    retry: 1,
  });

  const updateMutation = trpc.progress.update.useMutation();

  const [localStats, setLocalStats] = useState({
    total_phrases: 3000,
    mastered: 0,
    learning: 0,
    new_count: 3000,
    avg_mastery: 0,
    total_practices: 0,
    active_days: 0,
    last_active: null as string | null,
  });

  const useLocalData = isLocal || statsQuery.isError;

  // Populate local stats
  useEffect(() => {
    if (useLocalData && user) {
      try {
        setLocalStats(localProgress.getStats(user.id));
      } catch (e) {
        console.error("Failed to load local progress:", e);
      }
    }
  }, [useLocalData, user]);

  const stats = useLocalData
    ? localStats
    : (statsQuery.data ?? localStats);

  const update = useCallback(
    (phraseId: number, status: string) => {
      if (useLocalData && user) {
        try {
          localProgress.update(user.id, phraseId, status);
          setLocalStats(localProgress.getStats(user.id));
        } catch (e) {
          console.error("Failed to update local progress:", e);
        }
      } else {
        updateMutation.mutate({
          phraseId,
          status: status as "mastered" | "learning" | "new",
        });
      }
    },
    [useLocalData, user, updateMutation]
  );

  const getAll = useCallback(() => {
    if (useLocalData && user) {
      return localProgress.getAll(user.id);
    }
    return [];
  }, [useLocalData, user]);

  return { stats, update, getAll, isLoading: statsQuery.isLoading };
}

// ===== ACHIEVEMENTS =====
export function useAchievements(_userId: number) {
  const { mode, isReady, user } = useAuth();
  const isLocal = mode === "local" || mode === "unknown";

  const listQuery = trpc.achievement.list.useQuery(undefined, {
    enabled: isReady && !isLocal && !!user,
    retry: 1,
  });

  const useLocalData = isLocal || listQuery.isError;

  const [localAchs, setLocalAchs] = useState<any[]>([]);

  useEffect(() => {
    if (useLocalData && user) {
      try {
        setLocalAchs(localAchievements.getAll(user.id));
      } catch (e) {
        console.error("Failed to load local achievements:", e);
      }
    }
  }, [useLocalData, user]);

  const achievements = useLocalData
    ? localAchs
    : (listQuery.data ?? []);

  return { achievements, isLoading: listQuery.isLoading };
}

// Legacy compatibility export
export function useApi() {
  return { token: null, userId: null as number | null };
}
