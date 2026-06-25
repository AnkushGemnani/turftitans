import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Shield, 
  MapPin, 
  CalendarDays, 
  Wallet,
  Clock
} from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/tournaments/format";
import type { Database } from "@/types/database";

type PublicSummaryPageProps = {
  params: Promise<{ tournamentId: string }>;
};

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

// Helper to create an admin client that bypasses RLS
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration env variables for admin operation.");
  }
  return createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function PublicSummaryPage({ params }: PublicSummaryPageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use admin client to query all data to bypass RLS for non-members
  const adminClient = getAdminClient();

  // 1. Fetch tournament details
  const { data: tournament, error: tourneyError } = await adminClient
    .from("tournaments")
    .select("*, profiles(full_name)")
    .eq("id", tournamentId)
    .single();

  if (tourneyError || !tournament) {
    notFound();
  }

  // 2. Fetch teams
  const { data: teamsData } = await adminClient
    .from("teams")
    .select("id, name, budget, remaining_budget, logo_path")
    .eq("tournament_id", tournamentId);

  const teams = teamsData || [];

  // 3. Fetch auction purchases
  const { data: auctionPurchasesData } = await adminClient
    .from("auction_purchases")
    .select(`
      id,
      purchase_amount,
      created_at,
      status,
      registrations(
        role,
        profiles(
          full_name,
          avatar_url
        )
      ),
      teams(
        id,
        name
      )
    `)
    .eq("tournament_id", tournamentId)
    .eq("status", "sold")
    .order("created_at", { ascending: false });

  const auctionPurchases = (auctionPurchasesData || []).map((ap: any) => ({
    id: ap.id,
    purchase_amount: ap.purchase_amount,
    created_at: ap.created_at,
    role: ap.registrations?.role || "batsman",
    playerName: ap.registrations?.profiles?.full_name || "Unknown Player",
    avatarUrl: ap.registrations?.profiles?.avatar_url,
    teamId: ap.teams?.id,
    teamName: ap.teams?.name || "Unassigned",
  }));

  // 4. Fetch approved registrations (players list)
  const { data: registrationsData } = await adminClient
    .from("registrations")
    .select(`
      id,
      role,
      profiles(
        full_name,
        avatar_url
      )
    `)
    .eq("tournament_id", tournamentId)
    .eq("status", "approved");

  const approvedPlayers = (registrationsData || []).map((r: any) => {
    // Check if player is purchased
    const purchase = auctionPurchases.find(ap => ap.playerName === r.profiles?.full_name);
    return {
      id: r.id,
      role: r.role,
      name: r.profiles?.full_name || "Unknown Player",
      avatarUrl: r.profiles?.avatar_url,
      isSold: !!purchase,
      purchaseAmount: purchase?.purchase_amount ?? 0,
      teamName: purchase?.teamName ?? "Unsold",
    };
  });

  const banner = tournament.banner_url ?? tournament.banner_path;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back button */}
      <div>
        <Link
          href={`/tournaments/${tournament.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
          Back to tournament detail
        </Link>
      </div>

      {/* Main Banner Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-white/10 to-transparent dark:from-white/[0.04] dark:to-transparent shadow-sm relative">
        <div className="aspect-[3/1] w-full bg-slate-100 dark:bg-pitch-900 relative">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#e8f5ed,#f8fafc)] dark:bg-[linear-gradient(135deg,#0c2316,#040806)] text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-pitch-500 dark:from-gold-400 dark:to-pitch-400">
              SUMMARY
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/40 to-transparent dark:from-pitch-950 dark:via-pitch-950/40 dark:to-transparent" />
        </div>

        <div className="p-6 relative">
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-pitch-500/30 bg-pitch-500/10 text-pitch-600 dark:text-pitch-400">
            {tournament.status}
          </span>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-2">
            {tournament.name} — Public Summary
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-pitch-600 dark:text-pitch-400" />
              {tournament.location}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-pitch-600 dark:text-pitch-400" />
              {formatDate(tournament.start_date)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Teams & Auction */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Teams and Rosters Column */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-pitch-600 dark:text-pitch-400" />
            Teams &amp; Rosters
          </h2>

          {teams.length === 0 ? (
            <div className="glass-card p-8 text-center text-xs text-slate-400 rounded-xl">
              No teams have been created yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {teams.map(t => {
                const teamRoster = auctionPurchases.filter(ap => ap.teamId === t.id);
                const spent = t.budget - t.remaining_budget;

                return (
                  <div key={t.id} className="glass-card p-5 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-pitch-500/10 flex items-center justify-center font-bold text-pitch-600 dark:text-pitch-400 shrink-0">
                        {t.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-400">{teamRoster.length} players purchased</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-200/50 dark:border-white/5">
                      <div>
                        <span className="text-slate-400">Spent:</span>
                        <p className="font-bold text-slate-700 dark:text-slate-300">{spent.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Remaining:</span>
                        <p className="font-bold text-pitch-600 dark:text-pitch-400">{t.remaining_budget.toLocaleString("en-IN")}</p>
                      </div>
                    </div>

                    {/* Roster Players */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                      <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Roster</p>
                      {teamRoster.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No players purchased</p>
                      ) : (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {teamRoster.map(p => (
                            <div key={p.id} className="flex justify-between items-center text-xs py-0.5">
                              <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{p.playerName}</span>
                              <span className="font-bold text-slate-900 dark:text-white text-[10px]">{p.purchase_amount.toLocaleString("en-IN")} pts</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Auction Results / Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-pitch-600 dark:text-pitch-400" />
            Auction Results
          </h2>

          {auctionPurchases.length === 0 ? (
            <div className="glass-card p-8 text-center text-xs text-slate-400 rounded-xl">
              No players sold yet.
            </div>
          ) : (
            <div className="glass-card p-5 rounded-xl border border-slate-200/60 dark:border-white/5 max-h-[480px] overflow-y-auto space-y-3.5 scrollbar-thin">
              {auctionPurchases.map(p => {
                const seed = encodeURIComponent(p.playerName);
                const avatar = p.avatarUrl ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;

                return (
                  <div key={p.id} className="flex gap-2.5 text-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatar} alt="" className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-white/5 object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{p.playerName}</p>
                      <p className="text-[10px] text-slate-400 truncate">Sold to <span className="font-semibold text-slate-600 dark:text-slate-300">{p.teamName}</span></p>
                      <p className="text-[9px] text-pitch-600 dark:text-pitch-400 font-bold mt-0.5">{p.purchase_amount.toLocaleString("en-IN")} pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Approved Players Pool list */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-pitch-600 dark:text-pitch-400" />
          Approved Players Pool
        </h2>

        {approvedPlayers.length === 0 ? (
          <div className="glass-card p-8 text-center text-xs text-slate-400 rounded-xl">
            No approved players in the pool.
          </div>
        ) : (
          <div className="glass-card p-6 rounded-xl border border-slate-200/60 dark:border-white/5">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-h-[360px] overflow-y-auto pr-1">
              {approvedPlayers.map(p => {
                const seed = encodeURIComponent(p.name);
                const avatar = p.avatarUrl ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;

                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 rounded-xl hover:border-pitch-500/25 transition">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatar} alt="" className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-white/5 object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-950 dark:text-white truncate">{p.name}</p>
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-bold uppercase mt-1 ${ROLE_COLORS[p.role]}`}>
                        {ROLE_LABELS[p.role] || p.role}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      {p.isSold ? (
                        <>
                          <span className="inline-flex rounded-full bg-pitch-500/10 px-2 py-0.5 text-[9px] font-bold text-pitch-600 dark:text-pitch-400 uppercase border border-pitch-500/25">Sold</span>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.teamName}</p>
                        </>
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase border border-blue-500/25">In Pool</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
