export interface User {
  id: number;
  email: string;
  role?: string;
  backupEmail?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  securityQuestion?: string | null;
  hasBiometric?: boolean;
}

export interface Phrase {
  id: number;
  english: string;
  category: string;
  difficulty: number;
}

export interface Progress {
  total_phrases: number;
  mastered: number;
  learning: number;
  new_count: number;
  avg_mastery: number;
  total_practices: number;
  active_days: number;
  last_active: Date | string | null;
}

export interface Achievement {
  id: number;
  badgeType: string;
  badgeName: string;
  earnedAt: Date;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
