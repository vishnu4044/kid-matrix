import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "../test/renderWithProviders";
import { ProtectedRoute } from "./ProtectedRoute";
import { TOKEN_STORAGE_KEY } from "../api/client";

function TestApp() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login Page</div>} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <div>Protected Home</div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirects to /login when there is no authenticated user", () => {
    renderWithProviders(<TestApp />, { route: "/home" });
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders the protected content when a user is stored", () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "fake-token");
    localStorage.setItem(
      "kid_matrix_user",
      JSON.stringify({ id: 1, name: "John", email: "john@example.com", has_pin: false, audio_enabled: true }),
    );
    renderWithProviders(<TestApp />, { route: "/home" });
    expect(screen.getByText("Protected Home")).toBeInTheDocument();
  });
});
