"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback?next=/dashboard`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogleLogin}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] px-4 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.04] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm backdrop-blur-md"
      >
        {isLoading ? (
          <svg
            className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>
      {error && (
        <p className="text-center text-xs text-red-500 font-semibold">{error}</p>
      )}
    </div>
  );
}
