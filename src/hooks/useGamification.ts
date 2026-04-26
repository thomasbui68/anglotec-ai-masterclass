import { useState, useEffect, useCallback } from "react";

export interface GamificationState {
  xp: number;
  level: number;
  xpForNextLevel: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  totalSessions: number;
  totalCorrect: number;
  dailyGoal: number;
  dailyProgress: number;
  achievements: string[];
  rank: string;
  dailyRewardClaimed: boolean;
  weeklyChallengeProgress: number;
  weeklyChallengeGoal: number;
}

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

const STORAGE_KEY = "anglotec_game_state";

function loadState(): GamificationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return getDefaultState();
}

function getDefaultState(): GamificationState {
  return {
    xp: 0,
    level: 1,
    xpForNextLevel: XP_PER_LEVEL(1),
    streak: 0,
    longestStreak: 0,
    lastActiveDate: "",
    totalSessions: 0,
    totalCorrect: 0,
    dailyGoal: 10,
    dailyProgress: 0,
    achievements: [],
    rank: RANKS[0].name,
    dailyRewardClaimed: false,
    weeklyChallengeProgress: 0,
    weeklyChallengeGoal: 50,
  };
}

function saveState(state: GamificationState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function useGamification() {
  const [state, setState] = useState<GamificationState>(loadState);
  const [newAchievement, setNewAchievement] = useState<string | null>(null);

  // Check daily streak on mount
  useEffect(() => {
    setState((prev) => {
      const today = getToday();
      if (prev.lastActiveDate === today) return prev;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = prev.streak;
      let newDailyProgress = prev.dailyProgress;
      let newDailyRewardClaimed = prev.dailyRewardClaimed;

      if (prev.lastActiveDate === yesterdayStr) {
        newStreak = prev.streak + 1; // continued streak
      } else if (prev.lastActiveDate !== today) {
        newStreak = 1; // reset streak
      }

      // Reset daily progress at midnight
      if (prev.lastActiveDate !== today) {
        newDailyProgress = 0;
        newDailyRewardClaimed = false;
      }

      const updated = {
        ...prev,
        streak: newStreak,
        longestStreak: Math.max(newStreak, prev.longestStreak),
        lastActiveDate: today,
        dailyProgress: newDailyProgress,
        dailyRewardClaimed: newDailyRewardClaimed,
      };
      saveState(updated);
      return updated;
    });
  }, []);

  const checkAchievements = useCallback((s: GamificationState): string[] => {
    const earned: string[] = [];
    if (s.totalCorrect >= 1 && !s.achievements.includes("first_correct")) earned.push("first_correct");
    if (s.totalCorrect >= 10 && !s.achievements.includes("getting_started")) earned.push("getting_started");
    if (s.totalCorrect >= 50 && !s.achievements.includes("half_century")) earned.push("half_century");
    if (s.totalCorrect >= 100 && !s.achievements.includes("century")) earned.push("century");
    if (s.totalCorrect >= 500 && !s.achievements.includes("champion")) earned.push("champion");
    if (s.streak >= 3 && !s.achievements.includes("streak_3")) earned.push("streak_3");
    if (s.streak >= 7 && !s.achievements.includes("streak_7")) earned.push("streak_7");
    if (s.streak >= 30 && !s.achievements.includes("streak_30")) earned.push("streak_30");
    if (s.level >= 5 && !s.achievements.includes("level_5")) earned.push("level_5");
    if (s.level >= 10 && !s.achievements.includes("level_10")) earned.push("level_10");
    if (s.level >= 25 && !s.achievements.includes("level_25")) earned.push("level_25");
    if (s.dailyProgress >= s.dailyGoal && !s.achievements.includes("daily_goal")) earned.push("daily_goal");
    if (s.totalSessions >= 1 && !s.achievements.includes("first_session")) earned.push("first_session");
    return earned;
  }, []);

  const addXp = useCallback((amount: number) => {
    setState((prev) => {
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      let xpNeeded = XP_PER_LEVEL(newLevel);
      let levelUps = 0;

      while (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel++;
        xpNeeded = XP_PER_LEVEL(newLevel);
        levelUps++;
      }

      const rank = getRank(newLevel);
      const updated = {
        ...prev,
        xp: newXp,
        level: newLevel,
        xpForNextLevel: xpNeeded,
        rank: rank.name,
      };

      const newAchievements = checkAchievements(updated);
      if (newAchievements.length > 0) {
        updated.achievements = [...prev.achievements, ...newAchievements];
        setTimeout(() => setNewAchievement(newAchievements[0]), 100);
        setTimeout(() => setNewAchievement(null), 5000);
      }

      saveState(updated);
      return updated;
    });
  }, [checkAchievements]);

  const recordCorrect = useCallback(() => {
    setState((prev) => {
      const updated = {
        ...prev,
        totalCorrect: prev.totalCorrect + 1,
        dailyProgress: prev.dailyProgress + 1,
      };
      const newAchievements = checkAchievements(updated);
      if (newAchievements.length > 0) {
        updated.achievements = [...prev.achievements, ...newAchievements];
      }
      saveState(updated);
      return updated;
    });
    addXp(10);
  }, [addXp, checkAchievements]);

  const recordSession = useCallback(() => {
    setState((prev) => {
      const updated = { ...prev, totalSessions: prev.totalSessions + 1 };
      saveState(updated);
      return updated;
    });
  }, []);

  const claimDailyReward = useCallback(() => {
    setState((prev) => {
      if (prev.dailyRewardClaimed) return prev;
      const updated = { ...prev, dailyRewardClaimed: true };
      saveState(updated);
      return updated;
    });
    addXp(50);
  }, [addXp]);

  const xpPercent = Math.round((state.xp / state.xpForNextLevel) * 100);
  const rankInfo = getRank(state.level);
  const nextRank = RANKS.find((r) => r.level > state.level);

  return {
    ...state,
    xpPercent,
    rankInfo,
    nextRank,
    newAchievement,
    addXp,
    recordCorrect,
    recordSession,
    claimDailyReward,
    clearNewAchievement: () => setNewAchievement(null),
  };
}

export default useGamification;
