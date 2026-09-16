import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-blue text-white hover:bg-[#4a97ee] shadow-sm shadow-brand-blue/30",
  secondary:
    "bg-white text-ink border border-slate-200 hover:bg-slate-50",
  ghost: "bg-transparent text-brand-blue hover:bg-brand-blue-light",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

export function Button({ variant = "primary", fullWidth, className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-2xl px-6 py-3 text-base font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${
        variantClasses[variant]
      } ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
}
