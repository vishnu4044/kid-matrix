import { useAuth } from "../features/auth/AuthContext";

export function useSpeak() {
  const { user } = useAuth();
  const audioEnabled = user?.audio_enabled ?? true;

  return (text: string) => {
    if (!audioEnabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };
}
