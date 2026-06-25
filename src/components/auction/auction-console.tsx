"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shuffle,
  Hammer,
  SkipForward,
  RotateCcw,
  Trophy,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  Crown,
  UserCircle,
} from "lucide-react";
import {
  sellPlayerAction,
  skipPlayerAction,
  returnPlayerAction,
  completeAuctionAction,
} from "@/app/(dashboard)/tournaments/[tournamentId]/auction/auction-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuctionPlayer = {
  registrationId: string;
  name: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  avatarUrl: string | null;
  purchaseStatus: "sold" | "skipped" | null;
  purchaseAmount: number;
  purchaseTeamId: string | null;
  registeredAt: string;
};

export type AuctionTeam = {
  id: string;
  name: string;
  logoUrl: string | null;
  budget: number;
  remainingBudget: number;
  playerCount: number;
};

export type AuctionHistoryEntry = {
  id: string;
  playerName: string;
  teamName: string | null;
  purchaseAmount: number;
  status: "sold" | "skipped";
  createdAt: string;
};

type AuctionConsoleProps = {
  tournamentId: string;
  tournamentName: string;
  isCreator: boolean;
  isCompleted: boolean;
  players: AuctionPlayer[];
  teams: AuctionTeam[];
  history: AuctionHistoryEntry[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number) {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatRelativeTime(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const ROLE_LABELS: Record<AuctionPlayer["role"], string> = {
  batsman: "Batsman",
  bowler: "Bowler",
  all_rounder: "All-Rounder",
  wicket_keeper: "Wicket Keeper",
};

const ROLE_COLORS: Record<AuctionPlayer["role"], string> = {
  batsman: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  bowler: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  all_rounder: "text-pitch-600 dark:text-pitch-400 bg-pitch-500/10 border-pitch-500/20",
  wicket_keeper: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-12 w-12 text-sm";
  const seed = encodeURIComponent(name);
  const src = avatarUrl ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={`${sizeClass} rounded-xl object-cover bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0`}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuctionConsole({
  tournamentId,
  tournamentName,
  isCreator,
  isCompleted,
  players,
  teams,
  history,
}: AuctionConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlayer, setSelectedPlayer] = useState<AuctionPlayer | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [fromSkipped, setFromSkipped] = useState(false);

  // ─── Player Pool Logic ───────────────────────────────────────────────────
  const soldPlayers = players.filter((p) => p.purchaseStatus === "sold");
  const skippedPlayers = players.filter((p) => p.purchaseStatus === "skipped");
  const primaryPool = players.filter((p) => p.purchaseStatus === null);
  const availablePool = primaryPool.length > 0 ? primaryPool : skippedPlayers;
  const totalPlayers = players.length;
  const soldCount = soldPlayers.length;
  const skippedCount = skippedPlayers.length;
  const availableCount = primaryPool.length;
  const progress = totalPlayers > 0 ? Math.round((soldCount / totalPlayers) * 100) : 0;
  const allProcessed = primaryPool.length === 0 && skippedPlayers.length === 0;

  // ─── Random Pick ────────────────────────────────────────────────────────
  const pickRandom = useCallback(() => {
    const pool = primaryPool.length > 0 ? primaryPool : skippedPlayers;
    if (pool.length === 0) return;
    const idx = Math.floor(Math.random() * pool.length);
    setFromSkipped(primaryPool.length === 0);
    setSelectedPlayer(pool[idx]);
    setBidAmount("");
    setSelectedTeamId("");
    setActionMsg(null);
  }, [primaryPool, skippedPlayers]);

  // Auto-clear actionMsg after 4s
  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(null), 4000);
    return () => clearTimeout(t);
  }, [actionMsg]);

  // Sync selectedPlayer after refresh (in case it was just sold/returned)
  useEffect(() => {
    if (!selectedPlayer) return;
    const updated = players.find((p) => p.registrationId === selectedPlayer.registrationId);
    if (!updated || updated.purchaseStatus === "sold") {
      setSelectedPlayer(null);
    }
  }, [players, selectedPlayer]);

  // ─── Actions ─────────────────────────────────────────────────────────────
  function handleSell() {
    if (!selectedPlayer || !selectedTeamId || bidAmount === "") return;
    const amount = parseInt(bidAmount.replace(/[^0-9]/g, ""), 10);
    if (isNaN(amount) || amount < 0) {
      setActionMsg({ type: "error", text: "Enter a valid bid amount." });
      return;
    }
    startTransition(async () => {
      const result = await sellPlayerAction(tournamentId, selectedPlayer.registrationId, selectedTeamId, amount);
      if (result.status === "success") {
        setSelectedPlayer(null);
        setBidAmount("");
        setSelectedTeamId("");
        router.refresh();
      }
      setActionMsg(
        result.status !== "idle"
          ? { type: result.status, text: result.message }
          : null
      );
    });
  }

  function handleSkip() {
    if (!selectedPlayer) return;
    startTransition(async () => {
      const result = await skipPlayerAction(tournamentId, selectedPlayer.registrationId);
      if (result.status === "success") {
        setSelectedPlayer(null);
        router.refresh();
      }
      setActionMsg(
        result.status !== "idle"
          ? { type: result.status, text: result.message }
          : null
      );
    });
  }

  function handleReturn(registrationId: string) {
    startTransition(async () => {
      const result = await returnPlayerAction(tournamentId, registrationId);
      if (result.status === "success") {
        if (selectedPlayer?.registrationId === registrationId) setSelectedPlayer(null);
        router.refresh();
      }
      setActionMsg(
        result.status !== "idle"
          ? { type: result.status, text: result.message }
          : null
      );
    });
  }

  function handleComplete() {
    startTransition(async () => {
      const result = await completeAuctionAction(tournamentId);
      setActionMsg(
        result.status !== "idle"
          ? { type: result.status, text: result.message }
          : null
      );
      if (result.status === "success") {
        setShowCompleteConfirm(false);
        router.refresh();
      }
    });
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const bidAmountNum = parseInt(bidAmount.replace(/[^0-9]/g, ""), 10);
  const isOverBudget =
    selectedTeam && !isNaN(bidAmountNum) && bidAmountNum > selectedTeam.remainingBudget;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
              isCompleted
                ? "border-slate-400/20 bg-slate-400/10 text-slate-500"
                : "border-red-500/30 bg-red-500/10 text-red-500 animate-pulse"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isCompleted ? "bg-slate-400" : "bg-red-500"}`} />
              {isCompleted ? "COMPLETED" : "LIVE"}
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">{tournamentName} — Auction</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-0.5">
            {soldCount}/{totalPlayers} players sold · {skippedCount} skipped
          </p>
        </div>

        {isCreator && !isCompleted && (
          <button
            onClick={() => setShowCompleteConfirm(true)}
            disabled={isPending}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 px-4 text-xs font-bold transition shrink-0"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete Auction
          </button>
        )}
      </div>

      {/* Complete Confirm Modal */}
      {showCompleteConfirm && (
        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">Confirm Auction Completion</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                This will lock all rosters. No further purchases will be possible. Are you sure?
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-pitch-500 hover:bg-pitch-400 text-pitch-950 px-4 text-xs font-black transition disabled:opacity-50"
            >
              {isPending ? "Completing..." : "Yes, Complete Auction"}
            </button>
            <button
              onClick={() => setShowCompleteConfirm(false)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Global action message */}
      {actionMsg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
          actionMsg.type === "success"
            ? "bg-pitch-500/10 border border-pitch-500/20 text-pitch-600 dark:text-pitch-400"
            : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
        }`}>
          {actionMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {actionMsg.text}
        </div>
      )}

      {/* ─── Progress Bar ─── */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3 text-xs font-bold">
          <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Auction Progress</span>
          <span className="text-pitch-600 dark:text-pitch-400">{progress}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-200/60 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pitch-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: "Available", value: availableCount, icon: Users, color: "text-blue-500" },
            { label: "Sold", value: soldCount, icon: CheckCircle2, color: "text-pitch-500" },
            { label: "Skipped", value: skippedCount, icon: SkipForward, color: "text-amber-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <Icon className={`h-4 w-4 mx-auto ${color}`} />
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Main 3-column layout ─── */}
      <div className="grid gap-6 xl:grid-cols-[280px_1fr_300px]">

        {/* Left: Player Pool */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Player Pool
          </h3>

          {availablePool.length === 0 && !allProcessed && (
            <div className="glass-card rounded-xl p-4 text-center border border-dashed border-slate-300 dark:border-white/10">
              <p className="text-xs text-slate-500">All players processed!</p>
            </div>
          )}

          {/* Skipped players re-enter label */}
          {fromSkipped && primaryPool.length === 0 && skippedPlayers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <SkipForward className="h-3 w-3" />
              Drawing from skipped players
            </div>
          )}

          <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1 scrollbar-thin">
            {availablePool.map((player) => (
              <button
                key={player.registrationId}
                onClick={() => {
                  setSelectedPlayer(player);
                  setBidAmount("");
                  setSelectedTeamId("");
                  setActionMsg(null);
                }}
                disabled={!isCreator || isCompleted || isPending}
                className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition border ${
                  selectedPlayer?.registrationId === player.registrationId
                    ? "border-pitch-500/40 bg-pitch-500/10"
                    : "border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] hover:border-pitch-400/30 hover:bg-pitch-500/5"
                } disabled:cursor-default`}
              >
                <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{player.name}</p>
                  <span className={`mt-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${ROLE_COLORS[player.role]}`}>
                    {ROLE_LABELS[player.role]}
                  </span>
                </div>
              </button>
            ))}

            {/* Sold players (collapsed) */}
            {soldPlayers.length > 0 && (
              <div className="pt-2 border-t border-slate-200/50 dark:border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Sold ({soldCount})</p>
                <div className="space-y-1.5">
                  {soldPlayers.map((player) => {
                    const team = teams.find((t) => t.id === player.purchaseTeamId);
                    return (
                      <div key={player.registrationId} className="flex items-center gap-2 rounded-lg p-2 bg-pitch-500/5 border border-pitch-500/10">
                        <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{player.name}</p>
                          <p className="text-[9px] text-pitch-600 dark:text-pitch-400">{team?.name} · {formatAmount(player.purchaseAmount)}</p>
                        </div>
                        {isCreator && !isCompleted && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleReturn(player.registrationId); }}
                            disabled={isPending}
                            className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition shrink-0"
                            title="Return to pool"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Bidding Console */}
        <div className="space-y-4">
          {/* Pick Random Button */}
          {isCreator && !isCompleted && (
            <button
              onClick={pickRandom}
              disabled={isPending || availablePool.length === 0}
              className="w-full inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 font-black text-base shadow-lg shadow-pitch-500/20 transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Shuffle className="h-5 w-5" />
              {availablePool.length === 0 ? "All Players Processed" : "Pick Random Player"}
            </button>
          )}

          {/* Selected Player Card */}
          {selectedPlayer ? (
            <div className="glass-card rounded-2xl overflow-hidden border border-pitch-500/20 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
              {/* Gradient header */}
              <div className="bg-gradient-to-br from-pitch-600 via-pitch-700 to-pitch-900 dark:from-pitch-800 dark:via-pitch-900 dark:to-black p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.3)_0%,transparent_70%)]" />
                <div className="relative flex items-center gap-5">
                  <div className="relative">
                    <PlayerAvatar name={selectedPlayer.name} avatarUrl={selectedPlayer.avatarUrl} size="lg" />
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
                      <Crown className="h-2.5 w-2.5 text-amber-900" />
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white leading-tight">{selectedPlayer.name}</p>
                    <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${ROLE_COLORS[selectedPlayer.role]}`}>
                      {ROLE_LABELS[selectedPlayer.role]}
                    </span>
                    {fromSkipped && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        Skipped
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bid Controls */}
              {isCreator && !isCompleted ? (
                <div className="p-5 space-y-4">
                  {/* Team Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Assign to Team
                    </label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-pitch-500 dark:focus:border-pitch-400 transition"
                    >
                      <option value="">Select a team...</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name} — {formatAmount(team.remainingBudget)} left
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bid Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Bid Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="e.g. 2000000"
                        className={`w-full rounded-xl border ${
                          isOverBudget
                            ? "border-red-500 bg-red-500/5"
                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]"
                        } pl-8 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-pitch-500 dark:focus:border-pitch-400 transition`}
                      />
                    </div>
                    {/* Budget display */}
                    {selectedTeam && (
                      <div className="mt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Team remaining budget:</span>
                        <span className={`font-black ${isOverBudget ? "text-red-500" : "text-pitch-500"}`}>
                          {formatAmount(selectedTeam.remainingBudget)}
                        </span>
                      </div>
                    )}
                    {isOverBudget && (
                      <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Exceeds team budget!
                      </p>
                    )}
                    {/* Quick amount buttons */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[100000, 500000, 1000000, 2000000, 5000000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setBidAmount(String(amt))}
                          className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition"
                        >
                          {formatAmount(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={handleSell}
                      disabled={isPending || !selectedTeamId || bidAmount === "" || !!isOverBudget}
                      className="col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 font-black text-sm shadow-md shadow-pitch-500/20 transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Hammer className="h-4 w-4" />
                      {isPending ? "Selling..." : "Sell Player"}
                    </button>
                    <button
                      onClick={handleSkip}
                      disabled={isPending}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs transition active:scale-98 disabled:opacity-40"
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedPlayer(null)}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition py-1"
                  >
                    Deselect player
                  </button>
                </div>
              ) : (
                <div className="p-5 text-center text-sm text-slate-500 dark:text-slate-400">
                  {isCompleted ? "Auction is completed. Rosters are locked." : "Viewing mode only."}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-white/10">
              <UserCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-white/10 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {isCreator ? "Pick a player to begin bidding" : "Waiting for next player..."}
              </p>
              {isCreator && !isCompleted && availablePool.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">Click &quot;Pick Random Player&quot; above</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Teams Panel */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Teams &amp; Budgets
          </h3>
          <div className="space-y-3">
            {teams.map((team) => {
              const spent = team.budget - team.remainingBudget;
              const spentPct = team.budget > 0 ? Math.round((spent / team.budget) * 100) : 0;
              const teamPlayers = soldPlayers.filter((p) => p.purchaseTeamId === team.id);

              return (
                <div
                  key={team.id}
                  className={`glass-card rounded-xl p-4 border transition ${
                    selectedTeamId === team.id
                      ? "border-pitch-500/40 bg-pitch-500/5"
                      : "border-slate-200/50 dark:border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-pitch-500/10 to-emerald-400/10 border border-pitch-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {team.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logoUrl} alt={team.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-pitch-600 dark:text-pitch-400">
                          {team.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-slate-900 dark:text-white truncate">{team.name}</p>
                      <p className="text-[10px] text-slate-400">{team.playerCount} players</p>
                    </div>
                  </div>

                  {/* Budget bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Spent: {formatAmount(spent)}</span>
                      <span className="text-pitch-600 dark:text-pitch-400">Left: {formatAmount(team.remainingBudget)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200/60 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pitch-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${spentPct}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 text-right">Budget: {formatAmount(team.budget)}</p>
                  </div>

                  {/* Player chips */}
                  {teamPlayers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {teamPlayers.slice(0, 5).map((p) => (
                        <span key={p.registrationId} className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                          {p.name.split(" ")[0]}
                        </span>
                      ))}
                      {teamPlayers.length > 5 && (
                        <span className="rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">
                          +{teamPlayers.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Auction History ─── */}
      {history.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Auction History
          </h3>
          <div className="space-y-2">
            {history.slice(0, 20).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 text-sm">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                  entry.status === "sold"
                    ? "bg-pitch-500/10 text-pitch-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}>
                  {entry.status === "sold" ? (
                    <Trophy className="h-3.5 w-3.5" />
                  ) : (
                    <SkipForward className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {entry.playerName}
                    {entry.status === "sold" && entry.teamName && (
                      <span className="font-normal text-slate-500"> → {entry.teamName}</span>
                    )}
                    {entry.status === "skipped" && (
                      <span className="font-normal text-amber-500"> skipped</span>
                    )}
                  </p>
                  {entry.status === "sold" && (
                    <p className="text-[10px] text-pitch-600 dark:text-pitch-400 font-bold">
                      {formatAmount(entry.purchaseAmount)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(entry.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All processed state */}
      {allProcessed && !isCompleted && isCreator && (
        <div className="glass-card rounded-2xl p-8 text-center border border-pitch-500/20 bg-pitch-500/5">
          <TrendingUp className="h-10 w-10 mx-auto text-pitch-500 mb-3" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white">All Players Processed!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            {soldCount} players sold across {teams.length} teams. Ready to lock the rosters?
          </p>
          <button
            onClick={() => setShowCompleteConfirm(true)}
            disabled={isPending}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 px-6 text-sm font-black shadow-md shadow-pitch-500/20 transition active:scale-98 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" />
            Complete Auction
          </button>
        </div>
      )}
    </div>
  );
}
