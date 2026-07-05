"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy, Users, Hammer, Clock, AlertCircle, CheckCircle2, ChevronRight, Crown, Smile, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const FRANCHISES = [
  { id: "bangalore", name: "Bangalore", color: "bg-red-600/10 border-red-500/30 text-red-500" },
  { id: "mumbai", name: "Mumbai", color: "bg-blue-600/10 border-blue-500/30 text-blue-500" },
  { id: "chennai", name: "Chennai", color: "bg-amber-500/10 border-amber-400/30 text-amber-500" },
  { id: "delhi", name: "Delhi", color: "bg-sky-600/10 border-sky-500/30 text-sky-500" },
  { id: "kolkata", name: "Kolkata", color: "bg-purple-600/10 border-purple-500/30 text-purple-500" },
  { id: "hyderabad", name: "Hyderabad", color: "bg-orange-500/10 border-orange-400/30 text-orange-500" },
  { id: "rajasthan", name: "Rajasthan", color: "bg-pink-600/10 border-pink-500/30 text-pink-500" },
  { id: "punjab", name: "Punjab", color: "bg-rose-600/10 border-rose-500/30 text-rose-500" },
  { id: "lucknow", name: "Lucknow", color: "bg-teal-500/10 border-teal-400/30 text-teal-500" },
  { id: "gujarat", name: "Gujarat", color: "bg-indigo-600/10 border-indigo-500/30 text-indigo-500" }
];

type GameTeam = {
  id: string;
  name: string;
  budget: number;
  remainingBudget: number;
  playerCount: number;
  players: any[];
};

type PoolPlayer = {
  name: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  basePrice: number;
};

const ROLE_LABELS = {
  batsman: "Batsman",
  bowler: "Bowler",
  all_rounder: "All-Rounder",
  wicket_keeper: "Wicket Keeper",
};

const ROLE_COLORS = {
  batsman: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  bowler: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  all_rounder: "text-pitch-600 dark:text-pitch-400 bg-pitch-500/10 border-pitch-500/20",
  wicket_keeper: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
};

function GamePlayerContent() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room") || "";

  const [roomCode, setRoomCode] = useState(roomParam);
  const [playerName, setPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Game Real-time channel ref
  const channelRef = useRef<any>(null);

  // States received from Game Host
  const [gameStatus, setGameStatus] = useState<"lobby" | "active" | "completed">("lobby");
  const [joinedPlayers, setJoinedPlayers] = useState<Array<{ name: string; teamId: string }>>([]);
  const [teams, setTeams] = useState<GameTeam[]>([]);
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<PoolPlayer | null>(null);
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [currentHighestBidderId, setCurrentHighestBidderId] = useState<string | null>(null);
  const [timerValue, setTimerValue] = useState(5);
  const [gameCommentary, setGameCommentary] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Local helper to format points/INR
  const formatAmount = (amount: number) => {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
    if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    if (isJoined && roomCode) {
      const supabase = createClient();
      const channel = supabase.channel(`quick-auction-game:${roomCode}`, {
        config: { broadcast: { self: true } },
      });

      setConnecting(true);

      // Listen to host game updates
      channel
        .on("broadcast", { event: "game_state_update" }, ({ payload }) => {
          setConnecting(false);
          setErrorMsg("");
          if (payload) {
            setGameStatus(payload.gameStatus);
            setJoinedPlayers(payload.joinedPlayers || []);
            setTeams(payload.teams || []);
            setCurrentBiddingPlayer(payload.currentBiddingPlayer);
            setCurrentHighestBid(payload.currentHighestBid || 0);
            setCurrentHighestBidderId(payload.currentHighestBidderId);
            setTimerValue(payload.timerValue !== undefined ? payload.timerValue : 5);
            setGameCommentary(payload.commentary || []);
            setHistory(payload.history || []);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            channelRef.current = channel;
            // Send join request to host
            channel.send({
              type: "broadcast",
              event: "player_join_request",
              payload: {
                playerName,
                teamId: selectedTeamId,
              },
            });
            setSuccessMsg("Connected to room lobby. Waiting for Host to start...");
            setTimeout(() => {
              setConnecting(false);
            }, 6000);
          } else {
            setErrorMsg("Lobby disconnected. Trying to reconnect...");
          }
        });

      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    }
  }, [isJoined, roomCode, playerName, selectedTeamId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setErrorMsg("Please enter a valid Room Code");
      return;
    }
    if (!playerName.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!selectedTeamId) {
      setErrorMsg("Please choose your IPL Franchise team");
      return;
    }
    setIsJoined(true);
  };

  const handlePlaceBid = () => {
    if (!channelRef.current || !currentBiddingPlayer) return;
    const bidAmount = currentHighestBid === 0 ? currentBiddingPlayer.basePrice : currentHighestBid + 500000; // 5L increments

    // Verify budget
    const myTeam = teams.find((t) => t.id === selectedTeamId);
    if (!myTeam || bidAmount > myTeam.remainingBudget) {
      alert("Over Budget! You cannot place this bid.");
      return;
    }

    // Send bid event to host
    channelRef.current.send({
      type: "broadcast",
      event: "place_bid_action",
      payload: {
        teamId: selectedTeamId,
        amount: bidAmount,
      },
    });
  };

  // Lobby screen layout
  if (!isJoined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-xl glass-card rounded-3xl p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 items-center justify-center shadow-lg shadow-pitch-500/20">
              <Zap className="h-6 w-6 text-pitch-950" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Join Multiplayer Auction Game</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your room code, pick your favorite team name, and compete live with other players.
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Room Code</label>
                <input
                  type="text"
                  placeholder="GAME-CODE"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full h-11 px-4 text-center font-black tracking-wider rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition uppercase"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full h-11 px-4 font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Select Franchise Team</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {FRANCHISES.map((team) => {
                  const isSelected = selectedTeamId === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`h-11 rounded-xl border text-[11px] font-black tracking-tight transition-all text-center flex items-center justify-center ${
                        isSelected
                          ? "bg-pitch-500 border-pitch-500 text-pitch-950 shadow-md font-extrabold active:scale-98"
                          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {team.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-lg shadow-pitch-500/20 active:scale-98 transition flex items-center justify-center gap-2 text-sm"
            >
              Join Auction Lobby
            </button>
          </form>
          {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}
        </div>
      </div>
    );
  }

  // Active game view
  const myTeam = teams.find((t) => t.id === selectedTeamId);
  const myBudget = myTeam ? myTeam.remainingBudget : 10000000;
  const isHighestBidder = currentHighestBidderId === selectedTeamId;
  const nextBidAmount = currentHighestBid === 0 ? (currentBiddingPlayer?.basePrice || 100000) : currentHighestBid + 500000;
  const canBid = currentBiddingPlayer && myBudget >= nextBidAmount && !isHighestBidder;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-4 h-16 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-600 text-pitch-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <Trophy className="h-4.5 w-4.5" />
          </span>
          <div>
            <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white block">
              TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
            </span>
            <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 block">
              Live Bidding Game
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {myTeam && (
            <div className="bg-pitch-500/10 border border-pitch-500/20 text-pitch-600 dark:text-pitch-400 px-3 py-1.5 rounded-xl text-xs font-black">
              Team: {myTeam.name} | Budget: {formatAmount(myBudget)}
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {connecting && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl p-3 text-center text-xs font-bold animate-pulse">
            Connecting to game lobby... Please wait.
          </div>
        )}

        {gameStatus === "lobby" ? (
          /* Lobby view */
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm text-center space-y-6 max-w-2xl mx-auto">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-pitch-500/10 items-center justify-center text-pitch-500">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Waiting in Lobby: Room {roomCode}</h2>
              <p className="text-xs text-slate-500 mt-1">
                You have successfully joined. Once the organizer starts the game, players will be nominated for bidding.
              </p>
            </div>

            <div className="border border-slate-200/50 dark:border-white/5 rounded-2xl p-4 bg-slate-50 dark:bg-white/[0.01]">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Joined Players ({joinedPlayers.length})</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {joinedPlayers.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200/50 dark:border-white/5 text-xs font-bold">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-pitch-500 uppercase font-black">{p.teamId.toUpperCase()}</span>
                  </div>
                ))}
                {joinedPlayers.length === 0 && (
                  <p className="col-span-2 text-xs text-slate-400 py-4">No other players in the lobby yet</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Active Game View */
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left Frame: Bidding Console (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm min-h-[460px] flex flex-col justify-between relative overflow-hidden">
                {currentBiddingPlayer ? (
                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    {/* Nominated Player Card */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-emerald-500/20 border border-pitch-500/25 flex items-center justify-center font-black text-3xl text-pitch-600 dark:text-pitch-400 relative">
                          {currentBiddingPlayer.name.charAt(0)}
                        </div>
                        {/* Countdown circle */}
                        <div className={`absolute -top-3 -right-3 h-10 w-10 rounded-full flex items-center justify-center text-xs font-black shadow-lg border border-white dark:border-pitch-950 transition-all ${
                          timerValue <= 2 ? "bg-red-600 text-white animate-pulse" : "bg-pitch-500 text-pitch-950"
                        }`}>
                          <Clock className="h-3 w-3 mr-0.5" /> {timerValue}s
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-center sm:text-left flex-1">
                        <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full border ${ROLE_COLORS[currentBiddingPlayer.role]}`}>
                          {ROLE_LABELS[currentBiddingPlayer.role]}
                        </span>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{currentBiddingPlayer.name}</h2>
                        <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start text-xs text-slate-500">
                          <span>Base Price: <strong className="text-slate-800 dark:text-slate-200">{formatAmount(currentBiddingPlayer.basePrice)}</strong></span>
                          <span>Next Bid: <strong className="text-pitch-500">{formatAmount(nextBidAmount)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Highest Bid HUD */}
                    <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/50 dark:border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Highest Bid</span>
                      <h3 className="text-3xl font-black text-pitch-600 mt-1.5 flex items-center gap-2">
                        {currentHighestBid === 0 ? "No Bids Placed" : formatAmount(currentHighestBid)}
                      </h3>
                      {currentHighestBidderId && (
                        <span className="text-xs font-bold text-slate-500 mt-1">
                          Held by: <strong className="uppercase text-slate-800 dark:text-slate-200">{currentHighestBidderId}</strong>
                          {isHighestBidder && <span className="text-[10px] font-black text-pitch-500 ml-1.5">(Your Bid!)</span>}
                        </span>
                      )}
                    </div>

                    {/* Bidding CTA button */}
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3">
                      <button
                        onClick={handlePlaceBid}
                        disabled={!canBid}
                        className={`flex-1 h-14 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg ${
                          isHighestBidder
                            ? "bg-pitch-500/10 border border-pitch-500/20 text-pitch-500 cursor-default"
                            : canBid
                            ? "bg-pitch-500 hover:bg-pitch-600 text-pitch-950 shadow-pitch-500/20 active:scale-98"
                            : "bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        <Hammer className="h-4.5 w-4.5 animate-bounce" />
                        {isHighestBidder
                          ? "You are the highest bidder!"
                          : myBudget < nextBidAmount
                          ? "Insufficient Budget!"
                          : `Place Bid: ${formatAmount(nextBidAmount)}`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400">
                      <Hammer className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">Waiting for Host...</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mx-auto">
                        The next player nomination is coming shortly. Keep your paddles ready!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* My Squad Roster */}
              {myTeam && (
                <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02]">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    My Squad: Team {myTeam.name} ({myTeam.playerCount}/10 Players)
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {myTeam.players && myTeam.players.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.name}</span>
                          <span className="text-[9px] text-slate-400 uppercase">{ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role}</span>
                        </div>
                        <span className="font-black text-pitch-600">{formatAmount(p.purchaseAmount)}</span>
                      </div>
                    ))}
                    {(!myTeam.players || myTeam.players.length === 0) && (
                      <p className="col-span-2 text-xs text-slate-400 text-center py-4">You have not drafted any players yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Frame: Live Commentary & Scoreboard (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Commentary */}
              {gameCommentary.length > 0 && (
                <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live Commentary
                  </h4>
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                    {gameCommentary.slice(0, 6).map((log, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        <ChevronRight className="h-3 w-3 shrink-0 text-pitch-500 mt-0.5" />
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard/Scoreboard */}
              <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Live Team Standing</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {teams.map((t) => (
                    <div key={t.id} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white uppercase">{t.name}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {t.playerCount}/10 Players &bull; Left Budget: {formatAmount(t.remainingBudget)}
                        </span>
                      </div>
                      <span className="font-black text-slate-500">{t.playerCount} Picks</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function GamePlayerPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs">Loading Game Console...</div>}>
      <GamePlayerContent />
    </React.Suspense>
  );
}
