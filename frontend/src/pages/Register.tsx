import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { registerParent } from "../api/auth";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../features/auth/AuthContext";

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      registerParent({ name, email, password, confirm_password: confirmPassword }),
    onSuccess: (data) => {
      login(data);
      navigate("/home");
    },
    onError: (err) => setError(getApiErrorMessage(err, "Could not create your account")),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-display text-3xl font-extrabold text-ink">Create Your Account</h1>
        <p className="mt-1 text-ink-soft">Start your child's learning journey</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
              placeholder="John Doe"
            />
          </div>
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
              minLength={8}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:border-brand-blue focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-brand-blue">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
