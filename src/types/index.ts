export interface User {
  id: number;
  email: string;
  role?: string;
  backup_email?: string;
  phone_number?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  security_question?: string;
  has_biometric?: boolean;
}

export interface Phrase {
  id: number;
  english: string;
  category: string;
  difficulty: number;
  audio_generated: number;
  status?: string;
  practice_count?: number;
  last_practiced?: string;
  mastery_score?: number;
}

export interface Progress {
  total_phrases: number;
  mastered: number;
  learning: number;
  new_count: number;
  avg_mastery: number;
  total_practices: number;
  active_days: number;
  last_active: string;
}

export interface Achievement {
  id: number;
  badge_type: string;
  badge_name: string;
  earned_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
