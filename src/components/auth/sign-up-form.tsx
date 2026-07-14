"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUpAction, type AuthActionState } from "@/app/(auth)/actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { User, UploadCloud } from "lucide-react";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
};

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      {state.status !== "idle" ? <Notice type={state.status} message={state.message} /> : null}

      {/* Profile Picture Upload */}
      <div className="flex flex-col space-y-3 pt-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Profile Picture (Mandatory)</span>
        <div className="flex items-center gap-4 w-full">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 dark:bg-pitch-900 border-2 border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <label
              htmlFor="profileImage"
              className="cursor-pointer inline-flex items-center justify-center gap-2 h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 px-4 text-xs font-bold transition active:scale-98"
            >
              <UploadCloud className="h-4 w-4" />
              Choose Image
            </label>
            <input
              id="profileImage"
              name="profileImage"
              type="file"
              accept="image/*"
              required
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!file.type.startsWith("image/")) {
                    alert("Please select an image file.");
                    return;
                  }
                  if (file.size > 3 * 1024 * 1024) {
                    alert("Profile picture must be smaller than 3 MB.");
                    return;
                  }
                  setPreviewUrl(URL.createObjectURL(file));
                }
              }}
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Supported formats: JPG, PNG, WEBP (Max 3MB)
            </p>
          </div>
        </div>
      </div>

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

      {/* Player Specialty Role Dropdown */}
      <label className="block">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Player Specialty Role</span>
        <select
          name="role"
          required
          defaultValue=""
          className="mt-2 h-12 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none transition focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
        >
          <option value="" disabled>
            Select your player specialty
          </option>
          <option value="batsman">Batsman</option>
          <option value="bowler">Bowler</option>
          <option value="all_rounder">All-Rounder</option>
          <option value="wicket_keeper">Wicket Keeper</option>
        </select>
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
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-pitch-600 dark:text-pitch-400 hover:text-pitch-500 dark:hover:text-pitch-300">
          Log in
        </Link>
      </p>
    </form>
  );
}
