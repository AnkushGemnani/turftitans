import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Trophy,
  Calendar,
  Users,
  TrendingUp,
  MapPin,
  ArrowUpRight,
  PlusCircle,
  Search,
  UserCheck,
  UserX,
  CreditCard,
  Gavel,
  ChevronRight,
  DollarSign,
  Activity,
  CalendarDays,
  ArrowRight,
  Zap
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";

type ProfileSummary = {
  full_name: string;
};

type CreatedTournamentSummary = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  status: string;
  max_players: number;
  number_of_teams: number;
  team_budget: number;
  registration_fee: number;
  banner_url?: string;
  registrations?: Array<{ id: string; status: string }>;
};

type JoinedTournamentSummary = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  status: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getFormattedMonth(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
  }).format(new Date(date)).toUpperCase();
}

function getFormattedDay(date: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
  }).format(new Date(date));
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval}y ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval}mo ago`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval}d ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval}h ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval}m ago`;
  return seconds < 10 ? "Just now" : `${seconds}s ago`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch data from database
  const [profileResult, createdTournamentsResult, registrationsResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("tournaments")
        .select("id,name,location,start_date,status,max_players,number_of_teams,team_budget,registration_fee,banner_url,registrations(id,status)")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("registrations")
        .select("id,tournament_id,status,role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const profile = profileResult.data as ProfileSummary | null;
  const createdTournaments = createdTournamentsResult.data as CreatedTournamentSummary[] | null;
  const registrations = registrationsResult.data as { tournament_id: string; status: string }[] | null;

  const joinedTournamentIds = registrations?.map((r) => r.tournament_id) ?? [];
  const joinedTournamentsResult = joinedTournamentIds.length
    ? await supabase
        .from("tournaments")
        .select("id,name,location,start_date,status")
        .in("id", joinedTournamentIds)
    : { data: [] };
  const joinedTournaments = joinedTournamentsResult.data as JoinedTournamentSummary[] | null;

  // Calculation of dynamic stats
  const totalTournamentsCreated = createdTournaments?.length ?? 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingTournamentsCreated = createdTournaments?.filter((t) => t.start_date >= todayStr).length ?? 0;
  
  // Total players registered in user's tournaments and breakdowns
  let totalRegisteredPlayers = 0;
  let pendingRegistrations = 0;
  let approvedRegistrations = 0;

  if (createdTournaments) {
    createdTournaments.forEach((t) => {
      if (t.registrations) {
        totalRegisteredPlayers += t.registrations.length;
        t.registrations.forEach((r) => {
          if (r.status === "approved") {
            approvedRegistrations++;
          } else if (r.status === "pending_payment" || r.status === "payment_uploaded") {
            pendingRegistrations++;
          }
        });
      }
    });
  }

  // Total revenue and payment statuses from payments table
  let totalRevenue = 0;
  let pendingPayments = 0;
  let approvedPaymentsCount = 0;
  let rejectedPayments = 0;

  const createdIds = createdTournaments?.map((t) => t.id) ?? [];
  if (createdIds.length > 0) {
    const { data: paymentsList } = await supabase
      .from("payments")
      .select("status, amount")
      .in("tournament_id", createdIds);

    if (paymentsList) {
      paymentsList.forEach((p) => {
        if (p.status === "approved") {
          approvedPaymentsCount++;
          totalRevenue += Number(p.amount);
        } else if (p.status === "submitted" || p.status === "pending") {
          pendingPayments++;
        } else if (p.status === "rejected") {
          rejectedPayments++;
        }
      });
    }
  }

  // Fetch dynamic recent activities based on registrations
  let recentActivities: Array<{
    text: string;
    time: string;
    icon: any;
    iconBg: string;
    dateObj: Date;
  }> = [];

  const dbPromises = [];
  
  if (createdIds.length > 0) {
    dbPromises.push(
      supabase
        .from("registrations")
        .select(`
          id,
          status,
          created_at,
          role,
          profiles (
            full_name
          ),
          tournaments (
            name
          )
        `)
        .in("tournament_id", createdIds)
        .order("created_at", { ascending: false })
        .limit(5)
    );
  } else {
    dbPromises.push(Promise.resolve({ data: [] }));
  }

  dbPromises.push(
    supabase
      .from("registrations")
      .select(`
        id,
        status,
        created_at,
        role,
        tournaments (
          name
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
  );

  const [hostedRegsResult, ownRegsResult] = await Promise.all(dbPromises);
  const hostedRegs = hostedRegsResult.data;
  const ownRegs = ownRegsResult.data;

  const roleLabels: Record<string, string> = {
    batsman: "Batsman",
    bowler: "Bowler",
    all_rounder: "All-Rounder",
    wicket_keeper: "Wicket Keeper",
  };

  if (hostedRegs) {
    hostedRegs.forEach((r: any) => {
      const playerName = r.profiles?.full_name ?? "A player";
      const tourneyName = r.tournaments?.name ?? "your tournament";
      const roleStr = roleLabels[r.role] ?? r.role.replace("_", " ");
      
      let text = "";
      let icon = UserCheck;
      let iconBg = "bg-purple-500/10 text-purple-500";
      
      if (r.status === "approved") {
        text = `${playerName} was approved as a ${roleStr} in ${tourneyName}`;
        iconBg = "bg-emerald-500/10 text-emerald-500";
      } else if (r.status === "rejected") {
        text = `${playerName}'s registration/payment for ${tourneyName} was rejected`;
        icon = UserX;
        iconBg = "bg-red-500/10 text-red-500";
      } else if (r.status === "payment_uploaded") {
        text = `${playerName} uploaded payment screenshot for ${tourneyName}`;
        icon = CreditCard;
        iconBg = "bg-amber-500/10 text-amber-500";
      } else {
        text = `${playerName} registered as a ${roleStr} for ${tourneyName}`;
      }

      recentActivities.push({
        text,
        time: formatTimeAgo(r.created_at),
        icon,
        iconBg,
        dateObj: new Date(r.created_at)
      });
    });
  }

  if (ownRegs) {
    ownRegs.forEach((r: any) => {
      const tourneyName = r.tournaments?.name ?? "a tournament";
      const roleStr = roleLabels[r.role] ?? r.role.replace("_", " ");
      
      let text = "";
      let icon = UserCheck;
      let iconBg = "bg-blue-500/10 text-blue-500";
      
      if (r.status === "approved") {
        text = `You were approved as a ${roleStr} in ${tourneyName}`;
        iconBg = "bg-emerald-500/10 text-emerald-500";
      } else if (r.status === "rejected") {
        text = `Your registration/payment for ${tourneyName} was rejected`;
        icon = UserX;
        iconBg = "bg-red-500/10 text-red-500";
      } else if (r.status === "payment_uploaded") {
        text = `You uploaded payment screenshot for ${tourneyName}`;
        icon = CreditCard;
        iconBg = "bg-amber-500/10 text-amber-500";
      } else {
        text = `You applied as a ${roleStr} for ${tourneyName}`;
      }

      recentActivities.push({
        text,
        time: formatTimeAgo(r.created_at),
        icon,
        iconBg,
        dateObj: new Date(r.created_at)
      });
    });
  }

  // Sort and slice
  recentActivities.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  recentActivities = recentActivities.slice(0, 4);

  const userDisplayName = profile?.full_name ?? user.email?.split("@")[0] ?? "Organizer";

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* ═══════════════════════════════════════════════════════════════
          GREETING HEADER
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <DashboardGreeting userDisplayName={userDisplayName} />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Here&apos;s what&apos;s happening with your tournaments today.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          QUICK ACTIONS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(() => {
            const singleTournamentId = createdTournaments && createdTournaments.length === 1 ? createdTournaments[0].id : null;
            const actions = [
              { label: "Create Tournament", href: "/tournaments/create", icon: PlusCircle, color: "text-pitch-500 border-pitch-500/20 bg-pitch-500/5 hover:bg-pitch-500/10" },
              { label: "Browse Tournaments", href: "/tournaments", icon: Search, color: "text-blue-500 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10" },
              { 
                label: "Manage Registrations", 
                href: singleTournamentId ? `/tournaments/${singleTournamentId}/registrations` : "/tournaments/my?action=registrations", 
                icon: UserCheck, 
                color: "text-purple-500 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10" 
              },
              { 
                label: "Verify Payments", 
                href: singleTournamentId ? `/tournaments/${singleTournamentId}/payments` : "/tournaments/my?action=payments", 
                icon: CreditCard, 
                color: "text-amber-500 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10" 
              },
              { 
                label: "Start Auction", 
                href: singleTournamentId ? `/tournaments/${singleTournamentId}/auction` : "/tournaments/my?action=auction", 
                icon: Gavel, 
                color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" 
              },
              { 
                label: "Quick Auction", 
                href: "/quick-auction", 
                icon: Zap, 
                color: "text-rose-500 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10" 
              },
            ];
            return actions.map((act, i) => {
              const Icon = act.icon;
              return (
                <Link
                  key={i}
                  href={act.href}
                  className={cn(
                    "flex flex-col items-center justify-between p-4.5 rounded-xl border transition-all duration-200 text-center space-y-3 cursor-pointer group active:scale-98",
                    act.color
                  )}
                >
                  <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 tracking-tight leading-tight">{act.label}</p>
                  </div>
                </Link>
              );
            });
          })()}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          METRICS CARDS (4 COLUMNS WITH SPARKLINE GRAPHS)
      ═══════════════════════════════════════════════════════════════ */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Metric 1: Tournaments Created */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-32 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tournaments Created</span>
              <h3 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-1">{totalTournamentsCreated}</h3>
            </div>
            <span className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Trophy className="h-4 w-4" />
            </span>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
              <span>Total hosted leagues</span>
            </div>
            {/* Sparkline Graph */}
            <div className="w-16 h-8 opacity-70">
              <svg viewBox="0 0 100 30" className="w-full h-full">
                <path d="M0 25 Q15 5, 30 18 T60 8 T90 22" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Metric 2: Registered Players */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-32 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Registered Players</span>
              <h3 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-1">{totalRegisteredPlayers}</h3>
            </div>
            <span className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="text-pitch-600 dark:text-pitch-400">Approved: {approvedRegistrations}</span>
              <span className="text-slate-300 dark:text-white/10">|</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">Pending: {pendingRegistrations}</span>
            </div>
            {/* Sparkline Graph */}
            <div className="w-16 h-8 opacity-70">
              <svg viewBox="0 0 100 30" className="w-full h-full">
                <path d="M0 28 Q20 10, 40 22 T80 5 T100 15" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Metric 3: Revenue Collected */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-32 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Revenue Collected</span>
              <h3 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-1">₹{totalRevenue.toLocaleString("en-IN")}</h3>
            </div>
            <span className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-pitch-600 dark:text-pitch-400">App: {approvedPaymentsCount}</span>
              <span className="text-slate-300 dark:text-white/10">|</span>
              <span className="text-amber-600 dark:text-amber-400">Pend: {pendingPayments}</span>
              <span className="text-slate-300 dark:text-white/10">|</span>
              <span className="text-red-500">Rej: {rejectedPayments}</span>
            </div>
            {/* Sparkline Graph */}
            <div className="w-16 h-8 opacity-70">
              <svg viewBox="0 0 100 30" className="w-full h-full">
                <path d="M0 20 Q15 28, 35 12 T75 22 T100 8" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Metric 4: Upcoming Events */}
        <div className="glass-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-32 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Upcoming Events</span>
              <h3 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white mt-1">{upcomingTournamentsCreated}</h3>
            </div>
            <span className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="flex justify-between items-end mt-4">
            <div className="text-[10px] font-bold text-blue-500">
              <span>Scheduled next 30 days</span>
            </div>
            {/* Sparkline Graph */}
            <div className="w-16 h-8 opacity-70">
              <svg viewBox="0 0 100 30" className="w-full h-full">
                <path d="M0 15 Q25 25, 50 10 T75 20 T100 5" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT 2-COLUMN LAYOUT
      ═══════════════════════════════════════════════════════════════ */}
      <section className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Left Column (Active Tournaments & Quick Actions) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Tournaments Block */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
                Active Tournaments
              </h2>
              <Link href="/tournaments/my" className="text-xs font-bold text-pitch-500 hover:text-pitch-400 flex items-center gap-0.5">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {createdTournaments?.length ? (
                createdTournaments.slice(0, 2).map((tournament) => {
                  const regCount = tournament.registrations?.length ?? 0;
                  const maxPlayers = tournament.max_players ?? 30;
                  const fillPercentage = Math.round((regCount / maxPlayers) * 100);
                  const isUpcoming = new Date(tournament.start_date) > new Date();

                  return (
                    <div
                      key={tournament.id}
                      className="glass-card rounded-xl overflow-hidden border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm flex flex-col justify-between"
                    >
                      {/* Banner / Card Header */}
                      <div className="relative h-28 bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0 border-b border-slate-200/50 dark:border-white/5">
                        {tournament.banner_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={tournament.banner_url}
                              alt={tournament.name}
                              className="w-full h-full object-cover opacity-70"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                          </>
                        ) : (
                          // High-fidelity fallback gradient graphic (Responsive light/dark mode)
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,#e8f5ed,#f8fafc)] dark:bg-[linear-gradient(135deg,#0c1d13,#030604)] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] opacity-70" />
                            <span className="text-[9px] font-black tracking-widest text-pitch-650/40 dark:text-pitch-500/20 font-display">
                              {tournament.name.toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        {/* Title overlay */}
                        <div className="absolute bottom-3 left-4">
                          <h4 className={cn(
                            "text-sm font-black tracking-tight",
                            tournament.banner_url ? "text-white drop-shadow-md" : "text-slate-900 dark:text-white"
                          )}>
                            {tournament.name}
                          </h4>
                        </div>

                        {/* Status Tag Overlay */}
                        <span className={cn(
                          "absolute top-3 right-4 rounded-lg px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                          !tournament.banner_url && "bg-white/80 dark:bg-pitch-950/80 backdrop-blur-sm",
                          isUpcoming
                            ? "border border-amber-500/20 text-amber-600 dark:text-amber-500"
                            : "border border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
                        )}>
                          {isUpcoming ? "Upcoming" : "Open"}
                        </span>
                      </div>

                      {/* Content Panel */}
                      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                        
                        {/* Registration fill rate progress */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-500 dark:text-slate-400">
                              {regCount} / {maxPlayers} Players Registered
                            </span>
                            <span className="text-pitch-500">{fillPercentage}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-pitch-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Specification details grid */}
                        <div className="grid grid-cols-4 gap-2 border-t border-b border-slate-100 dark:border-white/5 py-3 text-center">
                          <div>
                            <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Entry Fee</span>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white mt-0.5">₹{tournament.registration_fee}</p>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Team Budget</span>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white mt-0.5">₹{(tournament.team_budget / 100000).toFixed(1)}L</p>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Teams</span>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white mt-0.5">{tournament.number_of_teams}</p>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-slate-500">Format</span>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white mt-0.5">Auction</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1.5">
                          <Link
                            href={`/tournaments/${tournament.id}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 text-[10px] font-bold transition active:scale-98"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/tournaments/${tournament.id}/registrations`}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-pitch-500 hover:bg-pitch-400 text-pitch-950 text-[10px] font-bold transition active:scale-98"
                          >
                            Manage Tournament
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.01] p-8 text-center space-y-3">
                  <Trophy className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No active leagues hosted yet</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">Create a tournament to manage live registrations, payment status queues, and IPL-style auctions.</p>
                  <Link
                    href="/tournaments/create"
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-pitch-500 hover:bg-pitch-400 text-pitch-950 text-xs font-bold px-4 transition active:scale-98"
                  >
                    Create a Tournament
                  </Link>
                </div>
              )}
            </div>
          </div>


        </div>

        {/* Right Column (Upcoming Tournaments Timeline & Recent Activities) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upcoming Tournaments Widget */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
                Upcoming Tournaments
              </h2>
              <Link href="/tournaments" className="text-xs font-bold text-pitch-500 hover:text-pitch-400 flex items-center gap-0.5">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="glass-card rounded-xl border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.01] p-4.5 shadow-sm space-y-4">
              {createdTournaments?.length ? (
                createdTournaments.slice(0, 4).map((t, idx) => {
                  const daysLeft = Math.ceil((new Date(t.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={t.id} className="flex gap-4 items-start group">
                      {/* Date block */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/30 dark:border-white/5 w-12 h-12 shrink-0 group-hover:border-pitch-500/25 transition">
                        <span className="text-xs font-black text-slate-900 dark:text-white leading-none">
                          {getFormattedDay(t.start_date)}
                        </span>
                        <span className="text-[7.5px] font-black text-pitch-600 dark:text-pitch-400 mt-1 tracking-wider leading-none">
                          {getFormattedMonth(t.start_date)}
                        </span>
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-pitch-500 transition-colors">
                          {t.name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {daysLeft > 0 ? `Starts in ${daysLeft} days` : "Starts today"}
                        </p>
                      </div>

                      {/* Status dot */}
                      <span className="h-2 w-2 rounded-full bg-pitch-500 self-center shrink-0" />
                    </div>
                  );
                })
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-4">No upcoming events scheduled</p>
              )}
            </div>
          </div>

          {/* Recent Activity Widget */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
                Recent Activity
              </h2>
              <span className="text-[9px] font-bold text-slate-400">Live Feed</span>
            </div>

            <div className="glass-card rounded-xl border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.01] p-4.5 shadow-sm space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((act, i) => {
                  const ActIcon = act.icon;
                  return (
                    <div key={i} className="flex gap-3 items-start text-xs">
                      <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", act.iconBg)}>
                        <ActIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-normal">
                          {act.text}
                        </p>
                        <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 mt-1 block">
                          {act.time}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 space-y-1">
                  <Activity className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">No recent activity</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 max-w-[180px] mx-auto">
                    Player registrations and updates will appear here automatically.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>
      
    </div>
  );
}
