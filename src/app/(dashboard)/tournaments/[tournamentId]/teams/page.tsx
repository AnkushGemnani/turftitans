import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Shield, Trophy, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { TeamSetupPanel } from "@/components/teams/team-setup-panel";

type TeamsPageProps = {
  params: Promise<{ tournamentId: string }>;
};

function formatAmount(amount: number) {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

const ROLE_LABELS: Record<string, string> = {
  batsman: "Batsman",
  bowler: "Bowler",
  all_rounder: "All-Rounder",
  wicket_keeper: "Wicket Keeper",
};

const ROLE_COLORS: Record<string, string> = {
  batsman: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  bowler: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  all_rounder: "text-pitch-600 dark:text-pitch-400 bg-pitch-500/10 border-pitch-500/20",
  wicket_keeper: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default async function TeamsPage({ params }: TeamsPageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: tournament, error: tourneyError } = await supabase
    .from("tournaments")
    .select("id, name, creator_id, status, team_budget")
    .eq("id", tournamentId)
    .single();

  if (tourneyError || !tournament) notFound();

  const isCreator = tournament.creator_id === user.id;
  const auctionActive = tournament.status === "auction" || tournament.status === "completed";

  // Check if user is an approved player (non-creator access)
  if (!isCreator) {
    const { data: myReg } = await supabase
      .from("registrations")
      .select("status")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myReg || myReg.status !== "approved") {
      redirect(`/tournaments/${tournamentId}?error=Only approved players can view the teams page.`);
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch teams
  const { data: rawTeams } = await adminClient
    .from("teams")
    .select("id, name, logo_path, budget, remaining_budget")
    .eq("tournament_id", tournamentId)
    .order("name");

  const teams = (rawTeams ?? []).map((t) => ({
    ...t,
    logo_url: t.logo_path
      ? supabase.storage.from("team-logos").getPublicUrl(t.logo_path).data.publicUrl
      : null,
  }));

  // Fetch approved player count
  const { count: approvedPlayerCount } = await adminClient
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "approved");

  // Fetch sold auction_purchases with player info (for roster view)
  const { data: purchases } = auctionActive
    ? await adminClient
        .from("auction_purchases")
        .select(`
          id,
          team_id,
          purchase_amount,
          status,
          registration_id,
          registrations (
            role,
            profiles ( full_name, avatar_url )
          )
        `)
        .eq("tournament_id", tournamentId)
        .eq("status", "sold")
        .order("purchase_amount", { ascending: false })
    : { data: [] };

  // Build team → players map
  type PurchaseRow = {
    id: string;
    team_id: string | null;
    purchase_amount: number;
    status: string;
    registration_id: string;
    registrations: {
      role: string;
      profiles: { full_name: string; avatar_url: string | null } | null;
    } | null;
  };

  const teamPlayersMap = new Map<
    string,
    Array<{
      registrationId: string;
      name: string;
      role: string;
      avatarUrl: string | null;
      purchaseAmount: number;
    }>
  >();

  (purchases as PurchaseRow[] ?? []).forEach((p) => {
    if (!p.team_id) return;
    const existing = teamPlayersMap.get(p.team_id) ?? [];
    existing.push({
      registrationId: p.registration_id,
      name: p.registrations?.profiles?.full_name ?? "Unknown Player",
      role: p.registrations?.role ?? "batsman",
      avatarUrl: p.registrations?.profiles?.avatar_url ?? null,
      purchaseAmount: p.purchase_amount,
    });
    teamPlayersMap.set(p.team_id, existing);
  });

  // Enrich teams for setup panel
  const enrichedTeams = teams.map((t) => ({
    ...t,
    player_count: (teamPlayersMap.get(t.id) ?? []).length,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Navigation */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group self-start"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to tournament
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <span className="h-10 w-10 rounded-xl bg-pitch-500/10 border border-pitch-500/20 flex items-center justify-center text-pitch-500 shrink-0">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {auctionActive ? "Team Rosters" : "Team Management"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {tournament.name}
              {!auctionActive && (
                <span className="ml-2 text-slate-400">
                  · Budget per team: {formatAmount(tournament.team_budget)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Setup Panel (creator, pre-auction) */}
      {isCreator && !auctionActive && (
        <TeamSetupPanel
          tournamentId={tournamentId}
          tournamentStatus={tournament.status}
          teams={enrichedTeams}
          approvedPlayerCount={approvedPlayerCount ?? 0}
        />
      )}

      {/* Roster View (auction started) */}
      {auctionActive && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Teams", value: teams.length, icon: Shield, color: "text-pitch-500" },
              {
                label: "Players Sold",
                value: (purchases as PurchaseRow[] ?? []).length,
                icon: Users,
                color: "text-blue-500",
              },
              {
                label: "Total Budget",
                value: formatAmount(teams.reduce((s, t) => s + t.budget, 0)),
                icon: Wallet,
                color: "text-amber-500",
                isText: true,
              },
              {
                label: "Total Spent",
                value: formatAmount(
                  (purchases as PurchaseRow[] ?? []).reduce((s, p) => s + p.purchase_amount, 0)
                ),
                icon: Trophy,
                color: "text-gold-500",
                isText: true,
              },
            ].map(({ label, value, icon: Icon, color, isText }) => (
              <div key={label} className="glass-card glass-card-hover p-5 rounded-2xl">
                <Icon className={`h-5 w-5 ${color}`} />
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                <p className={`mt-1 font-black text-slate-900 dark:text-white ${isText ? "text-base" : "text-2xl"}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Team roster cards */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const players = teamPlayersMap.get(team.id) ?? [];
              const spent = team.budget - team.remaining_budget;
              const spentPct = team.budget > 0 ? Math.round((spent / team.budget) * 100) : 0;

              return (
                <div key={team.id} className="glass-card rounded-2xl overflow-hidden">
                  {/* Team header */}
                  <div className="bg-gradient-to-r from-pitch-500/10 to-transparent border-b border-slate-200/50 dark:border-white/5 p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {team.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-pitch-600 dark:text-pitch-400">
                          {team.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 dark:text-white truncate">{team.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {players.length} players · {formatAmount(spent)} spent
                      </p>
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div className="px-5 pt-3 pb-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                      <span>Spent: {formatAmount(spent)}</span>
                      <span>Remaining: {formatAmount(team.remaining_budget)}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200/60 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pitch-500 to-emerald-400 transition-all"
                        style={{ width: `${spentPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Player list */}
                  <div className="p-4 pt-2 space-y-2">
                    {players.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-4">No players yet</p>
                    ) : (
                      players.map((player) => {
                        const seed = encodeURIComponent(player.name);
                        const avatarSrc =
                          player.avatarUrl ??
                          `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
                        return (
                          <div
                            key={player.registrationId}
                            className="flex items-center gap-3 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 p-2.5"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatarSrc}
                              alt={player.name}
                              className="h-8 w-8 rounded-lg object-cover bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {player.name}
                              </p>
                              <span
                                className={`inline-flex items-center rounded border px-1.5 py-0 text-[9px] font-bold ${ROLE_COLORS[player.role] ?? ""}`}
                              >
                                {ROLE_LABELS[player.role] ?? player.role}
                              </span>
                            </div>
                            <span className="text-xs font-black text-pitch-600 dark:text-pitch-400 shrink-0">
                              {formatAmount(player.purchaseAmount)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Non-creator, pre-auction */}
      {!isCreator && !auctionActive && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Shield className="h-10 w-10 mx-auto text-slate-300 dark:text-white/10 mb-3" />
          <h3 className="font-black text-slate-900 dark:text-white">Teams Not Revealed Yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Teams will be visible once the auction begins.
          </p>
        </div>
      )}
    </div>
  );
}
