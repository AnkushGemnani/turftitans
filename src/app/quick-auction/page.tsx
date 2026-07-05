import Link from "next/link";
import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { QuickAuctionConsole } from "./quick-auction-console";

export const dynamic = "force-dynamic";

export default async function QuickAuctionPage() {
  let user = null;
  let profile = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      profile = data;
    }
  } catch (e) {
    // Fail silently if supabase environment variables are missing
    console.error("Auth check failed in Quick Auction:", e);
  }

  const initialUser = user
    ? {
        id: user.id,
        email: user.email ?? "",
        displayName: profile?.full_name ?? user.email?.split("@")[0] ?? "Organizer",
        avatarUrl: profile?.avatar_url ?? null,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased transition-colors duration-300 flex flex-col">
      {/* Premium Public Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between transition-colors duration-300">
        <Link href="/" className="flex flex-col group px-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-600 text-pitch-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:scale-105 transition-all duration-300">
              <Trophy className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-black font-display tracking-tight text-slate-900 dark:text-white">
              TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
            </span>
          </div>
          <span className="text-[6.5px] font-bold tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 ml-10 -mt-0.5">
            Auction. Play. Win.
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {initialUser ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-pitch-500 hover:bg-pitch-600 text-pitch-950 px-4 text-xs font-black transition-all active:scale-98 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login?redirect=/quick-auction"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] px-4 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 active:scale-98 backdrop-blur-md"
              >
                Login
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-pitch-500 hover:bg-pitch-600 text-pitch-950 px-4 text-xs font-black transition-all active:scale-98 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Work Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10">
        <QuickAuctionConsole initialUser={initialUser} />
      </main>
    </div>
  );
}
