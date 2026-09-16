import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../test/renderWithProviders";
import { Login } from "./Login";
import * as authApi from "../api/auth";

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("submits credentials and navigates to /home on success", async () => {
    const loginSpy = vi.spyOn(authApi, "loginParent").mockResolvedValue({
      user: { id: 1, name: "John Doe", email: "john@example.com", has_pin: false, audio_enabled: true },
      access_token: "fake-token",
    });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<div>Parent Home</div>} />
      </Routes>,
      { route: "/login" },
    );

    await userEvent.type(screen.getByPlaceholderText("parent@email.com"), "john@example.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText("Parent Home")).toBeInTheDocument());
    expect(loginSpy).toHaveBeenCalledWith({ email: "john@example.com", password: "password123" });
  });

  it("shows an error message on invalid credentials", async () => {
    vi.spyOn(authApi, "loginParent").mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: { message: "Invalid email or password" } } },
    });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>,
      { route: "/login" },
    );

    await userEvent.type(screen.getByPlaceholderText("parent@email.com"), "john@example.com");
    await userEvent.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });
});
