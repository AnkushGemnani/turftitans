"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthActionState } from "@/app/(auth)/actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status !== "idle" ? <Notice type={state.status} message={state.message} /> : null}

      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</span>
        <input
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
          placeholder="Rohit Sharma"
        />
      </label>

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
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Phone number</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
          placeholder="+91 98765 43210"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Password</span>
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

      <SubmitButton>Create account</SubmitButton>

      <p className="text-center text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-pitch-600 dark:text-pitch-400 hover:text-pitch-500 dark:hover:text-pitch-300">
          Log in
        </Link>
      </p>
    </form>
  );
}
