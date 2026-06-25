import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Edit,
  Eye,
  ListChecks,
  PlusCircle,
  Trophy,
  CreditCard,
  Gavel,
  Users,
  LineChart,
  UserCheck
} from "lucide-react";
import { DeleteTournamentButton } from "@/components/tournaments/delete-tournament-button";
import { Notice } from "@/components/ui/notice";
import { formatCurrency, formatDate } from "@/lib/tournaments/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type MyTournamentsPageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
    action?: string;
  }>;
};

type MyTournament = {
  id: string;
  name: string;
  start_date: string;
  registration_fee: number;
  max_players: number;
  status: string;
  banner_url: string | null;
  banner_path: string | null;
  registrations?: Array<{ status: string }>;
};

export default async function MyTournamentsPage({ searchParams }: MyTournamentsPageProps) {
  const params = await searchParams;
  const action = params.action;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("id,name,start_date,registration_fee,max_players,status,banner_url,banner_path,registrations(id,status)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const tournaments = (data ?? []) as MyTournament[];

  const getActionLabel = (act: string) => {
    switch (act) {
      case "registrations":
        return "Manage Registrations";
      case "payments":
        return "Review Payments";
      case "auction":
        return "Enter Auction Room";
      case "teams":
        return "Manage Teams";
      case "reports":
        return "View Reports";
      default:
        return "Select Tournament";
    }
  };

  const getActionIcon = (act: string) => {
    switch (act) {
      case "registrations":
        return UserCheck;
      case "payments":
        return CreditCard;
      case "auction":
        return Gavel;
      case "teams":
        return Users;
      case "reports":
        return LineChart;
      default:
        return Trophy;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Banner Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-gradient-to-r dark:from-pitch-950 dark:via-pitch-900 dark:to-pitch-950 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-sm dark:shadow-premium backdrop-blur-md">
        <div className="absolute inset-0 bg-radial-card opacity-50 pointer-events-none" />
        <div className="relative space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-pitch-600 dark:text-gold-400">
            Creator tools
          </p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">My Tournaments</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg">Manage tournament details, registrations, and team setup.</p>
        </div>
        <Link
          href="/tournaments/create"
          className="relative inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pitch-500 to-emerald-400 px-5 text-sm font-bold text-pitch-950 transition hover:brightness-110 active:scale-98 shadow-glow-green whitespace-nowrap self-start sm:self-center"
        >
          <PlusCircle className="h-4 w-4" aria-hidden />
          Create Tournament
        </Link>
      </section>

      {action ? (
        <Notice
          type="info"
          message={`Please select a tournament below to access its ${
            action === "reports"
              ? "Reports & Export Center"
              : action === "auction"
              ? "Auction Room"
              : action.charAt(0).toUpperCase() + action.slice(1)
          }.`}
        />
      ) : null}

      {params.message ? <Notice type="success" message={params.message} /> : null}
      {params.error ? <Notice type="error" message={params.error} /> : null}
      {error ? <Notice type="error" message={error.message} /> : null}

      {tournaments.length ? (
        <section className="space-y-4">
          {tournaments.map((tournament) => {
            const registeredCount =
              tournament.registrations?.filter((registration) => registration.status === "approved").length ?? 0;
            const banner = tournament.banner_url ?? tournament.banner_path;

            const targetHref = action
              ? `/tournaments/${tournament.id}/${action === "reports" ? "export" : action}`
              : `/tournaments/${tournament.id}`;

            return (
              <article
                key={tournament.id}
                className="glass-card glass-card-hover p-4 md:p-5 rounded-2xl grid gap-5 md:grid-cols-[180px_1fr] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-radial-card opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                {/* Banner Thumbnail */}
                <div className="aspect-[16/9] overflow-hidden rounded-xl bg-slate-100 dark:bg-pitch-900 md:aspect-square relative border border-slate-200/50 dark:border-white/5">
                  {banner ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={banner} 
                      alt="" 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-pitch-400">
                      TT
                    </div>
                  )}
                </div>

                {/* Details Content */}
                <div className="flex flex-col justify-between min-w-0 space-y-4 md:space-y-0">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight hover:text-pitch-500 transition-colors truncate pr-2">
                        <Link href={targetHref}>{tournament.name}</Link>
                      </h2>
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border",
                        tournament.status === "open"
                          ? "border-pitch-500/30 bg-pitch-500/10 text-pitch-600 dark:text-pitch-400"
                          : tournament.status === "upcoming"
                          ? "border-gold-500/30 bg-gold-500/10 text-gold-600 dark:text-gold-400"
                          : tournament.status === "locked"
                          ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                          : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                      )}>
                        {tournament.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-pitch-600 dark:text-pitch-400" aria-hidden />
                        {formatDate(tournament.start_date)}
                      </span>
                      <span className="text-slate-300 dark:text-slate-500">&bull;</span>
                      <span>
                        <strong className="text-slate-900 dark:text-white font-bold">{registeredCount}</strong> / {tournament.max_players} slots
                      </span>
                      <span className="text-slate-300 dark:text-slate-500">&bull;</span>
                      <span className="text-gold-600 dark:text-gold-400 font-semibold">
                        {formatCurrency(tournament.registration_fee)}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t border-slate-100 dark:border-white/5 md:border-0">
                    {action && (() => {
                      const ActionIcon = getActionIcon(action);
                      return (
                        <Link 
                          href={targetHref} 
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-pitch-500 hover:bg-pitch-400 text-pitch-950 px-3.5 text-xs font-bold shadow-md shadow-pitch-500/10 transition-transform active:scale-98"
                        >
                          <ActionIcon className="h-3.5 w-3.5" aria-hidden />
                          {getActionLabel(action)}
                        </Link>
                      );
                    })()}
                    <Link 
                      href={`/tournaments/${tournament.id}`} 
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-950 dark:hover:text-white transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden />
                      Details
                    </Link>
                    <Link 
                      href={`/tournaments/${tournament.id}/edit`} 
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-950 dark:hover:text-white transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </Link>
                    <Link 
                      href={`/tournaments/${tournament.id}/registrations`} 
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-950 dark:hover:text-white transition-colors"
                    >
                      <ListChecks className="h-3.5 w-3.5" aria-hidden />
                      Registrations
                    </Link>
                    {tournament.registration_fee > 0 && (
                      <Link 
                        href={`/tournaments/${tournament.id}/payments`} 
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-950 dark:hover:text-white transition-colors"
                      >
                        <CreditCard className="h-3.5 w-3.5" aria-hidden />
                        Payments
                      </Link>
                    )}
                    <div className="ml-auto">
                      <DeleteTournamentButton tournamentId={tournament.id} tournamentName={tournament.name} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="glass-card border-dashed border-slate-200 dark:border-white/10 p-12 text-center rounded-2xl flex flex-col items-center justify-center max-w-lg mx-auto space-y-5">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-pitch-900 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm dark:shadow-glow-green">
            <Trophy className="h-6 w-6 text-pitch-600 dark:text-pitch-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">No tournaments created yet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">Create your first tournament to start accepting player registrations and running drafts.</p>
          </div>
          <Link
            href="/tournaments/create"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pitch-500 to-emerald-400 px-5 text-sm font-bold text-pitch-950 transition hover:brightness-110 active:scale-98 shadow-glow-green"
          >
            <PlusCircle className="h-4 w-4" aria-hidden />
            Create Your First Tournament
          </Link>
        </section>
      )}
    </div>
  );
}

