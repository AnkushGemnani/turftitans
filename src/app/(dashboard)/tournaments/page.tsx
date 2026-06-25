import { Search } from "lucide-react";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { createClient } from "@/lib/supabase/server";

type TournamentsPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    sort?: "asc" | "desc";
  }>;
};

type TournamentListItem = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  registration_fee: number;
  max_players: number;
  banner_url: string | null;
  banner_path: string | null;
  registrations?: Array<{ status: string }>;
};

export default async function TournamentsPage({ searchParams }: TournamentsPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const sort = params.sort === "desc" ? "desc" : "asc";
  const supabase = await createClient();

  let tournamentsQuery = supabase
    .from("tournaments")
    .select("id,name,location,start_date,registration_fee,max_players,banner_url,banner_path,registrations(id,status)")
    .order("start_date", { ascending: sort === "asc" });

  if (query) {
    tournamentsQuery = tournamentsQuery.ilike("name", `%${query}%`);
  }

  if (location) {
    tournamentsQuery = tournamentsQuery.ilike("location", `%${location}%`);
  }

  const [{ data: tournaments, error }, { data: locationRows }] = await Promise.all([
    tournamentsQuery,
    supabase.from("tournaments").select("location").order("location"),
  ]);

  const locations = Array.from(new Set((locationRows ?? []).map((row) => row.location))).filter(Boolean);
  const items = (tournaments ?? []) as TournamentListItem[];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner / Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-radial-card p-6 sm:p-8 shadow-sm dark:shadow-premium backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-pitch-500/10 rounded-full blur-3xl pointer-events-none" />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-pitch-600 dark:text-pitch-500 glow-text-green font-display">
          Tournament Discovery
        </p>
        <h1 className="mt-3 text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white sm:text-4xl">Browse Tournaments</h1>
        
        {/* Filter Form */}
        <form className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_200px_160px_100px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search tournament name"
              className="h-11 w-full rounded-xl border border-slate-200/50 dark:border-white/5 bg-white dark:bg-pitch-950/70 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:bg-slate-50 dark:focus:bg-pitch-950 focus:shadow-glow-green dark:focus:shadow-glow-green transition-all"
            />
          </div>
          <select
            name="location"
            defaultValue={location}
            className="h-11 rounded-xl border border-slate-200/50 dark:border-white/5 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 transition-all cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-pitch-950 text-slate-900 dark:text-white">All locations</option>
            {locations.map((item) => (
              <option key={item} value={item} className="bg-white dark:bg-pitch-950 text-slate-900 dark:text-white">
                {item}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="h-11 rounded-xl border border-slate-200/50 dark:border-white/5 bg-white dark:bg-pitch-950/70 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 transition-all cursor-pointer"
          >
            <option value="asc" className="bg-white dark:bg-pitch-950 text-slate-900 dark:text-white">Soonest first</option>
            <option value="desc" className="bg-white dark:bg-pitch-950 text-slate-900 dark:text-white">Latest first</option>
          </select>
          <button
            className="h-11 rounded-xl bg-pitch-500 text-sm font-bold text-pitch-950 shadow-lg shadow-pitch-500/20 hover:bg-pitch-400 transition"
            type="submit"
          >
            Apply
          </button>
        </form>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-800 dark:text-red-200">
          {error.message}
        </div>
      ) : null}

      {/* Grid List */}
      {items.length ? (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.01] p-12 text-center shadow-sm">
          <Search className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-600" aria-hidden />
          <h2 className="mt-4 text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">No tournaments found</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            We couldn&apos;t find any match for your search query. Try typing another name or checking a different location.
          </p>
        </section>
      )}
    </div>
  );
}
