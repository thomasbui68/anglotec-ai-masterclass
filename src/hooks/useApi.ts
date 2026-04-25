import { trpc } from "@/providers/trpc";

// Re-export local-db helpers for any remaining client-side needs
export { localPhrases, localProgress, localAchievements } from "@/lib/local-db";

export function useApi() {
  return { token: null, userId: null as number | null };
}

export function usePhrases() {
  return {
    getCategories: () => {
      const { data } = trpc.phrase.categories.useQuery();
      return data ?? [];
    },
    getPhrases: (category?: string, search?: string, page?: number, limit?: number) => {
      const { data } = trpc.phrase.list.useQuery({
        category,
        page: page ?? 1,
        limit: limit ?? 50,
        search,
      });
      return data ?? { phrases: [], total: 0, page: 1, totalPages: 0 };
    },
    getPhraseById: (id: number) => {
      const { data } = trpc.phrase.byId.useQuery({ id });
      return data ?? null;
    },
  };
}

export function useProgress(_userId: number) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.progress.update.useMutation({
    onSuccess: () => {
      utils.progress.getByUser.invalidate();
      utils.progress.getStats.invalidate();
    },
  });

  return {
    getAll: () => {
      const { data } = trpc.progress.getByUser.useQuery();
      return data ?? [];
    },
    getStats: () => {
      const { data } = trpc.progress.getStats.useQuery();
      return data ?? {
        total_phrases: 0,
        mastered: 0,
        learning: 0,
        new_count: 0,
        avg_mastery: 0,
        total_practices: 0,
        active_days: 0,
        last_active: null,
      };
    },
    update: (phraseId: number, status: string) => {
      updateMutation.mutate({ phraseId, status: status as "mastered" | "learning" | "new" });
    },
  };
}

export function useAchievements(_userId: number) {
  return {
    getAll: () => {
      const { data } = trpc.achievement.list.useQuery();
      return data ?? [];
    },
  };
}
