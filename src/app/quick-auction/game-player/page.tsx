"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Trophy,
  Users,
  Hammer,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Crown,
  Smile,
  Zap,
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  XCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Helper to convert formatting strings to numbers
const getNumber = (val: string): number => {
  return parseInt(val.replace(/,/g, ""), 10) || 0;
};

// Formatting currency/INR amounts helper
const formatAmount = (amount: number, symbol: string = "₹") => {
  if (symbol === "₹") {
    if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
    if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `${amount.toLocaleString()} ${symbol}`;
};

// Predefined cricketer role mappings
const ROLE_LABELS = {
  batsman: "Batsman",
  bowler: "Bowler",
  all_rounder: "All-Rounder",
  wicket_keeper: "Wicket Keeper",
  unknown: "Unknown / Unassigned",
};

const ROLE_COLORS = {
  batsman: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  bowler: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
  all_rounder: "text-pitch-600 dark:text-pitch-400 bg-pitch-500/10 border-pitch-500/20",
  wicket_keeper: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  unknown: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
};

export type PoolPlayer = {
  name: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper" | "unknown";
  basePrice: number;
};

export type GameTeam = {
  id: string;
  name: string;
  managerName: string;
  budget: number;
  remainingBudget: number;
  playerCount: number;
  players: Array<{ name: string; role: string; purchaseAmount: number }>;
};

const PRELOADED_IPL_PLAYERS: PoolPlayer[] = [
  // Wicket Keepers (15)
  { name: "MS Dhoni", role: "wicket_keeper", basePrice: 100000 },
  { name: "Rishabh Pant", role: "wicket_keeper", basePrice: 100000 },
  { name: "KL Rahul", role: "wicket_keeper", basePrice: 100000 },
  { name: "Sanju Samson", role: "wicket_keeper", basePrice: 100000 },
  { name: "Heinrich Klaasen", role: "wicket_keeper", basePrice: 100000 },
  { name: "Nicholas Pooran", role: "wicket_keeper", basePrice: 100000 },
  { name: "Jos Buttler", role: "wicket_keeper", basePrice: 100000 },
  { name: "Quinton de Kock", role: "wicket_keeper", basePrice: 100000 },
  { name: "Phil Salt", role: "wicket_keeper", basePrice: 100000 },
  { name: "Ishan Kishan", role: "wicket_keeper", basePrice: 100000 },
  { name: "Rahmanullah Gurbaz", role: "wicket_keeper", basePrice: 100000 },
  { name: "Dinesh Karthik", role: "wicket_keeper", basePrice: 100000 },
  { name: "Jitesh Sharma", role: "wicket_keeper", basePrice: 100000 },
  { name: "Dhruv Jurel", role: "wicket_keeper", basePrice: 100000 },
  { name: "Tristan Stubbs", role: "wicket_keeper", basePrice: 100000 },

  // Batsmen (30)
  { name: "Virat Kohli", role: "batsman", basePrice: 100000 },
  { name: "Rohit Sharma", role: "batsman", basePrice: 100000 },
  { name: "Shubman Gill", role: "batsman", basePrice: 100000 },
  { name: "Suryakumar Yadav", role: "batsman", basePrice: 100000 },
  { name: "Yashasvi Jaiswal", role: "batsman", basePrice: 100000 },
  { name: "Travis Head", role: "batsman", basePrice: 100000 },
  { name: "David Warner", role: "batsman", basePrice: 100000 },
  { name: "Kane Williamson", role: "batsman", basePrice: 100000 },
  { name: "Steve Smith", role: "batsman", basePrice: 100000 },
  { name: "Babar Azam", role: "batsman", basePrice: 100000 },
  { name: "Rinku Singh", role: "batsman", basePrice: 100000 },
  { name: "Shreyas Iyer", role: "batsman", basePrice: 100000 },
  { name: "Harry Brook", role: "batsman", basePrice: 100000 },
  { name: "Faf du Plessis", role: "batsman", basePrice: 100000 },
  { name: "Devon Conway", role: "batsman", basePrice: 100000 },
  { name: "Ruturaj Gaikwad", role: "batsman", basePrice: 100000 },
  { name: "Sai Sudharsan", role: "batsman", basePrice: 100000 },
  { name: "Tilak Varma", role: "batsman", basePrice: 100000 },
  { name: "Rovman Powell", role: "batsman", basePrice: 100000 },
  { name: "David Miller", role: "batsman", basePrice: 100000 },
  { name: "Shimron Hetmyer", role: "batsman", basePrice: 100000 },
  { name: "Aiden Markram", role: "batsman", basePrice: 100000 },
  { name: "Joe Root", role: "batsman", basePrice: 100000 },
  { name: "Tom Latham", role: "batsman", basePrice: 100000 },
  { name: "Jake Fraser-McGurk", role: "batsman", basePrice: 100000 },
  { name: "Rachin Ravindra", role: "batsman", basePrice: 100000 },
  { name: "Ajinkya Rahane", role: "batsman", basePrice: 100000 },
  { name: "Nitish Rana", role: "batsman", basePrice: 100000 },
  { name: "Manish Pandey", role: "batsman", basePrice: 100000 },
  { name: "Mayank Agarwal", role: "batsman", basePrice: 100000 },

  // All-Rounders (25)
  { name: "Hardik Pandya", role: "all_rounder", basePrice: 100000 },
  { name: "Ravindra Jadeja", role: "all_rounder", basePrice: 100000 },
  { name: "Glenn Maxwell", role: "all_rounder", basePrice: 100000 },
  { name: "Andre Russell", role: "all_rounder", basePrice: 100000 },
  { name: "Sunil Narine", role: "all_rounder", basePrice: 100000 },
  { name: "Sam Curran", role: "all_rounder", basePrice: 100000 },
  { name: "Axar Patel", role: "all_rounder", basePrice: 100000 },
  { name: "Marcus Stoinis", role: "all_rounder", basePrice: 100000 },
  { name: "Cameron Green", role: "all_rounder", basePrice: 100000 },
  { name: "Daryl Mitchell", role: "all_rounder", basePrice: 100000 },
  { name: "Wanindu Hasaranga", role: "all_rounder", basePrice: 100000 },
  { name: "Shakib Al Hasan", role: "all_rounder", basePrice: 100000 },
  { name: "Liam Livingstone", role: "all_rounder", basePrice: 100000 },
  { name: "Shivam Dube", role: "all_rounder", basePrice: 100000 },
  { name: "Nitish Kumar Reddy", role: "all_rounder", basePrice: 100000 },
  { name: "Krunal Pandya", role: "all_rounder", basePrice: 100000 },
  { name: "Washington Sundar", role: "all_rounder", basePrice: 100000 },
  { name: "Venkatesh Iyer", role: "all_rounder", basePrice: 100000 },
  { name: "Romario Shepherd", role: "all_rounder", basePrice: 100000 },
  { name: "Tim David", role: "all_rounder", basePrice: 100000 },
  { name: "Marco Jansen", role: "all_rounder", basePrice: 100000 },
  { name: "Chris Woakes", role: "all_rounder", basePrice: 100000 },
  { name: "Jason Holder", role: "all_rounder", basePrice: 100000 },
  { name: "Vijay Shankar", role: "all_rounder", basePrice: 100000 },
  { name: "Deepak Hooda", role: "all_rounder", basePrice: 100000 },

  // Bowlers (30)
  { name: "Jasprit Bumrah", role: "bowler", basePrice: 100000 },
  { name: "Mitchell Starc", role: "bowler", basePrice: 100000 },
  { name: "Pat Cummins", role: "bowler", basePrice: 100000 },
  { name: "Rashid Khan", role: "bowler", basePrice: 100000 },
  { name: "Trent Boult", role: "bowler", basePrice: 100000 },
  { name: "Kagiso Rabada", role: "bowler", basePrice: 100000 },
  { name: "Mohammed Siraj", role: "bowler", basePrice: 100000 },
  { name: "Kuldeep Yadav", role: "bowler", basePrice: 100000 },
  { name: "Yuzvendra Chahal", role: "bowler", basePrice: 100000 },
  { name: "Matheesha Pathirana", role: "bowler", basePrice: 100000 },
  { name: "Josh Hazlewood", role: "bowler", basePrice: 100000 },
  { name: "Shaheen Afridi", role: "bowler", basePrice: 100000 },
  { name: "Anrich Nortje", role: "bowler", basePrice: 100000 },
  { name: "Adam Zampa", role: "bowler", basePrice: 100000 },
  { name: "Ravi Bishnoi", role: "bowler", basePrice: 100000 },
  { name: "Arshdeep Singh", role: "bowler", basePrice: 100000 },
  { name: "Sandeep Sharma", role: "bowler", basePrice: 100000 },
  { name: "Harshal Patel", role: "bowler", basePrice: 100000 },
  { name: "Naveen-ul-Haq", role: "bowler", basePrice: 100000 },
  { name: "Maheesh Theekshana", role: "bowler", basePrice: 100000 },
  { name: "Deepak Chahar", role: "bowler", basePrice: 100000 },
  { name: "Bhuvneshwar Kumar", role: "bowler", basePrice: 100000 },
  { name: "T Natarajan", role: "bowler", basePrice: 100000 },
  { name: "Shardul Thakur", role: "bowler", basePrice: 100000 },
  { name: "Lockie Ferguson", role: "bowler", basePrice: 100000 },
  { name: "Nathan Ellis", role: "bowler", basePrice: 100000 },
  { name: "Mustafizur Rahman", role: "bowler", basePrice: 100000 },
  { name: "Gerald Coetzee", role: "bowler", basePrice: 100000 },
  { name: "Akash Deep", role: "bowler", basePrice: 100000 },
  { name: "Varun Chakaravarthy", role: "bowler", basePrice: 100000 }
];

function parseNames(text: string): string[] {
  return text
    .split("\n")
    .map((line) => {
      let cleaned = line.replace(/^\s*(?:\d+[\s,.)\]-]*|[-•*+]+)\s*/, "");
      cleaned = cleaned.trim();
      return cleaned;
    })
    .filter((name) => name.length > 0);
}

function GamePlayerContent() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room") || "";

  // View States
  const [viewMode, setViewMode] = useState<"chooser" | "create" | "join" | "board" | "player">("chooser");

  // Create Room Setup Form States
  const [presetType, setPresetType] = useState<"custom" | "ipl">("ipl");
  const [roomName, setRoomName] = useState("IPL 1 Crore Dream Team Draft");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [totalBudgetStr, setTotalBudgetStr] = useState("10,000,000"); // 1 Crore
  const [basePriceStr, setBasePriceStr] = useState("100,000"); // 1 Lakh
  const [minIncrementStr, setMinIncrementStr] = useState("50,000"); // 50K
  const [capText, setCapText] = useState("");
  const [playText, setPlayText] = useState("");

  useEffect(() => {
    // Fill IPL defaults by default on mount
    setCapText([
      "Chennai Super Kings",
      "Mumbai Indians",
      "Royal Challengers Bengaluru",
      "Kolkata Knight Riders",
      "Sunrisers Hyderabad",
      "Rajasthan Royals",
      "Delhi Capitals",
      "Gujarat Titans",
      "Lucknow Super Giants",
      "Punjab Kings"
    ].join("\n"));
    setPlayText(PRELOADED_IPL_PLAYERS.map(p => p.name).join("\n"));
  }, []);

  const handlePresetChange = (type: "custom" | "ipl") => {
    setPresetType(type);
    if (type === "ipl") {
      setRoomName("IPL 1 Crore Dream Team Draft");
      setTotalBudgetStr("10,000,000");
      setBasePriceStr("100,000");
      setMinIncrementStr("50,000");
      setCapText([
        "Chennai Super Kings",
        "Mumbai Indians",
        "Royal Challengers Bengaluru",
        "Kolkata Knight Riders",
        "Sunrisers Hyderabad",
        "Rajasthan Royals",
        "Delhi Capitals",
        "Gujarat Titans",
        "Lucknow Super Giants",
        "Punjab Kings"
      ].join("\n"));
      setPlayText(PRELOADED_IPL_PLAYERS.map(p => p.name).join("\n"));
    } else {
      setRoomName("");
      setTotalBudgetStr("");
      setBasePriceStr("");
      setMinIncrementStr("");
      setCapText("");
      setPlayText("");
    }
  };

  // Room Bidding Game States (for both Creator/Board and Bidders)
  const [gameStatus, setGameStatus] = useState<"setup" | "lobby" | "active" | "completed">("setup");
  const [roomCode, setRoomCode] = useState(roomParam);
  const [playerName, setPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Active Draft Variables
  const [connectedPlayers, setConnectedPlayers] = useState<Array<{ name: string; teamId: string }>>([]);
  const [teams, setTeams] = useState<GameTeam[]>([]);
  const [playersPool, setPlayersPool] = useState<PoolPlayer[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentBiddingPlayer, setCurrentBiddingPlayer] = useState<PoolPlayer | null>(null);
  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [currentHighestBidderId, setCurrentHighestBidderId] = useState<string | null>(null);
  const [timerValue, setTimerValue] = useState(30);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [gameCommentary, setGameCommentary] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Host Player & Pass Bidding States
  const [hostClaimedTeamId, setHostClaimedTeamId] = useState<string | null>(null);
  const [passedManagers, setPassedManagers] = useState<string[]>([]);

  // Bidder Local Bid Input State
  const [bidAmount, setBidAmount] = useState("");
  const [hostBidAmount, setHostBidAmount] = useState("");

  // Sound option
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Channels & Interval references
  const channelRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Refs to avoid stale closures in socket callbacks
  const roomNameRef = useRef(roomName);
  const currencySymbolRef = useRef(currencySymbol);
  const gameStatusRef = useRef(gameStatus);
  const connectedPlayersRef = useRef(connectedPlayers);
  const teamsRef = useRef(teams);
  const currentBiddingPlayerRef = useRef(currentBiddingPlayer);
  const currentHighestBidRef = useRef(currentHighestBid);
  const currentHighestBidderIdRef = useRef(currentHighestBidderId);
  const timerValueRef = useRef(timerValue);
  const historyRef = useRef(history);
  const gameCommentaryRef = useRef(gameCommentary);
  const passedManagersRef = useRef(passedManagers);
  const hostClaimedTeamIdRef = useRef(hostClaimedTeamId);

  useEffect(() => { roomNameRef.current = roomName; }, [roomName]);
  useEffect(() => { currencySymbolRef.current = currencySymbol; }, [currencySymbol]);
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { connectedPlayersRef.current = connectedPlayers; }, [connectedPlayers]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);
  useEffect(() => { currentBiddingPlayerRef.current = currentBiddingPlayer; }, [currentBiddingPlayer]);
  useEffect(() => { currentHighestBidRef.current = currentHighestBid; }, [currentHighestBid]);
  useEffect(() => { currentHighestBidderIdRef.current = currentHighestBidderId; }, [currentHighestBidderId]);
  useEffect(() => { timerValueRef.current = timerValue; }, [timerValue]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { gameCommentaryRef.current = gameCommentary; }, [gameCommentary]);
  useEffect(() => { passedManagersRef.current = passedManagers; }, [passedManagers]);
  useEffect(() => { hostClaimedTeamIdRef.current = hostClaimedTeamId; }, [hostClaimedTeamId]);

  // play audio helper
  const playSound = useCallback((frequency: number, type: OscillatorType = "sine", duration: number = 0.1) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio API unsupported or blocked", e);
    }
  }, [soundEnabled]);

  // Broadcast state helper (for board creator)
  const broadcastGameState = useCallback((
    status: typeof gameStatus,
    pl: typeof connectedPlayers,
    tm: typeof teams,
    activePlayer: PoolPlayer | null,
    bid: number,
    bidderId: string | null,
    timer: number,
    hist: any[],
    comments: string[]
  ) => {
    if (channelRef.current) {
      channelRef.current.send({
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
          roomName: roomNameRef.current,
          currencySymbol: currencySymbolRef.current,
          passedManagers: passedManagersRef.current,
        },
      });
    }
  }, []);

  // ─── Creator Setup Actions ──────────────────────────────────────────────────
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCaptains = parseNames(capText);
    const parsedPlayers = parseNames(playText);

    if (!roomName.trim()) {
      setErrorMsg("Please enter an auction room title.");
      return;
    }
    if (parsedCaptains.length < 2) {
      setErrorMsg("Please paste/enter at least 2 Captain/Owner names.");
      return;
    }
    if (parsedPlayers.length === 0) {
      setErrorMsg("Please paste/enter cricketer names to bid on.");
      return;
    }

    const generatedCode = "GAME-" + Math.floor(100000 + Math.random() * 900000).toString();
    const initialTeams: GameTeam[] = parsedCaptains.map((capName, idx) => ({
      id: `team-${idx}`,
      name: capName,
      managerName: "",
      budget: getNumber(totalBudgetStr),
      remainingBudget: getNumber(totalBudgetStr),
      playerCount: 0,
      players: [],
    }));

    const initialPlayers: PoolPlayer[] = parsedPlayers.map((name) => {
      const match = PRELOADED_IPL_PLAYERS.find(
        (p) => p.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      return {
        name,
        role: match ? match.role : "unknown",
        basePrice: getNumber(basePriceStr),
      };
    });

    // Setup room local states
    setRoomCode(generatedCode);
    setTeams(initialTeams);
    setPlayersPool(initialPlayers);
    setGameStatus("lobby");
    setConnectedPlayers([]);
    const commentaryInit = [`Multiplayer Bidding Lobby created for "${roomName}"!`];
    setGameCommentary(commentaryInit);

    // Initialize Supabase Channel as Board Host
    const supabase = createClient();
    const channel = supabase.channel(`quick-auction-game:${generatedCode}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "request_lobby_state" }, () => {
        broadcastGameState(
          gameStatusRef.current,
          connectedPlayersRef.current,
          teamsRef.current,
          currentBiddingPlayerRef.current,
          currentHighestBidRef.current,
          currentHighestBidderIdRef.current,
          timerValueRef.current,
          historyRef.current,
          gameCommentaryRef.current
        );
      })
      .on("broadcast", { event: "player_join_request" }, ({ payload }) => {
        if (!payload) return;
        const { playerName: bidderName, teamId } = payload;
        playSound(440, "triangle", 0.15);

        setConnectedPlayers((prev) => {
          const exists = prev.some((p) => p.teamId === teamId);
          if (exists) return prev;
          const updated = [...prev, { name: bidderName, teamId }];

          setTeams((prevTeams) => {
            const updatedTeams = prevTeams.map((t) =>
              t.id === teamId ? { ...t, managerName: bidderName } : t
            );
            broadcastGameState("lobby", updated, updatedTeams, null, 0, null, 5, [], [`Manager "${bidderName}" connected to Team ${prevTeams.find(t=>t.id===teamId)?.name}`]);
            return updatedTeams;
          });

          return updated;
        });
      })
      .on("broadcast", { event: "player_pass_action" }, ({ payload }) => {
        if (!payload) return;
        const { teamId } = payload;

        setPassedManagers((prevPassed) => {
          if (prevPassed.includes(teamId)) return prevPassed;
          const updatedPassed = [...prevPassed, teamId];
          passedManagersRef.current = updatedPassed;

          const team = teamsRef.current.find(t => t.id === teamId);
          const passLogText = `Manager "${team?.managerName || team?.name || teamId}" is Not Interested.`;

          setGameCommentary((prevLogs) => {
            const updatedLogs = [passLogText, ...prevLogs];

            const activeConnectedTeamIds = connectedPlayersRef.current
              .map(p => p.teamId)
              .filter(tId => {
                const tm = teamsRef.current.find(t => t.id === tId);
                return tm ? tm.playerCount < 10 : false;
              });

            const allPassed = activeConnectedTeamIds.length > 0 && activeConnectedTeamIds.every(tId => updatedPassed.includes(tId));

            broadcastGameState(
              "active",
              connectedPlayersRef.current,
              teamsRef.current,
              currentBiddingPlayerRef.current,
              currentHighestBidRef.current,
              currentHighestBidderIdRef.current,
              timerValueRef.current,
              historyRef.current,
              updatedLogs
            );

            if (allPassed) {
              setTimeout(() => {
                resolveNomination();
              }, 600);
            }

            return updatedLogs;
          });

          return updatedPassed;
        });
      })
      .on("broadcast", { event: "place_bid_action" }, ({ payload }) => {
        if (!payload) return;
        const { teamId, amount } = payload;

        setTeams((prevTeams) => {
          const team = prevTeams.find((t) => t.id === teamId);
          if (!team || amount > team.remainingBudget || team.playerCount >= 10) return prevTeams;
          playSound(660, "sine", 0.1);

          setPassedManagers((prevPassed) => {
            const updatedPassed = prevPassed.filter((id) => id !== teamId);
            passedManagersRef.current = updatedPassed;

            setCurrentHighestBid(amount);
            setCurrentHighestBidderId(teamId);
            setTimerValue(30); // Reset timer to 30s on bid

            const bidderText = `Manager "${team.managerName || team.name}" bid ${formatAmount(amount, currencySymbol)}!`;
            setGameCommentary((prevLogs) => {
              const updatedLogs = [bidderText, ...prevLogs];
              broadcastGameState(
                "active",
                connectedPlayersRef.current,
                prevTeams,
                currentBiddingPlayerRef.current,
                amount,
                teamId,
                30,
                historyRef.current,
                updatedLogs
              );
              return updatedLogs;
            });

            return updatedPassed;
          });

          return prevTeams;
        });
      });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channelRef.current = channel;
        setViewMode("board");
        setErrorMsg("");
      } else {
        setErrorMsg("Failed to establish real-time connection. Please try again.");
      }
    });
  };

  // ─── Board Draft Controls ───────────────────────────────────────────────────
  const resolveNomination = useCallback(() => {
    if (!currentBiddingPlayer) return;

    let updatedTeams = [...teams];
    let resolvedText = "";
    let completedText = "";
    let nextHistory = [...history];

    if (currentHighestBidderId && currentHighestBid > 0) {
      const bidderTeam = teams.find((t) => t.id === currentHighestBidderId);
      resolvedText = `🔨 SOLD! ${currentBiddingPlayer.name} goes to Team ${bidderTeam ? bidderTeam.name : currentHighestBidderId} for ${formatAmount(currentHighestBid, currencySymbol)}!`;
      playSound(880, "triangle", 0.4);
      updatedTeams = teams.map((t) => {
        if (t.id === currentHighestBidderId) {
          const newCount = t.playerCount + 1;
          if (newCount === 10) {
            completedText = `🎉 ${t.name} has completed their squad of 10 players!`;
          }
          return {
            ...t,
            remainingBudget: t.remainingBudget - currentHighestBid,
            playerCount: newCount,
            players: [...(t.players || []), { name: currentBiddingPlayer.name, role: currentBiddingPlayer.role, purchaseAmount: currentHighestBid }],
          };
        }
        return t;
      });

      nextHistory = [
        {
          id: `hist-${Date.now()}`,
          playerName: currentBiddingPlayer.name,
          teamName: bidderTeam ? bidderTeam.name : currentHighestBidderId,
          purchaseAmount: currentHighestBid,
          status: "sold",
        },
        ...history,
      ];
    } else {
      resolvedText = `💨 UNSOLD! ${currentBiddingPlayer.name} goes unsold and returns to the pool.`;
      playSound(220, "sawtooth", 0.35);

      nextHistory = [
        {
          id: `hist-${Date.now()}`,
          playerName: currentBiddingPlayer.name,
          teamName: null,
          purchaseAmount: 0,
          status: "skipped",
        },
        ...history,
      ];
    }

    setTeams(updatedTeams);
    setHistory(nextHistory);
    const updatedCommentary = [
      resolvedText,
      ...(completedText ? [completedText] : []),
      ...gameCommentary
    ];
    setGameCommentary(updatedCommentary);

    broadcastGameState("active", connectedPlayers, updatedTeams, null, currentHighestBid, currentHighestBidderId, 0, nextHistory, updatedCommentary);

    // Nominate next player automatically after 3 seconds
    setTimeout(() => {
      setCurrentPlayerIdx((prevIdx) => {
        const nextIdx = prevIdx + 1;
        if (nextIdx < playersPool.length) {
          const nextPlayer = playersPool[nextIdx];
          setCurrentBiddingPlayer(nextPlayer);
          setCurrentHighestBid(0);
          setCurrentHighestBidderId(null);
          setTimerValue(30);
          setPassedManagers([]);
          passedManagersRef.current = [];

          const nominateText = `Cricketer Nominated: ${nextPlayer.name} (${ROLE_LABELS[nextPlayer.role] || nextPlayer.role}). Base price: ${formatAmount(nextPlayer.basePrice, currencySymbol)}.`;
          const finalCommentary = [nominateText, ...updatedCommentary];
          setGameCommentary(finalCommentary);
          broadcastGameState("active", connectedPlayers, updatedTeams, nextPlayer, 0, null, 30, nextHistory, finalCommentary);
        } else {
          setGameStatus("completed");
          setCurrentBiddingPlayer(null);
          const endText = "🏆 Live Auction Completed! All cricketers processed.";
          const finalCommentary = [endText, ...updatedCommentary];
          setGameCommentary(finalCommentary);
          broadcastGameState("completed", connectedPlayers, updatedTeams, null, 0, null, 0, nextHistory, finalCommentary);
        }
        return nextIdx;
      });
    }, 3000);
  }, [currentBiddingPlayer, currentHighestBidderId, currentHighestBid, teams, history, gameCommentary, connectedPlayers, currencySymbol, broadcastGameState, playSound]);

  const handleStartGame = () => {
    const shuffled = [...playersPool].sort(() => Math.random() - 0.5);
    setPlayersPool(shuffled);
    setCurrentPlayerIdx(0);
    setGameStatus("active");
    setHistory([]);

    const firstPlayer = shuffled[0];
    setCurrentBiddingPlayer(firstPlayer);
    setCurrentHighestBid(0);
    setCurrentHighestBidderId(null);
    setTimerValue(30);
    setPassedManagers([]);
    passedManagersRef.current = [];
    setIsTimerPaused(false);
    playSound(523, "sine", 0.3);

    const introText = `Draft Started! Up first: ${firstPlayer.name} (${ROLE_LABELS[firstPlayer.role] || firstPlayer.role}). Base price: ${formatAmount(firstPlayer.basePrice, currencySymbol)}.`;
    const comments = [introText, "Bidding has officially commenced!"];
    setGameCommentary(comments);

    broadcastGameState("active", connectedPlayers, teams, firstPlayer, 0, null, 30, [], comments);
  };

  const handleGamePlayerRoleChange = (newRole: any) => {
    if (!currentBiddingPlayer) return;
    const updated = { ...currentBiddingPlayer, role: newRole };
    setCurrentBiddingPlayer(updated);

    setPlayersPool((prev) =>
      prev.map((p, idx) => (idx === currentPlayerIdx ? updated : p))
    );

    broadcastGameState(
      gameStatus,
      connectedPlayers,
      teams,
      updated,
      currentHighestBid,
      currentHighestBidderId,
      timerValue,
      history,
      [`Auctioneer updated ${currentBiddingPlayer.name}'s role to ${ROLE_LABELS[newRole as keyof typeof ROLE_LABELS] || newRole}`, ...gameCommentary]
    );
  };

  const handleSkipCricketer = () => {
    if (!currentBiddingPlayer || gameStatus !== "active") return;
    clearInterval(timerIntervalRef.current);
    // Force resolve as unsold
    setCurrentHighestBidderId(null);
    setCurrentHighestBid(0);
    resolveNomination();
  };

  // Timer Effect (Main Game Board only)
  useEffect(() => {
    if (viewMode !== "board" || gameStatus !== "active" || !currentBiddingPlayer || isTimerPaused) return;

    timerIntervalRef.current = setInterval(() => {
      setTimerValue((prev) => {
        if (prev > 1) {
          const nextVal = prev - 1;
          if (nextVal <= 2) playSound(330, "sine", 0.05); // tick warning
          broadcastGameState(gameStatus, connectedPlayers, teams, currentBiddingPlayer, currentHighestBid, currentHighestBidderId, nextVal, history, gameCommentary);
          return nextVal;
        } else {
          clearInterval(timerIntervalRef.current);
          resolveNomination();
          return 0;
        }
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [viewMode, gameStatus, currentBiddingPlayer, isTimerPaused, currentHighestBid, currentHighestBidderId, teams, connectedPlayers, history, gameCommentary, broadcastGameState, resolveNomination, playSound]);

  // ─── Bidder Client Actions ──────────────────────────────────────────────────
  const handleConnectJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setErrorMsg("Please enter a Room Code");
      return;
    }
    if (!playerName.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }

    setConnecting(true);
    const supabase = createClient();
    const channel = supabase.channel(`quick-auction-game:${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on("broadcast", { event: "game_state_update" }, ({ payload }) => {
        setConnecting(false);
        setErrorMsg("");
        if (payload) {
          setGameStatus(payload.gameStatus);
          setConnectedPlayers(payload.joinedPlayers || []);
          setTeams(payload.teams || []);
          setCurrentBiddingPlayer(payload.currentBiddingPlayer);
          setCurrentHighestBid(payload.currentHighestBid || 0);
          setCurrentHighestBidderId(payload.currentHighestBidderId);
          setTimerValue(payload.timerValue !== undefined ? payload.timerValue : 30);
          setGameCommentary(payload.commentary || []);
          setHistory(payload.history || []);
          setRoomName(payload.roomName || "");
          setCurrencySymbol(payload.currencySymbol || "₹");
          setPassedManagers(payload.passedManagers || []);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channelRef.current = channel;
          setViewMode("player");
          setSuccessMsg("Connected to room lobby. Select your team to participate.");
          channel.send({
            type: "broadcast",
            event: "request_lobby_state",
            payload: {},
          });
        } else {
          setConnecting(false);
          setErrorMsg("Could not connect to Room. Check the code.");
        }
      });
  };

  const handleRegisterTeam = () => {
    if (!selectedTeamId) {
      alert("Please select your Team first.");
      return;
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "player_join_request",
        payload: {
          playerName,
          teamId: selectedTeamId,
        },
      });
      setIsRegistered(true);
      setSuccessMsg(`Registered successfully as Manager for ${teams.find(t=>t.id===selectedTeamId)?.name}!`);
    }
  };

  // Bidder local input synchronization
  const stepSize = currentBiddingPlayer ? Math.max(1, Math.round(currentBiddingPlayer.basePrice * 0.1)) : 100000;
  const nextBidAmount = currentHighestBid === 0 ? (currentBiddingPlayer?.basePrice || 100000) : currentHighestBid + stepSize;

  useEffect(() => {
    if (currentBiddingPlayer) {
      setBidAmount(nextBidAmount.toString());
      setHostBidAmount(nextBidAmount.toString());
    } else {
      setBidAmount("");
      setHostBidAmount("");
    }
  }, [currentHighestBid, currentBiddingPlayer, nextBidAmount]);

  const handleBidsIncrement = (multiplier: number) => {
    if (!currentBiddingPlayer) return;
    const increment = Math.max(1, Math.round(currentBiddingPlayer.basePrice * multiplier));
    const currentVal = Number(bidAmount) || nextBidAmount;
    setBidAmount(String(currentVal + increment));
  };

  // ─── Export Roster Logic ─────────────────────────────────────────────────────
  const handleGameCopyWhatsApp = () => {
    let text = `*🏆 ${roomName || "Multiplayer Auction"} - Live Auction Rosters 🏆*\n\n`;

    teams.forEach((team) => {
      text += `*Team ${team.name}*\n`;
      text += `• Captain/Owner/Manager: ${team.managerName || "Unassigned"}\n`;
      text += `• Total Spent: ${formatAmount(team.budget - team.remainingBudget, currencySymbol)} | Left: ${formatAmount(team.remainingBudget, currencySymbol)}\n`;

      if (!team.players || team.players.length === 0) {
        text += `  _No draft picks yet_\n`;
      } else {
        team.players.forEach((p: any, index: number) => {
          text += `  ${index + 1}. ${p.name} (${ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role}) - ${formatAmount(p.purchaseAmount, currencySymbol)}\n`;
        });
      }
      text += `\n`;
    });

    text += `Generated via *TurfTitans* 🏏\n`;
    text += `Start your local cricket leagues at https://turftitans.vercel.app/\n`;

    navigator.clipboard.writeText(text);
    alert("WhatsApp rosters copied to clipboard!");
  };

  const handleGameExportExcel = () => {
    const wb = XLSX.utils.book_new();

    teams.forEach((team) => {
      const rows = (team.players || []).map((p: any, idx: number) => ({
        "S.No": idx + 1,
        "Player Name": p.name,
        "Role": ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role,
        "Purchase Amount": p.purchaseAmount,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, team.name.substring(0, 30));
    });

    XLSX.writeFile(wb, `${(roomName || "Multiplayer_Auction").replace(/\s+/g, "_")}_Rosters.xlsx`);
  };

  const handleGameExportPDF = () => {
    const doc = new jsPDF();
    let yOffset = 20;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(roomName || "Multiplayer Auction", 14, yOffset);
    yOffset += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Generated via TurfTitans - https://turftitans.vercel.app/", 14, yOffset);
    yOffset += 15;

    teams.forEach((team) => {
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Team: ${team.name} (Manager: ${team.managerName || "N/A"})`, 14, yOffset);
      yOffset += 6;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Spent: ${formatAmount(team.budget - team.remainingBudget, currencySymbol)} | Left: ${formatAmount(team.remainingBudget, currencySymbol)}`, 14, yOffset);
      yOffset += 6;

      // Draw table header
      doc.setFont("helvetica", "bold");
      doc.text("S.No", 14, yOffset);
      doc.text("Player Name", 30, yOffset);
      doc.text("Role", 110, yOffset);
      doc.text("Price", 160, yOffset);
      yOffset += 4;
      doc.line(14, yOffset, 195, yOffset);
      yOffset += 6;

      doc.setFont("helvetica", "normal");
      (team.players || []).forEach((p: any, idx: number) => {
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 20;
        }

        doc.text(String(idx + 1), 14, yOffset);
        doc.text(p.name, 30, yOffset);
        doc.text(ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role, 110, yOffset);
        doc.text(formatAmount(p.purchaseAmount, currencySymbol), 160, yOffset);
        yOffset += 7;
      });

      yOffset += 10;
    });

    doc.save(`${(roomName || "Multiplayer_Auction").replace(/\s+/g, "_")}_Rosters.pdf`);
  };

  // Clean subscription on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // ─── RENDERS ─────────────────────────────────────────────────────────────────

  // 1. Initial Chooser screen
  if (viewMode === "chooser") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-4xl space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 items-center justify-center shadow-lg shadow-pitch-500/20">
              <Zap className="h-7 w-7 text-pitch-950" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Multiplayer Auction Game</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Compete live with your friends! Set up dynamic teams, paste players, and bid in real-time.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Room Card */}
            <button
              onClick={() => setViewMode("create")}
              className="glass-card text-left rounded-3xl p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-lg hover:border-pitch-500 dark:hover:border-pitch-500 transition-all duration-300 group flex flex-col justify-between h-[240px]"
            >
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-pitch-500/10 flex items-center justify-center text-pitch-500 group-hover:scale-110 transition-transform">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Room</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Setup dynamic budgets, paste cricketer lists and captain names. Share the code to host a real-time lobby.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-pitch-500 mt-4 flex items-center gap-1">
                Start Setting Up &rarr;
              </span>
            </button>

            {/* Join Room Card */}
            <button
              onClick={() => setViewMode("join")}
              className="glass-card text-left rounded-3xl p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-lg hover:border-amber-500 dark:hover:border-amber-500 transition-all duration-300 group flex flex-col justify-between h-[240px]"
            >
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Join Room</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Have a room code? Enter the lobby, select a custom franchise team, and bid live on cricketers.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-amber-500 mt-4 flex items-center gap-1">
                Enter Room Code &rarr;
              </span>
            </button>
          </div>

          <div className="text-center">
            <Link href="/quick-auction" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Standalone Quick Auction
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Creator Setup view
  if (viewMode === "create") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-3xl glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl space-y-6 animate-fade-in">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Create Multiplayer Auction</h2>
            <button
              onClick={() => setViewMode("chooser")}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-5">
            {/* Preset Selector */}
            <div className="flex bg-slate-100 dark:bg-white/5 rounded-2xl p-1 mb-2">
              <button
                type="button"
                onClick={() => handlePresetChange("ipl")}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                  presetType === "ipl"
                    ? "bg-pitch-500 text-pitch-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                🏆 IPL Star Preset (100 Stars / 10 Franchises)
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("custom")}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
                  presetType === "custom"
                    ? "bg-pitch-500 text-pitch-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                📝 Custom WhatsApp Paste
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Auction Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WhatsApp Sunday League"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Currency / Points Symbol</label>
                <select
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition text-slate-800 dark:text-slate-200"
                >
                  <option value="₹">Indian Rupee (₹)</option>
                  <option value="pts">Points (pts)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Budget per Team</label>
                <input
                  type="text"
                  required
                  value={totalBudgetStr}
                  onChange={(e) => setTotalBudgetStr(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Starting Base Price</label>
                <input
                  type="text"
                  required
                  value={basePriceStr}
                  onChange={(e) => setBasePriceStr(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Increment Base</label>
                <input
                  type="text"
                  required
                  value={minIncrementStr}
                  onChange={(e) => setMinIncrementStr(e.target.value)}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition font-mono"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                  Captains / Owners (Teams list)
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Girish Manuja&#10;Bharat Kukreja&#10;..."
                  value={capText}
                  onChange={(e) => setCapText(e.target.value)}
                  className="w-full p-4 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                />
                <span className="text-[10px] text-slate-400 block mt-1">One captain per line. Creates a team for each name.</span>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                  Cricketers Pool list (To bid on)
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Sagar Bhairani&#10;Jagdish Kukreja&#10;..."
                  value={playText}
                  onChange={(e) => setPlayText(e.target.value)}
                  className="w-full p-4 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
                />
                <span className="text-[10px] text-slate-400 block mt-1">One name per line. Role defaults to Unknown.</span>
              </div>
            </div>

            {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-lg shadow-pitch-500/25 transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Zap className="h-4.5 w-4.5" /> Initialize Lobby & Get Code
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Join Setup view
  if (viewMode === "join") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl space-y-6 animate-fade-in">
          <div className="flex justify-between items-center pb-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Join Multiplayer Game</h2>
            <button
              onClick={() => setViewMode("chooser")}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleConnectJoinRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Lobby Room Code</label>
              <input
                type="text"
                required
                placeholder="e.g. GAME-123456"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full h-11 px-4 text-center font-black tracking-widest rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5">Your Name</label>
              <input
                type="text"
                required
                placeholder="Enter name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full h-11 px-4 font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition"
              />
            </div>

            {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}

            <button
              type="submit"
              disabled={connecting}
              className="w-full h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-lg shadow-pitch-500/25 transition active:scale-98 flex items-center justify-center gap-2"
            >
              {connecting ? "Connecting..." : "Connect to Lobby"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. MAIN GAME BOARD (Creator/TV View)
  if (viewMode === "board") {
    // Lobby view
    if (gameStatus === "lobby") {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-6 h-16 flex items-center justify-between">
            <span className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Turf<span className="text-pitch-500">Titans</span> Main Board
            </span>
            <ThemeToggle />
          </header>

          <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6 justify-center flex flex-col">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Game Lobby Active</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Lobby Code generated. Instruct players to join with the code below on their phones.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl max-w-xl mx-auto space-y-6 w-full">
              <div className="text-center bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-2xl relative overflow-hidden">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Multiplayer Room Code</span>
                <h2 className="text-4xl font-black text-pitch-500 tracking-widest mt-1.5">{roomCode}</h2>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/quick-auction/game-player?room=${roomCode}`;
                    navigator.clipboard.writeText(url);
                    alert("Join link copied!");
                  }}
                  className="text-xs text-slate-400 underline hover:text-white mt-3 block mx-auto font-semibold"
                >
                  Copy Invitation Link
                </button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Registered Teams ({connectedPlayers.length}/{teams.length})
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] flex justify-between items-center text-xs font-bold"
                    >
                      <span className="uppercase text-slate-900 dark:text-white">{t.name}</span>
                      {t.managerName ? (
                        <span className="text-pitch-500 font-extrabold flex items-center gap-1">
                          🟢 Connected: {t.managerName}
                        </span>
                      ) : (
                        <span className="text-slate-400">Waiting for manager...</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Team Claiming */}
              <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-4">
                <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Claim a Team for Yourself (Optional)
                </label>
                <select
                  value={hostClaimedTeamId || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value || null;
                    const prevId = hostClaimedTeamId;
                    setHostClaimedTeamId(selectedId);
                    
                    setTeams((prevTeams) => {
                      const updatedTeams = prevTeams.map((t) => {
                        if (prevId && t.id === prevId) {
                          return { ...t, managerName: "" };
                        }
                        if (selectedId && t.id === selectedId) {
                          return { ...t, managerName: "Host (You)" };
                        }
                        return t;
                      });
                      
                      setConnectedPlayers((prevPlayers) => {
                        let filtered = prevPlayers.filter(p => p.teamId !== prevId);
                        if (selectedId) {
                          filtered = [...filtered, { name: "Host (You)", teamId: selectedId }];
                        }
                        broadcastGameState("lobby", filtered, updatedTeams, null, 0, null, 30, [], []);
                        return filtered;
                      });
                      
                      return updatedTeams;
                    });
                  }}
                  className="w-full h-11 px-4 text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:border-pitch-500 transition text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- No Team claimed by Host --</option>
                  {teams.map((t) => {
                    const isClaimable = !t.managerName || t.managerName === "Host (You)";
                    if (!isClaimable) return null;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    );
                  })}
                </select>
                <span className="text-[10px] text-slate-400 block">
                  As host, claiming a team allows you to bid or pass directly on this board screen.
                </span>
              </div>

              <button
                onClick={handleStartGame}
                disabled={connectedPlayers.length === 0}
                className="w-full h-13 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-lg shadow-pitch-500/20 active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="h-4.5 w-4.5" /> Start Live Draft Room
              </button>
            </div>
          </main>
        </div>
      );
    }

    // Active draft view
    if (gameStatus === "active") {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-6 h-16 flex items-center justify-between">
            <span className="text-xs font-black text-pitch-600 dark:text-pitch-400 uppercase tracking-widest bg-pitch-500/5 dark:bg-pitch-500/10 px-3 py-1.5 rounded-full border border-pitch-500/20">
              Live Room: {roomCode}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-white"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Draft board (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="glass-card rounded-3xl p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-md min-h-[460px] flex flex-col justify-between relative overflow-hidden">
                  {currentBiddingPlayer ? (
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-emerald-500/20 border border-pitch-500/25 flex items-center justify-center font-black text-3xl text-pitch-600 dark:text-pitch-400 relative">
                            {currentBiddingPlayer.name.charAt(0)}
                          </div>
                          <div className={`absolute -top-3 -right-3 h-10 w-10 rounded-full flex items-center justify-center text-xs font-black shadow-lg border border-white dark:border-pitch-950 ${
                            timerValue <= 5 ? "bg-red-600 text-white animate-pulse" : "bg-pitch-500 text-pitch-950"
                          }`}>
                            <Clock className="h-3.5 w-3.5 mr-0.5" /> {timerValue}s
                          </div>
                        </div>

                        <div className="space-y-3 text-center sm:text-left flex-1">
                          {/* Host Role Dropdown */}
                          <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start">
                            <select
                              value={currentBiddingPlayer.role}
                              onChange={(e) => handleGamePlayerRoleChange(e.target.value as any)}
                              className="h-8 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-pitch-950 text-xs font-bold focus:outline-none focus:border-pitch-500 transition text-slate-800 dark:text-slate-200"
                            >
                              <option value="batsman">Batsman</option>
                              <option value="bowler">Bowler</option>
                              <option value="all_rounder">All-Rounder</option>
                              <option value="wicket_keeper">Wicket Keeper</option>
                              <option value="unknown">Unknown Role</option>
                            </select>
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Auctioneer Role Control</span>
                          </div>

                          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{currentBiddingPlayer.name}</h2>
                          <p className="text-xs text-slate-400 font-bold">
                            Starting Base Price: {formatAmount(currentBiddingPlayer.basePrice, currencySymbol)}
                          </p>
                        </div>
                      </div>

                      {/* Bid Status */}
                      <div className="flex flex-col items-center justify-center py-8 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/50 dark:border-white/5">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Highest Bid</span>
                        <h3 className="text-4.5xl font-black text-pitch-500 mt-2">
                          {currentHighestBid === 0 ? "No Bids Placed" : formatAmount(currentHighestBid, currencySymbol)}
                        </h3>
                        {currentHighestBidderId && (
                          <span className="text-xs font-bold text-slate-500 mt-2 uppercase">
                            Held by: <strong className="text-slate-800 dark:text-slate-200">{teams.find(t=>t.id===currentHighestBidderId)?.name}</strong>
                          </span>
                        )}

                        {/* Passed Managers Status */}
                        {passedManagers.length > 0 && (
                          <div className="text-xs text-slate-500 flex flex-wrap gap-1.5 justify-center items-center mt-3 border-t border-slate-100 dark:border-white/5 pt-3 w-full max-w-md px-4">
                            <span className="font-bold text-[9px] uppercase text-red-500 flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Not Interested:
                            </span>
                            {passedManagers.map((pId) => (
                              <span key={pId} className="inline-block px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold uppercase text-[9px]">
                                {teams.find(t => t.id === pId)?.name || pId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Admin Timer Actions */}
                      <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-3">
                        <button
                          onClick={() => setIsTimerPaused(!isTimerPaused)}
                          className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                          {isTimerPaused ? (
                            <>
                              <Play className="h-4 w-4 text-pitch-500" /> Resume Count
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4 text-amber-500" /> Pause Count
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleSkipCricketer}
                          className="flex-1 h-12 rounded-xl border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                          <SkipForward className="h-4 w-4" /> Skip Cricketer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                      <div className="h-14 w-14 rounded-2xl bg-pitch-500/10 flex items-center justify-center text-pitch-500 animate-bounce">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Cricketer Sold!</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mx-auto">
                          Loading next nominee...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Host's Player Bidding Controls */}
                {hostClaimedTeamId && currentBiddingPlayer && (
                  <div className="glass-card rounded-3xl p-5 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-md space-y-4 mt-4">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Your Team Bidding Controls ({teams.find(t=>t.id===hostClaimedTeamId)?.name})
                      </span>
                      <span className="text-[10px] font-black text-pitch-500 uppercase">
                        Budget Left: {formatAmount(teams.find(t=>t.id===hostClaimedTeamId)?.remainingBudget || 0, currencySymbol)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1 w-full space-y-2">
                        <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                          Your Bid Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            min={nextBidAmount}
                            step={stepSize}
                            value={hostBidAmount}
                            onChange={(e) => setHostBidAmount(e.target.value)}
                            className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-8 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-pitch-500 transition font-black"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto shrink-0">
                        {/* Host Not Interested Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!hostClaimedTeamId) return;
                            setPassedManagers((prevPassed) => {
                              if (prevPassed.includes(hostClaimedTeamId)) return prevPassed;
                              const updatedPassed = [...prevPassed, hostClaimedTeamId];
                              passedManagersRef.current = updatedPassed;

                              const team = teams.find(t => t.id === hostClaimedTeamId);
                              const passLog = `Manager "${team?.managerName || team?.name || "Host"}" is Not Interested.`;

                              setGameCommentary((prevLogs) => {
                                const updatedLogs = [passLog, ...prevLogs];

                                const activeConnectedTeamIds = connectedPlayers
                                  .map(p => p.teamId)
                                  .filter(tId => {
                                    const tm = teams.find(t => t.id === tId);
                                    return tm ? tm.playerCount < 10 : false;
                                  });

                                const allPassed = activeConnectedTeamIds.length > 0 && activeConnectedTeamIds.every(tId => updatedPassed.includes(tId));

                                broadcastGameState(
                                  "active",
                                  connectedPlayers,
                                  teams,
                                  currentBiddingPlayer,
                                  currentHighestBid,
                                  currentHighestBidderId,
                                  timerValue,
                                  history,
                                  updatedLogs
                                );

                                if (allPassed) {
                                  setTimeout(() => {
                                    resolveNomination();
                                  }, 600);
                                }

                                return updatedLogs;
                              });

                              return updatedPassed;
                            });
                          }}
                          disabled={passedManagers.includes(hostClaimedTeamId) || (teams.find(t=>t.id===hostClaimedTeamId)?.playerCount || 0) >= 10}
                          className={`h-12 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 ${
                            passedManagers.includes(hostClaimedTeamId)
                              ? "bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-400 cursor-default"
                              : "border border-red-500/30 dark:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/40 text-red-600 dark:text-red-400 active:scale-98"
                          }`}
                        >
                          <XCircle className="h-4.5 w-4.5" />
                          {passedManagers.includes(hostClaimedTeamId) ? "Passed" : "Not Interested"}
                        </button>

                        {/* Host Bid Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!hostClaimedTeamId || !currentBiddingPlayer) return;
                            const amount = Number(hostBidAmount);
                            const hostTeam = teams.find(t => t.id === hostClaimedTeamId);
                            const hostBudget = hostTeam ? hostTeam.remainingBudget : 0;
                            if (isNaN(amount) || amount < nextBidAmount) {
                              alert(`Minimum bid is ${formatAmount(nextBidAmount, currencySymbol)}`);
                              return;
                            }
                            if (amount > hostBudget) {
                              alert("Over Budget! You cannot place this bid.");
                              return;
                            }

                            setTeams((prevTeams) => {
                              playSound(660, "sine", 0.1);

                              setPassedManagers((prevPassed) => {
                                const updatedPassed = prevPassed.filter((id) => id !== hostClaimedTeamId);
                                passedManagersRef.current = updatedPassed;

                                setCurrentHighestBid(amount);
                                setCurrentHighestBidderId(hostClaimedTeamId);
                                setTimerValue(30);

                                const bidderText = `Manager "Host (You)" bid ${formatAmount(amount, currencySymbol)}!`;
                                setGameCommentary((prevLogs) => {
                                  const updatedLogs = [bidderText, ...prevLogs];
                                  broadcastGameState(
                                    "active",
                                    connectedPlayers,
                                    prevTeams,
                                    currentBiddingPlayer,
                                    amount,
                                    hostClaimedTeamId,
                                    30,
                                    history,
                                    updatedLogs
                                  );
                                  return updatedLogs;
                                });

                                return updatedPassed;
                              });

                              return prevTeams;
                            });
                          }}
                          disabled={
                            currentHighestBidderId === hostClaimedTeamId ||
                            Number(hostBidAmount) > (teams.find(t=>t.id===hostClaimedTeamId)?.remainingBudget || 0) ||
                            Number(hostBidAmount) < nextBidAmount ||
                            (teams.find(t=>t.id===hostClaimedTeamId)?.playerCount || 0) >= 10
                          }
                          className={`h-12 px-6 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shrink-0 flex-1 ${
                            (teams.find(t=>t.id===hostClaimedTeamId)?.playerCount || 0) >= 10
                              ? "bg-red-500/10 border border-red-500/20 text-red-500 cursor-not-allowed"
                              : currentHighestBidderId === hostClaimedTeamId
                              ? "bg-pitch-500/10 border border-pitch-500/20 text-pitch-500 cursor-default"
                              : Number(hostBidAmount) <= (teams.find(t=>t.id===hostClaimedTeamId)?.remainingBudget || 0) && Number(hostBidAmount) >= nextBidAmount
                              ? "bg-pitch-500 hover:bg-pitch-600 text-pitch-950 shadow-pitch-500/25 active:scale-98"
                              : "bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          <Hammer className="h-4.5 w-4.5 shrink-0" />
                          {(teams.find(t=>t.id===hostClaimedTeamId)?.playerCount || 0) >= 10 ? "Squad Full (10/10)" : currentHighestBidderId === hostClaimedTeamId ? "Highest Bidder" : "Bid"}
                        </button>
                      </div>
                    </div>

                    {/* Quick increments for Host */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "+10% Base", multiplier: 0.1 },
                        { label: "+20% Base", multiplier: 0.2 },
                        { label: "+50% Base", multiplier: 0.5 },
                      ].map((opt) => {
                        const increment = Math.max(1, Math.round(currentBiddingPlayer.basePrice * opt.multiplier));
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => {
                              const targetVal = Math.max(nextBidAmount, currentHighestBid + increment);
                              setHostBidAmount(String(targetVal));
                            }}
                            className="py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 text-[10px] font-black text-slate-600 dark:text-slate-300 active:scale-98 transition"
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Leaderboard/Rosters panel (4 cols) */}
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
                    {teams.map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white uppercase">{t.name}</span>
                            {t.playerCount >= 10 && (
                              <span className="inline-block text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-pitch-500 text-pitch-950">Full</span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {t.playerCount}/10 Picks &bull; Spent: {formatAmount(t.budget - t.remainingBudget, currencySymbol)}
                          </span>
                        </div>
                        <span className="font-black text-slate-500">{formatAmount(t.remainingBudget, currencySymbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Squad Rosters */}
            <div className="space-y-4 pt-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Squad Rosters</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <div key={team.id} className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/5 pb-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">{team.name}</h3>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Manager: {team.managerName || "Unassigned"}</span>
                        </div>
                        <span className="text-xs font-black text-pitch-600">{formatAmount(team.remainingBudget, currencySymbol)}</span>
                      </div>
                      <div className="pt-3 space-y-2">
                        {team.players && team.players.map((p: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs py-1">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.name}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-bold">{ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role}</span>
                            </div>
                            <span className="font-black text-slate-500">{formatAmount(p.purchaseAmount, currencySymbol)}</span>
                          </div>
                        ))}
                        {(!team.players || team.players.length === 0) && (
                          <p className="text-xs text-slate-400 py-2">No players drafted yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      );
    }

    // Completed View (exports screen)
    if (gameStatus === "completed") {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-6 h-16 flex items-center justify-between">
            <span className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Turf<span className="text-pitch-500">Titans</span> Final Results
            </span>
            <ThemeToggle />
          </header>

          <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6 py-10">
            <div className="text-center space-y-3 py-6">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-pitch-500 to-emerald-400 items-center justify-center shadow-lg shadow-pitch-500/25">
                <Trophy className="h-8 w-8 text-pitch-950 animate-bounce" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">Multiplayer Auction Finished!</h1>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                All players processed. Copy rosters for WhatsApp or export the draft details to Excel and PDF formats.
              </p>

              {/* Roster Export Actions */}
              <div className="flex flex-wrap gap-3 items-center justify-center pt-4">
                <button
                  onClick={handleGameCopyWhatsApp}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 px-5 text-xs font-black shadow-md shadow-pitch-500/20 active:scale-98 transition"
                >
                  <Share2 className="h-4 w-4" /> Copy for WhatsApp
                </button>

                <button
                  onClick={handleGameExportExcel}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 px-5 text-xs font-bold active:scale-98 transition"
                >
                  <Download className="h-4 w-4 text-emerald-500" /> Export Excel (.xlsx)
                </button>

                <button
                  onClick={handleGameExportPDF}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 px-5 text-xs font-bold active:scale-98 transition"
                >
                  <Download className="h-4 w-4 text-red-500" /> Export PDF (.pdf)
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <div key={team.id} className="glass-card rounded-2xl p-5 border border-slate-200/50 bg-white dark:bg-white/[0.02] shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white border-b pb-2.5 mb-3 uppercase flex justify-between items-center">
                    <span>{team.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize font-bold">Manager: {team.managerName || "Unassigned"}</span>
                  </h3>
                  <div className="space-y-2">
                    {team.players && team.players.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span>{p.name}</span>
                        <span className="font-bold text-slate-600 dark:text-slate-400">{formatAmount(p.purchaseAmount, currencySymbol)}</span>
                      </div>
                    ))}
                    {(!team.players || team.players.length === 0) && (
                      <p className="text-xs text-slate-400 py-1 text-center">No picks drafted</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 text-center">
              <button
                onClick={() => setViewMode("chooser")}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-200 hover:bg-slate-350 dark:bg-white/5 dark:hover:bg-white/10 px-8 text-xs font-bold transition active:scale-98 text-slate-800 dark:text-slate-200"
              >
                Back to Chooser Home
              </button>
            </div>
          </main>
        </div>
      );
    }
  }

  // 5. BIDDER CLIENT SCREEN
  if (viewMode === "player") {
    const myTeam = teams.find((t) => t.id === selectedTeamId);
    const myBudget = myTeam ? myTeam.remainingBudget : 0;
    const isHighestBidder = currentHighestBidderId === selectedTeamId;
    const isSquadFull = myTeam ? myTeam.playerCount >= 10 : false;
    const canBid = currentBiddingPlayer && myBudget >= Number(bidAmount) && Number(bidAmount) >= nextBidAmount && !isHighestBidder && !isSquadFull;

    // Connect to dynamic team choice first
    if (!isRegistered) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col justify-center items-center p-4">
          <div className="w-full max-w-xl glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-xl space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Connected to Room</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Choose Your Franchise Team</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lobby room: <strong className="text-pitch-500">{roomCode}</strong>. Select which Captain/Franchise you represent.
              </p>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <div className="h-10 w-10 border-4 border-pitch-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading custom teams from host broadcast...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {teams.map((team) => {
                    const isSelected = selectedTeamId === team.id;
                    const isTaken = team.managerName && team.managerName !== playerName;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        disabled={!!isTaken}
                        onClick={() => setSelectedTeamId(team.id)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-[80px] transition-all relative ${
                          isSelected
                            ? "bg-pitch-500 border-pitch-500 text-pitch-950 shadow-md font-extrabold active:scale-98"
                            : isTaken
                            ? "border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/[0.01] text-slate-400 cursor-not-allowed opacity-50"
                            : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-tight truncate">{team.name}</span>
                        <span className="text-[10px] opacity-80 mt-1">
                          {isTaken ? `Taken: ${team.managerName}` : `Available &bull; Budget: ${formatAmount(team.remainingBudget, currencySymbol)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleRegisterTeam}
                  disabled={!selectedTeamId}
                  className="w-full h-12 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 font-black shadow-lg shadow-pitch-500/20 active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Join Draft Room &rarr;
                </button>
              </div>
            )}
            {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-600 text-pitch-950 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <Trophy className="h-4.5 w-4.5" />
            </span>
            <div>
              <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white block uppercase">
                {roomName || "Multiplayer Auction"}
              </span>
              <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                Bidder Screen &bull; Code: {roomCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {myTeam && (
              <div className="bg-pitch-500/10 border border-pitch-500/20 text-pitch-600 dark:text-pitch-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight truncate max-w-[180px]">
                {myTeam.name}: {formatAmount(myBudget, currencySymbol)}
              </div>
            )}
          </div>
        </header>

        {/* Main Work Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {gameStatus === "lobby" && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm text-center space-y-6 max-w-xl mx-auto py-12">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-pitch-500/10 items-center justify-center text-pitch-500 animate-pulse">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Waiting in Draft Lobby</h2>
                <p className="text-xs text-slate-500 mt-1">
                  You are registered to team **{myTeam?.name}**. Bidding will begin automatically once the auctioneer starts the draft.
                </p>
              </div>
            </div>
          )}

          {gameStatus === "active" && (
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Left Panel: Bidding HUD */}
              <div className="lg:col-span-8 space-y-4">
                <div className="glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm min-h-[460px] flex flex-col justify-between relative overflow-hidden">
                  {currentBiddingPlayer ? (
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                        <div className="relative">
                          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-pitch-500/20 to-emerald-500/20 border border-pitch-500/25 flex items-center justify-center font-black text-3xl text-pitch-600 dark:text-pitch-400 relative">
                            {currentBiddingPlayer.name.charAt(0)}
                          </div>
                          <div className={`absolute -top-3 -right-3 h-10 w-10 rounded-full flex items-center justify-center text-xs font-black shadow-lg border border-white dark:border-pitch-950 ${
                            timerValue <= 5 ? "bg-red-600 text-white animate-pulse" : "bg-pitch-500 text-pitch-950"
                          }`}>
                            <Clock className="h-3 w-3 mr-0.5" /> {timerValue}s
                          </div>
                        </div>

                        <div className="space-y-2 text-center sm:text-left flex-1">
                          <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full border ${ROLE_COLORS[currentBiddingPlayer.role] || ""}`}>
                            {ROLE_LABELS[currentBiddingPlayer.role] || currentBiddingPlayer.role}
                          </span>
                          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{currentBiddingPlayer.name}</h2>
                          <div className="flex flex-wrap gap-4 items-center justify-center sm:justify-start text-xs text-slate-500">
                            <span>Base Price: <strong className="text-slate-800 dark:text-slate-200">{formatAmount(currentBiddingPlayer.basePrice, currencySymbol)}</strong></span>
                            <span>Min Next Bid: <strong className="text-pitch-500 font-extrabold">{formatAmount(nextBidAmount, currencySymbol)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Bid Status */}
                      <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/50 dark:border-white/5">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Highest Bid</span>
                        <h3 className="text-3xl font-black text-pitch-600 mt-1 flex items-center gap-2">
                          {currentHighestBid === 0 ? "No Bids Placed" : formatAmount(currentHighestBid, currencySymbol)}
                        </h3>
                        {currentHighestBidderId && (
                          <span className="text-xs font-bold text-slate-500 mt-1">
                            Held by: <strong className="uppercase text-slate-800 dark:text-slate-200">{teams.find(t=>t.id===currentHighestBidderId)?.name}</strong>
                            {isHighestBidder && <span className="text-[10px] font-black text-pitch-500 ml-1.5">(Your Bid!)</span>}
                          </span>
                        )}

                        {/* Passed Managers Status */}
                        {passedManagers.length > 0 && (
                          <div className="text-xs text-slate-500 flex flex-wrap gap-1.5 justify-center items-center mt-3 border-t border-slate-100 dark:border-white/5 pt-3 w-full max-w-md px-4">
                            <span className="font-bold text-[9px] uppercase text-red-500 flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Not Interested:
                            </span>
                            {passedManagers.map((pId) => (
                              <span key={pId} className="inline-block px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-bold uppercase text-[9px]">
                                {teams.find(t => t.id === pId)?.name || pId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bidding Controls (spinner and increments) */}
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                          <div className="flex-1 w-full space-y-2">
                            <label className="block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                              Your Bid Amount
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                min={nextBidAmount}
                                step={stepSize}
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                className="w-full h-12 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] pl-8 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-pitch-500 transition font-black"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 w-full sm:w-auto shrink-0">
                            {/* Not Interested Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!channelRef.current || !selectedTeamId) return;
                                channelRef.current.send({
                                  type: "broadcast",
                                  event: "player_pass_action",
                                  payload: { teamId: selectedTeamId }
                                });
                              }}
                              disabled={passedManagers.includes(selectedTeamId) || isSquadFull}
                              className={`h-12 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 ${
                                passedManagers.includes(selectedTeamId)
                                  ? "bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-400 cursor-default"
                                  : "border border-red-500/30 dark:border-red-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/40 text-red-600 dark:text-red-400 active:scale-98"
                              }`}
                            >
                              <XCircle className="h-4.5 w-4.5" />
                              {passedManagers.includes(selectedTeamId) ? "Passed" : "Not Interested"}
                            </button>

                            {/* Bid Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!channelRef.current || !currentBiddingPlayer) return;
                                const amount = Number(bidAmount);
                                if (isNaN(amount) || amount < nextBidAmount) {
                                  alert(`Minimum bid is ${formatAmount(nextBidAmount, currencySymbol)}`);
                                  return;
                                }
                                if (amount > myBudget) {
                                  alert("Over Budget! You cannot place this bid.");
                                  return;
                                }
                                
                                channelRef.current.send({
                                  type: "broadcast",
                                  event: "place_bid_action",
                                  payload: {
                                    teamId: selectedTeamId,
                                    amount,
                                  },
                                });
                              }}
                              disabled={!canBid || Number(bidAmount) > myBudget || Number(bidAmount) < nextBidAmount || isSquadFull}
                              className={`h-12 px-6 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shrink-0 flex-1 ${
                                isSquadFull
                                  ? "bg-red-500/10 border border-red-500/20 text-red-500 cursor-not-allowed"
                                  : isHighestBidder
                                  ? "bg-pitch-500/10 border border-pitch-500/20 text-pitch-500 cursor-default"
                                  : canBid && Number(bidAmount) <= myBudget && Number(bidAmount) >= nextBidAmount
                                  ? "bg-pitch-500 hover:bg-pitch-600 text-pitch-950 shadow-pitch-500/25 active:scale-98"
                                  : "bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              <Hammer className="h-4.5 w-4.5 shrink-0" />
                              {isSquadFull ? "Squad Full (10/10)" : isHighestBidder ? "Highest Bidder" : "Bid"}
                            </button>
                          </div>
                        </div>

                        {/* Quick increments based on basePrice percent */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "+10% Base", multiplier: 0.1 },
                            { label: "+20% Base", multiplier: 0.2 },
                            { label: "+50% Base", multiplier: 0.5 },
                          ].map((opt) => {
                            const increment = Math.max(1, Math.round(currentBiddingPlayer.basePrice * opt.multiplier));
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => handleBidsIncrement(opt.multiplier)}
                                className="h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-[11px] font-black text-slate-700 dark:text-slate-300 transition"
                              >
                                {opt.label} ({formatAmount(increment, currencySymbol)})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-10">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 animate-pulse">
                        <Hammer className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Waiting for Nominee...</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mx-auto">
                          The next player nomination is coming shortly. Get your bidding values ready!
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* My Squad */}
                {myTeam && (
                  <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02]">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 flex items-center gap-1.5">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      My Squad: {myTeam.name} ({myTeam.playerCount}/10 Cricketers)
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {myTeam.players && myTeam.players.map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-bold">{ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role}</span>
                          </div>
                          <span className="font-black text-pitch-600">{formatAmount(p.purchaseAmount, currencySymbol)}</span>
                        </div>
                      ))}
                      {(!myTeam.players || myTeam.players.length === 0) && (
                        <p className="col-span-2 text-xs text-slate-400 text-center py-4">No picks drafted yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Commentary & standing */}
              <div className="lg:col-span-4 space-y-4">
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

                <div className="glass-card rounded-2xl p-5 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Live Team Standings</h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {teams.map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-white/5 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white uppercase">{t.name}</span>
                            {t.playerCount >= 10 && (
                              <span className="inline-block text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-pitch-500 text-pitch-950">Full</span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {t.playerCount}/10 Picks &bull; Left: {formatAmount(t.remainingBudget, currencySymbol)}
                          </span>
                        </div>
                        <span className="font-black text-slate-500">{t.playerCount}/10 Picks</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {gameStatus === "completed" && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm text-center space-y-6 max-w-xl mx-auto py-12">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-pitch-500/10 items-center justify-center text-pitch-500">
                <Trophy className="h-6 w-6 text-pitch-500" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Auction Finished!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Draft has closed successfully. The host will download the final squads. Thank you for participating!
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-white/5 pt-4 text-left space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Final Rosters</h4>
                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[250px] overflow-y-auto pr-1">
                  {teams.map((team) => (
                    <div key={team.id} className="py-2.5 text-xs">
                      <span className="font-bold uppercase block text-slate-900 dark:text-white">{team.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Manager: {team.managerName || "N/A"} &bull; Picks: {team.playerCount}/10 &bull; Remaining: {formatAmount(team.remainingBudget, currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
}

export default function GamePlayerPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs">Loading Game Console...</div>}>
      <GamePlayerContent />
    </React.Suspense>
  );
}
