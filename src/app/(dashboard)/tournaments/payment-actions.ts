"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type PaymentActionState = {
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

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
}

/**
 * Submit payment screenshot proof for a registration.
 */
export async function submitPaymentProofAction(
  _previousState: PaymentActionState,
  formData: FormData
): Promise<PaymentActionState> {
  try {
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be logged in to submit payment." };
    }

    const registrationId = formData.get("registrationId") as string;
    const tournamentId = formData.get("tournamentId") as string;
    const screenshotFile = formData.get("screenshot") as File;

    if (!registrationId || !tournamentId) {
      return { status: "error", message: "Missing registration or tournament details." };
    }

    if (!screenshotFile || screenshotFile.size === 0) {
      return { status: "error", message: "Payment screenshot is required." };
    }

    // 1. Verify registration exists, belongs to user, and requires payment
    const { data: registration, error: regError } = await userClient
      .from("registrations")
      .select("id, status, user_id")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      return { status: "error", message: "Registration not found." };
    }

    if (registration.user_id !== user.id) {
      return { status: "error", message: "Unauthorized: This is not your registration." };
    }

    // 2. Fetch tournament details to verify fee and settings
    const { data: tournament, error: tourneyError } = await userClient
      .from("tournaments")
      .select("id, registration_fee, status")
      .eq("id", tournamentId)
      .single();

    if (tourneyError || !tournament) {
      return { status: "error", message: "Tournament not found." };
    }

    if (tournament.status !== "open") {
      return { status: "error", message: "Cannot submit payment for a closed tournament." };
    }

    if (tournament.registration_fee <= 0) {
      return { status: "error", message: "This tournament is free. No payment is required." };
    }

    // 3. Validate image file type and size (max 5MB)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(screenshotFile.type)) {
      return { status: "error", message: "Allowed formats are JPG, PNG, and WEBP." };
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (screenshotFile.size > maxSizeBytes) {
      return { status: "error", message: "Screenshot file must be smaller than 5 MB." };
    }

    // 4. Upload file to private 'payment-screenshots' storage bucket
    const fileExt = getFileExtension(screenshotFile);
    const path = `${user.id}/${registrationId}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await userClient.storage
      .from("payment-screenshots")
      .upload(path, screenshotFile, {
        contentType: screenshotFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { status: "error", message: `File upload failed: ${uploadError.message}` };
    }

    // 5. Use admin client to upsert the payment record and update registration status
    const adminClient = createAdminClient();

    // Query if a payment already exists
    const { data: existingPayment } = await adminClient
      .from("payments")
      .select("id, screenshot_path")
      .eq("registration_id", registrationId)
      .maybeSingle();

    // Insert or update payment record
    const paymentPayload = {
      registration_id: registrationId,
      tournament_id: tournamentId,
      user_id: user.id,
      amount: tournament.registration_fee,
      screenshot_path: path,
      status: "submitted" as const,
      creator_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    };

    let paymentError;
    if (existingPayment) {
      // Delete old file from storage to avoid orphan files
      if (existingPayment.screenshot_path) {
        await adminClient.storage
          .from("payment-screenshots")
          .remove([existingPayment.screenshot_path]);
      }

      const { error } = await adminClient
        .from("payments")
        .update(paymentPayload)
        .eq("id", existingPayment.id);
      paymentError = error;
    } else {
      const { error } = await adminClient
        .from("payments")
        .insert(paymentPayload);
      paymentError = error;
    }

    if (paymentError) {
      // Clean up uploaded file on DB error
      await userClient.storage.from("payment-screenshots").remove([path]);
      return { status: "error", message: `Database save failed: ${paymentError.message}` };
    }

    // Update registrations status to payment_uploaded
    const { error: regUpdateError } = await adminClient
      .from("registrations")
      .update({
        status: "payment_uploaded" as const,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);

    if (regUpdateError) {
      return { status: "error", message: `Registration status update failed: ${regUpdateError.message}` };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/payments`);

    return {
      status: "success",
      message: "Payment proof uploaded successfully! Awaiting organizer verification.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Approve or Reject a payment (tournament creator only).
 */
export async function reviewPaymentAction(
  paymentId: string,
  status: "approved" | "rejected",
  rejectionReason?: string
): Promise<PaymentActionState> {
  try {
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return { status: "error", message: "You must be logged in to perform this action." };
    }

    // 1. Fetch payment details
    const { data: payment, error: paymentError } = await userClient
      .from("payments")
      .select("id, registration_id, tournament_id, user_id, status")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return { status: "error", message: "Payment record not found." };
    }

    // 2. Fetch tournament details and check creator ownership
    const { data: tournament, error: tourneyError } = await userClient
      .from("tournaments")
      .select("id, creator_id, max_players, status")
      .eq("id", payment.tournament_id)
      .single();

    if (tourneyError || !tournament) {
      return { status: "error", message: "Tournament not found for this payment." };
    }

    if (tournament.creator_id !== user.id) {
      return { status: "error", message: "Only the tournament creator can review payments." };
    }

    if (tournament.status === "archived") {
      return { status: "error", message: "Cannot review payments for an archived tournament." };
    }

    const adminClient = createAdminClient();

    // 3. Handle approvals
    if (status === "approved") {
      // Verify tournament capacity constraints
      const { count: approvedCount, error: countError } = await userClient
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament.id)
        .eq("status", "approved");

      if (countError) {
        return { status: "error", message: "Failed to verify tournament slots." };
      }

      if ((approvedCount ?? 0) >= tournament.max_players) {
        return { status: "error", message: "Cannot approve. The tournament slots are full." };
      }

      // Update payment
      const { error: payUpdateError } = await adminClient
        .from("payments")
        .update({
          status: "approved" as const,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          creator_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (payUpdateError) {
        return { status: "error", message: payUpdateError.message };
      }

      // Update registration status to approved
      const { error: regUpdateError } = await adminClient
        .from("registrations")
        .update({
          status: "approved" as const,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.registration_id);

      if (regUpdateError) {
        return { status: "error", message: `Registration approval sync failed: ${regUpdateError.message}` };
      }
    } else {
      // 4. Handle rejections
      const note = rejectionReason || "Payment rejected by organizer.";
      
      const { error: payUpdateError } = await adminClient
        .from("payments")
        .update({
          status: "rejected" as const,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          creator_notes: note,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (payUpdateError) {
        return { status: "error", message: payUpdateError.message };
      }

      // Update registration status to rejected
      const { error: regUpdateError } = await adminClient
        .from("registrations")
        .update({
          status: "rejected" as const,
          rejection_reason: note,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.registration_id);

      if (regUpdateError) {
        return { status: "error", message: `Registration rejection sync failed: ${regUpdateError.message}` };
      }
    }

    revalidatePath("/dashboard");
    revalidatePath(`/tournaments/${tournament.id}`);
    revalidatePath(`/tournaments/${tournament.id}/payments`);

    return {
      status: "success",
      message: `Payment has been ${status === "approved" ? "approved" : "rejected"} successfully.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Generate a short-lived signed URL for a payment screenshot (Creator or Owner only).
 */
export async function getSignedScreenshotUrlAction(paymentId: string): Promise<string | null> {
  try {
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) return null;

    // Fetch payment details to check ownership
    const { data: payment, error } = await userClient
      .from("payments")
      .select("user_id, tournament_id, screenshot_path")
      .eq("id", paymentId)
      .single();

    if (error || !payment || !payment.screenshot_path) return null;

    // Check if current user is owner OR tournament creator
    let authorized = payment.user_id === user.id;

    if (!authorized) {
      const { data: tournament } = await userClient
        .from("tournaments")
        .select("creator_id")
        .eq("id", payment.tournament_id)
        .single();
      
      if (tournament && tournament.creator_id === user.id) {
        authorized = true;
      }
    }

    if (!authorized) return null;

    // Generate signed URL via admin client
    const adminClient = createAdminClient();
    const { data: signedData, error: signError } = await adminClient.storage
      .from("payment-screenshots")
      .createSignedUrl(payment.screenshot_path, 60);

    if (signError) {
      console.warn("Error signing URL:", signError.message);
      return null;
    }

    return signedData.signedUrl;
  } catch (e) {
    console.warn("Error getting signed screenshot URL:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Generate a short-lived signed URL for a tournament's UPI QR Code (Authenticated users only).
 */
export async function getSignedUpiQrUrlAction(tournamentId: string): Promise<string | null> {
  try {
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) return null;

    const { data: tournament, error } = await userClient
      .from("tournaments")
      .select("upi_qr_path")
      .eq("id", tournamentId)
      .single();

    if (error || !tournament || !tournament.upi_qr_path) return null;

    // Generate signed URL via admin client
    const adminClient = createAdminClient();
    const { data: signedData, error: signError } = await adminClient.storage
      .from("upi-qr")
      .createSignedUrl(tournament.upi_qr_path, 60);

    if (signError) {
      console.warn("Error signing UPI QR URL:", signError.message);
      return null;
    }

    return signedData.signedUrl;
  } catch (e) {
    console.warn("Error getting signed UPI QR URL:", e instanceof Error ? e.message : e);
    return null;
  }
}
