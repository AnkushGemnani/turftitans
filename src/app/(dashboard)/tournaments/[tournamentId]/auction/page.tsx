import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  AuctionConsole,
  type AuctionPlayer,
  type AuctionTeam,
  type AuctionHistoryEntry,
} from "@/components/auction/auction-console";

type AuctionPageProps = {
  params: Promise<{ tournamentId: string }>;
};

export default async function AuctionPage({ params }: AuctionPageProps) {
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
  const isAuction = tournament.status === "auction";
  const isCompleted = tournament.status === "completed";
  const auctionActive = isAuction || isCompleted;

  // If not creator, check if user has an approved registration
  if (!isCreator) {
    const { data: myReg } = await supabase
      .from("registrations")
      .select("status")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myReg || myReg.status !== "approved") {
      redirect(`/tournaments/${tournamentId}?error=Only approved players can view the auction.`);
    }
  }

  // Show gate screen if auction not started
  if (!auctionActive) {
    const canSetupTeams =
      isCreator && (tournament.status === "open" || tournament.status === "locked");
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto">
          <Lock className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Auction Not Started</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {isCreator
              ? "Set up your teams and lock the tournament to start the auction."
              : "The auction hasn't started yet. Check back later."}
          </p>
        </div>
        {canSetupTeams && (
          <Link
            href={`/tournaments/${tournamentId}/teams`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 px-6 text-sm font-black shadow-md shadow-pitch-500/20 transition active:scale-98"
          >
            Set Up Teams →
          </Link>
        )}
        <Link
          href={`/tournaments/${tournamentId}`}
          className="block text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          ← Back to tournament
        </Link>
      </div>
    );
  }

  // Fetch all data using admin client (bypass RLS for reading all player/team data)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fetch approved players with their auction purchase status
  const { data: registrations } = await adminClient
    .from("registrations")
    .select(`
      id,
      role,
      created_at,
      profiles ( full_name, avatar_url ),
      auction_purchases (
        id,
        status,
        purchase_amount,
        team_id
      )
    `)
    .eq("tournament_id", tournamentId)
    .eq("status", "approved")
    .order("created_at");

  // Fetch teams
  const { data: rawTeams } = await adminClient
    .from("teams")
    .select("id, name, logo_path, budget, remaining_budget")
    .eq("tournament_id", tournamentId)
    .order("name");

  // Fetch history: all auction_purchases ordered by created_at desc
  const { data: rawHistory } = await adminClient
    .from("auction_purchases")
    .select(`
      id,
      status,
      purchase_amount,
      created_at,
      registration_id,
      team_id,
      registrations ( profiles ( full_name ) ),
      teams ( name )
    `)
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false })
    .limit(50);

  // ─── Shape data for client component ─────────────────────────────────────

  type RegRow = {
    id: string;
    role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
    created_at: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
    auction_purchases:
      | Array<{
          id: string;
          status: "sold" | "returned" | "skipped";
          purchase_amount: number;
          team_id: string | null;
        }>
      | null;
  };

  const players: AuctionPlayer[] = ((registrations as unknown as RegRow[]) ?? []).map((r) => {
    const purchase = r.auction_purchases?.[0] ?? null;
    return {
      registrationId: r.id,
      name: r.profiles?.full_name ?? "Unknown",
      role: r.role,
      avatarUrl: r.profiles?.avatar_url ?? null,
      purchaseStatus: purchase ? (purchase.status === "returned" ? null : purchase.status) : null,
      purchaseAmount: purchase?.purchase_amount ?? 0,
      purchaseTeamId: purchase?.team_id ?? null,
      registeredAt: r.created_at,
    };
  });

  const teams: AuctionTeam[] = (rawTeams ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    logoUrl: t.logo_path
      ? supabase.storage.from("team-logos").getPublicUrl(t.logo_path).data.publicUrl
      : null,
    budget: t.budget,
    remainingBudget: t.remaining_budget,
    playerCount: players.filter((p) => p.purchaseTeamId === t.id && p.purchaseStatus === "sold").length,
  }));

  type HistRow = {
    id: string;
    status: "sold" | "skipped";
    purchase_amount: number;
    created_at: string;
    registration_id: string;
    team_id: string | null;
    registrations: { profiles: { full_name: string } | null } | null;
    teams: { name: string } | null;
  };

  const history: AuctionHistoryEntry[] = ((rawHistory as unknown as HistRow[]) ?? [])
    .filter((h) => h.status === "sold" || h.status === "skipped")
    .map((h) => ({
      id: h.id,
      playerName: h.registrations?.profiles?.full_name ?? "Unknown",
      teamName: h.teams?.name ?? null,
      purchaseAmount: h.purchase_amount,
      status: h.status,
      createdAt: h.created_at,
    }));

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to tournament
        </Link>
        <Link
          href={`/tournaments/${tournamentId}/teams`}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300 px-4 text-xs font-bold transition"
        >
          <Gavel className="h-3.5 w-3.5" />
          View Rosters
        </Link>
      </div>

      <AuctionConsole
        tournamentId={tournamentId}
        tournamentName={tournament.name}
        isCreator={isCreator}
        isCompleted={isCompleted}
        players={players}
        teams={teams}
        history={history}
      />
    </div>
  );
}
