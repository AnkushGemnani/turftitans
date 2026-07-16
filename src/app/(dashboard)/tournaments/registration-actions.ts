"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

// Helper to create an admin client that bypasses RLS
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase configuration env variables for admin operation.");
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Register a user as a player in a tournament.
 * If the user is the creator, the registration is auto-approved (bypassing RLS).
 * Otherwise, it starts as pending approval.
 */
export async function registerForTournamentAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be logged in to register." };
    }

    const tournamentId = formData.get("tournamentId") as string;

    if (!tournamentId) {
      return { status: "error", message: "Missing required registration details." };
    }

    // Retrieve user's profile to get their details
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role, avatar_url, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { status: "error", message: "User profile not found." };
    }

    let role = profile.role;
    let avatarUrl = profile.avatar_url;

    // Handle full name update
    const submittedFullName = formData.get("fullName") as string;
    if (submittedFullName && submittedFullName !== profile.full_name) {
      const { error: nameError } = await userClient
        .from("profiles")
        .update({ full_name: submittedFullName })
        .eq("id", user.id);
      
      if (nameError) {
        return { status: "error", message: `Failed to update your name: ${nameError.message}` };
      }
    }

    // Handle missing profile picture
    if (!avatarUrl) {
      const profileImageFile = formData.get("profileImage") as File | null;
      if (!profileImageFile || profileImageFile.size === 0) {
        return { status: "error", message: "Profile picture is required." };
      }

      if (!profileImageFile.type.startsWith("image/")) {
        return { status: "error", message: "Profile picture must be an image file." };
      }

      const maxSizeBytes = 3 * 1024 * 1024;
      if (profileImageFile.size > maxSizeBytes) {
        return { status: "error", message: "Profile picture must be smaller than 3 MB." };
      }

      // Helper to get file extension
      const getFileExtension = (file: File) => {
        const extension = file.name.split(".").pop()?.toLowerCase();
        return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
      };

      const adminClient = createAdminClient();
      const fileExt = getFileExtension(profileImageFile);
      const path = `avatars/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await adminClient.storage
        .from("profile-images")
        .upload(path, profileImageFile, {
          contentType: profileImageFile.type,
          upsert: false,
        });

      if (uploadError) {
        return { status: "error", message: `Profile picture upload failed: ${uploadError.message}` };
      }

      const { data: { publicUrl } } = adminClient.storage
        .from("profile-images")
        .getPublicUrl(path);

      // Update the user's profile with the uploaded avatar URL
      const { error: updateAvatarError } = await userClient
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateAvatarError) {
        // Cleanup uploaded file if DB update fails
        await adminClient.storage.from("profile-images").remove([path]);
        return { status: "error", message: `Failed to save your profile picture: ${updateAvatarError.message}` };
      }

      avatarUrl = publicUrl;
    }

    if (!role) {
      const submittedRole = formData.get("role") as string;
      if (!submittedRole) {
        return { status: "error", message: "Player specialty role is required." };
      }

      const validRoles = ["batsman", "bowler", "all_rounder", "wicket_keeper"];
      if (!validRoles.includes(submittedRole)) {
        return { status: "error", message: "Invalid role selected." };
      }

      // Update the user's profile with the selected role
      const { error: updateError } = await userClient
        .from("profiles")
        .update({ role: submittedRole as any })
        .eq("id", user.id);

      if (updateError) {
        return { status: "error", message: `Failed to save your player role: ${updateError.message}` };
      }

      role = submittedRole as any;
    }

    // Retrieve tournament data
    const { data: tournament, error: tourneyError } = await userClient
      .from("tournaments")
      .select("id, creator_id, status, registration_deadline, max_players, registration_fee")
      .eq("id", tournamentId)
      .single();

    if (tourneyError || !tournament) {
      return { status: "error", message: "Tournament not found." };
    }

    // Rule 1: Check tournament status
    if (tournament.status !== "open") {
      return { status: "error", message: `Cannot register. This tournament status is currently '${tournament.status}'.` };
    }

    // Rule 2: Check registration deadline
    if (new Date(tournament.registration_deadline) < new Date()) {
      return { status: "error", message: "Cannot register. The registration deadline has passed." };
    }

    // Rule 3: Check if tournament is full (approved registrations)
    const { count: approvedCount, error: countError } = await userClient
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "approved");

    if (countError) {
      return { status: "error", message: "Failed to check tournament capacity constraints." };
    }

    if ((approvedCount ?? 0) >= tournament.max_players) {
      return { status: "error", message: "Cannot register. This tournament is already full." };
    }

    // Rule 4: Prevent duplicate registrations
    const { data: existingReg, error: regError } = await userClient
      .from("registrations")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReg) {
      return { status: "error", message: "You are already registered for this tournament." };
    }

    const isCreator = tournament.creator_id === user.id;

    // Use admin client to insert registration to bypass t.creator_id <> auth.uid() check
    const adminClient = createAdminClient();
    const { error: insertError } = await adminClient
      .from("registrations")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
        role: role as any,
        status: (isCreator || tournament.registration_fee === 0) ? "approved" : "pending_payment" // Auto-approve creator or free tournaments
      });

    if (insertError) {
      return { status: "error", message: insertError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/registrations`);

    return {
      status: "success",
      message: isCreator
        ? "Successfully registered as a player! As the creator, your registration has been auto-approved."
        : "Successfully registered! Your application is pending approval from the organizer."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "An unexpected error occurred."
    };
  }
}

/**
 * Approve or Reject a player registration (creator only).
 */
export async function updateRegistrationStatusAction(
  registrationId: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<ActionState> {
  try {
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be logged in to perform this action." };
    }

    // Fetch registration details
    const { data: registration, error: regError } = await userClient
      .from("registrations")
      .select("id, tournament_id, user_id, status")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      return { status: "error", message: "Registration record not found." };
    }

    // Verify user is the creator of the tournament
    const { data: tournament, error: tourneyError } = await userClient
      .from("tournaments")
      .select("id, creator_id, max_players, status")
      .eq("id", registration.tournament_id)
      .single();

    if (tourneyError || !tournament) {
      return { status: "error", message: "Tournament not found." };
    }

    if (tournament.creator_id !== user.id) {
      return { status: "error", message: "Only the tournament creator can approve or reject registrations." };
    }

    if (tournament.status === "archived") {
      return { status: "error", message: "Cannot manage registrations for an archived tournament." };
    }

    // If approving, check if tournament is already full
    if (status === "approved" && registration.status !== "approved") {
      const { count: approvedCount, error: countError } = await userClient
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament.id)
        .eq("status", "approved");

      if (countError) {
        return { status: "error", message: "Failed to verify tournament slots." };
      }

      if ((approvedCount ?? 0) >= tournament.max_players) {
        return { status: "error", message: "Cannot approve registration. The tournament is already full." };
      }
    }

    // Update registration status using the admin client to avoid potential RLS policy blocks
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from("registrations")
      .update({
        status,
        rejection_reason: status === "rejected" ? (rejectionReason || "Registration rejected by host.") : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", registrationId);

    if (updateError) {
      return { status: "error", message: updateError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/tournaments/${tournament.id}`);
    revalidatePath(`/tournaments/${tournament.id}/registrations`);

    return {
      status: "success",
      message: `Registration has been ${status} successfully.`
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "An unexpected error occurred."
    };
  }
}
