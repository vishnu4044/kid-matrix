import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { loginParent } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../features/auth/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => loginParent({ email, password }),
    onSuccess: (data) => {
      login(data);
      navigate("/home");
    },
    onError: (err) => setError(getApiErrorMessage(err, "Invalid email or password")),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-extrabold text-ink">Welcome Back!</h1>
        <p className="mt-1 text-ink-soft">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
              placeholder="parent@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold text-brand-blue">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
