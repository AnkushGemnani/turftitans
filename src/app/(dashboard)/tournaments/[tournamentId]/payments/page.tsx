import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreatorPaymentsDashboard } from "@/components/tournaments/creator-payments-dashboard";
import { getSignedScreenshotUrlAction } from "@/app/(dashboard)/tournaments/payment-actions";

type PaymentsPageProps = {
  params: Promise<{ tournamentId: string }>;
};

type PaymentRow = {
  id: string;
  registration_id: string;
  tournament_id: string;
  user_id: string;
  amount: number;
  screenshot_path: string | null;
  status: "pending" | "submitted" | "approved" | "rejected";
  creator_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  registrations: {
    role: "batsman" | "bowler" | "all_rounder" | "wicket_keeper";
  } | null;
};

export default async function PaymentsPage({ params }: PaymentsPageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch tournament details & check creator
  const { data: tournament, error: tourneyError } = await supabase
    .from("tournaments")
    .select("id, name, creator_id")
    .eq("id", tournamentId)
    .single();

  if (tourneyError || !tournament) {
    notFound();
  }

  if (tournament.creator_id !== user.id) {
    redirect(`/tournaments/${tournamentId}?error=Only the tournament creator can access the payment queue.`);
  }

  // 2. Fetch payments with profile and registration info
  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payments")
    .select(`
      id,
      registration_id,
      tournament_id,
      user_id,
      amount,
      screenshot_path,
      status,
      creator_notes,
      created_at,
      profiles:profiles!payments_user_id_fkey(full_name, avatar_url, phone),
      registrations(role)
    `)
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (paymentsError) {
    console.error("Error fetching payments:", paymentsError);
  }

  const paymentsRaw = (paymentsData || []) as unknown as PaymentRow[];

  // 3. Generate signed URLs for all screenshots on the server side
  const payments = await Promise.all(
    paymentsRaw.map(async (payment) => {
      let signedUrl = null;
      if (payment.screenshot_path) {
        signedUrl = await getSignedScreenshotUrlAction(payment.id);
      }
      return {
        ...payment,
        signed_url: signedUrl,
      };
    })
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back button & Title */}
      <div className="space-y-4">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden />
          Back to tournament details
        </Link>
        
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-pitch-600 dark:text-gold-400 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Payment review queue
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {tournament.name} Payments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review player payment screenshot uploads, verify transactions, and approve or reject entries.
          </p>
        </div>
      </div>

      {/* Creator Payments Review Queue Dashboard */}
      <CreatorPaymentsDashboard payments={payments} tournamentName={tournament.name} />
    </div>
  );
}
