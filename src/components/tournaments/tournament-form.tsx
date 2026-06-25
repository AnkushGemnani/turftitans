"use client";

import { useActionState, useMemo, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";
import type { TournamentActionState } from "@/app/(dashboard)/tournaments/actions";
import { toDateTimeLocalValue } from "@/lib/tournaments/format";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

type TournamentFormValue = {
  name: string;
  description: string | null;
  rules: string | null;
  location: string;
  start_date: string;
  registration_deadline: string;
  registration_fee: number;
  max_players: number;
  number_of_teams: number;
  team_budget: number;
  banner_url: string | null;
  upi_id?: string | null;
  payment_instructions?: string | null;
  upi_qr_url?: string | null;
};

type TournamentFormProps = {
  mode: "create" | "edit";
  action: (
    previousState: TournamentActionState,
    formData: FormData,
  ) => Promise<TournamentActionState>;
  tournament?: TournamentFormValue;
  approvedCount?: number;
};

const initialState: TournamentActionState = {
  status: "idle",
  message: "",
};

export function TournamentForm({
  mode,
  action,
  tournament,
  approvedCount = 0,
}: TournamentFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [preview, setPreview] = useState<string | null>(tournament?.banner_url ?? null);
  const [qrPreview, setQrPreview] = useState<string | null>(tournament?.upi_qr_url ?? null);

  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }, []);

  return (
    <form action={formAction} className="space-y-6 max-w-3xl mx-auto pb-12">
      {state.status === "error" ? <Notice type="error" message={state.message} /> : null}

      {/* Banner Upload Zone */}
      <div className="space-y-2">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Tournament Cover Banner</span>
        
        <label 
          htmlFor="banner" 
          className="relative block aspect-[21/9] w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-pitch-900/40 overflow-hidden hover:border-pitch-500/30 transition-all duration-300 cursor-pointer group shadow-sm dark:shadow-premium"
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Banner Preview" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white/90 dark:bg-pitch-950/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <UploadCloud className="h-3.5 w-3.5 text-pitch-600 dark:text-pitch-400" />
                  Change Cover Banner
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
              <div className="h-10 w-10 rounded-full bg-white dark:bg-pitch-950/80 border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:shadow-glow-green group-hover:border-pitch-500/20 transition-all duration-300">
                <UploadCloud className="h-5 w-5 text-pitch-600 dark:text-pitch-400 transition-transform group-hover:-translate-y-0.5" aria-hidden />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">Upload a tournament banner</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Drag & drop or click to browse (16:9 recommended)</p>
            </div>
          )}
        </label>
        
        <input
          id="banner"
          name="banner"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setPreview(URL.createObjectURL(file));
            }
          }}
        />
      </div>

      {/* Form Fields Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2 space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Tournament Name</span>
          <input
            name="name"
            required
            defaultValue={tournament?.name}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200"
            placeholder="e.g. Sunday Premier League"
          />
        </label>

        <label className="block sm:col-span-2 space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Description</span>
          <textarea
            name="description"
            rows={4}
            defaultValue={tournament?.description ?? ""}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200 resize-y"
            placeholder="Describe the tournament format, matches, venue, and prize pool details..."
          />
        </label>

        <label className="block sm:col-span-2 space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Rules & Guidelines</span>
          <textarea
            name="rules"
            rows={4}
            defaultValue={tournament?.rules ?? ""}
            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200 resize-y"
            placeholder="Auction parameters, squad limits, match formats, and code of conduct..."
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Location / Venue</span>
          <input
            name="location"
            required
            defaultValue={tournament?.location}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200"
            placeholder="e.g. Hyderabad Sports Arena"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Tournament Date</span>
          <input
            name="startDate"
            type="date"
            required
            min={minDate}
            defaultValue={tournament?.start_date}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Registration Deadline</span>
          <input
            name="registrationDeadline"
            type="datetime-local"
            required
            defaultValue={
              tournament?.registration_deadline
                ? toDateTimeLocalValue(tournament.registration_deadline)
                : undefined
            }
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Registration Fee (₹)</span>
          <input
            name="registrationFee"
            type="number"
            min={0}
            required
            defaultValue={tournament?.registration_fee ?? 0}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200"
          />
        </label>

        <label className="block space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Maximum Players</span>
            {approvedCount > 0 ? (
              <span className="text-[10px] text-slate-500 font-semibold">Min: {approvedCount}</span>
            ) : null}
          </div>
          <input
            name="maxPlayers"
            type="number"
            min={Math.max(1, approvedCount)}
            required
            defaultValue={tournament?.max_players ?? 120}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Number of Teams</span>
          <input
            name="numberOfTeams"
            type="number"
            min={1}
            required
            defaultValue={tournament?.number_of_teams ?? 8}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200"
          />
        </label>

        <label className="block sm:col-span-2 space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Squad Bid Budget (Points / Cash)</span>
          <input
            name="teamBudget"
            type="number"
            min={1}
            required
            defaultValue={tournament?.team_budget ?? 100000}
            className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200"
          />
        </label>
      </div>

      {/* UPI Payment Setup Section */}
      <div className="pt-6 border-t border-slate-200 dark:border-white/10 space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
          UPI Payment Setup
        </h3>
        <p className="text-xs text-slate-500">
          Enter payment details for players to submit their registration entry fees. UPI QR Code and ID will be securely rendered using signed URLs.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">UPI ID</span>
            <input
              name="upiId"
              defaultValue={tournament?.upi_id ?? ""}
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200"
              placeholder="e.g. host@upi"
            />
          </label>

          <label className="block sm:col-span-2 space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Payment Instructions</span>
            <textarea
              name="paymentInstructions"
              rows={3}
              defaultValue={tournament?.payment_instructions ?? ""}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/40 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-pitch-500 dark:focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500/50 transition duration-200 resize-y"
              placeholder="e.g. Please scan the QR code to pay the entry fee, then take a screenshot of your success receipt and upload it below."
            />
          </label>

          <div className="sm:col-span-2 space-y-2">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">UPI QR Code Image</span>
            <label
              htmlFor="upiQr"
              className="relative block aspect-[3/1] max-w-md rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-pitch-900/40 overflow-hidden hover:border-pitch-500/30 transition-all duration-300 cursor-pointer group shadow-sm"
            >
              {qrPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrPreview} alt="UPI QR Code Preview" className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.02]" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 dark:bg-pitch-950/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <UploadCloud className="h-3.5 w-3.5 text-pitch-600 dark:text-pitch-400" />
                      Change QR Code Image
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                  <UploadCloud className="h-5 w-5 text-pitch-600 dark:text-pitch-400 transition-transform group-hover:-translate-y-0.5" aria-hidden />
                  <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-white">Upload UPI QR Code image</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Drag & drop or click (JPG, PNG, WEBP)</p>
                </div>
              )}
            </label>
            <input
              id="upiQr"
              name="upiQr"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setQrPreview(URL.createObjectURL(file));
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="pt-4">
        <SubmitButton className="bg-gradient-to-r from-pitch-500 to-emerald-400 hover:from-pitch-400 hover:to-emerald-300 text-pitch-950 font-black h-11 w-full rounded-xl shadow-glow-green transition-all duration-200 active:scale-[0.99] border-0">
          {mode === "create" ? "Create Tournament" : "Save Changes"}
        </SubmitButton>
      </div>
    </form>
  );
}
