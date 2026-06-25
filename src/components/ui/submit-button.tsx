"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils/cn";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function SubmitButton({ children, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 px-5 text-xs font-black uppercase tracking-wider text-pitch-950 shadow-lg shadow-pitch-500/15 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 border-0",
        className,
      )}
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? "Working..." : children}
    </button>
  );
}
