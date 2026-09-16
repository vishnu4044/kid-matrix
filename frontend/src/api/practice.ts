import { apiClient } from "./client";
import type { AnswerResult, CreatePracticePayload, PracticeSession } from "../types/practice";

export async function createPractice(payload: CreatePracticePayload): Promise<PracticeSession> {
  const { data } = await apiClient.post<PracticeSession>("/practice", payload);
  return data;
}

export async function fetchPractice(id: number): Promise<PracticeSession> {
  const { data } = await apiClient.get<PracticeSession>(`/practice/${id}`);
  return data;
}

export async function startPractice(id: number): Promise<PracticeSession> {
  const { data } = await apiClient.post<PracticeSession>(`/practice/${id}/start`);
  return data;
}

export async function submitAnswer(
  sessionId: number,
  payload: { question_id: number; image_data_url?: string; answer?: string },
): Promise<AnswerResult> {
  const { data } = await apiClient.post<AnswerResult>(`/practice/${sessionId}/answers`, payload);
  return data;
}

export async function completePractice(id: number): Promise<PracticeSession> {
  const { data } = await apiClient.post<PracticeSession>(`/practice/${id}/complete`);
  return data;
}
