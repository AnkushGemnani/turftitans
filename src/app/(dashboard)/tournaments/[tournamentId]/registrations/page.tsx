import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { CreatorRegistrationDashboard } from "@/components/tournaments/creator-registration-dashboard";
import { ArrowLeft, Users } from "lucide-react";

type RegistrationsPageProps = {
  params: Promise<{ tournamentId: string }>;
};

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

export default async function RegistrationsPage({
  params,
}: RegistrationsPageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch tournament details
  const { data: tournament, error: tourneyError } = await supabase
    .from("tournaments")
    .select("id, name, creator_id")
    .eq("id", tournamentId)
    .single();

  if (tourneyError || !tournament) {
    notFound();
  }

  // Verify that the current user is the creator of the tournament
  if (tournament.creator_id !== user.id) {
    redirect(`/tournaments/${tournamentId}?error=Only the tournament creator can manage registrations.`);
  }

  // Fetch all registrations using the admin client to bypass any RLS select restrictions on profiles/registrations
  let registrations: RegistrationWithProfile[] = [];
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      const { data, error } = await adminClient
        .from("registrations")
        .select(`
          id,
          role,
          status,
          rejection_reason,
          created_at,
          profiles (
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        registrations = data as unknown as RegistrationWithProfile[];
      } else if (error) {
        console.error("Error query from admin client:", error.message);
      }
    }
  } catch (e) {
    console.error("Admin client registrations fetch error:", e);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-2">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group self-start"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to tournament details
        </Link>
        
        <div className="flex items-center gap-3 mt-2">
          <span className="h-10 w-10 rounded-xl bg-pitch-500/10 border border-pitch-500/20 flex items-center justify-center text-pitch-500 shrink-0">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Manage Registrations
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Review and update player applications for <span className="font-bold text-pitch-600 dark:text-pitch-400">{tournament.name}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Creator Dashboard component */}
      <div className="pt-2">
        <CreatorRegistrationDashboard
          tournamentId={tournamentId}
          registrations={registrations}
        />
      </div>
    </div>
  );
}
