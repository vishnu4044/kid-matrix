import type { HTMLAttributes } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card bg-white border border-slate-100 shadow-[0_2px_16px_rgba(44,53,80,0.06)] ${className}`}
      {...rest}
    />
  );
}
