"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/app/(auth)/actions";
import { AuthStatusNotice } from "@/components/auth/auth-status-notice";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <AuthStatusNotice />
      {state.status === "error" ? <Notice type="error" message={state.message} /> : null}

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

      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
          placeholder="Your password"
        />
      </label>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-pitch-600 dark:text-pitch-400 hover:text-pitch-500 dark:hover:text-pitch-300">
          Forgot password?
        </Link>
      </div>

      <SubmitButton>Log in</SubmitButton>

      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
        </div>
        <span className="relative bg-white dark:bg-[#030604] px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Or continue with
        </span>
      </div>

      <GoogleSignInButton />

      <p className="text-center text-sm text-slate-600 dark:text-slate-300 pt-2">
        New to TurfTitans?{" "}
        <Link href="/sign-up" className="font-bold text-pitch-600 dark:text-pitch-400 hover:text-pitch-500 dark:hover:text-pitch-300">
          Create an account
        </Link>
      </p>
    </form>
  );
}
