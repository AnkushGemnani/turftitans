"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type AuthActionState } from "@/app/(auth)/actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status !== "idle" ? <Notice type={state.status} message={state.message} /> : null}

      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
          placeholder="you@example.com"
        />
      </label>

      <SubmitButton>Send reset link</SubmitButton>

      <p className="text-center text-sm text-slate-600 dark:text-slate-300">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-pitch-600 dark:text-pitch-400 hover:text-pitch-500 dark:hover:text-pitch-300">
          Back to login
        </Link>
      </p>
    </form>
  );
}
