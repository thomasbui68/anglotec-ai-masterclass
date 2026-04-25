import { useMemo } from "react";
import { localPhrases, localProgress, localAchievements } from "@/lib/local-db";

export { localPhrases, localProgress, localAchievements };

export function useApi() {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const request = async (endpoint: string, _options: any = {}) => {
    const url = endpoint;
    throw new Error(`API endpoint ${url} not available in offline mode`);
  };

  return { request, token, userId: user?.id };
}

export function usePhrases() {
  return useMemo(() => ({
    getCategories: () => localPhrases.getCategories(),
    getPhrases: (category?: string, search?: string, page?: number, limit?: number) =>
      localPhrases.getAll(category, search, page, limit),
    getPhraseById: (id: number) => localPhrases.getById(id),
  }), []);
}

export function useProgress(userId: number) {
  return useMemo(() => ({
    getAll: () => localProgress.getAll(userId),
    getStats: () => localProgress.getStats(userId),
    update: (phraseId: number, status: string) => localProgress.update(userId, phraseId, status),
  }), [userId]);
}

export function useAchievements(userId: number) {
  return useMemo(() => ({
    getAll: () => localAchievements.getAll(userId),
  }), [userId]);
}
