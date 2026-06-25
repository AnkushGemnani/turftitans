"use client";

import { useActionState, useState } from "react";
import { Copy, Check, UploadCloud, FileImage, ShieldAlert } from "lucide-react";
import { submitPaymentProofAction, type PaymentActionState } from "@/app/(dashboard)/tournaments/payment-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Notice } from "@/components/ui/notice";
import { formatCurrency } from "@/lib/tournaments/format";

type PaymentProofSectionProps = {
  registrationId: string;
  tournamentId: string;
  registrationFee: number;
  upiId: string | null;
  paymentInstructions: string | null;
  upiQrUrl: string | null;
};

const initialState: PaymentActionState = {
  status: "idle",
  message: "",
};

export function PaymentProofSection({
  registrationId,
  tournamentId,
  registrationFee,
  upiId,
  paymentInstructions,
  upiQrUrl,
}: PaymentProofSectionProps) {
  const [state, formAction] = useActionState(submitPaymentProofAction, initialState);
  const [copied, setCopied] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleCopyUPI = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden border border-slate-200/50 dark:border-white/5 bg-gradient-to-b from-slate-50/50 via-transparent to-transparent dark:from-white/[0.02] dark:via-transparent dark:to-transparent shadow-sm dark:shadow-premium">
      <div className="absolute top-0 right-0 w-64 h-64 bg-pitch-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-4 bg-pitch-500 rounded-full" />
          Complete Registration Payment
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your player registration is pending. Please transfer the entry fee and upload your receipt screenshot below.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Step 1: Payment Instructions & Details */}
        <div className="space-y-4 bg-slate-100/40 dark:bg-pitch-950/20 border border-slate-200/40 dark:border-white/5 p-5 rounded-2xl">
          <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">1. Scan & Pay</h4>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-200/40 dark:border-white/5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Amount Due</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{formatCurrency(registrationFee)}</span>
            </div>

            {upiId ? (
              <div className="flex justify-between items-center py-2 border-b border-slate-200/40 dark:border-white/5 gap-4">
                <span className="text-sm text-slate-600 dark:text-slate-400 shrink-0">UPI ID</span>
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-200 truncate">{upiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUPI}
                    className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/5 hover:bg-slate-300/60 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition shrink-0"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-pitch-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ) : null}

            {paymentInstructions ? (
              <div className="py-1">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Instructions</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-line font-sans">
                  {paymentInstructions}
                </p>
              </div>
            ) : null}

            {upiQrUrl ? (
              <div className="pt-2 flex flex-col items-center">
                <div className="relative aspect-square w-40 rounded-xl bg-white p-3 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={upiQrUrl} alt="UPI QR Code" className="h-full w-full object-contain" />
                </div>
                <span className="text-[10px] text-slate-400 mt-2 font-medium">Scan this QR Code in your UPI App</span>
              </div>
            ) : (
              <div className="pt-4 flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-slate-400 text-center">
                <ShieldAlert className="h-6 w-6 text-amber-500 opacity-60" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2">No QR Code Available</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Please transfer to the UPI ID directly.</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Upload Screenshot Form */}
        <form action={formAction} className="space-y-4">
          <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">2. Upload Screenshot</h4>
          
          {state.status === "error" && <Notice type="error" message={state.message} />}
          {state.status === "success" && <Notice type="success" message={state.message} />}

          <input type="hidden" name="registrationId" value={registrationId} />
          <input type="hidden" name="tournamentId" value={tournamentId} />

          <div className="space-y-2">
            <label 
              htmlFor="screenshot"
              className="relative block aspect-[4/3] w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-pitch-900/40 overflow-hidden hover:border-pitch-500/30 transition-all duration-300 cursor-pointer group shadow-sm"
            >
              {screenshotPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshotPreview} alt="Screenshot Preview" className="h-full w-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 dark:bg-pitch-950/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
                      <UploadCloud className="h-3.5 w-3.5 text-pitch-600 dark:text-pitch-400" />
                      Replace Screenshot
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-pitch-950/80 border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:shadow-glow-green group-hover:border-pitch-500/20 transition-all duration-300">
                    <UploadCloud className="h-5 w-5 text-pitch-600 dark:text-pitch-400" aria-hidden />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-800 dark:text-white">Upload receipt screenshot</p>
                  <p className="mt-1 text-[10px] text-slate-500">JPG, PNG, or WEBP (Max 5 MB)</p>
                </div>
              )}
            </label>
            <input
              id="screenshot"
              name="screenshot"
              type="file"
              accept="image/*"
              className="hidden"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
                  if (!allowedTypes.includes(file.type)) {
                    alert("Only JPG, PNG, and WEBP image formats are supported.");
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert("Maximum size is 5 MB.");
                    return;
                  }
                  setSelectedFile(file);
                  setScreenshotPreview(URL.createObjectURL(file));
                }
              }}
            />
          </div>

          {selectedFile ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-3 py-2 rounded-xl border border-slate-200/40 dark:border-white/5">
              <FileImage className="h-4 w-4 text-pitch-600 dark:text-pitch-400 shrink-0" />
              <span className="truncate flex-1">{selectedFile.name}</span>
              <span className="text-[10px] text-slate-400 shrink-0">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          ) : null}

          <div className="pt-2">
            <SubmitButton className="bg-gradient-to-r from-pitch-500 to-emerald-400 hover:from-pitch-400 hover:to-emerald-300 text-pitch-950 font-black h-11 w-full rounded-xl shadow-glow-green transition-all border-0">
              Submit Payment Receipt
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
