import { apiClient } from "./client";
import type { Child } from "../types";
import type { ChildProgress, HistorySession } from "../types/progress";

export interface ChildInput {
  name: string;
  age: number;
  grade: string;
  avatar?: string;
  learning_goals?: string[];
}

export async function fetchChildren(): Promise<Child[]> {
  const { data } = await apiClient.get<Child[]>("/children");
  return data;
}

export async function fetchChild(id: number): Promise<Child> {
  const { data } = await apiClient.get<Child>(`/children/${id}`);
  return data;
}

export async function createChild(payload: ChildInput): Promise<Child> {
  const { data } = await apiClient.post<Child>("/children", payload);
  return data;
}

export async function updateChild(id: number, payload: Partial<ChildInput>): Promise<Child> {
  const { data } = await apiClient.put<Child>(`/children/${id}`, payload);
  return data;
}

export async function deleteChild(id: number): Promise<void> {
  await apiClient.delete(`/children/${id}`);
}

export async function fetchChildProgress(id: number): Promise<ChildProgress> {
  const { data } = await apiClient.get<ChildProgress>(`/children/${id}/progress`);
  return data;
}

export async function fetchChildHistory(id: number): Promise<HistorySession[]> {
  const { data } = await apiClient.get<HistorySession[]>(`/children/${id}/history`);
  return data;
}

export interface TutorInteraction {
  id: number;
  child_id: number | null;
  question: string;
  response: string;
  created_at: string;
}

export async function fetchChildTutorHistory(id: number): Promise<TutorInteraction[]> {
  const { data } = await apiClient.get<TutorInteraction[]>(`/children/${id}/tutor-history`);
  return data;
}
