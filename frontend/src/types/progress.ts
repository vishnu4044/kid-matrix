export interface TopicProgress {
  topic: string;
  attempts: number;
  correct: number;
  accuracy: number;
  status: "mastered" | "improving" | "needs_practice" | "not_started";
  last_practiced: string | null;
}

export interface ChildProgress {
  overall_accuracy: number;
  sessions_completed: number;
  questions_completed: number;
  time_spent_minutes: number;
  subject_progress: Record<string, number>;
  topics: Record<string, TopicProgress[]>;
}

export interface HistorySession {
  id: number;
  child_id: number;
  type: string;
  title: string;
  difficulty: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  total_questions: number;
}
