import { apiClient } from "./client";
import type { AuthResponse, User } from "../types";

export async function registerParent(payload: {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", payload);
  return data;
}

export async function loginParent(payload: { email: string; password: string }): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function logoutParent(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function updateSettings(payload: { name?: string; audio_enabled?: boolean }): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/settings", payload);
  return data;
}

export async function setPin(pin: string): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/pin", { pin });
  return data;
}

export async function clearPin(): Promise<User> {
  const { data } = await apiClient.delete<User>("/auth/pin");
  return data;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const { data } = await apiClient.post<{ valid: boolean }>("/auth/verify-pin", { pin });
  return data.valid;
}
