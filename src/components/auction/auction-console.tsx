"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  Undo,
  Trash2,
} from "lucide-react";
import {
  sellPlayerAction,
  skipPlayerAction,
  returnPlayerAction,
  completeAuctionAction,
  undoLastAuctionAction,
  resetAuctionAction,
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

const ROLE_ORDER: Record<AuctionPlayer["role"], number> = {
  batsman: 1,
  bowler: 2,
  all_rounder: 3,
  wicket_keeper: 4,
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [fromSkipped, setFromSkipped] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "name" | "role" | "newest">("default");
  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingPlayer, setShufflingPlayer] = useState<AuctionPlayer | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"available" | "skipped" | "sold">("available");

  // ─── Player Pool Logic ───────────────────────────────────────────────────
  const soldPlayers = players.filter((p) => p.purchaseStatus === "sold");
  const skippedPlayers = players.filter((p) => p.purchaseStatus === "skipped");
  const primaryPool = players.filter((p) => p.purchaseStatus === null);
  const totalPlayers = players.length;
  const soldCount = soldPlayers.length;
  const skippedCount = skippedPlayers.length;
  const availableCount = primaryPool.length;
  const progress = totalPlayers > 0 ? Math.round((soldCount / totalPlayers) * 100) : 0;
  const allProcessed = primaryPool.length === 0 && skippedPlayers.length === 0;

  const activePool =
    sidebarTab === "available"
      ? primaryPool
      : sidebarTab === "skipped"
      ? skippedPlayers
      : soldPlayers;

  // Auto-switch to skipped/unsold tab if available pool is empty and skipped is not empty
  useEffect(() => {
    if (primaryPool.length === 0 && skippedPlayers.length > 0 && sidebarTab === "available") {
      setSidebarTab("skipped");
    }
  }, [primaryPool.length, skippedPlayers.length, sidebarTab]);

  const handlePlayerSelect = useCallback((player: AuctionPlayer, fromUnsold: boolean) => {
    setSelectedPlayer(player);
    setBidAmount("");
    setSelectedTeamId("");
    setActionMsg(null);
    setFromSkipped(fromUnsold);
  }, []);

  // ─── Random Pick ────────────────────────────────────────────────────────
  const pickRandom = useCallback(() => {
    const pool = primaryPool.length > 0 ? primaryPool : skippedPlayers;
    if (pool.length === 0) return;

    setIsShuffling(true);
    setBidAmount("");
    setSelectedTeamId("");
    setActionMsg(null);

    let count = 0;
    const maxTicks = 15;
    const baseDelay = 80;

    const tick = () => {
      const idx = Math.floor(Math.random() * pool.length);
      setShufflingPlayer(pool[idx]);

      count++;
      if (count < maxTicks) {
        const delay = baseDelay + Math.pow(count, 1.8) * 4;
        setTimeout(tick, delay);
      } else {
        const finalIdx = Math.floor(Math.random() * pool.length);
        const finalPlayer = pool[finalIdx];

        setIsShuffling(false);
        setShufflingPlayer(null);
        const isFromSkipped = primaryPool.length === 0;
        setFromSkipped(isFromSkipped);
        if (isFromSkipped) {
          setSidebarTab("skipped");
        }
        setSelectedPlayer(finalPlayer);
      }
    };

    setTimeout(tick, baseDelay);
  }, [primaryPool, skippedPlayers, setSidebarTab]);

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

  function handleUndo() {
    startTransition(async () => {
      const result = await undoLastAuctionAction(tournamentId);
      setActionMsg(
        result.status !== "idle"
          ? { type: result.status, text: result.message }
          : null
      );
      if (result.status === "success") {
        setSelectedPlayer(null);
        router.refresh();
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetAuctionAction(tournamentId);
      setActionMsg(
        result.status !== "idle"
          ? { type: result.status, text: result.message }
          : null
      );
      if (result.status === "success") {
        setShowResetConfirm(false);
        setSelectedPlayer(null);
        router.refresh();
      }
    });
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const bidAmountNum = parseInt(bidAmount.replace(/[^0-9]/g, ""), 10);
  const isOverBudget =
    selectedTeam && !isNaN(bidAmountNum) && bidAmountNum > selectedTeam.remainingBudget;

  const renderPlayerList = () => {
    const sortedPool = [...activePool].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "role") {
        const orderA = ROLE_ORDER[a.role];
        const orderB = ROLE_ORDER[b.role];
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "newest") {
        return new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime();
      }
      return 0;
    });

    if (sortedPool.length === 0) {
      const emptyMessages = {
        available: "All players processed!",
        skipped: "No skipped players.",
        sold: "No players sold yet.",
      };
      return (
        <div className="glass-card rounded-xl p-4 text-center border border-dashed border-slate-300 dark:border-white/10">
          <p className="text-xs text-slate-500">{emptyMessages[sidebarTab]}</p>
        </div>
      );
    }

    const renderPlayerButton = (player: AuctionPlayer) => {
      const isUnsoldTab = sidebarTab === "skipped";
      const isSelected = selectedPlayer?.registrationId === player.registrationId;
      return (
        <button
          key={player.registrationId}
          onClick={() => handlePlayerSelect(player, isUnsoldTab)}
          disabled={!isCreator || isCompleted || isPending}
          className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition border ${
            isSelected
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
      );
    };

    const renderSoldPlayerCard = (player: AuctionPlayer) => {
      const team = teams.find((t) => t.id === player.purchaseTeamId);
      return (
        <div key={player.registrationId} className="flex items-center gap-3 rounded-xl p-3 bg-pitch-500/5 border border-pitch-500/10">
          <PlayerAvatar name={player.name} avatarUrl={player.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{player.name}</p>
            <p className="text-[10px] text-pitch-600 dark:text-pitch-400 font-bold mt-0.5">
              {team?.name} · {formatAmount(player.purchaseAmount)}
            </p>
          </div>
          {isCreator && !isCompleted && (
            <button
              onClick={(e) => { e.stopPropagation(); handleReturn(player.registrationId); }}
              disabled={isPending}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition shrink-0 bg-white/50 dark:bg-white/[0.02]"
              title="Return to pool"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    };

    const renderItem = (player: AuctionPlayer) => {
      if (sidebarTab === "sold") {
        return renderSoldPlayerCard(player);
      }
      return renderPlayerButton(player);
    };

    if (sortBy === "role") {
      return (
        <div className="space-y-4">
          {(["batsman", "bowler", "all_rounder", "wicket_keeper"] as const).map((role) => {
            const rolePlayers = sortedPool.filter((p) => p.role === role);
            if (rolePlayers.length === 0) return null;
            return (
              <div key={role} className="space-y-1.5 pb-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 pt-1.5 flex items-center justify-between">
                  <span>{role === "batsman" ? "Batsmen" : role === "bowler" ? "Bowlers" : role === "all_rounder" ? "All-Rounders" : "Wicket Keepers"}</span>
                  <span className="bg-slate-200/60 dark:bg-white/5 px-1.5 py-0.5 rounded-md text-[9px]">
                    {rolePlayers.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {rolePlayers.map((player) => renderItem(player))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {sortedPool.map((player) => renderItem(player))}
      </div>
    );
  };

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

        {isCreator && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isCompleted && (
              <>
                <button
                  onClick={handleUndo}
                  disabled={isPending || history.length === 0}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 px-4 text-xs font-bold transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Undo the last auction action"
                >
                  <Undo className="h-4 w-4" />
                  Undo Last
                </button>
                <button
                  onClick={() => setShowCompleteConfirm(true)}
                  disabled={isPending}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 px-4 text-xs font-bold transition shrink-0"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Auction
                </button>
              </>
            )}
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-4 text-xs font-bold transition shrink-0"
              title="Reset the entire auction"
            >
              <Trash2 className="h-4 w-4" />
              Reset Auction
            </button>
          </div>
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

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="glass-card rounded-2xl p-5 border border-red-500/20 bg-red-500/5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">Reset Auction</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                This will delete ALL player purchases and skipped records in the database. The tournament status will be set back to Locked, allowing you to edit teams or start the auction fresh. This action cannot be undone. Are you sure?
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white px-4 text-xs font-black transition disabled:opacity-50"
            >
              {isPending ? "Resetting..." : "Yes, Reset Auction"}
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
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
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Player Pool
            </h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-[10px] font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-pitch-500 transition cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="name">Name (A-Z)</option>
              <option value="role">Role</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-[10px] font-bold">
            <button
              onClick={() => setSidebarTab("available")}
              className={`py-1.5 rounded-lg text-center transition-all ${
                sidebarTab === "available"
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Pool ({availableCount})
            </button>
            <button
              onClick={() => setSidebarTab("skipped")}
              className={`py-1.5 rounded-lg text-center transition-all ${
                sidebarTab === "skipped"
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Unsold ({skippedCount})
            </button>
            <button
              onClick={() => setSidebarTab("sold")}
              className={`py-1.5 rounded-lg text-center transition-all ${
                sidebarTab === "sold"
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Sold ({soldCount})
            </button>
          </div>

          {/* Skipped players re-enter label */}
          {fromSkipped && primaryPool.length === 0 && skippedPlayers.length > 0 && sidebarTab === "skipped" && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <SkipForward className="h-3 w-3" />
              Drawing from skipped players
            </div>
          )}

          <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto pr-1 scrollbar-thin">
            {renderPlayerList()}
          </div>
        </div>

        {/* Center: Bidding Console */}
        <div className="space-y-4">
          {/* Pick Random Button */}
          {isCreator && !isCompleted && (
            <button
              onClick={pickRandom}
              disabled={isPending || allProcessed}
              className="w-full inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 font-black text-base shadow-lg shadow-pitch-500/20 transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Shuffle className="h-5 w-5" />
              {allProcessed ? "All Players Processed" : "Pick Random Player"}
            </button>
          )}

          {/* Selected Player / Shuffling Card */}
          {isShuffling && shufflingPlayer ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card rounded-2xl overflow-hidden border-2 border-pitch-500/40 bg-[#040806] shadow-[0_0_50px_rgba(16,185,129,0.2)] p-8 text-center relative min-h-[350px] flex flex-col items-center justify-center"
            >
              {/* Scanning laser line */}
              <motion.div
                animate={{ y: [-100, 100, -100] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pitch-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.8)] pointer-events-none"
              />

              {/* Hologram loading rings */}
              <div className="absolute w-48 h-48 border border-dashed border-pitch-500/20 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute w-40 h-40 border border-pitch-500/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />

              <div className="relative z-10 space-y-6">
                <motion.div
                  key={shufflingPlayer.registrationId}
                  initial={{ scale: 0.8, opacity: 0.5, filter: "blur(4px)" }}
                  animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                  className="flex flex-col items-center"
                >
                  <PlayerAvatar name={shufflingPlayer.name} avatarUrl={shufflingPlayer.avatarUrl} size="lg" />
                  <p className="text-2xl font-black text-white mt-4 tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {shufflingPlayer.name}
                  </p>
                  <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${ROLE_COLORS[shufflingPlayer.role]}`}>
                    {ROLE_LABELS[shufflingPlayer.role]}
                  </span>
                </motion.div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-pitch-400 text-xs font-black uppercase tracking-[0.2em] animate-pulse">
                    <Zap className="h-4 w-4 text-pitch-400 animate-spin" />
                    <span>Analyzing Pool...</span>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                     IPL-STYLE SHUFFLE IN PROGRESS
                  </p>
                </div>
              </div>
            </motion.div>
          ) : selectedPlayer ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, rotateY: -30 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="glass-card rounded-2xl overflow-hidden border border-pitch-500/20 shadow-[0_0_40px_rgba(16,185,129,0.08)] relative"
            >
              {/* Reveal spark flash */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 3.5], opacity: [0.8, 0] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-[80px] left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-pitch-400/25 blur-md pointer-events-none z-0"
              />

              {/* Gradient header */}
              <div className="bg-gradient-to-br from-pitch-600 via-pitch-700 to-pitch-900 dark:from-pitch-800 dark:via-pitch-900 dark:to-black p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.3)_0%,transparent_70%)]" />
                <div className="relative flex items-center gap-5 z-10">
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
            </motion.div>
          ) : (
            <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-white/10">
              <UserCircle className="h-12 w-12 mx-auto text-slate-300 dark:text-white/10 mb-3" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {isCreator ? "Pick a player to begin bidding" : "Waiting for next player..."}
              </p>
              {isCreator && !isCompleted && !allProcessed && (
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
