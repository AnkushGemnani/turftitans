import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Plus } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { NavLinks } from "@/components/dashboard/nav-links";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { HeaderSearch } from "@/components/dashboard/header-search";
import { HeaderNotifications } from "@/components/dashboard/header-notifications";
import { HeaderMessages } from "@/components/dashboard/header-messages";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile for top navigation info
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const userDisplayName = profile?.full_name ?? user.email?.split("@")[0] ?? "User";
  const userAvatar = profile?.avatar_url ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userDisplayName)}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-900 dark:text-slate-100 font-sans pb-20 md:pb-0 transition-colors duration-300 flex">
      
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ═══════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/50 dark:border-white/5 bg-white dark:bg-pitch-950/70 backdrop-blur-md p-5 shrink-0 justify-between h-screen sticky top-0 z-30">
        <div className="space-y-6">
          {/* Logo Header */}
          <Link href="/dashboard" className="flex flex-col group px-2">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-600 text-pitch-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:scale-105 transition-all duration-300">
                <Trophy className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="text-lg font-black font-display tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
              </span>
            </div>
            <span className="text-[6.5px] font-bold tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 ml-10 -mt-0.5">
              Auction. Play. Win.
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="pt-2">
            <NavLinks vertical />
          </div>
        </div>

        {/* Sidebar Footer Widgets */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-400">
            <ThemeToggle showLabel />
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between transition-colors duration-300">
          
          {/* Mobile Logo Link (only visible on mobile) */}
          <Link href="/dashboard" className="md:hidden flex items-center gap-2 group">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-600 text-pitch-950">
              <Trophy className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="text-base font-black font-display tracking-tight text-slate-900 dark:text-white">
              TurfTitans
            </span>
          </Link>

          {/* Search Bar (Centered on desktop) */}
          <HeaderSearch />

          {/* User profile & Actions */}
          <div className="flex items-center gap-4">
            {/* Quick action message/notifications */}
            <HeaderNotifications userId={user.id} />
            <HeaderMessages />
            
            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />

            {/* Profile widget */}
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userAvatar}
                alt={userDisplayName}
                className="h-8 w-8 rounded-xl object-cover bg-slate-100 border border-slate-200 dark:border-white/10"
              />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">
                  {userDisplayName}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                  Organizer
                </span>
              </div>
            </div>

            {/* Header Create Tournament Button */}
            <Link
              href="/tournaments/create"
              className="inline-flex items-center gap-1 bg-pitch-500 hover:bg-pitch-400 text-pitch-950 font-bold text-xs h-9 px-3.5 rounded-xl shadow-md shadow-pitch-500/10 transition active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Tournament</span>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10">
          {children}
        </main>
        
        {/* Mobile Nav Links rendering */}
        <NavLinks />
      </div>
    </div>
  );
}
