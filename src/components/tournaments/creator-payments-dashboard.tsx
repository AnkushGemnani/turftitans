"use client";

import { useState, useTransition } from "react";
import { Check, X, Eye, FileSpreadsheet, Calendar, User, Phone, Tag } from "lucide-react";
import { reviewPaymentAction } from "@/app/(dashboard)/tournaments/payment-actions";
import { Notice } from "@/components/ui/notice";
import { formatCurrency, formatDateTime } from "@/lib/tournaments/format";
import { cn } from "@/lib/utils/cn";

type PaymentWithRelations = {
  id: string;
  registration_id: string;
  amount: number;
  screenshot_path: string | null;
  status: "pending" | "submitted" | "approved" | "rejected";
  creator_notes: string | null;
  created_at: string;
  signed_url: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  registrations: {
    role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  } | null;
};

type CreatorPaymentsDashboardProps = {
  payments: PaymentWithRelations[];
  tournamentName: string;
};

type ActiveFilter = "all" | "pending" | "approved" | "rejected";

export function CreatorPaymentsDashboard({ payments, tournamentName }: CreatorPaymentsDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("pending");
  const [selectedScreenshot, setSelectedScreenshot] = useState<{ url: string; name: string } | null>(null);
  
  // Track rejection input state: key is paymentId
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return p.status === "submitted" || p.status === "pending";
    return p.status === activeFilter;
  });

  const handleApprove = (paymentId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await reviewPaymentAction(paymentId, "approved");
      if (res.status === "success") {
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  const handleRejectSubmit = (paymentId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejecting the payment.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await reviewPaymentAction(paymentId, "rejected", rejectionReason);
      if (res.status === "success") {
        setSuccessMsg(res.message);
        setRejectingPaymentId(null);
        setRejectionReason("");
      } else {
        setErrorMsg(res.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {errorMsg && <Notice type="error" message={errorMsg} />}
      {successMsg && <Notice type="success" message={successMsg} />}

      {/* Tabs Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div className="flex gap-1 bg-slate-100 dark:bg-pitch-950/60 p-1 rounded-xl w-fit border border-slate-200/50 dark:border-white/5">
          {(["pending", "approved", "rejected", "all"] as ActiveFilter[]).map((filter) => {
            const count = payments.filter((p) => {
              if (filter === "all") return true;
              if (filter === "pending") return p.status === "submitted" || p.status === "pending";
              return p.status === filter;
            }).length;
            
            return (
              <button
                key={filter}
                onClick={() => {
                  setActiveFilter(filter);
                  setRejectingPaymentId(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black capitalize transition-all duration-200",
                  activeFilter === filter
                    ? "bg-white dark:bg-pitch-900 text-pitch-950 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {filter === "pending" ? "Pending Approval" : filter} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table grid */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/5">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 mb-4">
              <Eye className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white capitalize">No {activeFilter} payments</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no registrations matching this status tab.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Player</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Role</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Screenshot</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Submitted At</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredPayments.map((payment) => {
                  const player = payment.profiles;
                  const role = payment.registrations?.role ?? "batsman";
                  const isPendingReview = payment.status === "submitted" || payment.status === "pending";
                  const isRejected = payment.status === "rejected";

                  return (
                    <tr 
                      key={payment.id}
                      className="hover:bg-slate-100/20 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      {/* Player column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pitch-500/20 to-emerald-500/20 border border-pitch-500/10 flex items-center justify-center font-bold text-pitch-600 dark:text-pitch-400 capitalize">
                            {player?.full_name?.charAt(0) ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                              {player?.full_name ?? "TurfTitans Player"}
                            </p>
                            {player?.phone && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {player.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role column */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                        {role.replace("_", " ")}
                      </td>

                      {/* Screenshot thumbnail */}
                      <td className="px-6 py-4">
                        {payment.signed_url ? (
                          <button
                            type="button"
                            onClick={() => setSelectedScreenshot({
                              url: payment.signed_url!,
                              name: player?.full_name ?? "Receipt Screenshot"
                            })}
                            className="group relative h-12 w-16 rounded-lg bg-slate-100 dark:bg-pitch-950 overflow-hidden border border-slate-200 dark:border-white/10 hover:border-pitch-500/30 flex items-center justify-center transition shadow-sm shrink-0"
                            title="Click to view full size"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={payment.signed_url} 
                              alt="Thumbnail" 
                              className="h-full w-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="h-4 w-4" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">No image</span>
                        )}
                      </td>

                      {/* Time column */}
                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateTime(payment.created_at)}
                        </span>
                      </td>

                      {/* Status column */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border",
                            payment.status === "approved"
                              ? "border-pitch-500/20 bg-pitch-500/10 text-pitch-500"
                              : payment.status === "rejected"
                              ? "border-red-500/20 bg-red-500/10 text-red-500"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                          )}>
                            {isPendingReview ? "Pending Approval" : payment.status}
                          </span>
                          {isRejected && payment.creator_notes && (
                            <p className="text-[10px] text-red-500 max-w-[200px] leading-tight font-medium">
                              Reason: {payment.creator_notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions column */}
                      <td className="px-6 py-4 text-right">
                        {isPendingReview ? (
                          <div className="flex flex-col items-end gap-2">
                            {rejectingPaymentId === payment.id ? (
                              <div className="flex flex-col gap-2 w-64 bg-slate-50 dark:bg-pitch-900 border border-slate-200 dark:border-white/5 p-3 rounded-xl shadow-md text-left">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Rejection Reason</span>
                                <textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Write a reason (e.g. Transaction ID mismatch)"
                                  className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950 px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 resize-none h-16"
                                  required
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingPaymentId(null);
                                      setRejectionReason("");
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleRejectSubmit(payment.id)}
                                    className="px-2.5 py-1 rounded bg-red-500 hover:bg-red-400 text-[10px] font-black text-white disabled:opacity-50"
                                  >
                                    Confirm Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => {
                                    setRejectingPaymentId(payment.id);
                                    setRejectionReason("");
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/60 dark:border-white/10 bg-slate-50 dark:bg-pitch-950 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition active:scale-95"
                                  title="Reject Payment"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleApprove(payment.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pitch-500 text-pitch-950 hover:bg-pitch-400 transition active:scale-95 shadow-md shadow-pitch-500/10"
                                  title="Approve Payment"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screenshot lightbox Modal */}
      {selectedScreenshot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-950">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-pitch-400" />
                {selectedScreenshot.name} - Payment Screenshot
              </h3>
              <button
                type="button"
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={selectedScreenshot.url} 
                alt="Full Screenshot" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-white/5"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
