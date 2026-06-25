"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FolderKanban,
  UserCheck,
  CreditCard,
  Gavel,
  Users,
  LineChart,
  Settings,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function NavLinks({ vertical = false }: { vertical?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");

  // Extract tournamentId from pathname if we are currently inside a tournament route
  // e.g. /tournaments/8fa43fa2-d04b-4c4f-a9b0-13a8cdb6cf42/...
  const match = pathname.match(/^\/tournaments\/([^/]+)/);
  const idParam = match ? match[1] : null;
  const currentTournamentId = idParam && idParam !== "create" && idParam !== "my" ? idParam : null;

  const sidebarNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tournaments", label: "Browse Tournaments", icon: Search },
    { href: "/tournaments/my", label: "My Tournaments", icon: FolderKanban },
    { 
      href: currentTournamentId 
        ? `/tournaments/${currentTournamentId}/registrations` 
        : "/tournaments/my?action=registrations", 
      label: "Registrations", 
      icon: UserCheck 
    },
    { 
      href: currentTournamentId 
        ? `/tournaments/${currentTournamentId}/payments` 
        : "/tournaments/my?action=payments", 
      label: "Payments", 
      icon: CreditCard 
    },
    { 
      href: currentTournamentId 
        ? `/tournaments/${currentTournamentId}/auction` 
        : "/tournaments/my?action=auction", 
      label: "Auction Room", 
      icon: Gavel 
    },
    { 
      href: currentTournamentId 
        ? `/tournaments/${currentTournamentId}/teams` 
        : "/tournaments/my?action=teams", 
      label: "Teams", 
      icon: Users 
    },
    { 
      href: currentTournamentId 
        ? `/tournaments/${currentTournamentId}/export` 
        : "/tournaments/my?action=reports", 
      label: "Reports", 
      icon: LineChart 
    },
    { href: "/profile", label: "Settings", icon: Settings },
  ];

  const mobileNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tournaments", label: "Browse", icon: Search },
    { href: "/tournaments/my", label: "My Tournaments", icon: FolderKanban },
    { href: "/tournaments/create", label: "Create", icon: PlusCircle },
    { href: "/profile", label: "Settings", icon: Settings },
  ];

  // Helper to determine precise active states for the sidebar links
  const getIsActive = (itemHref: string) => {
    const [itemPath, itemQuery] = itemHref.split("?");

    // Exact matches
    if (itemHref === "/dashboard" || itemHref === "/profile") {
      return pathname === itemHref;
    }

    // Match path + search params if query parameter exists
    if (itemQuery) {
      if (pathname !== itemPath) return false;
      const itemAction = new URLSearchParams(itemQuery).get("action");
      return actionParam === itemAction;
    }

    // Exact path match
    if (pathname === itemPath) return true;

    // Browse Tournaments matches any subpage under /tournaments/[id] (except specific tabs)
    if (itemHref === "/tournaments" && pathname.startsWith("/tournaments") && !pathname.startsWith("/tournaments/my")) {
      const isSubpage = 
        pathname.endsWith("/registrations") || 
        pathname.endsWith("/payments") || 
        pathname.endsWith("/auction") || 
        pathname.endsWith("/teams") || 
        pathname.endsWith("/export") || 
        pathname.endsWith("/edit");
      return !isSubpage;
    }

    // My Tournaments matches /tournaments/my but not when custom tabs are active
    if (itemHref === "/tournaments/my" && pathname.startsWith("/tournaments/my")) {
      return !actionParam;
    }

    return false;
  };

  if (vertical) {
    return (
      <nav className="flex flex-col gap-1 w-full">
        {sidebarNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 border",
                isActive
                  ? "bg-pitch-500/10 border-pitch-500/20 text-pitch-500 shadow-glow-green"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-pitch-950/80 backdrop-blur-lg px-4 py-2 flex items-center justify-around pb-safe transition-colors duration-300">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const mobileLabel = item.label === "My Tournaments" ? "My Turfs" : item.label;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-all duration-200",
              isActive
                ? "text-pitch-500 glow-text-green font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "scale-110")} aria-hidden />
            <span className="text-[10px] tracking-wide font-medium">{mobileLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
