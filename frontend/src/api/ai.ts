import { apiClient } from "./client";
import type { PracticeSession } from "../types/practice";

export async function generateAIPractice(payload: { child_id: number; prompt: string }): Promise<PracticeSession> {
  const { data } = await apiClient.post<PracticeSession>("/ai/generate-practice", payload);
  return data;
}

export async function askTutor(payload: { child_id?: number; question: string }): Promise<{ response: string }> {
  const { data } = await apiClient.post<{ response: string }>("/ai/tutor", payload);
  return data;
}
