"use client";

import { useActionState, useTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  Users,
  Wallet,
  Lock,
  Zap,
  ImageIcon,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { createTeamAction, deleteTeamAction, updateTeamAction } from "@/app/(dashboard)/tournaments/[tournamentId]/teams/team-actions";
import { lockTournamentAction, startAuctionAction } from "@/app/(dashboard)/tournaments/[tournamentId]/auction/auction-actions";

type Team = {
  id: string;
  name: string;
  logo_url: string | null;
  budget: number;
  remaining_budget: number;
  player_count: number;
};

type TeamSetupPanelProps = {
  tournamentId: string;
  tournamentStatus: string;
  teams: Team[];
  approvedPlayerCount: number;
};

function formatAmount(amount: number) {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function TeamSetupPanel({
  tournamentId,
  tournamentStatus,
  teams,
  approvedPlayerCount,
}: TeamSetupPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const createAction = createTeamAction.bind(null, tournamentId);
  const [createState, createFormAction] = useActionState(createAction, {
    status: "idle" as const,
    message: "",
  });

  const canLock = tournamentStatus === "open" && approvedPlayerCount > 0;
  const canStart = tournamentStatus === "locked" && teams.length >= 2;
  const isLocked = tournamentStatus === "locked";
  const auctionStarted = tournamentStatus === "auction" || tournamentStatus === "completed";

  function handleDelete(teamId: string) {
    setDeletingId(teamId);
    startTransition(async () => {
      const result = await deleteTeamAction(tournamentId, teamId);
      setActionMsg({ type: result.status === "success" ? "success" : "error", text: result.message });
      setDeletingId(null);
      router.refresh();
    });
  }

  function handleLock() {
    startTransition(async () => {
      const result = await lockTournamentAction(tournamentId);
      setActionMsg({ type: result.status === "success" ? "success" : "error", text: result.message });
      if (result.status === "success") router.refresh();
    });
  }

  function handleStartAuction() {
    startTransition(async () => {
      const result = await startAuctionAction(tournamentId);
      if (result.status === "success") {
        router.push(`/tournaments/${tournamentId}/auction`);
      } else {
        setActionMsg({ type: "error", text: result.message });
      }
    });
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`glass-card rounded-2xl p-5 border ${
        auctionStarted
          ? "border-pitch-500/20 bg-pitch-500/5"
          : isLocked
          ? "border-amber-500/20 bg-amber-500/5"
          : "border-slate-200/50 dark:border-white/5"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Auction Status
            </p>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {auctionStarted
                ? tournamentStatus === "completed"
                  ? "✅ Auction Completed"
                  : "🔴 Auction Live"
                : isLocked
                ? "🔒 Tournament Locked — Ready to Start"
                : "⚙️ Setup Phase — Open for Registrations"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {approvedPlayerCount} approved players &bull; {teams.length} teams created
            </p>
          </div>

          <div className="flex gap-2.5 shrink-0">
            {canLock && (
              <button
                onClick={handleLock}
                disabled={isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-4 text-xs font-bold transition active:scale-98 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                Lock Tournament
              </button>
            )}
            {canStart && (
              <button
                onClick={handleStartAuction}
                disabled={isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 px-5 text-xs font-black shadow-md shadow-pitch-500/20 transition active:scale-98 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                {isPending ? "Starting..." : "Start Auction →"}
              </button>
            )}
            {auctionStarted && (
              <a
                href={`/tournaments/${tournamentId}/auction`}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 px-5 text-xs font-black shadow-md transition active:scale-98"
              >
                <Zap className="h-4 w-4" />
                Open Auction Console
                <ChevronRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Inline status messages */}
        {actionMsg && (
          <div className={`mt-3 flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 ${
            actionMsg.type === "success"
              ? "bg-pitch-500/10 text-pitch-600 dark:text-pitch-400"
              : "bg-red-500/10 text-red-600 dark:text-red-400"
          }`}>
            {actionMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {actionMsg.text}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Team List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Teams ({teams.length})
          </h3>
          {teams.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-white/10">
              <Users className="h-8 w-8 mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No teams yet</p>
              <p className="text-xs text-slate-400 mt-1">Create at least 2 teams to start the auction.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`glass-card glass-card-hover rounded-2xl p-4 flex items-center gap-4 group transition-all ${
                    editingTeam?.id === team.id ? "ring-2 ring-pitch-500 bg-pitch-500/5" : ""
                  }`}
                >
                  {/* Logo */}
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pitch-500/10 to-emerald-400/10 border border-pitch-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-pitch-600 dark:text-pitch-400">
                        {team.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 dark:text-white truncate">{team.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        Budget: {formatAmount(team.budget)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {team.player_count} players
                      </span>
                    </div>
                  </div>

                  {!auctionStarted && (
                    <div className="shrink-0 min-h-[32px] flex items-center justify-end">
                      {showDeleteConfirmId === team.id ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <span className="text-[10px] font-bold text-red-500 mr-1 animate-pulse">Delete?</span>
                          <button
                            onClick={() => {
                              handleDelete(team.id);
                              setShowDeleteConfirmId(null);
                            }}
                            disabled={isPending && deletingId === team.id}
                            className="inline-flex h-7 items-center justify-center rounded-lg bg-red-600 hover:bg-red-500 text-white px-2.5 text-[10px] font-black tracking-wider uppercase transition disabled:opacity-50 shadow-sm shadow-red-500/20"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirmId(null)}
                            disabled={isPending}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => {
                              setEditingTeam(team);
                              setEditName(team.name);
                              setEditBudget(String(team.budget));
                              setLogoPreview(team.logo_url);
                              setActionMsg(null);
                              setShowDeleteConfirmId(null);
                            }}
                            disabled={isPending}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-pitch-500 hover:bg-pitch-500/10 transition disabled:opacity-50"
                            title="Edit team"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirmId(team.id);
                              setEditingTeam(null);
                            }}
                            disabled={isPending}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50"
                            title="Delete team"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create / Edit Team Form */}
        {!auctionStarted && (
          <div className="glass-card rounded-2xl p-5 space-y-4 self-start">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {editingTeam ? `Edit Team: ${editingTeam.name}` : "Create Team"}
            </h3>

            {editingTeam ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    const formData = new FormData();
                    formData.append("name", editName);
                    formData.append("budget", editBudget);
                    if (fileRef.current?.files?.[0]) {
                      formData.append("logo", fileRef.current.files[0]);
                    }

                    const result = await updateTeamAction(tournamentId, editingTeam.id, formData);
                    setActionMsg({ type: result.status === "success" ? "success" : "error", text: result.message });
                    if (result.status === "success") {
                      setEditingTeam(null);
                      setLogoPreview(null);
                      if (fileRef.current) fileRef.current.value = "";
                      router.refresh();
                    }
                  });
                }}
                className="space-y-4"
              >
                {/* Team Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Team Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={40}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pitch-500 dark:focus:border-pitch-400 transition"
                  />
                </div>

                {/* Team Budget */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Budget (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    required
                    min={0}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pitch-500 dark:focus:border-pitch-400 transition"
                  />
                </div>

                {/* Team Logo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Team Logo <span className="text-slate-400">(optional, max 2MB)</span>
                  </label>
                  <div
                    className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-pitch-400 dark:hover:border-pitch-500 p-4 cursor-pointer transition min-h-[80px]"
                    onClick={() => fileRef.current?.click()}
                  >
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded-lg object-cover mx-auto" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">Click to upload</span>
                      </>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      name="logo"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 text-sm font-black shadow-md shadow-pitch-500/10 transition active:scale-98 disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTeam(null);
                      setLogoPreview(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 px-4 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form action={createFormAction} className="space-y-4" onSubmit={() => setLogoPreview(null)}>
                {/* Team Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Team Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="name"
                    type="text"
                    placeholder="e.g. Hidden Heroes"
                    required
                    minLength={2}
                    maxLength={40}
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pitch-500 dark:focus:border-pitch-400 transition"
                  />
                </div>

                {/* Team Logo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Team Logo <span className="text-slate-400">(optional, max 2MB)</span>
                  </label>
                  <div
                    className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-pitch-400 dark:hover:border-pitch-500 p-4 cursor-pointer transition min-h-[80px]"
                    onClick={() => fileRef.current?.click()}
                  >
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded-lg object-cover mx-auto" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                        <span className="text-xs text-slate-400 font-medium">Click to upload</span>
                      </>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      name="logo"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>

                {/* Error / Success */}
                {createState.status === "error" && (
                  <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {createState.message}
                  </p>
                )}
                {createState.status === "success" && (
                  <p className="text-xs text-pitch-600 dark:text-pitch-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {createState.message}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 text-sm font-black shadow-md shadow-pitch-500/10 transition active:scale-98"
                >
                  <Plus className="h-4 w-4" />
                  Add Team
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
