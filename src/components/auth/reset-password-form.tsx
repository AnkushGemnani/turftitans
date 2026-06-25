"use client";

import { useActionState } from "react";
import { resetPasswordAction, type AuthActionState } from "@/app/(auth)/actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" ? <Notice type="error" message={state.message} /> : null}

      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">New password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
          placeholder="Minimum 8 characters"
        />
      </label>

      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
