export interface User {
  id: number;
  name: string;
  email: string;
  has_pin: boolean;
  audio_enabled: boolean;
}

export interface Child {
  id: number;
  name: string;
  age: number;
  grade: string;
  avatar: string | null;
  learning_goals: string[];
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
