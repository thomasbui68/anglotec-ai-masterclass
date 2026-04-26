import { useState, useEffect, useCallback } from "react";

const RANKS = [
  { level: 1, name: "New Explorer", color: "#9CA3AF" },
  { level: 3, name: "Apprentice", color: "#60A5FA" },
  { level: 5, name: "Learner", color: "#34D399" },
  { level: 8, name: "Practitioner", color: "#A78BFA" },
  { level: 12, name: "Specialist", color: "#F472B6" },
  { level: 17, name: "Expert", color: "#FBBF24" },
  { level: 23, name: "Master", color: "#FB923C" },
  { level: 30, name: "Grandmaster", color: "#EF4444" },
  { level: 40, name: "Legend", color: "#F59E0B" },
  { level: 50, name: "AI Champion", color: "#FFD700" },
];

const XP_PER_LEVEL = (level: number) => Math.floor(100 * Math.pow(1.2, level - 1));

function getRank(level: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].level) return RANKS[i];
  }
  return RANKS[0];
}

const STORAGE_KEY = "anglotec_game_v2";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    xp: 0, level: 1, streak: 0, longestStreak: 0,
    totalSessions: 0, totalCorrect: 0, dailyProgress: 0,
    dailyGoal: 10, dailyRewardClaimed: false, achievements: [],
    lastActiveDate: "",
  };
}

function saveState(state: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export function useGamification() {
  const [state, setState] = useState(loadState);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);

  // Only check streak/date once on initial mount
  useEffect(() => {
    const today = getToday();
    if (state.lastActiveDate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const newStreak = state.lastActiveDate === yesterdayStr ? state.streak + 1 : 1;

    const updated = {
      ...state,
      streak: newStreak,
      longestStreak: Math.max(newStreak, state.longestStreak),
      lastActiveDate: today,
      dailyProgress: 0,
      dailyRewardClaimed: false,
    };

    setState(updated);
    saveState(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addXp = useCallback((amount: number) => {
    setState((prev: any) => {
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      let xpNeeded = XP_PER_LEVEL(newLevel);

      while (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel++;
        xpNeeded = XP_PER_LEVEL(newLevel);
      }

      const rank = getRank(newLevel);
      const updated = { ...prev, xp: newXp, level: newLevel, xpForNextLevel: xpNeeded, rank: rank.name };
      saveState(updated);
      return updated;
    });
  }, []);

  const recordCorrect = useCallback(() => {
    setState((prev: any) => {
      const updated = { ...prev, totalCorrect: prev.totalCorrect + 1, dailyProgress: prev.dailyProgress + 1 };
      saveState(updated);
      return updated;
    });
    addXp(10);
  }, [addXp]);

  const recordSession = useCallback(() => {
    setState((prev: any) => {
      const updated = { ...prev, totalSessions: prev.totalSessions + 1 };
      saveState(updated);
      return updated;
    });
  }, []);

  const rankInfo = getRank(state.level);
  const nextRank = RANKS.find((r) => r.level > state.level);
  const xpPercent = Math.round((state.xp / (state.xpForNextLevel || XP_PER_LEVEL(state.level))) * 100);

  return {
    ...state,
    xpPercent,
    rankInfo,
    nextRank,
    newAchievement,
    addXp,
    recordCorrect,
    recordSession,
    clearNewAchievement: () => setNewAchievement(null),
  };
}

export default useGamification;
