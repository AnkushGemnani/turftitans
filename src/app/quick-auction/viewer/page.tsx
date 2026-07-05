"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, Users, Hammer, Clock, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type AuctionPlayer = {
  registrationId: string;
  name: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper" | "unknown";
  avatarUrl: string | null;
  purchaseStatus: "sold" | "skipped" | null;
  purchaseAmount: number;
  purchaseTeamId: string | null;
  registeredAt: string;
};

type AuctionTeam = {
  id: string;
  name: string;
  logoUrl: string | null;
  budget: number;
  remainingBudget: number;
  playerCount: number;
};

type AuctionHistoryEntry = {
  id: string;
  playerName: string;
  teamName: string | null;
  purchaseAmount: number;
  status: "sold" | "skipped";
  createdAt: string;
};

const ROLE_LABELS = {
  batsman: "Batsman",
  bowler: "Bowler",
  all_rounder: "All-Rounder",
  wicket_keeper: "Wicket Keeper",
  unknown: "Unknown",
};

const ROLE_COLORS = {
  batsman: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  bowler: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  all_rounder: "text-pitch-600 dark:text-pitch-400 bg-pitch-500/10 border-pitch-500/20",
  wicket_keeper: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  unknown: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
};

function SpectatorPageContent() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room") || "";

  const [roomCode, setRoomCode] = useState(roomParam);
  const [isJoined, setIsJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Room State
  const [roomName, setRoomName] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [teams, setTeams] = useState<AuctionTeam[]>([]);
  const [players, setPlayers] = useState<AuctionPlayer[]>([]);
  const [history, setHistory] = useState<AuctionHistoryEntry[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<AuctionPlayer | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [commentaries, setCommentaries] = useState<string[]>([]);

  const formatAmount = useCallback((amount: number) => {
    if (currencySymbol === "₹") {
      if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
      if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
      return `₹${amount.toLocaleString("en-IN")}`;
    }
    return `${amount.toLocaleString()} ${currencySymbol}`;
  }, [currencySymbol]);

  useEffect(() => {
    if (isJoined && roomCode) {
      const supabase = createClient();
      const channel = supabase.channel(`quick-auction:${roomCode}`, {
        config: { broadcast: { self: false } },
      });

      setConnecting(true);

      channel
        .on("broadcast", { event: "state_update" }, ({ payload }) => {
          setConnecting(false);
          setErrorMsg("");
          if (payload) {
            setRoomName(payload.roomName || "Quick Standalone Auction");
            setCurrencySymbol(payload.currencySymbol || "₹");
            setTeams(payload.teams || []);
            setPlayers(payload.players || []);
            setHistory(payload.history || []);
            setSelectedPlayer(payload.selectedPlayer || null);
            setBidAmount(payload.bidAmount ? payload.bidAmount.toString() : "");
            setIsCompleted(payload.isCompleted || false);
            if (payload.commentaryLogs) {
              setCommentaries(payload.commentaryLogs);
            }
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // Request latest state immediately
            channel.send({
              type: "broadcast",
              event: "request_state",
            });
            // Fallback timeout if host is offline
            setTimeout(() => {
              setConnecting(false);
            }, 5000);
          } else {
            setErrorMsg("Connection lost. Retrying...");
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isJoined, roomCode]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setErrorMsg("Please enter a valid Room Code");
      return;
    }
    setIsJoined(true);
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md glass-card rounded-3xl p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl text-center space-y-6">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 items-center justify-center shadow-lg shadow-pitch-500/20">
            <Trophy className="h-6 w-6 text-pitch-950" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Watch Quick Auction</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the room code shared by your tournament organizer to view the live bidding panel.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              placeholder="Enter Room Code (e.g. QA-1234)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full h-12 px-4 text-center text-lg font-black tracking-widest rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition uppercase"
            />
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-md shadow-pitch-500/10 active:scale-98 transition flex items-center justify-center gap-2 text-sm"
            >
              Connect to Live Room
            </button>
          </form>
          {errorMsg && <p className="text-xs font-bold text-red-500">{errorMsg}</p>}
        </div>
      </div>
    );
  }

  const soldCount = players.filter((p) => p.purchaseStatus === "sold" && p.registeredAt !== "captain").length;
  const totalPlayersToBid = players.filter((p) => p.registeredAt !== "captain").length;
  const progress = totalPlayersToBid > 0 ? Math.round((soldCount / totalPlayersToBid) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased transition-colors duration-300 flex flex-col">
      {/* Premium Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between transition-colors duration-300">
        <Link href="/" className="flex flex-col group px-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-600 text-pitch-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:scale-105 transition-all duration-300">
              <Trophy className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-black font-display tracking-tight text-slate-900 dark:text-white">
              TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
            </span>
          </div>
          <span className="text-[6.5px] font-bold tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 ml-10 -mt-0.5">
            Spectator View
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="inline-flex h-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 px-3 text-[10px] font-black border border-red-500/25">
            Read Only
          </span>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10 space-y-6">
        {connecting && (
          <div className="bg-pitch-500/10 border border-pitch-500/20 text-pitch-700 dark:text-pitch-400 rounded-xl p-3 text-center text-xs font-bold animate-pulse">
            Connecting to Host... Make sure the host has the auction window open.
          </div>
        )}

        {/* HUD Info */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 dark:border-white/5 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-pitch-600 dark:text-pitch-400 text-xs font-black uppercase tracking-wider bg-pitch-500/5 dark:bg-pitch-500/10 px-3 py-1 rounded-full border border-pitch-500/25">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pitch-500" />
              </span>
              Live Room: {roomCode}
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{roomName || "Spectating Standalone Auction"}</h1>
          </div>

          <div className="w-full md:w-64">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5">
              <span>Draft Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-white/5 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-pitch-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Active Bidding Frame (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm min-h-[380px] flex flex-col justify-between relative overflow-hidden">
              {isCompleted ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-10">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 flex items-center justify-center text-pitch-950 shadow-lg">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Auction Finished!</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                      The rosters are finalized. You can see the team summaries below.
                    </p>
                  </div>
                </div>
              ) : selectedPlayer ? (
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  {/* Player Card */}
                  <div className="grid gap-6 md:grid-cols-12 items-center pb-6 border-b border-slate-100 dark:border-white/5">
                    <div className="md:col-span-3 flex justify-center">
                      <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-emerald-500/20 border border-pitch-500/25 flex items-center justify-center font-black text-3xl text-pitch-600 dark:text-pitch-400 relative">
                        {selectedPlayer.name.charAt(0)}
                      </div>
                    </div>
                    <div className="md:col-span-9 space-y-2 text-center md:text-left">
                      <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full border ${ROLE_COLORS[selectedPlayer.role]}`}>
                        {ROLE_LABELS[selectedPlayer.role]}
                      </span>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{selectedPlayer.name}</h2>
                      <p className="text-xs text-slate-400 font-bold">
                        Bidding active...
                      </p>
                    </div>
                  </div>

                  {/* Bid Display */}
                  <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/50 dark:border-white/5">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Current Bid Price</span>
                    <h3 className="text-4xl font-black text-pitch-600 dark:text-pitch-400 mt-1">
                      {bidAmount ? formatAmount(parseInt(bidAmount, 10)) : formatAmount(selectedPlayer.purchaseAmount || 0)}
                    </h3>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400">
                    <Hammer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Waiting for next player...</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mx-auto">
                      The host has not nominated any player yet. Bids will update here in real time.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: History Log & Commentary (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Live Commentary box */}
            {commentaries.length > 0 && (
              <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live Commentary
                </h4>
                <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1">
                  {commentaries.slice(0, 5).map((log, idx) => (
                    <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      <ChevronRight className="h-3 w-3 shrink-0 text-pitch-500 mt-0.5" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bidding History */}
            <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Bidding Log</h4>
              <div className="max-h-[220px] overflow-y-auto space-y-3 pr-1">
                {history.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{entry.playerName}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {entry.status === "sold" ? `Drafted to ${entry.teamName}` : "Skipped / Passed"}
                      </span>
                    </div>
                    {entry.status === "sold" ? (
                      <span className="font-black text-pitch-600 dark:text-pitch-400">{formatAmount(entry.purchaseAmount)}</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-500">Unsold</span>
                    )}
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No auction logs yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Rosters */}
        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
            Squad rosters
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => {
              const teamPlayers = players.filter((p) => p.purchaseTeamId === team.id && p.purchaseStatus === "sold");
              return (
                <div key={team.id} className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">{team.name}</h3>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <Users className="h-3 w-3" /> {teamPlayers.length} Players
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Remaining Budget</span>
                        <span className="text-xs font-black text-pitch-600 dark:text-pitch-400">
                          {formatAmount(team.remainingBudget)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 space-y-2">
                      {teamPlayers.map((p) => (
                        <div key={p.registrationId} className="flex justify-between items-center text-xs py-1">
                          <div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                            <span className="text-[9px] text-slate-400 block -mt-0.5">{ROLE_LABELS[p.role]}</span>
                          </div>
                          <span className="font-black text-slate-950 dark:text-white">
                            {p.purchaseAmount === 0 && p.registeredAt === "captain" ? "Captain" : formatAmount(p.purchaseAmount)}
                          </span>
                        </div>
                      ))}
                      {teamPlayers.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">No picks drafted yet</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1">
                      <span>Budget Spent</span>
                      <span>{Math.round(((team.budget - team.remainingBudget) / team.budget) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-pitch-500 h-full rounded-full transition-all"
                        style={{ width: `${((team.budget - team.remainingBudget) / team.budget) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SpectatorPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs">Loading Live View...</div>}>
      <SpectatorPageContent />
    </React.Suspense>
  );
}
