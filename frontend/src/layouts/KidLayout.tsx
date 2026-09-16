import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "../components/Modal";
import { Button } from "../components/Button";
import { verifyPin } from "../api/auth";
import { useAuth } from "../features/auth/AuthContext";

export function KidLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => verifyPin(pin),
    onSuccess: (valid) => {
      if (valid) {
        navigate("/home");
      } else {
        setError("Incorrect PIN");
      }
      setPin("");
    },
  });

  const handleExitClick = () => {
    if (user?.has_pin) {
      setShowPinModal(true);
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light via-white to-brand-yellow-light">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </div>
      <button
        onClick={handleExitClick}
        className="fixed bottom-3 right-3 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-ink-soft shadow"
      >
        Exit Kid Mode
      </button>

      <Modal open={showPinModal} onClose={() => setShowPinModal(false)} title="Enter Parent PIN">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoFocus
            placeholder="••••"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-brand-blue focus:outline-none"
          />
          {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}
          <Button type="submit" fullWidth disabled={pin.length !== 4 || mutation.isPending}>
            {mutation.isPending ? "Checking..." : "Unlock"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
