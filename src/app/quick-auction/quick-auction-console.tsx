"use client";

import React, { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Share2,
  Download,
  Settings,
  ArrowLeft,
  X,
  FileSpreadsheet,
  Check,
  ArrowUpRight,
  HelpCircle,
  Volume2,
  ChevronRight
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/browser";
import { INTERNATIONAL_PLAYERS, PoolPlayer } from "./players-pool";


// ─── Types ────────────────────────────────────────────────────────────────────

export type AuctionPlayer = {
  registrationId: string;
  name: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper" | "unknown";
  avatarUrl: string | null;
  purchaseStatus: "sold" | "skipped" | null;
  purchaseAmount: number;
  purchaseTeamId: string | null;
  registeredAt: string; // "captain" or ISO timestamp
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

type QuickAuctionConsoleProps = {
  initialUser: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

const ROLE_LABELS = {
  batsman: "Batsman",
  bowler: "Bowler",
  all_rounder: "All-Rounder",
  wicket_keeper: "Wicket Keeper",
  unknown: "Unknown",
};

const ROLE_ORDER = {
  batsman: 1,
  bowler: 2,
  all_rounder: 3,
  wicket_keeper: 4,
  unknown: 5,
};

const ROLE_COLORS = {
  batsman: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  bowler: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  all_rounder: "text-pitch-600 dark:text-pitch-400 bg-pitch-500/10 border-pitch-500/20",
  wicket_keeper: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  unknown: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNames(text: string): string[] {
  return text
    .split("\n")
    .map((line) => {
      // Clean up number prefixes (e.g. "1, Sagar", "12. Jagdish", "- Jayesh", "• Bharat")
      let cleaned = line.replace(/^\s*(?:\d+[\s,.)\]-]*|[-•*+]+)\s*/, "");
      cleaned = cleaned.trim();
      return cleaned;
    })
    .filter((name) => name.length > 0);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuickAuctionConsole({ initialUser }: QuickAuctionConsoleProps) {
  // ─── Modes & Realtime Sharing States ───────────────────────────────────────
  const [consoleMode, setConsoleMode] = useState<"standalone" | "game">("standalone");
  const [isLive, setIsLive] = useState(false);
  const [liveRoomCode, setLiveRoomCode] = useState("");
  const [liveChannel, setLiveChannel] = useState<any>(null);
  const [commentaryLogs, setCommentaryLogs] = useState<string[]>([
    "Welcome to TurfTitans Quick Auction Live commentary!"
  ]);

  // ─── Configuration Form States ─────────────────────────────────────────────
  const [isConfigured, setIsConfigured] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [totalBudgetStr, setTotalBudgetStr] = useState("10,000,000"); // 100 Lakhs
  const [basePriceStr, setBasePriceStr] = useState("200,000"); // 2 Lakhs
  const [minIncrementStr, setMinIncrementStr] = useState("100,000"); // 1 Lakh
  const [captainsText, setCaptainsText] = useState("");
  const [playersText, setPlayersText] = useState("");

  // Preset Configurations
  const handleApplyPreset = (preset: "cricket_inr" | "points" | "custom_small") => {
    if (preset === "cricket_inr") {
      setCurrencySymbol("₹");
      setTotalBudgetStr("10,000,000");
      setBasePriceStr("200,000");
      setMinIncrementStr("100,000");
    } else if (preset === "points") {
      setCurrencySymbol("pts");
      setTotalBudgetStr("10,000");
      setBasePriceStr("100");
      setMinIncrementStr("50");
    } else if (preset === "custom_small") {
      setCurrencySymbol("₹");
      setTotalBudgetStr("1,000,000");
      setBasePriceStr("20,000");
      setMinIncrementStr("10,000");
    }
  };

  // ─── Live Auction Console States ───────────────────────────────────────────
  const [players, setPlayers] = useState<AuctionPlayer[]>([]);
  const [teams, setTeams] = useState<AuctionTeam[]>([]);
  const [history, setHistory] = useState<AuctionHistoryEntry[]>([]);
  
  const [selectedPlayer, setSelectedPlayer] = useState<AuctionPlayer | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRostersModal, setShowRostersModal] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "name" | "role">("default");
  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingPlayer, setShufflingPlayer] = useState<AuctionPlayer | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"available" | "skipped" | "sold">("available");
  const [copiedRosters, setCopiedRosters] = useState(false);

  // ─── Multiplayer Auction Game States ────────────────────────────────────────
  const [gameStatus, setGameStatus] = useState<"setup" | "lobby" | "active" | "completed">("setup");
  const [gameRoomCode, setGameRoomCode] = useState("");
  const [gameMaxTeams, setGameMaxTeams] = useState(4); // default 4 teams
  const [gameBudgetStr, setGameBudgetStr] = useState("10,000,000"); // 1 Crore = 100 Lakhs
  const [connectedPlayers, setConnectedPlayers] = useState<Array<{ name: string; teamId: string }>>([]);
  const [gameTeams, setGameTeams] = useState<any[]>([]);
  const [gamePlayersPool, setGamePlayersPool] = useState<PoolPlayer[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<PoolPlayer | null>(null);
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [currentHighestBidderId, setCurrentHighestBidderId] = useState<string | null>(null);
  const [gameTimer, setGameTimer] = useState(5);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [gameCommentary, setGameCommentary] = useState<string[]>([
    "Multiplayer lobby initialized. Ready for teams to join!"
  ]);
  const gameChannelRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const renderModeTabs = () => {
    return null;
  };

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("turftitans_quick_auction_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRoomName(parsed.roomName || "WhatsApp Sunday League");
        setCurrencySymbol(parsed.currencySymbol || "₹");
        setTotalBudgetStr(parsed.totalBudgetStr || "10,000,000");
        setBasePriceStr(parsed.basePriceStr || "200,000");
        setMinIncrementStr(parsed.minIncrementStr || "100,000");
        setPlayers(parsed.players || []);
        setTeams(parsed.teams || []);
        setHistory(parsed.history || []);
        setIsCompleted(parsed.isCompleted || false);
        setIsConfigured(true);
      } catch (e) {
        console.error("Failed to parse saved quick auction state:", e);
      }
    }
  }, []);

  const addCommentary = useCallback((text: string) => {
    setCommentaryLogs((prev) => [text, ...prev]);
  }, []);

  const generateAndAddCommentary = useCallback((type: "nominate" | "bid" | "sold" | "skipped" | "completed", data: { player: string; team?: string; amount?: string }) => {
    const NOMINATION_QUOTES = [
      "A hushed silence in the room as {player} is nominated! Base price: {amount}.",
      "Up next is the superstar {player}! Who will open the bidding at {amount}?",
      "Get your paddles ready! {player} is on the block at {amount}.",
      "The room lights up! {player} is up for grabs. Base price: {amount}.",
      "Next out of the hat is {player}. Bidding starts at {amount}!"
    ];

    const BID_QUOTES = [
      "Boom! {team} raises the paddle to {amount}!",
      "We have a bid! {team} takes it to {amount}.",
      "{team} is showing real intent here, bid is now {amount}!",
      "A quick counter-bid from {team}! Now at {amount}.",
      "{team} jumps in! Bid stands at {amount}."
    ];

    const SOLD_QUOTES = [
      "Going once... Going twice... SOLD! {player} goes to {team} for {amount}! What a signing!",
      "Hammer down! {player} is officially a member of {team} for {amount}!",
      "Sold! {team} secures the services of {player} for {amount}. Absolute class!",
      "Done deal! {player} joins the ranks of {team} for {amount}!",
      "Bidding closes! {player} is snapped up by {team} for a cool {amount}!"
    ];

    const UNSOLD_QUOTES = [
      "Unsold! No takers for {player} today. He returns to the pool.",
      "Timer runs out and {player} goes unsold. A surprise pass from the teams!",
      "No interest in {player}. Passed on for now.",
      "{player} remains unsold. Will someone scoop him up in the next round?"
    ];

    let templates = NOMINATION_QUOTES;
    if (type === "bid") templates = BID_QUOTES;
    else if (type === "sold") templates = SOLD_QUOTES;
    else if (type === "skipped") templates = UNSOLD_QUOTES;
    else if (type === "completed") {
      addCommentary("And that's the end of the draft! What an absolute thriller of an auction. Congratulations to all teams on finalising their squads!");
      return;
    }

    const teamDisplayName = data.team
      ? (data.team.toLowerCase().startsWith("team") ? data.team : `Team ${data.team}`)
      : "";

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    const text = randomTemplate
      .replace(/{player}/g, data.player)
      .replace(/{team}/g, teamDisplayName)
      .replace(/{amount}/g, data.amount || "");
    addCommentary(text);
  }, [addCommentary]);

  const broadcastStandaloneState = useCallback((
    currentTeams: AuctionTeam[],
    currentPlayers: AuctionPlayer[],
    currentHistory: AuctionHistoryEntry[],
    currentPlayer: AuctionPlayer | null,
    currentBid: string,
    completed: boolean,
    logs: string[]
  ) => {
    if (!liveChannel) return;
    liveChannel.send({
      type: "broadcast",
      event: "state_update",
      payload: {
        roomName: roomName || "Quick Standalone Auction",
        currencySymbol,
        teams: currentTeams,
        players: currentPlayers,
        history: currentHistory,
        selectedPlayer: currentPlayer,
        bidAmount: currentBid,
        isCompleted: completed,
        commentaryLogs: logs
      }
    });
  }, [liveChannel, roomName, currencySymbol]);

  // Effect to manage standalone live channel
  useEffect(() => {
    if (!isLive || !liveRoomCode) return;
    const supabase = createClient();
    const channel = supabase.channel(`quick-auction:${liveRoomCode}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "request_state" }, () => {
        channel.send({
          type: "broadcast",
          event: "state_update",
          payload: {
            roomName: roomName || "Quick Standalone Auction",
            currencySymbol,
            teams,
            players,
            history,
            selectedPlayer,
            bidAmount,
            isCompleted,
            commentaryLogs
          }
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLiveChannel(channel);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setLiveChannel(null);
    };
  }, [isLive, liveRoomCode, roomName, currencySymbol, teams, players, history, selectedPlayer, bidAmount, isCompleted, commentaryLogs]);

  // Save to local storage on state changes
  const saveState = (
    updatedTeams: AuctionTeam[],
    updatedPlayers: AuctionPlayer[],
    updatedHistory: AuctionHistoryEntry[],
    completedVal?: boolean
  ) => {
    const finalCompleted = completedVal !== undefined ? completedVal : isCompleted;
    localStorage.setItem(
      "turftitans_quick_auction_state",
      JSON.stringify({
        roomName,
        currencySymbol,
        totalBudgetStr,
        basePriceStr,
        minIncrementStr,
        teams: updatedTeams,
        players: updatedPlayers,
        history: updatedHistory,
        isCompleted: finalCompleted,
      })
    );

    if (isLive) {
      broadcastStandaloneState(
        updatedTeams,
        updatedPlayers,
        updatedHistory,
        selectedPlayer,
        bidAmount,
        finalCompleted,
        commentaryLogs
      );
    }
  };

  // Formatting helper
  const formatAmount = useCallback((amount: number) => {
    if (currencySymbol === "₹") {
      if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
      if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
      return `₹${amount.toLocaleString("en-IN")}`;
    }
    return `${amount.toLocaleString()} ${currencySymbol}`;
  }, [currencySymbol]);

  // Clean parse number strings
  const getNumber = (val: string) => {
    return parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
  };

  const handleGoLive = () => {
    if (isLive) return;
    const code = "QA-" + Math.floor(100000 + Math.random() * 900000).toString();
    setLiveRoomCode(code);
    setIsLive(true);
  };

  // ─── Multiplayer Bidding Game Host Logic ──────────────────────────────────
  const handleStartGameLobby = () => {
    const code = "GAME-" + Math.floor(100000 + Math.random() * 900000).toString();
    setGameRoomCode(code);
    setGameStatus("lobby");
    setConnectedPlayers([]);
    setGameCommentary(["Room Lobby created. Waiting for active players to join..."]);

    const FRANCHISES = [
      { id: "bangalore", name: "Bangalore" },
      { id: "mumbai", name: "Mumbai" },
      { id: "chennai", name: "Chennai" },
      { id: "delhi", name: "Delhi" },
      { id: "kolkata", name: "Kolkata" },
      { id: "hyderabad", name: "Hyderabad" },
      { id: "rajasthan", name: "Rajasthan" },
      { id: "punjab", name: "Punjab" },
      { id: "lucknow", name: "Lucknow" },
      { id: "gujarat", name: "Gujarat" }
    ];

    // Generate teams based on gameMaxTeams
    const teamsList = FRANCHISES.slice(0, gameMaxTeams).map((f) => ({
      id: f.id,
      name: f.name,
      budget: getNumber(gameBudgetStr),
      remainingBudget: getNumber(gameBudgetStr),
      playerCount: 0,
      players: [],
    }));
    setGameTeams(teamsList);
  };

  const broadcastGameState = useCallback((
    status: typeof gameStatus,
    pl: typeof connectedPlayers,
    tm: typeof gameTeams,
    activePlayer: PoolPlayer | null,
    bid: number,
    bidderId: string | null,
    timer: number,
    hist: any[],
    comments: string[]
  ) => {
    if (gameChannelRef.current) {
      gameChannelRef.current.send({
        type: "broadcast",
        event: "game_state_update",
        payload: {
          gameStatus: status,
          joinedPlayers: pl,
          teams: tm,
          currentBiddingPlayer: activePlayer,
          currentHighestBid: bid,
          currentHighestBidderId: bidderId,
          timerValue: timer,
          history: hist,
          commentary: comments,
        },
      });
    }
  }, []);

  // Effect to manage Multiplayer Game Channel
  useEffect(() => {
    if (!gameRoomCode || gameStatus === "setup") return;
    const supabase = createClient();
    const channel = supabase.channel(`quick-auction-game:${gameRoomCode}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on("broadcast", { event: "player_join_request" }, ({ payload }) => {
        if (!payload) return;
        const { playerName, teamId } = payload;
        
        setConnectedPlayers((prev) => {
          const exists = prev.some((p) => p.teamId === teamId);
          if (exists) return prev;
          const updated = [...prev, { name: playerName, teamId }];
          
          setGameTeams((prevTeams) => {
            const updatedTeams = prevTeams.map((t) =>
              t.id === teamId ? { ...t, managerName: playerName } : t
            );
            broadcastGameState(gameStatus, updated, updatedTeams, currentBiddingPlayer, currentHighestBid, currentHighestBidderId, gameTimer, gameHistory, gameCommentary);
            return updatedTeams;
          });

          return updated;
        });
      })
      .on("broadcast", { event: "place_bid_action" }, ({ payload }) => {
        if (!payload || gameStatus !== "active") return;
        const { teamId, amount } = payload;

        setGameTeams((prevTeams) => {
          const team = prevTeams.find((t) => t.id === teamId);
          if (!team || amount > team.remainingBudget) return prevTeams;

          setCurrentHighestBid(amount);
          setCurrentHighestBidderId(teamId);
          setGameTimer(5);

          const teamDisplayName = team.name.toLowerCase().startsWith("team") ? team.name : `Team ${team.name}`;
          const bidderText = `${teamDisplayName} placed a bid of ${formatAmount(amount)}!`;
          setGameCommentary((prevLogs) => {
            const updatedLogs = [bidderText, ...prevLogs];
            broadcastGameState(gameStatus, connectedPlayers, prevTeams, currentBiddingPlayer, amount, teamId, 5, gameHistory, updatedLogs);
            return updatedLogs;
          });

          return prevTeams;
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          gameChannelRef.current = channel;
          broadcastGameState(gameStatus, connectedPlayers, gameTeams, currentBiddingPlayer, currentHighestBid, currentHighestBidderId, gameTimer, gameHistory, gameCommentary);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      gameChannelRef.current = null;
    };
  }, [gameRoomCode, gameStatus]);

  const resolveNomination = () => {
    if (!currentBiddingPlayer) return;

    let updatedTeams = [...gameTeams];
    let resolvedText = "";
    let nextHistory = [...gameHistory];

    if (currentHighestBidderId && currentHighestBid > 0) {
      const bidderTeam = gameTeams.find((t) => t.id === currentHighestBidderId);
      resolvedText = `SOLD! ${currentBiddingPlayer.name} goes to Team ${bidderTeam ? bidderTeam.name : currentHighestBidderId} for ${formatAmount(currentHighestBid)}!`;
      
      updatedTeams = gameTeams.map((t) =>
        t.id === currentHighestBidderId
          ? {
              ...t,
              remainingBudget: t.remainingBudget - currentHighestBid,
              playerCount: t.playerCount + 1,
              players: [...(t.players || []), { name: currentBiddingPlayer.name, role: currentBiddingPlayer.role, purchaseAmount: currentHighestBid }],
            }
          : t
      );

      nextHistory = [
        {
          id: `hist-${Date.now()}`,
          playerName: currentBiddingPlayer.name,
          teamName: bidderTeam ? bidderTeam.name : currentHighestBidderId,
          purchaseAmount: currentHighestBid,
          status: "sold",
        },
        ...gameHistory,
      ];
    } else {
      resolvedText = `UNSOLD! ${currentBiddingPlayer.name} goes unsold and returns to the pool.`;
      nextHistory = [
        {
          id: `hist-${Date.now()}`,
          playerName: currentBiddingPlayer.name,
          teamName: null,
          purchaseAmount: 0,
          status: "skipped",
        },
        ...gameHistory,
      ];
    }

    setGameTeams(updatedTeams);
    setGameHistory(nextHistory);
    
    const updatedCommentary = [resolvedText, ...gameCommentary];
    setGameCommentary(updatedCommentary);

    broadcastGameState(gameStatus, connectedPlayers, updatedTeams, null, currentHighestBid, currentHighestBidderId, 0, nextHistory, updatedCommentary);

    setTimeout(() => {
      setCurrentPlayerIdx((prevIdx) => {
        const nextIdx = prevIdx + 1;
        if (nextIdx < gamePlayersPool.length) {
          const nextPlayer = gamePlayersPool[nextIdx];
          setCurrentBiddingPlayer(nextPlayer);
          setCurrentHighestBid(0);
          setCurrentHighestBidderId(null);
          setGameTimer(5);

          const nominateText = `New Player Nominated: ${nextPlayer.name} (${ROLE_LABELS[nextPlayer.role as keyof typeof ROLE_LABELS] || nextPlayer.role}). Base Price: ${formatAmount(nextPlayer.basePrice)}.`;
          const finalCommentary = [nominateText, ...updatedCommentary];
          setGameCommentary(finalCommentary);

          broadcastGameState(gameStatus, connectedPlayers, updatedTeams, nextPlayer, 0, null, 5, nextHistory, finalCommentary);
        } else {
          setGameStatus("completed");
          setCurrentBiddingPlayer(null);
          const endText = "Draft Finished! The international player pool is exhausted.";
          const finalCommentary = [endText, ...updatedCommentary];
          setGameCommentary(finalCommentary);
          broadcastGameState("completed", connectedPlayers, updatedTeams, null, 0, null, 0, nextHistory, finalCommentary);
        }
        return nextIdx;
      });
    }, 3000);
  };

  const handleStartGame = () => {
    const shuffled = [...INTERNATIONAL_PLAYERS].sort(() => Math.random() - 0.5);
    setGamePlayersPool(shuffled);
    setCurrentPlayerIdx(0);
    setGameStatus("active");
    setGameHistory([]);
    
    const firstPlayer = shuffled[0];
    setCurrentBiddingPlayer(firstPlayer);
    setCurrentHighestBid(0);
    setCurrentHighestBidderId(null);
    setGameTimer(5);

    const introText = `Game Started! Up first: ${firstPlayer.name} (${ROLE_LABELS[firstPlayer.role as keyof typeof ROLE_LABELS] || firstPlayer.role}). Base price: ${formatAmount(firstPlayer.basePrice)}.`;
    const comments = [introText, "Lobby is locked, bidding has commenced!"];
    setGameCommentary(comments);

    broadcastGameState("active", connectedPlayers, gameTeams, firstPlayer, 0, null, 5, [], comments);
  };

  // Game countdown timer logic
  useEffect(() => {
    if (gameStatus !== "active" || !currentBiddingPlayer) return;

    intervalRef.current = setInterval(() => {
      setGameTimer((prev) => {
        if (prev > 1) {
          const nextVal = prev - 1;
          broadcastGameState(gameStatus, connectedPlayers, gameTeams, currentBiddingPlayer, currentHighestBid, currentHighestBidderId, nextVal, gameHistory, gameCommentary);
          return nextVal;
        } else {
          clearInterval(intervalRef.current);
          resolveNomination();
          return 0;
        }
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [gameStatus, currentBiddingPlayer, currentHighestBid, currentHighestBidderId, gameTeams, connectedPlayers, gameHistory, gameCommentary]);

  // ─── Setup Action ──────────────────────────────────────────────────────────
  const handleStartAuction = () => {
    const budgetVal = getNumber(totalBudgetStr);
    const baseVal = getNumber(basePriceStr);
    const parsedCaptains = parseNames(captainsText);
    const parsedPlayers = parseNames(playersText);

    if (parsedCaptains.length === 0) {
      alert("Please add at least one Captain/Owner name.");
      return;
    }
    if (parsedPlayers.length === 0) {
      alert("Please add some players to bid on.");
      return;
    }

    // 1. Create Teams from Captains list
    const generatedTeams: AuctionTeam[] = parsedCaptains.map((capName, idx) => ({
      id: `team-${idx}`,
      name: capName,
      logoUrl: null,
      budget: budgetVal,
      remainingBudget: budgetVal,
      playerCount: 1, // Start with captain already in team
    }));

    // 2. Setup Players
    // Assign balanced cricket roles to non-captain players
    const ROLES: Array<AuctionPlayer["role"]> = ["batsman", "bowler", "all_rounder", "wicket_keeper"];
    const generatedPlayers: AuctionPlayer[] = [];

    // Pre-add Captains as sold to their respective teams for 0 budget
    parsedCaptains.forEach((capName, idx) => {
      generatedPlayers.push({
        registrationId: `player-cap-${idx}`,
        name: capName,
        role: "all_rounder",
        avatarUrl: null,
        purchaseStatus: "sold",
        purchaseAmount: 0,
        purchaseTeamId: `team-${idx}`,
        registeredAt: "captain",
      });
    });

    // Add paid list players
    parsedPlayers.forEach((playerName, idx) => {
      generatedPlayers.push({
        registrationId: `player-${idx}`,
        name: playerName,
        role: "unknown",
        avatarUrl: null,
        purchaseStatus: null,
        purchaseAmount: 0,
        purchaseTeamId: null,
        registeredAt: new Date(Date.now() - idx * 60_000).toISOString(),
      });
    });

    setTeams(generatedTeams);
    setPlayers(generatedPlayers);
    setHistory([]);
    setSelectedPlayer(null);
    setSelectedTeamId("");
    setBidAmount("");
    setIsCompleted(false);
    setIsConfigured(true);

    // Save initial state to localStorage
    localStorage.setItem(
      "turftitans_quick_auction_state",
      JSON.stringify({
        roomName,
        currencySymbol,
        totalBudgetStr,
        basePriceStr,
        minIncrementStr,
        teams: generatedTeams,
        players: generatedPlayers,
        history: [],
        isCompleted: false,
      })
    );
  };

  // ─── Auction Core Mechanics ────────────────────────────────────────────────

  const soldPlayers = players.filter((p) => p.purchaseStatus === "sold");
  const skippedPlayers = players.filter((p) => p.purchaseStatus === "skipped");
  const primaryPool = players.filter((p) => p.purchaseStatus === null && p.registeredAt !== "captain");

  const totalPlayersToBid = players.filter(p => p.registeredAt !== "captain").length;
  const soldCount = soldPlayers.filter(p => p.registeredAt !== "captain").length;
  const skippedCount = skippedPlayers.length;
  const availableCount = primaryPool.length;
  const progress = totalPlayersToBid > 0 ? Math.round((soldCount / totalPlayersToBid) * 100) : 0;

  const activePool =
    sidebarTab === "available"
      ? primaryPool
      : sidebarTab === "skipped"
      ? skippedPlayers
      : soldPlayers.filter(p => p.registeredAt !== "captain");

  // Auto switch tabs
  useEffect(() => {
    if (primaryPool.length === 0 && skippedPlayers.length > 0 && sidebarTab === "available") {
      setSidebarTab("skipped");
    }
  }, [primaryPool.length, skippedPlayers.length, sidebarTab]);

  const handlePlayerSelect = (player: AuctionPlayer, fromUnsold: boolean) => {
    setSelectedPlayer(player);
    const baseVal = getNumber(basePriceStr);
    setBidAmount(baseVal.toString());
    setSelectedTeamId("");
    setActionMsg(null);
    generateAndAddCommentary("nominate", { player: player.name, amount: formatAmount(baseVal) });
  };

  // Random Shuffling Pick
  const pickRandom = () => {
    const pool = primaryPool.length > 0 ? primaryPool : skippedPlayers;
    if (pool.length === 0) return;

    setIsShuffling(true);
    setBidAmount("");
    setSelectedTeamId("");
    setActionMsg(null);
    setSelectedPlayer(null);

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
        setSelectedPlayer(finalPlayer);
        const baseVal = getNumber(basePriceStr);
        setBidAmount(baseVal.toString());
        generateAndAddCommentary("nominate", { player: finalPlayer.name, amount: formatAmount(baseVal) });
        if (primaryPool.length === 0) {
          setSidebarTab("skipped");
        } else {
          setSidebarTab("available");
        }
      }
    };

    setTimeout(tick, baseDelay);
  };

  // Action: Sell Player
  const handleSell = () => {
    if (!selectedPlayer || !selectedTeamId || !bidAmount) return;
    const amount = getNumber(bidAmount);

    if (isNaN(amount) || amount < 0) {
      setActionMsg({ type: "error", text: "Enter a valid bid amount." });
      return;
    }

    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    if (amount > team.remainingBudget) {
      setActionMsg({
        type: "error",
        text: `${team.name} only has ${formatAmount(team.remainingBudget)} remaining. Cannot spend ${formatAmount(amount)}.`,
      });
      return;
    }

    // Process Purchase
    const updatedPlayers = players.map((p) =>
      p.registrationId === selectedPlayer.registrationId
        ? {
            ...p,
            purchaseStatus: "sold" as const,
            purchaseAmount: amount,
            purchaseTeamId: selectedTeamId,
          }
        : p
    );

    const updatedTeams = teams.map((t) =>
      t.id === selectedTeamId
        ? {
            ...t,
            remainingBudget: t.remainingBudget - amount,
            playerCount: t.playerCount + 1,
          }
        : t
    );

    const logEntry: AuctionHistoryEntry = {
      id: `history-${Date.now()}`,
      playerName: selectedPlayer.name,
      teamName: team.name,
      purchaseAmount: amount,
      status: "sold",
      createdAt: new Date().toISOString(),
    };

    const updatedHistory = [logEntry, ...history];

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);
    setHistory(updatedHistory);
    setSelectedPlayer(null);
    setSelectedTeamId("");
    setBidAmount("");
    setActionMsg({ type: "success", text: `${selectedPlayer.name} sold to Team ${team.name} for ${formatAmount(amount)}!` });
    generateAndAddCommentary("sold", { player: selectedPlayer.name, team: team.name, amount: formatAmount(amount) });

    saveState(updatedTeams, updatedPlayers, updatedHistory);
  };

  // Action: Skip Player
  const handleSkip = () => {
    if (!selectedPlayer) return;

    const updatedPlayers = players.map((p) =>
      p.registrationId === selectedPlayer.registrationId
        ? { ...p, purchaseStatus: "skipped" as const }
        : p
    );

    const logEntry: AuctionHistoryEntry = {
      id: `history-${Date.now()}`,
      playerName: selectedPlayer.name,
      teamName: null,
      purchaseAmount: 0,
      status: "skipped",
      createdAt: new Date().toISOString(),
    };

    const updatedHistory = [logEntry, ...history];

    setPlayers(updatedPlayers);
    setHistory(updatedHistory);
    setSelectedPlayer(null);
    setActionMsg({ type: "success", text: `${selectedPlayer.name} skipped. Added to Unsold list.` });
    generateAndAddCommentary("skipped", { player: selectedPlayer.name });

    saveState(teams, updatedPlayers, updatedHistory);
  };

  // Action: Undo Last Transaction
  const handleUndo = () => {
    if (history.length === 0) return;
    const [lastAction, ...remainingHistory] = history;

    // Find if the action was a purchase or a skip
    const correspondingPlayer = players.find((p) => p.name === lastAction.playerName);
    if (!correspondingPlayer) return;

    let updatedTeams = [...teams];
    let updatedPlayers = [...players];

    if (lastAction.status === "sold" && lastAction.teamName) {
      // Return budget and decrement player count
      const team = teams.find((t) => t.name === lastAction.teamName);
      if (team) {
        updatedTeams = teams.map((t) =>
          t.id === team.id
            ? {
                ...t,
                remainingBudget: t.remainingBudget + lastAction.purchaseAmount,
                playerCount: Math.max(0, t.playerCount - 1),
              }
            : t
        );
      }
    }

    updatedPlayers = players.map((p) =>
      p.registrationId === correspondingPlayer.registrationId
        ? {
            ...p,
            purchaseStatus: null,
            purchaseAmount: 0,
            purchaseTeamId: null,
          }
        : p
    );

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);
    setHistory(remainingHistory);
    setSelectedPlayer(null);
    setActionMsg({ type: "success", text: `Undid last action: ${lastAction.playerName}` });

    saveState(updatedTeams, updatedPlayers, remainingHistory);
  };

  // Action: Release / Return sold player to pool
  const handleReleasePlayer = (player: AuctionPlayer) => {
    if (!player.purchaseTeamId || player.purchaseStatus !== "sold") return;

    const team = teams.find((t) => t.id === player.purchaseTeamId);
    let updatedTeams = [...teams];

    if (team) {
      updatedTeams = teams.map((t) =>
        t.id === team.id
          ? {
              ...t,
              remainingBudget: t.remainingBudget + player.purchaseAmount,
              playerCount: Math.max(0, t.playerCount - 1),
            }
          : t
      );
    }

    const updatedPlayers = players.map((p) =>
      p.registrationId === player.registrationId
        ? {
            ...p,
            purchaseStatus: null,
            purchaseAmount: 0,
            purchaseTeamId: null,
          }
        : p
    );

    const logEntry: AuctionHistoryEntry = {
      id: `history-release-${Date.now()}`,
      playerName: player.name,
      teamName: null,
      purchaseAmount: 0,
      status: "skipped", // Represents return
      createdAt: new Date().toISOString(),
    };
    const updatedHistory = [logEntry, ...history];

    setPlayers(updatedPlayers);
    setTeams(updatedTeams);
    setHistory(updatedHistory);
    if (selectedPlayer?.registrationId === player.registrationId) {
      setSelectedPlayer(null);
    }
    setActionMsg({ type: "success", text: `Released ${player.name} back to the auction pool.` });

    saveState(updatedTeams, updatedPlayers, updatedHistory);
  };

  // Action: Update player role
  const handleUpdateRole = (playerId: string, newRole: AuctionPlayer["role"]) => {
    const updatedPlayers = players.map((p) =>
      p.registrationId === playerId ? { ...p, role: newRole } : p
    );
    setPlayers(updatedPlayers);
    if (selectedPlayer?.registrationId === playerId) {
      setSelectedPlayer((prev) => prev ? { ...prev, role: newRole } : null);
    }
    saveState(teams, updatedPlayers, history);
    setActionMsg({ type: "success", text: `Updated player role to ${ROLE_LABELS[newRole]}.` });
  };

  // Action: Complete / End Auction
  const handleCompleteAuction = () => {
    setIsCompleted(true);
    setShowCompleteConfirm(false);
    setSelectedPlayer(null);
    saveState(teams, players, history, true);
    setActionMsg({ type: "success", text: "Auction ended! Rosters are now finalized." });
  };

  // Action: Reset Auction fully
  const handleReset = () => {
    localStorage.removeItem("turftitans_quick_auction_state");
    setIsConfigured(false);
    setShowResetConfirm(false);
    setIsCompleted(false);
    setSelectedPlayer(null);
    setPlayers([]);
    setTeams([]);
    setHistory([]);
  };

  // Action: Increment Bid Amount
  const handleIncrement = (incAmount: number) => {
    const current = getNumber(bidAmount) || getNumber(basePriceStr);
    setBidAmount((current + incAmount).toString());
  };

  // ─── Export Features ───────────────────────────────────────────────────────

  // Generate copyable text for WhatsApp
  const handleCopyWhatsApp = () => {
    let text = `*🏆 ${roomName} - Live Auction Rosters 🏆*\n\n`;

    teams.forEach((team) => {
      // Find team captain
      const cap = players.find((p) => p.purchaseTeamId === team.id && p.registeredAt === "captain");
      text += `*Team ${team.name}*\n`;
      text += `• Captain/Owner: ${cap ? cap.name : "N/A"}\n`;
      text += `• Total Spent: ${formatAmount(team.budget - team.remainingBudget)} | Left: ${formatAmount(team.remainingBudget)}\n`;
      
      const teamPlayers = players.filter(
        (p) => p.purchaseTeamId === team.id && p.purchaseStatus === "sold" && p.registeredAt !== "captain"
      );

      if (teamPlayers.length === 0) {
        text += `  _No draft picks yet_\n`;
      } else {
        teamPlayers.forEach((p, index) => {
          text += `  ${index + 1}. ${p.name} (${ROLE_LABELS[p.role]}) - ${formatAmount(p.purchaseAmount)}\n`;
        });
      }
      text += `\n`;
    });

    // Unsold summary
    if (skippedPlayers.length > 0) {
      text += `*🚫 Unsold Players (${skippedPlayers.length})*\n`;
      text += `${skippedPlayers.map((p) => `• ${p.name}`).join("\n")}\n\n`;
    }

    text += `Generated via *TurfTitans* 🏏\nStart your local cricket leagues at https://turftitans.vercel.app/`;

    navigator.clipboard.writeText(text);
    setCopiedRosters(true);
    setTimeout(() => setCopiedRosters(false), 2500);
  };

  // Export to Excel Multi-sheet file
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryHeaders = [["Team Name", "Captain/Owner", "Total Budget", "Budget Remaining", "Players Count"]];
    const summaryRows = teams.map((t) => {
      const cap = players.find((p) => p.purchaseTeamId === t.id && p.registeredAt === "captain");
      return [t.name, cap ? cap.name : "N/A", t.budget, t.remainingBudget, t.playerCount];
    });
    const wsSummary = XLSX.utils.aoa_to_sheet([...summaryHeaders, ...summaryRows]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // All Sold Players
    const playerHeaders = [["Name", "Team", "Role", "Purchase Price"]];
    const playerRows = players
      .filter((p) => p.purchaseStatus === "sold")
      .map((p) => {
        const teamName = teams.find((t) => t.id === p.purchaseTeamId)?.name ?? "N/A";
        return [
          p.name,
          p.registeredAt === "captain" ? `${teamName} (Captain)` : teamName,
          ROLE_LABELS[p.role],
          p.registeredAt === "captain" ? "PRE-ASSIGNED" : p.purchaseAmount,
        ];
      });
    const wsPlayers = XLSX.utils.aoa_to_sheet([...playerHeaders, ...playerRows]);
    XLSX.utils.book_append_sheet(wb, wsPlayers, "Roster List");

    // Individual Team Sheets
    teams.forEach((t) => {
      const teamPlayers = players.filter((p) => p.purchaseTeamId === t.id && p.purchaseStatus === "sold");
      const teamRows = teamPlayers.map((p) => [
        p.name,
        ROLE_LABELS[p.role],
        p.registeredAt === "captain" ? "CAPTAIN" : p.purchaseAmount,
      ]);
      const wsTeam = XLSX.utils.aoa_to_sheet([["Player Name", "Role", "Cost"], ...teamRows]);
      
      // Clean sheet name (max 31 chars, no special characters)
      const cleanName = t.name.replace(/[\[\]\:\*\?\/\\ ]/g, "_").substring(0, 30);
      XLSX.utils.book_append_sheet(wb, wsTeam, cleanName || `Team_${t.id}`);
    });

    XLSX.writeFile(wb, `${roomName.replace(/\s+/g, "_")}_Rosters.xlsx`);
  };

  // Export to PDF file
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // TurfTitans Mint Green
    doc.text(roomName, 20, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Live Auction Final Rosters - Generated on ${new Date().toLocaleDateString()}`, 20, 27);
    doc.text(`Powered by TurfTitans (https://turftitans.vercel.app/)`, 20, 32);

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 36, 190, 36);

    let yOffset = 45;

    teams.forEach((team) => {
      // Check if we need a new page
      if (yOffset > 240) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(`Team: ${team.name}`, 20, yOffset);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const spentText = formatAmount(team.budget - team.remainingBudget);
      const leftText = formatAmount(team.remainingBudget);
      doc.text(`Total Spent: ${spentText}  |  Remaining Budget: ${leftText}  |  Squad Size: ${team.playerCount}`, 20, yOffset + 6);

      const teamPlayers = players.filter((p) => p.purchaseTeamId === team.id && p.purchaseStatus === "sold");
      
      let playerY = yOffset + 14;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("Player Name", 25, playerY);
      doc.text("Role", 110, playerY);
      doc.text("Price", 160, playerY);

      doc.setDrawColor(241, 245, 249);
      doc.line(20, playerY + 2, 190, playerY + 2);

      playerY += 8;

      teamPlayers.forEach((p, idx) => {
        // Check page height
        if (playerY > 270) {
          doc.addPage();
          playerY = 20;
          // Reprint headers
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text("Player Name", 25, playerY);
          doc.text("Role", 110, playerY);
          doc.text("Price", 160, playerY);
          doc.setDrawColor(241, 245, 249);
          doc.line(20, playerY + 2, 190, playerY + 2);
          playerY += 8;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        const isCaptain = p.purchaseAmount === 0 && p.registeredAt === "captain";
        const nameText = isCaptain ? `${p.name} (Captain)` : `${idx + 1}. ${p.name}`;
        const priceText = isCaptain ? "Captain" : formatAmount(p.purchaseAmount);

        doc.text(nameText, 25, playerY);
        doc.text(ROLE_LABELS[p.role], 110, playerY);
        doc.text(priceText, 160, playerY);

        playerY += 7;
      });

      yOffset = playerY + 12; // Add space before next team
    });

    // Save the PDF
    doc.save(`${roomName.replace(/\s+/g, "_")}_Rosters.pdf`);
  };

  // ─── Sub-components & Renders ──────────────────────────────────────────────

  const renderAvailableList = () => {
    const sortedPool = [...activePool].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "role") {
        const orderA = ROLE_ORDER[a.role];
        const orderB = ROLE_ORDER[b.role];
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    if (sortedPool.length === 0) {
      const messages = {
        available: "All players processed!",
        skipped: "No unsold players remaining.",
        sold: "No players purchased yet.",
      };
      return (
        <div className="glass-card rounded-2xl p-6 text-center border border-dashed border-slate-300 dark:border-white/10 mt-2">
          <p className="text-sm text-slate-500">{messages[sidebarTab]}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-2 max-h-[460px] overflow-y-auto pr-1 mt-2">
        {sortedPool.map((p) => {
          const isSelected = selectedPlayer?.registrationId === p.registrationId;
          return (
            <button
              key={p.registrationId}
              onClick={() => handlePlayerSelect(p, sidebarTab === "skipped")}
              disabled={isCompleted}
              className={`w-full flex items-center justify-between rounded-xl p-3 text-left transition border ${
                isSelected
                  ? "border-pitch-500 bg-pitch-500/10 text-pitch-950 dark:text-white"
                  : "border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] hover:border-pitch-500/30 hover:bg-pitch-500/5"
              } disabled:opacity-75 disabled:cursor-default`}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                  {p.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-black">{p.name}</h4>
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border mt-1 ${ROLE_COLORS[p.role]}`}>
                    {ROLE_LABELS[p.role]}
                  </span>
                </div>
              </div>
              
              {p.purchaseStatus === "sold" && (
                <span className="text-[10px] font-black text-pitch-600 dark:text-pitch-400">
                  {formatAmount(p.purchaseAmount)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // ─── 1. Configuration Screen ──────────────────────────────────────────────
  if (!isConfigured) {
    if (consoleMode === "game") {
      if (gameStatus === "setup") {
        return (
          <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
            {renderModeTabs()}
            
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 items-center justify-center shadow-lg shadow-pitch-500/20">
                <Zap className="h-6 w-6 text-pitch-950" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Multiplayer Auction Game</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
                Host an interactive, real-time cricket bidding game! Up to 10 players can join your room and bid live against a 5-second countdown timer.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl max-w-xl mx-auto">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Number of Teams (2-10)</label>
                  <select
                    value={gameMaxTeams}
                    onChange={(e) => setGameMaxTeams(parseInt(e.target.value, 10))}
                    className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>{num} Teams</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Total Budget per Team (INR / Points)</label>
                  <input
                    type="text"
                    value={gameBudgetStr}
                    onChange={(e) => setGameBudgetStr(e.target.value)}
                    className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                    placeholder="e.g. 10,000,000"
                  />
                </div>

                <button
                  onClick={handleStartGameLobby}
                  className="w-full h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-md shadow-pitch-500/10 active:scale-98 transition flex items-center justify-center gap-2 text-sm"
                >
                  <Users className="h-4.5 w-4.5" /> Create Game Lobby
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (gameStatus === "lobby") {
        return (
          <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Game Lobby Created!</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Share the Room Code with your friends. Once players join, assign them a franchise and click Start.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl max-w-xl mx-auto space-y-6">
              <div className="text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Lobby Room Code</span>
                <h2 className="text-3xl font-black text-pitch-500 tracking-widest mt-1">{gameRoomCode}</h2>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/quick-auction/game-player?room=${gameRoomCode}`;
                    navigator.clipboard.writeText(url);
                    alert("Copied player join link!");
                  }}
                  className="text-xs text-slate-400 underline hover:text-white mt-2 block mx-auto"
                >
                  Copy Player Join Link
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Connected Teams ({connectedPlayers.length}/{gameMaxTeams})</h4>
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {gameTeams.map((team) => (
                    <div key={team.id} className="py-2.5 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white uppercase">{team.name}</span>
                      {team.managerName ? (
                        <span className="text-pitch-500 font-semibold flex items-center gap-1">
                          🟢 Connected: {team.managerName}
                        </span>
                      ) : (
                        <span className="text-slate-400">Waiting for player...</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartGame}
                disabled={connectedPlayers.length === 0}
                className="w-full h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-md shadow-pitch-500/10 active:scale-98 transition flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start Live Game Draft
              </button>
            </div>
          </div>
        );
      }

      if (gameStatus === "active") {
        return (
          <div className="space-y-6 pb-20 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 dark:border-white/5 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-pitch-600 dark:text-pitch-400 text-xs font-black uppercase tracking-wider bg-pitch-500/5 dark:bg-pitch-500/10 px-3 py-1 rounded-full border border-pitch-500/25">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pitch-500" />
                  </span>
                  Active Room Code: {gameRoomCode}
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">Multiplayer Auction Game Room</h1>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setGameStatus("setup")}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 px-4 text-xs font-bold transition"
                >
                  Quit Game
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12 items-start">
              <div className="lg:col-span-8 space-y-4">
                <div className="glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm min-h-[380px] flex flex-col justify-between relative overflow-hidden">
                  {currentBiddingPlayer ? (
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-emerald-500/20 border border-pitch-500/25 flex items-center justify-center font-black text-3xl text-pitch-600 dark:text-pitch-400 relative">
                            {currentBiddingPlayer?.name?.charAt(0) || ""}
                          </div>
                          <div className={`absolute -top-3 -right-3 h-10 w-10 rounded-full flex items-center justify-center text-xs font-black shadow-lg border border-white dark:border-pitch-950 ${
                            gameTimer <= 2 ? "bg-red-600 text-white animate-pulse" : "bg-pitch-500 text-pitch-950"
                          }`}>
                            <Clock className="h-3 w-3 mr-0.5" /> {gameTimer}s
                          </div>
                        </div>

                        <div className="space-y-2 text-center sm:text-left flex-1">
                          <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full border ${ROLE_COLORS[currentBiddingPlayer?.role as keyof typeof ROLE_COLORS] || ""}`}>
                            {ROLE_LABELS[currentBiddingPlayer?.role as keyof typeof ROLE_LABELS] || currentBiddingPlayer?.role || ""}
                          </span>
                          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{currentBiddingPlayer?.name || ""}</h2>
                          <p className="text-xs text-slate-400 font-bold">
                            Base Price: {formatAmount(currentBiddingPlayer?.basePrice || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/50 dark:border-white/5">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Current highest bid</span>
                        <h3 className="text-3xl font-black text-pitch-600 mt-1">
                          {currentHighestBid === 0 ? "No Bids Placed" : formatAmount(currentHighestBid)}
                        </h3>
                        {currentHighestBidderId && (
                          <span className="text-xs font-bold text-slate-500 mt-1">
                            Held by: <strong className="uppercase">{currentHighestBidderId}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                      <div className="h-14 w-14 rounded-2xl bg-pitch-500/10 flex items-center justify-center text-pitch-500 animate-bounce">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Nomination Settled!</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mx-auto">
                          Updating records and loading the next cricketer...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02]">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">Live Commentary</h4>
                  <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                    {gameCommentary.slice(0, 6).map((log, idx) => (
                      <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        <ChevronRight className="h-3 w-3 shrink-0 text-pitch-500 mt-0.5" />
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02]">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Leaderboard</h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {gameTeams.map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white uppercase">{t.name}</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {t.playerCount}/10 Players &bull; Budget: {formatAmount(t.remainingBudget)}
                          </span>
                        </div>
                        <span className="font-black text-slate-500">{t.playerCount} Picks</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Squad Rosters</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gameTeams.map((team) => (
                  <div key={team.id} className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">{team.name}</h3>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Manager: {team.managerName || "Unassigned"}</span>
                        </div>
                        <span className="text-xs font-black text-pitch-600">{formatAmount(team.remainingBudget)}</span>
                      </div>
                      <div className="pt-3 space-y-2">
                        {team.players && team.players.map((p: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs py-1">
                            <span>{p.name}</span>
                            <span className="font-black">{formatAmount(p.purchaseAmount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      if (gameStatus === "completed") {
        return (
          <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Game Finished!</h1>
              <p className="text-sm text-slate-500">Draft has closed. View final teams below.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gameTeams.map((team) => (
                <div key={team.id} className="glass-card rounded-2xl p-5 border border-slate-200/50 bg-white dark:bg-white/[0.02]">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white border-b pb-2 mb-3 uppercase">{team.name}</h3>
                  <div className="space-y-2">
                    {team.players && team.players.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span>{p.name}</span>
                        <span className="font-bold">{formatAmount(p.purchaseAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setGameStatus("setup")}
              className="w-full h-12 rounded-xl bg-pitch-500 text-pitch-950 font-black"
            >
              Start New Game Lobby
            </button>
          </div>
        );
      }
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
        {renderModeTabs()}

        {/* Info header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 items-center justify-center shadow-lg shadow-pitch-500/20">
            <Zap className="h-6 w-6 text-pitch-950" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Quick Auction Console</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Run a professional live auction instantly. Paste team captains and players directly from WhatsApp, set points/budget, and start bidding.
          </p>
        </div>

        {/* Wizard Panel */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl">
          <div className="space-y-6">
            
            {/* General parameters */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">Auction Title</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                  placeholder="e.g. Sunday League"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">Total Budget per Team</label>
                <input
                  type="text"
                  value={totalBudgetStr}
                  onChange={(e) => setTotalBudgetStr(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                  placeholder="e.g. 10,000,000"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">Starting Base Price</label>
                <input
                  type="text"
                  value={basePriceStr}
                  onChange={(e) => setBasePriceStr(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                  placeholder="e.g. 200,000"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">Bid Increment</label>
                <input
                  type="text"
                  value={minIncrementStr}
                  onChange={(e) => setMinIncrementStr(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                  placeholder="e.g. 100,000"
                />
              </div>
            </div>

            {/* Presets and Currency Toggle */}
            <div className="grid gap-4 sm:flex sm:items-center sm:justify-between py-3 border-y border-slate-100 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Settings Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("cricket_inr")}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-pitch-500/10 text-pitch-600 dark:text-pitch-400 hover:bg-pitch-500/20 transition"
                >
                  INR Cricket (₹100L Budget)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("points")}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition"
                >
                  Generic Points (10k pts)
                </button>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-xs font-bold text-slate-400">Currency Symbol:</span>
                <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1">
                  {["₹", "$", "pts"].map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => setCurrencySymbol(symbol)}
                      className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${
                        currencySymbol === symbol
                          ? "bg-pitch-500 text-pitch-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Captains and Players Input */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Captains / Team Owners</label>
                  <span className="text-[10px] text-slate-400 font-bold">1 per line. Creates teams automatically</span>
                </div>
                <textarea
                  value={captainsText}
                  onChange={(e) => setCaptainsText(e.target.value)}
                  rows={4}
                  className="w-full p-4 text-sm font-semibold rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition font-mono"
                  placeholder={`e.g. Captain One
e.g. Captain Two
e.g. Captain Three`}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Paid Players List</label>
                  <span className="text-[10px] text-slate-400 font-bold">Paste list (numbering cleaned automatically)</span>
                </div>
                <textarea
                  value={playersText}
                  onChange={(e) => setPlayersText(e.target.value)}
                  rows={6}
                  className="w-full p-4 text-sm font-semibold rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition font-mono"
                  placeholder={`e.g. Player One
e.g. Player Two
e.g. Player Three
e.g. Player Four`}
                />
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartAuction}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-105 text-pitch-950 font-black shadow-lg shadow-pitch-500/20 active:scale-98 transition flex items-center justify-center gap-2"
            >
              <Hammer className="h-5 w-5" /> Start Live Auction Room
            </button>

          </div>
        </div>
      </div>
    );
  }

  // ─── 2. Active Auction Console Screen ─────────────────────────────────────
  const currentBid = getNumber(bidAmount) || getNumber(basePriceStr);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const isOverBudget = selectedTeam && currentBid > selectedTeam.remainingBudget;

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-7xl mx-auto">
      
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/50 dark:border-white/5 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-rose-500 text-xs font-black uppercase tracking-wider bg-rose-500/5 dark:bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/25 shadow-glow-green">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            Quick Standalone Room
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">{roomName}</h1>
        </div>

        {/* Action Panel Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {!isLive && !isCompleted && (
            <button
              onClick={handleGoLive}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-pitch-950 px-4 text-xs font-black transition shadow-md"
            >
              📶 Go Live & Share
            </button>
          )}
          {isLive && (
            <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 text-xs font-bold text-emerald-500">
              🟢 Live Room: {liveRoomCode}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/quick-auction/viewer?room=${liveRoomCode}`;
                  navigator.clipboard.writeText(url);
                  alert("Copied spectator watch link!");
                }}
                className="ml-1 text-[10px] underline hover:text-emerald-450 text-emerald-400 font-black"
              >
                Copy Link
              </button>
            </div>
          )}

          {history.length > 0 && !isCompleted && (
            <button
              onClick={handleUndo}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 px-4 text-xs font-bold transition"
            >
              <Undo className="h-3.5 w-3.5" /> Undo Last
            </button>
          )}

          {!isCompleted && (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-4 text-xs font-black transition shadow-md shadow-rose-500/10 active:scale-98 animate-fade-in"
            >
              <Check className="h-3.5 w-3.5" /> End Auction
            </button>
          )}

          <button
            onClick={() => setShowRostersModal(true)}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-pitch-500/10 hover:bg-pitch-500/20 text-pitch-600 dark:text-pitch-400 px-4 text-xs font-black border border-pitch-500/25 transition"
          >
            <Users className="h-3.5 w-3.5" /> View Team Rosters ({teams.length})
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 px-4 text-xs font-bold transition"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Re-configure
          </button>
        </div>
      </div>

      {/* Progress HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Drafted Players</span>
            <h4 className="text-xl font-black mt-1 text-slate-900 dark:text-white">
              {soldCount} <span className="text-xs text-slate-400">/ {totalPlayersToBid}</span>
            </h4>
          </div>
          <CheckCircle2 className="h-8 w-8 text-pitch-500 opacity-60" />
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Unsold Pool</span>
            <h4 className="text-xl font-black mt-1 text-slate-900 dark:text-white">{skippedCount}</h4>
          </div>
          <AlertCircle className="h-8 w-8 text-amber-500 opacity-60" />
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Available Pool</span>
            <h4 className="text-xl font-black mt-1 text-slate-900 dark:text-white">{availableCount}</h4>
          </div>
          <Clock className="h-8 w-8 text-blue-500 opacity-60" />
        </div>

        {/* Progression bar */}
        <div className="glass-card rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] flex flex-col justify-center">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">
            <span>Draft Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/5 h-2.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-pitch-500 to-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Main Console Layout */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Left column: Players List (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
            
            {/* List header tabs */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex gap-1">
                {[
                  { id: "available", label: "Available", count: availableCount },
                  { id: "skipped", label: "Unsold", count: skippedCount },
                  { id: "sold", label: "Drafted", count: soldCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSidebarTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-tight transition ${
                      sidebarTab === tab.id
                        ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label} <span className="opacity-60 text-[10px]">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-[10px] font-black border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-xl px-2 py-1 focus:outline-none"
              >
                <option value="default">Sort: Default</option>
                <option value="name">Sort: Name</option>
                <option value="role">Sort: Role</option>
              </select>
            </div>

            {renderAvailableList()}
          </div>
        </div>

        {/* Center column: Main bidding portal (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm relative min-h-[480px] flex flex-col justify-between overflow-hidden">
            
            {/* Shuffling animation overlay */}
            <AnimatePresence>
              {isShuffling && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/90 dark:bg-pitch-950/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center space-y-6"
                >
                  <Shuffle className="h-12 w-12 text-pitch-500 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-pitch-500">Choosing Next Player</h3>
                    <div className="h-16 overflow-hidden">
                      <AnimatePresence mode="popLayout">
                        <motion.h2
                          key={shufflingPlayer?.name}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          className="text-2xl font-black text-white"
                        >
                          {shufflingPlayer?.name}
                        </motion.h2>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Display messaging feedback */}
            {actionMsg && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 border text-xs font-black mb-4 ${
                  actionMsg.type === "success"
                    ? "bg-pitch-500/10 border-pitch-500/20 text-pitch-700 dark:text-pitch-400"
                    : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                }`}
              >
                {actionMsg.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{actionMsg.text}</span>
              </div>
            )}

            {isCompleted ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10 animate-fade-in">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 flex items-center justify-center text-pitch-950 shadow-lg shadow-pitch-500/20">
                  <Trophy className="h-10 w-10 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Auction Ended Successfully!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-2 mx-auto">
                    All player squads are finalized. Copy the final results to WhatsApp or download the Excel sheet to share with your league.
                  </p>
                </div>

                 <div className="grid gap-3 sm:grid-cols-3 w-full max-w-2xl pt-2">
                  <button
                    onClick={handleCopyWhatsApp}
                    className="h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-pitch-500/10"
                  >
                    {copiedRosters ? <Check className="h-4.5 w-4.5" /> : <Share2 className="h-4.5 w-4.5" />}
                    {copiedRosters ? "Copied to Clipboard!" : "Copy for WhatsApp"}
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                  >
                    <FileSpreadsheet className="h-4.5 w-4.5" /> Excel (.xlsx)
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 animate-fade-in"
                  >
                    <Download className="h-4.5 w-4.5" /> PDF (.pdf)
                  </button>
                </div>
                
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  Start New Draft / Re-configure
                </button>
              </div>
            ) : selectedPlayer ? (
              <div className="flex-1 flex flex-col justify-between space-y-6">
                
                {/* Active Player Card HUD */}
                <div className="grid gap-6 md:grid-cols-12 items-center border-b border-slate-100 dark:border-white/5 pb-6">
                  
                  {/* Left avatar placeholder */}
                  <div className="md:col-span-3 flex justify-center">
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-emerald-500/20 border border-pitch-500/25 flex items-center justify-center font-black text-3xl text-pitch-600 dark:text-pitch-400 relative">
                      {selectedPlayer.name.charAt(0)}
                      <UserCircle className="absolute bottom-1.5 right-1.5 h-5 w-5 opacity-40 text-slate-500" />
                    </div>
                  </div>

                  {/* Right metadata */}
                  <div className="md:col-span-9 space-y-2 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Assign Role:</label>
                      <select
                        value={selectedPlayer.role}
                        onChange={(e) => handleUpdateRole(selectedPlayer.registrationId, e.target.value as any)}
                        className={`text-xs font-black px-3 py-1 rounded-full border ${ROLE_COLORS[selectedPlayer.role]} focus:outline-none cursor-pointer bg-transparent`}
                      >
                        <option value="unknown" className="text-slate-800 bg-white dark:text-white dark:bg-pitch-950 font-bold">Unknown / Unassigned</option>
                        <option value="batsman" className="text-slate-800 bg-white dark:text-white dark:bg-pitch-950 font-bold">Batsman</option>
                        <option value="bowler" className="text-slate-800 bg-white dark:text-white dark:bg-pitch-950 font-bold">Bowler</option>
                        <option value="all_rounder" className="text-slate-800 bg-white dark:text-white dark:bg-pitch-950 font-bold">All-Rounder</option>
                        <option value="wicket_keeper" className="text-slate-800 bg-white dark:text-white dark:bg-pitch-950 font-bold">Wicket Keeper</option>
                      </select>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{selectedPlayer.name}</h2>
                    <p className="text-xs text-slate-400 font-bold">
                      Status: {selectedPlayer.purchaseStatus === "skipped" ? "Unsold Pool" : "Available to Draft"}
                    </p>
                  </div>
                </div>

                {/* Bidding Control Panel */}
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Select Purchasing Team */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">Assign to Team</label>
                    <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {teams.map((team) => {
                        const isSelected = selectedTeamId === team.id;
                        return (
                          <button
                            key={team.id}
                            onClick={() => setSelectedTeamId(team.id)}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-bold transition ${
                              isSelected
                                ? "border-pitch-500 bg-pitch-500/10 text-pitch-950 dark:text-pitch-400 font-black"
                                : "border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="truncate">{team.name}</span>
                            <span className="opacity-60 shrink-0 ml-2">({formatAmount(team.remainingBudget)} Left)</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                   {/* Input Bid Price */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2">Final Bid Cost</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={Math.max(1, Math.round(getNumber(basePriceStr) * 0.1))}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={`e.g. ${basePriceStr}`}
                          className={`w-full rounded-xl border ${
                            isOverBudget
                              ? "border-red-500 bg-red-500/5"
                              : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]"
                          } pl-8 pr-8 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-pitch-500 dark:focus:border-pitch-400 transition font-black`}
                        />
                      </div>
                    </div>

                    {/* Quick increment buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "+10k", val: 10000, labelPts: "+10", valPts: 10 },
                        { label: "+50k", val: 50000, labelPts: "+50", valPts: 50 },
                        { label: "+1L", val: 100000, labelPts: "+100", valPts: 100 },
                        { label: "+5L", val: 500000, labelPts: "+500", valPts: 500 },
                      ].map((btn) => {
                        const lbl = currencySymbol === "₹" ? btn.label : btn.labelPts;
                        const v = currencySymbol === "₹" ? btn.val : btn.valPts;
                        return (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={() => handleIncrement(v)}
                            className="h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[10px] font-black text-slate-700 dark:text-slate-300 transition"
                          >
                            {lbl}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Finalize decision */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
                  <button
                    onClick={handleSkip}
                    className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-400 font-bold text-xs transition"
                  >
                    Skip Player (Unsold)
                  </button>

                  <button
                    onClick={handleSell}
                    disabled={!selectedTeamId || isOverBudget || !bidAmount}
                    className={`h-11 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                      isOverBudget
                        ? "bg-red-500/10 border border-red-500/25 text-red-500 cursor-not-allowed"
                        : "bg-pitch-500 hover:bg-pitch-600 text-pitch-950 shadow-lg shadow-pitch-500/20 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                  >
                    <Hammer className="h-4 w-4" />
                    {isOverBudget ? "Over Team Budget!" : "Sell Player"}
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                <div className="h-16 w-16 rounded-3xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400">
                  <Hammer className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Active Draft Panel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-2 mx-auto">
                    No player is currently selected. Click a player on the left panel or click below to shuffle pick!
                  </p>
                </div>
                
                {(availableCount > 0 || skippedCount > 0) && (
                  <button
                    onClick={pickRandom}
                    className="h-12 px-6 rounded-2xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-lg shadow-pitch-500/20 active:scale-98 transition flex items-center gap-2 text-xs"
                  >
                    <Shuffle className="h-4 w-4" /> Shuffle Pick Next Player
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Live Commentary (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Live Commentary box */}
          <div className="glass-card rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live Commentary
            </h3>
            <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-1">
              {commentaryLogs.slice(0, 10).map((log, idx) => (
                <div key={idx} className="flex gap-2 items-start text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2">
                  <ChevronRight className="h-3 w-3 shrink-0 text-pitch-500 mt-0.5" />
                  <span>{log}</span>
                </div>
              ))}
              {commentaryLogs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Waiting for auction events...</p>
              )}
            </div>
          </div>

          {/* History Feed */}
          <div className="glass-card rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Recent Activity
            </h3>
            <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
              {history.slice(0, 5).map((item) => (
                <div key={item.id} className="text-xs flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{item.playerName}</span>
                    <span className="text-[10px] text-slate-450 block">
                      {item.status === "sold" ? `Sold to ${item.teamName}` : "Unsold"}
                    </span>
                  </div>
                  <span className="font-black text-slate-500 text-[10px]">
                    {item.status === "sold" ? formatAmount(item.purchaseAmount) : "Passed"}
                  </span>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No recent activity.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Team Roster Grid (Public and Logged in) */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
          Roster Summaries
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const teamPlayers = players.filter((p) => p.purchaseTeamId === team.id && p.purchaseStatus === "sold");
            const captain = teamPlayers.find(p => p.registeredAt === "captain");
            const otherPlayers = teamPlayers.filter(p => p.registeredAt !== "captain");

            return (
              <div
                key={team.id}
                className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Roster Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{team.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" /> {teamPlayers.length} Players
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Left Budget</span>
                      <span className="text-xs font-black text-pitch-600 dark:text-pitch-400">
                        {formatAmount(team.remainingBudget)}
                      </span>
                    </div>
                  </div>

                  {/* Player list */}
                  <div className="pt-3 space-y-2">
                    {/* Render Captain */}
                    {captain && (
                      <div className="flex justify-between items-center text-xs p-1.5 rounded-lg border border-yellow-500/10 bg-yellow-500/5">
                        <span className="font-bold flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                          <Crown className="h-3.5 w-3.5 fill-current shrink-0" /> {captain.name}
                        </span>
                        <span className="text-[9px] font-black uppercase text-yellow-700 dark:text-yellow-400">Captain</span>
                      </div>
                    )}

                    {otherPlayers.map((p) => (
                      <div key={p.registrationId} className="flex justify-between items-center text-xs py-1 group">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{p.name}</span>
                          <span className="text-[9px] text-slate-400 block -mt-0.5">{ROLE_LABELS[p.role]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-white">
                            {formatAmount(p.purchaseAmount)}
                          </span>
                          {!isCompleted && (
                            <button
                              onClick={() => handleReleasePlayer(p)}
                              title="Release player back to draft pool"
                              className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-0.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {teamPlayers.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No picks drafted yet</p>
                    )}
                  </div>
                </div>

                {/* Spent status bar */}
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

      {/* Roster actions modal */}
      {showRostersModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl rounded-3xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-900 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Draft Results & Export</h3>
              <button onClick={() => setShowRostersModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Draft completed! You can copy the final rosters formatted beautifully for your WhatsApp groups, or download a professional Excel spreadsheet or PDF report containing team squads and budgets.
              </p>

              {/* Action grid */}
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  onClick={handleCopyWhatsApp}
                  className="h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-pitch-500/10"
                >
                  {copiedRosters ? <Check className="h-4.5 w-4.5" /> : <Share2 className="h-4.5 w-4.5" />}
                  {copiedRosters ? "Copied to Clipboard!" : "Copy for WhatsApp Group"}
                </button>

                <button
                  onClick={handleExportExcel}
                  className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                >
                  <FileSpreadsheet className="h-4.5 w-4.5" /> Export to Excel (.xlsx)
                </button>

                <button
                  onClick={handleExportPDF}
                  className="h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10"
                >
                  <Download className="h-4.5 w-4.5" /> Export to PDF (.pdf)
                </button>
              </div>
            </div>

            {/* Quick summary view */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Quick Team View</h4>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {teams.map((t) => {
                  const teamPlayers = players.filter((p) => p.purchaseTeamId === t.id && p.purchaseStatus === "sold");
                  return (
                    <div key={t.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                        <span className="text-[10px] text-slate-400 ml-2">({teamPlayers.length} players)</span>
                      </div>
                      <span className="font-semibold text-slate-500">
                        Spent: {formatAmount(t.budget - t.remainingBudget)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Re-configure confirm Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-900 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Restart & Re-configure?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Warning: Resetting the room will discard the current live draft progress, roster choices, and histories. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white transition"
              >
                Reset Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Auction confirm Dialog */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-900 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">End Auction & Lock Rosters?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to end this auction? Bidding and edits will be disabled, and you can download the final spreadsheets and rosters.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteAuction}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition"
              >
                End Auction
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
