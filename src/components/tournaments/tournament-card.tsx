import Link from "next/link";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/tournaments/format";

type TournamentCardProps = {
  tournament: {
    id: string;
    name: string;
    location: string;
    start_date: string;
    registration_fee: number;
    max_players: number;
    banner_url: string | null;
    banner_path?: string | null;
    registrations?: Array<{ status: string }>;
  };
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const registeredCount =
    tournament.registrations?.filter((registration) => registration.status === "approved").length ?? 0;
  const remainingSlots = Math.max(tournament.max_players - registeredCount, 0);
  const banner = tournament.banner_url ?? tournament.banner_path;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl glass-card glass-card-hover shadow-sm dark:shadow-premium"
    >
      <div className="aspect-[16/10] bg-slate-100 dark:bg-pitch-950 overflow-hidden relative border-b border-slate-200/50 dark:border-white/5">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner}
            alt={tournament.name}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#e8f5ed,#f8fafc)] dark:bg-[linear-gradient(135deg,#0c1d13,#030604)] text-pitch-600 dark:text-pitch-500 relative">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <span className="text-4xl font-black font-display tracking-widest opacity-80 glow-text-green">TT</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="rounded-lg border border-slate-200/50 dark:border-pitch-500/20 bg-white/80 dark:bg-pitch-950/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pitch-600 dark:text-pitch-400">
            Open
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="line-clamp-2 text-base font-bold font-display tracking-tight text-slate-900 dark:text-white group-hover:text-pitch-500 transition-colors duration-200">
            {tournament.name}
          </h3>
          <div className="mt-4 grid gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-pitch-600 dark:text-pitch-500" aria-hidden />
              {formatDate(tournament.start_date)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-pitch-600 dark:text-pitch-500" aria-hidden />
              {tournament.location}
            </p>
            <p className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-pitch-600 dark:text-pitch-500" aria-hidden />
              {registeredCount} / {tournament.max_players} Registered
            </p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
          <span className="text-base font-extrabold text-gold-600 dark:text-gold-400 font-display">
            {tournament.registration_fee === 0 ? "Free Entry" : formatCurrency(tournament.registration_fee)}
          </span>
          <span className="rounded-lg bg-pitch-500/10 border border-pitch-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pitch-600 dark:text-pitch-400 shadow-glow-green">
            {remainingSlots} slots left
          </span>
        </div>
      </div>
    </Link>
  );
}
