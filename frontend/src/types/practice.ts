export type PracticeType = "letters" | "numbers" | "math" | "shapes" | "mixed";
export type QuestionType = "letter" | "number" | "math" | "shape";

export interface Question {
  id: number;
  session_id: number;
  type: QuestionType;
  prompt: string;
  target: string;
  order_index: number;
  metadata: Record<string, unknown>;
}

export interface PracticeSession {
  id: number;
  child_id: number;
  type: PracticeType;
  title: string;
  difficulty: string | null;
  status: "pending" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  total_questions: number;
  questions: Question[];
  correct_count?: number;
}

export interface AnswerResult {
  id: number;
  question_id: number;
  child_id: number;
  answer: string | null;
  is_correct: boolean | null;
  confidence: number | null;
  feedback: string | null;
}

export interface CreatePracticePayload {
  child_id: number;
  type: PracticeType;
  title?: string;
  difficulty?: string;
  count: number;
  config?: Record<string, unknown>;
}
