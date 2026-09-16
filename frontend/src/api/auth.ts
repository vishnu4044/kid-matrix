import { apiClient } from "./client";
import type { AuthResponse } from "../types";

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
