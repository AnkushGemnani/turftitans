import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Mail, Phone, Trophy, UserRound, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ProfileDetails = {
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
};

type RegistrationSummary = {
  tournament_id: string;
};

type TournamentSummary = {
  id: string;
  name: string;
  status: string;
  start_date: string;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, createdTournamentsResult, registrationsResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("tournaments")
        .select("id,name,status,start_date")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("registrations")
        .select("id,tournament_id,status,role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const profile = profileResult.data as ProfileDetails | null;
  const createdTournaments = createdTournamentsResult.data as TournamentSummary[] | null;
  const registrations = registrationsResult.data as RegistrationSummary[] | null;

  const joinedTournamentIds = registrations?.map((registration) => registration.tournament_id) ?? [];
  const joinedTournamentsResult = joinedTournamentIds.length
    ? await supabase
        .from("tournaments")
        .select("id,name,status,start_date")
        .in("id", joinedTournamentIds)
    : { data: [] };
  const joinedTournaments = joinedTournamentsResult.data as TournamentSummary[] | null;

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-gold-400/30 bg-gold-400/10">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-10 w-10 text-gold-400" aria-hidden />
            )}
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-pitch-600 dark:text-gold-400">
              Player profile
            </p>
            <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
              {profile?.full_name ?? "TurfTitans user"}
            </h1>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-pitch-500 dark:text-gold-400" aria-hidden />
                {user.email}
              </p>
              {profile?.role && (
                <p className="flex items-center gap-2 capitalize">
                  <UserRound className="h-4 w-4 text-pitch-500 dark:text-gold-400" aria-hidden />
                  Role: {profile.role.replace("_", " ")}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-pitch-500 dark:text-gold-400" aria-hidden />
                {profile?.phone ?? "Phone not added"}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-pitch-500 dark:text-gold-400" aria-hidden />
                Joined {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(user.created_at))}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-6 shadow-sm">
          <Trophy className="h-5 w-5 text-pitch-600 dark:text-gold-400" aria-hidden />
          <h2 className="mt-3 text-lg font-black text-slate-900 dark:text-white font-display">Created Tournaments</h2>
          <div className="mt-4 space-y-3">
            {createdTournaments?.length ? (
              createdTournaments.map((tournament) => (
                <Link
                  href={`/tournaments/${tournament.id}`}
                  key={tournament.id}
                  className="block rounded-xl bg-slate-100 dark:bg-pitch-900 border border-slate-200 dark:border-white/5 p-3 text-sm transition hover:bg-slate-200 dark:hover:bg-pitch-800"
                >
                  <span className="font-bold text-slate-900 dark:text-white">{tournament.name}</span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">· {tournament.status}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No created tournaments yet.</p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 shadow-sm">
          <UsersRound className="h-5 w-5 text-pitch-600 dark:text-gold-400" aria-hidden />
          <h2 className="mt-3 text-lg font-black text-slate-900 dark:text-white font-display">Joined Tournaments</h2>
          <div className="mt-4 space-y-3">
            {joinedTournaments?.length ? (
              joinedTournaments.map((tournament) => (
                <Link
                  href={`/tournaments/${tournament.id}`}
                  key={tournament.id}
                  className="block rounded-xl bg-slate-100 dark:bg-pitch-900 border border-slate-200 dark:border-white/5 p-3 text-sm transition hover:bg-slate-200 dark:hover:bg-pitch-800"
                >
                  <span className="font-bold text-slate-900 dark:text-white">{tournament.name}</span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">· {tournament.status}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No joined tournaments yet.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
