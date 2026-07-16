"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { updateTournamentStatusAction } from "@/app/(dashboard)/tournaments/actions";

type StatusControlsProps = {
  tournamentId: string;
  currentStatus: "draft" | "open" | "locked" | "auction" | "completed" | "cancelled" | "archived";
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open (Registrations Open)",
  locked: "Registration Closed",
  auction: "Auction Live",
  completed: "Auction Completed",
  cancelled: "Cancelled",
  archived: "Tournament Archived (Read-Only)",
};

export function TournamentStatusControls({ tournamentId, currentStatus }: StatusControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const allowedStatuses = ["open", "locked", "completed", "archived"] as const;

  function handleStatusChange(newStatus: typeof allowedStatuses[number]) {
    setSelectedStatus(newStatus);
    
    startTransition(async () => {
      setMessage(null);
      const result = await updateTournamentStatusAction(tournamentId, newStatus);
      
      if (result.status === "success") {
        setMessage({ type: "success", text: result.message });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message });
        setSelectedStatus(currentStatus); // Revert on error
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
          Manage Tournament Status
        </label>
        <select
          value={selectedStatus}
          disabled={isPending}
          onChange={(e) => handleStatusChange(e.target.value as any)}
          className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-pitch-500 transition disabled:opacity-50"
        >
          {allowedStatuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status] || status}
            </option>
          ))}
          {currentStatus === "auction" && (
            <option value="auction" disabled>
              Auction Live (Complete in Console)
            </option>
          )}
          {currentStatus === "draft" && (
            <option value="draft" disabled>
              Draft (Publish to Open)
            </option>
          )}
          {currentStatus === "cancelled" && (
            <option value="cancelled" disabled>
              Cancelled
            </option>
          )}
        </select>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-bold ${
          message.type === "success"
            ? "bg-pitch-500/10 border border-pitch-500/20 text-pitch-600 dark:text-pitch-400"
            : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" />
          ) : (
            <AlertCircle className="h-3 w-3 shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
