export interface DashboardRecentAttempt {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  question_count: number;
  correct_count: number;
  score_percent: number;
  submitted_at: string;
}

export interface DashboardProgress {
  total_quizzes: number;
  quizzes_completed: number;
  total_attempts: number;
  average_score_percent: number | null;
  best_score_percent: number | null;
  recent_attempts: DashboardRecentAttempt[];
}

export interface DashboardDocument {
  document_id: string;
  filename: string;
  total_quizzes: number;
  quizzes_completed: number;
  total_attempts: number;
  average_score_percent: number | null;
  best_score_percent: number | null;
  last_attempt_at: string | null;
}

export interface DashboardAchievement {
  code: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface DashboardResponse {
  progress: DashboardProgress;
  documents: DashboardDocument[];
  achievements: DashboardAchievement[];
}