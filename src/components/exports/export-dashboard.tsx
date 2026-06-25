"use client";

import React from "react";
import Link from "next/link";
import { 
  FileText, 
  Table, 
  ArrowLeft, 
  Trophy, 
  Users, 
  Shield, 
  Wallet, 
  CheckCircle,
  CreditCard,
  Download,
  Share2
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, slugify } from "@/lib/tournaments/format";
import { exportToPDF } from "@/lib/exports/pdf";
import { exportToExcel, type ExcelExportData } from "@/lib/exports/excel";

type ExportDashboardProps = {
  tournament: {
    id: string;
    name: string;
    start_date: string;
    registration_fee: number;
    max_players: number;
    number_of_teams: number;
    team_budget: number;
    status: string;
  };
  teams: Array<{
    id: string;
    name: string;
    budget: number;
    remaining_budget: number;
  }>;
  registrations: Array<{
    id: string;
    role: string;
    status: string;
    created_at: string;
    playerName: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
    playerName: string;
  }>;
  auctionPurchases: Array<{
    id: string;
    purchase_amount: number;
    created_at: string;
    playerName: string;
    teamName: string;
    role: string;
  }>;
};

const ROLE_LABELS: Record<string, string> = {
  batsman: "Batsman",
  bowler: "Bowler",
  all_rounder: "All-Rounder",
  wicket_keeper: "Wicket Keeper",
};

export function ExportDashboard({
  tournament,
  teams,
  registrations,
  payments,
  auctionPurchases,
}: ExportDashboardProps) {

  const totalPlayers = registrations.filter(r => r.status === "approved").length;
  const totalRevenue = totalPlayers * tournament.registration_fee;
  
  // Format slug for file naming
  const filePrefix = slugify(tournament.name);

  // Helper to compile data for the Excel sheet
  function getExcelData(): ExcelExportData {
    const summarySheet = [
      ["TURFTITANS TOURNAMENT SUMMARY REPORT"],
      [],
      ["Property", "Value"],
      ["Tournament Name", tournament.name],
      ["Tournament Date", formatDate(tournament.start_date)],
      ["Total Approved Players", totalPlayers],
      ["Total Teams", teams.length],
      ["Registration Fee", formatCurrency(tournament.registration_fee)],
      ["Total Revenue Earned", formatCurrency(totalRevenue)],
      ["Auction Status", tournament.status.toUpperCase()],
    ];

    const teamsSheet = [
      ["Team Name", "Total Budget (Points)", "Amount Spent (Points)", "Remaining Budget (Points)"],
      ...teams.map(t => [
        t.name,
        t.budget,
        t.budget - t.remaining_budget,
        t.remaining_budget
      ])
    ];

    const playersSheet = [
      ["Player Name", "Assigned Team", "Player Role", "Purchase Price (Points)"],
      ...auctionPurchases.map(p => [
        p.playerName,
        p.teamName,
        ROLE_LABELS[p.role] || p.role,
        p.purchase_amount
      ])
    ];

    const auctionSheet = [
      ["Player Name", "Purchased By", "Amount Spent (Points)", "Purchase Time"],
      ...auctionPurchases.map(p => [
        p.playerName,
        p.teamName,
        p.purchase_amount,
        formatDateTime(p.created_at)
      ])
    ];

    const paymentsSheet = [
      ["Player Name", "Amount Paid (INR)", "Payment Status", "Submission Date"],
      ...payments.map(p => [
        p.playerName,
        p.amount,
        p.status.toUpperCase(),
        formatDateTime(p.created_at)
      ])
    ];

    return {
      summary: summarySheet,
      teams: teamsSheet,
      players: playersSheet,
      auction: auctionSheet,
      payments: paymentsSheet,
    };
  }

  // --- PDF Export Triggers ---
  
  function handleExportTeamsPDF() {
    // We will export a clean listing of team budgets and players
    const headers = ["Team Name", "Player Name", "Player Role", "Purchase Price"];
    const rows: string[][] = [];

    teams.forEach(t => {
      const teamPlayers = auctionPurchases.filter(ap => ap.teamName === t.name);
      
      rows.push([
        `[Team Summary] ${t.name}`,
        `Budget: ${t.budget}`,
        `Spent: ${t.budget - t.remaining_budget}`,
        `Remaining: ${t.remaining_budget}`,
      ]);

      if (teamPlayers.length === 0) {
        rows.push([t.name, "No players purchased yet", "-", "-"]);
      } else {
        teamPlayers.forEach(p => {
          rows.push([
            t.name,
            p.playerName,
            ROLE_LABELS[p.role] || p.role || "batsman",
            p.purchase_amount.toLocaleString("en-IN"),
          ]);
        });
      }
    });

    exportToPDF({
      tournamentName: tournament.name,
      reportTitle: "Team Rosters & Budgets Report",
      headers,
      rows,
      filename: `${filePrefix}-team-rosters.pdf`,
    });
  }

  function handleExportAuctionPDF() {
    const headers = ["Player Name", "Purchased By", "Amount (Points)", "Purchase Date/Time"];
    const rows = auctionPurchases.map(p => [
      p.playerName,
      p.teamName,
      p.purchase_amount.toLocaleString("en-IN"),
      formatDateTime(p.created_at),
    ]);

    exportToPDF({
      tournamentName: tournament.name,
      reportTitle: "Auction Results Report",
      headers,
      rows,
      filename: `${filePrefix}-auction-results.pdf`,
    });
  }

  function handleExportRegistrationsPDF() {
    const headers = ["Player Name", "Role", "Registered Date", "Status"];
    const rows = registrations.map(r => [
      r.playerName,
      ROLE_LABELS[r.role] || r.role,
      formatDateTime(r.created_at),
      r.status.toUpperCase(),
    ]);

    exportToPDF({
      tournamentName: tournament.name,
      reportTitle: "Tournament Registrations Report",
      headers,
      rows,
      filename: `${filePrefix}-registrations.pdf`,
    });
  }

  function handleExportPaymentsPDF() {
    const headers = ["Player Name", "Amount (INR)", "Payment Status", "Submission Date"];
    const rows = payments.map(p => [
      p.playerName,
      formatCurrency(p.amount),
      p.status.toUpperCase(),
      formatDateTime(p.created_at),
    ]);

    exportToPDF({
      tournamentName: tournament.name,
      reportTitle: "Payment Records Report",
      headers,
      rows,
      filename: `${filePrefix}-payment-records.pdf`,
    });
  }

  // --- Excel Export Trigger (Unified Workbook) ---

  function handleExportExcel() {
    const excelData = getExcelData();
    exportToExcel(excelData, `${filePrefix}-full-report.xlsx`);
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top navigation row */}
      <div className="flex items-center justify-between">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
          Back to tournament details
        </Link>
        <Link
          href={`/tournaments/${tournament.id}/summary`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-4 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
        >
          <Share2 className="h-3.5 w-3.5" />
          View Shareable Summary
        </Link>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Export & Reports Center</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export tournament results, player profiles, auction bid history, and transactions in high-quality PDF and spreadsheet formats.
        </p>
      </div>

      {/* 1. Tournament Summary Report Panel */}
      <div className="glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-card opacity-30 pointer-events-none" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 relative">
          <span className="w-1.5 h-4 bg-pitch-500 rounded-full" />
          Tournament Summary Report
        </h2>
        
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 mt-6 relative">
          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 p-4 rounded-xl">
            <Trophy className="h-4 w-4 text-gold-500" />
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Tournament Name</p>
            <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 truncate">{tournament.name}</p>
          </div>

          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 p-4 rounded-xl">
            <Users className="h-4 w-4 text-blue-500" />
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Total Approved Players</p>
            <p className="font-black text-base text-slate-900 dark:text-white mt-0.5">{totalPlayers} / {tournament.max_players}</p>
          </div>

          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 p-4 rounded-xl">
            <Shield className="h-4 w-4 text-pitch-500" />
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Teams Registered</p>
            <p className="font-black text-base text-slate-900 dark:text-white mt-0.5">{teams.length}</p>
          </div>

          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 p-4 rounded-xl">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Total Revenue Generated</p>
            <p className="font-black text-base text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 mt-6 pt-6 border-t border-slate-200/60 dark:border-white/5 relative">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Tournament Date:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(tournament.start_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Registration Fee:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(tournament.registration_fee)}</span>
            </div>
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Squad Budget Constraint:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{tournament.team_budget.toLocaleString("en-IN")} points</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Auction / Stage Status:</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-pitch-500/10 px-2 py-0.5 text-xs font-bold text-pitch-600 dark:text-pitch-400 uppercase border border-pitch-500/20">
                {tournament.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Export Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* PDF Reports Section */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            PDF Export Center
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate print-ready document summaries of team rosters, registrations, bidding outputs, and fee payments.
          </p>

          <div className="grid gap-3">
            <button
              onClick={handleExportTeamsPDF}

              className="flex items-center justify-between w-full h-11 px-4 text-xs font-bold border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 transition group active:scale-98 disabled:opacity-50"
            >
              <span>Export Teams &amp; Rosters (PDF)</span>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={handleExportAuctionPDF}

              className="flex items-center justify-between w-full h-11 px-4 text-xs font-bold border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 transition group active:scale-98 disabled:opacity-50"
            >
              <span>Export Auction Results (PDF)</span>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={handleExportRegistrationsPDF}

              className="flex items-center justify-between w-full h-11 px-4 text-xs font-bold border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 transition group active:scale-98 disabled:opacity-50"
            >
              <span>Export Registrations (PDF)</span>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={handleExportPaymentsPDF}

              className="flex items-center justify-between w-full h-11 px-4 text-xs font-bold border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 transition group active:scale-98 disabled:opacity-50"
            >
              <span>Export Payments &amp; Revenue (PDF)</span>
              <Download className="h-4 w-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Excel Reports Section */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="h-4 w-4 text-emerald-500" />
            Excel Export Center
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate tabular, raw data matrices containing separate sheets for Tournament Summary, Teams, Rosters, Auction results, and Payments.
          </p>

          <div className="grid gap-3">
            <button
              onClick={handleExportExcel}

              className="flex items-center justify-between w-full h-14 px-4 text-sm font-black rounded-xl bg-gradient-to-r from-emerald-500 to-pitch-500 hover:brightness-110 text-white transition shadow-md shadow-emerald-500/10 active:scale-98 disabled:opacity-50"
            >
              <div className="text-left">
                <p>Export Complete Workbook (.xlsx)</p>
                <p className="text-[10px] font-normal text-slate-100 mt-0.5">Includes Summary, Teams, Players, Auction, &amp; Payments</p>
              </div>
              <Download className="h-5 w-5 text-white/80" />
            </button>

            {/* Individual Excel tabs as separate exports for convenience */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={handleExportExcel}
  
                className="h-10 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Export Teams XLS
              </button>
              <button
                onClick={handleExportExcel}
  
                className="h-10 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Export Auction XLS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
