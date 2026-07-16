import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Edit,
  MapPin,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileImage,
  CreditCard,
  Gavel,
  Shield,
  Lock,
} from "lucide-react";
import { Notice } from "@/components/ui/notice";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/tournaments/format";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils/cn";
import { RegistrationSection } from "@/components/tournaments/registration-section";
import { PaymentProofSection } from "@/components/tournaments/payment-proof-section";
import { TournamentStatusControls } from "@/components/tournaments/tournament-status-controls";

type TournamentDetailsPageProps = {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

type TournamentDetails = {
  id: string;
  creator_id: string;
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
  banner_path: string | null;
  upi_id: string | null;
  payment_instructions: string | null;
  upi_qr_path: string | null;
  status: "draft" | "open" | "locked" | "auction" | "completed" | "cancelled" | "archived";
  profiles?: { full_name: string } | null;
};

export default async function TournamentDetailsPage({
  params,
  searchParams,
}: TournamentDetailsPageProps) {
  const { tournamentId } = await params;
  const notices = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch tournament details from DB
  const { data, error } = await supabase
    .from("tournaments")
    .select("*,profiles(full_name)")
    .eq("id", tournamentId)
    .single();

  if (error || !data) {
    notFound();
  }

  const tournament = data as TournamentDetails;
  const isCreator = tournament.creator_id === user.id;

  // 1. Fetch user's registration for this tournament (if any)
  const { data: userRegistration } = await supabase
    .from("registrations")
    .select("id, status, role, rejection_reason")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 1b. Fetch payment status if registered
  let userPayment = null;
  if (userRegistration) {
    const { data: payData } = await supabase
      .from("payments")
      .select("id, status, screenshot_path")
      .eq("registration_id", userRegistration.id)
      .maybeSingle();
    userPayment = payData;
  }

  // 2. Fetch user's profile details
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("full_name, phone, role, avatar_url")
    .eq("id", user.id)
    .single();

  // 2b. Fetch signed URLs for private storage images
  let upiQrUrl = null;
  if (tournament.upi_qr_path) {
    const { getSignedUpiQrUrlAction } = await import("@/app/(dashboard)/tournaments/payment-actions");
    upiQrUrl = await getSignedUpiQrUrlAction(tournament.id);
  }

  let screenshotUrl = null;
  if (userPayment && userPayment.screenshot_path) {
    const { getSignedScreenshotUrlAction } = await import("@/app/(dashboard)/tournaments/payment-actions");
    screenshotUrl = await getSignedScreenshotUrlAction(userPayment.id);
  }

  // 3. Fetch approved registrations count using admin client to bypass RLS restrictions
  let approvedCount = 0;
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { count } = await adminClient
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .eq("status", "approved");
      approvedCount = count ?? 0;
    }
  } catch (e) {
    console.error("Error fetching approved count with admin client:", e);
  }

  const remainingSlots = Math.max(tournament.max_players - approvedCount, 0);
  const progress = tournament.max_players > 0 ? Math.min((approvedCount / tournament.max_players) * 100, 100) : 0;
  const banner = tournament.banner_url ?? tournament.banner_path;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Archive Warning Banner */}
      {tournament.status === "archived" && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-bold text-sm">Archived Tournament</p>
            <p className="text-xs opacity-95">This tournament is archived and is in read-only mode. Details, rosters, payments, and registrations cannot be edited.</p>
          </div>
        </div>
      )}

      {/* Back button & top navigation row */}
      <div className="flex items-center justify-between">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
          Back to tournaments
        </Link>
        <div className="flex flex-wrap gap-2">
          {/* Shareable Public Summary Link */}
          <Link
            href={`/tournaments/${tournament.id}/summary`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-5 text-sm font-bold text-slate-700 dark:text-slate-300 transition active:scale-98"
          >
            <Sparkles className="h-4 w-4 text-gold-500 dark:text-gold-400" />
            Public Summary
          </Link>
          
          {/* Auction & Teams links — visible based on status */}
          {(tournament.status === "auction" || tournament.status === "completed" || tournament.status === "archived") && (
            <>
              <Link
                href={`/tournaments/${tournament.id}/auction`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pitch-500 to-emerald-400 px-5 text-sm font-bold text-pitch-950 transition hover:brightness-110 active:scale-98 shadow-glow-green"
              >
                <Gavel className="h-4 w-4" aria-hidden />
                {isCreator ? "Auction Console" : "View Auction"}
              </Link>
              <Link
                href={`/tournaments/${tournament.id}/teams`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-5 text-sm font-bold text-slate-700 dark:text-slate-300 transition active:scale-98"
              >
                <Shield className="h-4 w-4" />
                Team Rosters
              </Link>
            </>
          )}
          {/* Creator-only tools */}
          {isCreator && (tournament.status === "open" || tournament.status === "locked") && (
            <Link
              href={`/tournaments/${tournament.id}/teams`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-5 text-sm font-bold transition active:scale-98"
            >
              <Lock className="h-4 w-4" />
              {tournament.status === "locked" ? "Setup Teams" : "Lock & Setup Teams"}
            </Link>
          )}
          {isCreator && (tournament.status === "open" || tournament.status === "locked") && (
            <Link
              href={`/tournaments/${tournament.id}/registrations`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-5 text-sm font-bold text-slate-700 dark:text-slate-300 transition active:scale-98"
            >
              <UsersRound className="h-4 w-4" />
              Manage Registrations
            </Link>
          )}
          {isCreator && tournament.status !== "archived" && (
            <Link
              href={`/tournaments/${tournament.id}/edit`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-5 text-sm font-bold text-slate-700 dark:text-slate-300 transition active:scale-98"
            >
              <Edit className="h-4 w-4" aria-hidden />
              Edit
            </Link>
          )}
        </div>
      </div>

      {notices.message ? <Notice type="success" message={notices.message} /> : null}
      {notices.error ? <Notice type="error" message={notices.error} /> : null}

      {/* Main Banner Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-white/10 to-transparent dark:from-white/[0.04] dark:to-transparent shadow-sm dark:shadow-premium relative">
        <div className="absolute inset-0 bg-radial-card opacity-50 pointer-events-none" />
        <div className="aspect-[21/9] md:aspect-[3/1] w-full bg-slate-100 dark:bg-pitch-900 relative">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#e8f5ed,#f8fafc)] dark:bg-[linear-gradient(135deg,#0c2316,#040806)] text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-pitch-500 dark:from-gold-400 dark:to-pitch-400">
              TITANS
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/40 to-transparent dark:from-pitch-950 dark:via-pitch-950/40 dark:to-transparent" />
          
          {/* Floating Status Badge */}
          <div className="absolute top-4 left-4">
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border backdrop-blur-md",
              tournament.status === "open"
                ? "border-pitch-500/30 bg-pitch-500/10 text-pitch-600 dark:text-pitch-400 glow-text-green"
                : tournament.status === "locked"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : tournament.status === "archived"
                ? "border-slate-500/30 bg-slate-500/20 text-slate-600 dark:text-slate-400"
                : tournament.status === "completed"
                ? "border-pitch-500/30 bg-pitch-500/10 text-pitch-600 dark:text-pitch-400 glow-text-green"
                : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
            )}>
              {tournament.status === "locked" ? "registration closed" : tournament.status === "completed" ? "auction completed" : tournament.status === "archived" ? "archived" : tournament.status}
            </span>
          </div>
        </div>

        <div className="p-6 md:p-8 relative">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 leading-tight">
            {tournament.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 px-3 py-1 rounded-full text-slate-700 dark:text-slate-300">
              <MapPin className="h-4 w-4 text-pitch-600 dark:text-pitch-400" aria-hidden />
              {tournament.location}
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 px-3 py-1 rounded-full text-slate-700 dark:text-slate-300">
              <UserRound className="h-4 w-4 text-gold-500 dark:text-gold-400" aria-hidden />
              Host: {tournament.profiles?.full_name ?? "TurfTitans Creator"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-radial-card opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <CalendarDays className="h-5 w-5 text-pitch-600 dark:text-pitch-400" aria-hidden />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</p>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{formatDate(tournament.start_date)}</p>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-radial-card opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <Wallet className="h-5 w-5 text-pitch-600 dark:text-pitch-400" aria-hidden />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Entry Fee</p>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{formatCurrency(tournament.registration_fee)}</p>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-radial-card opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <UsersRound className="h-5 w-5 text-pitch-600 dark:text-pitch-400" aria-hidden />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Slots Filled</p>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{approvedCount} / {tournament.max_players}</p>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-radial-card opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <Trophy className="h-5 w-5 text-pitch-600 dark:text-pitch-400" aria-hidden />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Team Budget</p>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{formatCurrency(tournament.team_budget)}</p>
        </div>
      </div>

      {/* Registration Progress Bar Section */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-card opacity-40 pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Registration Progress</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {remainingSlots > 0 ? `${remainingSlots} slots remaining` : "Registration full"} &bull; Deadline: {formatDateTime(tournament.registration_deadline)}
            </p>
          </div>
          <span className="self-start sm:self-center rounded-full bg-pitch-500/10 border border-pitch-500/20 px-3 py-1 text-sm font-black text-pitch-600 dark:text-pitch-400 glow-text-green">
            {Math.round(progress)}% Filled
          </span>
        </div>
        <div className="mt-4 h-2.5 w-full bg-slate-200/60 dark:bg-pitch-950/80 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 relative">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-pitch-500 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-500" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {/* Player Registration Status or Action Section */}
      <div className="space-y-4">
        {isCreator && (
          /* Organizer View Controls Card */
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden border border-slate-200/50 dark:border-white/5 bg-gradient-to-r from-pitch-500/5 to-transparent space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-pitch-500 rounded-full" />
                  Tournament Organizer Controls
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You are hosting this tournament. Approve registrations, manage payments, run the player auction, and archive it when complete.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Link
                  href={`/tournaments/${tournament.id}/export`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-5 text-xs font-bold text-slate-700 dark:text-slate-300 transition active:scale-98"
                >
                  <FileImage className="h-4 w-4 text-emerald-500" />
                  Export Dashboard
                </Link>
                {(tournament.status === "open" || tournament.status === "locked") && (
                  <Link
                    href={`/tournaments/${tournament.id}/registrations`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-5 text-xs font-bold text-slate-700 dark:text-slate-300 transition active:scale-98"
                  >
                    <UsersRound className="h-4 w-4" />
                    Registrations
                  </Link>
                )}
                {tournament.registration_fee > 0 && (tournament.status === "open" || tournament.status === "locked") ? (
                  <Link
                    href={`/tournaments/${tournament.id}/payments`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] px-5 text-xs font-bold text-slate-700 dark:text-slate-300 transition active:scale-98"
                  >
                    <CreditCard className="h-4 w-4" />
                    Payments
                  </Link>
                ) : null}
                {(tournament.status === "open" || tournament.status === "locked") && (
                  <Link
                    href={`/tournaments/${tournament.id}/teams`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 px-5 text-xs font-black shadow-md shadow-pitch-500/10 transition active:scale-98"
                  >
                    <Lock className="h-4 w-4" />
                    {tournament.status === "locked" ? "Manage Teams" : "Lock & Setup Auction"}
                  </Link>
                )}
                {tournament.status === "auction" && (
                  <Link
                    href={`/tournaments/${tournament.id}/auction`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pitch-500 to-emerald-400 hover:brightness-110 text-pitch-950 px-5 text-xs font-black shadow-md shadow-pitch-500/10 transition active:scale-98"
                  >
                    <Gavel className="h-4 w-4" />
                    Open Auction Console
                  </Link>
                )}
              </div>
            </div>

            {/* Status change controls section */}
            <div className="pt-4 border-t border-slate-200/50 dark:border-white/5 max-w-sm">
              <TournamentStatusControls tournamentId={tournament.id} currentStatus={tournament.status} />
            </div>
          </div>
        )}

        {/* Regular Player View OR Organizer Self-Registration Form */}
        {userRegistration ? (
          /* Registered Player Status Display */
          <div className="space-y-4">
            <div className={cn(
              "glass-card p-6 rounded-2xl relative overflow-hidden border",
              userRegistration.status === "approved"
                ? "border-pitch-500/20 bg-gradient-to-r from-pitch-500/5 to-transparent"
                : userRegistration.status === "rejected"
                ? "border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent"
                : userRegistration.status === "payment_uploaded"
                ? "border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent"
                : "border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-transparent"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    userRegistration.status === "approved"
                      ? "bg-pitch-500/10 text-pitch-500"
                      : userRegistration.status === "rejected"
                      ? "bg-red-500/10 text-red-500"
                      : userRegistration.status === "payment_uploaded"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-blue-500/10 text-blue-500"
                  )}>
                    {userRegistration.status === "approved" ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : userRegistration.status === "rejected" ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Registration Status:{" "}
                      <span className={cn(
                        "capitalize",
                        userRegistration.status === "approved"
                          ? "text-pitch-500 glow-text-green"
                          : userRegistration.status === "rejected"
                          ? "text-red-500"
                          : userRegistration.status === "payment_uploaded"
                          ? "text-amber-500 glow-text-gold"
                          : "text-blue-500"
                      )}>
                        {userRegistration.status === "approved"
                          ? "Approved"
                          : userRegistration.status === "rejected"
                          ? "Rejected"
                          : userRegistration.status === "payment_uploaded"
                          ? "Payment Review Pending"
                          : "Pending Payment"}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Registered Role: <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{userRegistration.role.replace("_", " ")}</span>
                    </p>
                    {userRegistration.status === "rejected" && userRegistration.rejection_reason && (
                      <p className="text-xs text-red-500 mt-2 font-semibold bg-red-500/5 border border-red-500/10 px-3 py-1.5 rounded-lg max-w-xl">
                        Rejection Reason: {userRegistration.rejection_reason}
                      </p>
                    )}
                    {userRegistration.status === "payment_uploaded" && screenshotUrl && (
                      <div className="mt-3 flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-pitch-600 dark:text-pitch-400" />
                        <a 
                          href={screenshotUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-pitch-600 dark:text-pitch-400 hover:underline"
                        >
                          View Uploaded Receipt
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-400">
                  {userRegistration.status === "approved"
                    ? isCreator
                      ? "You are registered and approved in your own tournament."
                      : "You are officially in the player pool for the auction."
                    : userRegistration.status === "rejected"
                    ? "Please correct any issues and re-submit your proof below."
                    : userRegistration.status === "payment_uploaded"
                    ? "The organizer is validating your payment screenshot."
                    : "Your application is awaiting payment screenshot proof."}
                </div>
              </div>
            </div>

            {/* If status is pending_payment OR rejected, show the payment proof section */}
            {(userRegistration.status === "pending_payment" || userRegistration.status === "rejected") && (
              <PaymentProofSection
                registrationId={userRegistration.id}
                tournamentId={tournament.id}
                registrationFee={tournament.registration_fee}
                upiId={tournament.upi_id}
                paymentInstructions={tournament.payment_instructions}
                upiQrUrl={upiQrUrl}
              />
            )}
          </div>
        ) : (
          /* Join Tournament Action Wrapper */
          <div>
            {tournament.status !== "open" ? (
              <div className="glass-card p-6 rounded-2xl border border-red-500/10 bg-red-500/5 text-center flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Registration Closed</h4>
                <p className="text-xs text-slate-500">This tournament is currently not accepting registrations. Status is {tournament.status}.</p>
              </div>
            ) : new Date(tournament.registration_deadline) < new Date() ? (
              <div className="glass-card p-6 rounded-2xl border border-red-500/10 bg-red-500/5 text-center flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Registration Closed</h4>
                <p className="text-xs text-slate-500 font-semibold">The deadline of {formatDateTime(tournament.registration_deadline)} has passed.</p>
              </div>
            ) : approvedCount >= tournament.max_players ? (
              <div className="glass-card p-6 rounded-2xl border border-red-500/10 bg-red-500/5 text-center flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider">Registration Closed</h4>
                <p className="text-xs text-slate-500">The tournament is full. All slots have been approved.</p>
              </div>
            ) : (
              /* Inline Registration Client component */
              <RegistrationSection
                tournamentId={tournament.id}
                userEmail={user.email}
                userProfile={{
                  fullName: userProfile?.full_name ?? "",
                  phone: userProfile?.phone ?? null,
                  role: userProfile?.role ?? null,
                  avatarUrl: userProfile?.avatar_url ?? null,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Details & Info Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Details Panel */}
        <div className="glass-card p-6 md:p-8 rounded-2xl space-y-8">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="h-4 w-1 bg-pitch-500 rounded-full" />
              Tournament Details
            </h2>
            <div className="mt-4 text-sm md:text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
              {tournament.description || "No description provided for this tournament."}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/50 dark:border-white/5">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="h-4 w-1 bg-gold-400 rounded-full" />
              Rules & Guidelines
            </h2>
            <div className="mt-4 text-sm md:text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
              {tournament.rules || "No special rules or guidelines have been set."}
            </div>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <aside className="glass-card p-6 rounded-2xl space-y-6 self-start">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pitch-600 dark:text-pitch-400" />
            Auction Configuration
          </h3>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">Total Teams</span>
              <span className="font-bold text-slate-900 dark:text-white">{tournament.number_of_teams}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">Total Slots</span>
              <span className="font-bold text-slate-900 dark:text-white">{tournament.max_players}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400">Squad Budget</span>
              <span className="font-bold text-gold-600 dark:text-gold-400">{formatCurrency(tournament.team_budget)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 dark:text-slate-400">Available Slots</span>
              <span className="font-bold text-pitch-600 dark:text-pitch-400">{remainingSlots}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
