"use client";

import { useState, useTransition } from "react";
import { updateRegistrationStatusAction } from "@/app/(dashboard)/tournaments/registration-actions";
import { cn } from "@/lib/utils/cn";
import { Notice } from "@/components/ui/notice";
import {
  UserCheck,
  UserX,
  Clock,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  Calendar,
  AlertCircle,
  Loader2
} from "lucide-react";

type RegistrationWithProfile = {
  id: string;
  role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  status: "pending_payment" | "payment_uploaded" | "approved" | "rejected" | "waitlisted" | "withdrawn";
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

type CreatorRegistrationDashboardProps = {
  tournamentId: string;
  registrations: RegistrationWithProfile[];
};

export function CreatorRegistrationDashboard({
  tournamentId,
  registrations,
}: CreatorRegistrationDashboardProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [activeRejectingId, setActiveRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionRowId, setActionRowId] = useState<string | null>(null); // tracks loading per row

  // Map roles to human-readable strings
  const roleLabels = {
    batsman: "Batsman",
    bowler: "Bowler",
    all_rounder: "All-Rounder",
    wicket_keeper: "Wicket Keeper",
  };

  // Filter registrations
  const filteredRegs = registrations.filter((reg) => {
    if (filter === "all") return true;
    if (filter === "approved") return reg.status === "approved";
    if (filter === "rejected") return reg.status === "rejected";
    if (filter === "pending") {
      return reg.status === "pending_payment" || reg.status === "payment_uploaded";
    }
    return true;
  });

  // Action handlers
  const handleApprove = (regId: string) => {
    setErrorNotice(null);
    setSuccessNotice(null);
    setActionRowId(regId);

    startTransition(async () => {
      const result = await updateRegistrationStatusAction(regId, "approved");
      setActionRowId(null);
      if (result.status === "success") {
        setSuccessNotice(result.message);
      } else {
        setErrorNotice(result.message);
      }
    });
  };

  const handleConfirmReject = (regId: string) => {
    setErrorNotice(null);
    setSuccessNotice(null);
    setActionRowId(regId);

    startTransition(async () => {
      const result = await updateRegistrationStatusAction(regId, "rejected", rejectionReason);
      setActionRowId(null);
      setActiveRejectingId(null);
      setRejectionReason("");
      if (result.status === "success") {
        setSuccessNotice(result.message);
      } else {
        setErrorNotice(result.message);
      }
    });
  };

  // Stats
  const totalCount = registrations.length;
  const pendingCount = registrations.filter(r => r.status === "pending_payment" || r.status === "payment_uploaded").length;
  const approvedCount = registrations.filter(r => r.status === "approved").length;
  const rejectedCount = registrations.filter(r => r.status === "rejected").length;

  return (
    <div className="space-y-6">
      
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: totalCount, icon: HelpCircle, color: "text-slate-500 bg-slate-500/10 border-slate-500/10" },
          { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
          { label: "Approved Players", value: approvedCount, icon: CheckCircle, color: "text-pitch-500 bg-pitch-500/10 border-pitch-500/20" },
          { label: "Rejected Applications", value: rejectedCount, icon: XCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={cn("glass-card p-4 rounded-xl border flex items-center justify-between", stat.color)}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.label}</span>
                <p className="text-xl font-black">{stat.value}</p>
              </div>
              <Icon className="h-5 w-5 opacity-80 shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Notices */}
      {errorNotice ? <Notice type="error" message={errorNotice} /> : null}
      {successNotice ? <Notice type="success" message={successNotice} /> : null}

      {/* Filter and Tab Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: `All (${totalCount})` },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "approved", label: `Approved (${approvedCount})` },
            { id: "rejected", label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id as any);
                setActiveRejectingId(null);
              }}
              className={cn(
                "h-8 px-4 rounded-lg text-xs font-bold transition-all duration-200",
                filter === tab.id
                  ? "bg-pitch-500 text-pitch-950 font-black shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold px-2 shrink-0">
          <Filter className="h-4.5 w-4.5 text-pitch-500" />
          <span>Active Filter: {filter.toUpperCase()}</span>
        </div>
      </div>

      {/* Registrations List / Table Container */}
      <div className="glass-card rounded-2xl border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.01] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filteredRegs.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/5 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  <th className="py-4 px-6">Player Details</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Date Registered</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/30 dark:divide-white/5">
                {filteredRegs.map((reg) => {
                  const name = reg.profiles?.full_name ?? "Unknown Player";
                  const phone = reg.profiles?.phone ?? "No phone";
                  const avatarSeed = encodeURIComponent(name);
                  const avatar = reg.profiles?.avatar_url ?? `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`;
                  const formattedDate = new Date(reg.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  const isRowLoading = actionRowId === reg.id;

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors duration-150">
                      {/* Player Profile details */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-100 dark:bg-pitch-900 border border-slate-200 dark:border-white/10 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={avatar} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Player Specialty Role */}
                      <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-300">
                        {roleLabels[reg.role] ?? reg.role}
                      </td>

                      {/* Registration Date */}
                      <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formattedDate}
                        </span>
                      </td>

                      {/* Status Badges */}
                      <td className="py-4 px-6 text-center">
                        <span className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold border uppercase tracking-wider",
                          reg.status === "approved"
                            ? "border-pitch-500/20 bg-pitch-500/10 text-pitch-600 dark:text-pitch-400 glow-text-green"
                            : reg.status === "rejected"
                            ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 glow-text-gold"
                        )}>
                          {reg.status === "approved" ? "Approved" : reg.status === "rejected" ? "Rejected" : "Pending"}
                        </span>
                        {reg.status === "rejected" && reg.rejection_reason && (
                          <p className="text-[9px] text-red-400 mt-1 max-w-[150px] mx-auto truncate" title={reg.rejection_reason}>
                            Reason: {reg.rejection_reason}
                          </p>
                        )}
                      </td>

                      {/* Action Cell */}
                      <td className="py-4 px-6 text-right">
                        {isRowLoading ? (
                          <div className="flex justify-end pr-4">
                            <Loader2 className="h-4 w-4 animate-spin text-pitch-500" />
                          </div>
                        ) : activeRejectingId === reg.id ? (
                          /* Inline Rejection Reason Panel */
                          <div className="flex flex-col items-end gap-2 animate-fade-in">
                            <input
                              type="text"
                              required
                              placeholder="Reason (optional)"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="h-8 w-44 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950 px-2.5 text-[10px] text-slate-900 dark:text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setActiveRejectingId(null);
                                  setRejectionReason("");
                                }}
                                className="h-6 px-2.5 rounded-md border border-slate-200 dark:border-white/5 text-[9px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmReject(reg.id)}
                                className="h-6 px-2.5 rounded-md bg-red-500 hover:bg-red-400 text-white text-[9px] font-bold"
                              >
                                Reject Player
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Approve/Reject triggers */
                          <div className="flex items-center justify-end gap-1.5">
                            {reg.status !== "approved" && (
                              <button
                                onClick={() => handleApprove(reg.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-lg bg-pitch-500 hover:bg-pitch-400 text-pitch-950 text-[10px] font-bold px-3 transition active:scale-98 shadow-sm shadow-pitch-500/10"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                Approve
                              </button>
                            )}
                            {reg.status !== "rejected" && (
                              <button
                                onClick={() => {
                                  setActiveRejectingId(reg.id);
                                  setRejectionReason("");
                                }}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-3 transition active:scale-98"
                              >
                                <UserX className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No applications found</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                No player registrations match the current filter selection ({filter}).
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
