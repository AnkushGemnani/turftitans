"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validations/auth";

export type AuthActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialError: AuthActionState = {
  status: "error",
  message: "Something went wrong. Please try again.",
};

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

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

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: getField(formData, "fullName"),
    email: getField(formData, "email"),
    phone: getField(formData, "phone"),
    password: getField(formData, "password"),
    role: getField(formData, "role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? initialError.message,
    };
  }

  const profileImageFile = formData.get("profileImage") as File | null;
  if (!profileImageFile || profileImageFile.size === 0) {
    return {
      status: "error",
      message: "Profile picture is required.",
    };
  }

  if (!profileImageFile.type.startsWith("image/")) {
    return {
      status: "error",
      message: "Profile picture must be an image file.",
    };
  }

  const maxSizeBytes = 3 * 1024 * 1024;
  if (profileImageFile.size > maxSizeBytes) {
    return {
      status: "error",
      message: "Profile picture must be smaller than 3 MB.",
    };
  }

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
    return {
      status: "error",
      message: `Profile picture upload failed: ${uploadError.message}`,
    };
  }

  const { data: { publicUrl } } = adminClient.storage
    .from("profile-images")
    .getPublicUrl(path);

  const supabase = await createClient();
  const { fullName, email, phone, password, role } = parsed.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        avatar_url: publicUrl,
        role,
      },
      emailRedirectTo: `${env.siteUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    // Cleanup uploaded file if signup fails
    await adminClient.storage.from("profile-images").remove([path]);
    return {
      status: "error",
      message: error.message,
    };
  }

  return {
    status: "success",
    message: "Account created. Check your email if confirmation is enabled, then log in.",
  };
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: getField(formData, "email"),
    password: getField(formData, "password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? initialError.message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: getField(formData, "email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? initialError.message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  return {
    status: "success",
    message: "Password reset link sent. Check your email to continue.",
  };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: getField(formData, "password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? initialError.message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  redirect("/login?message=Password updated. Please log in with your new password.");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=You have been logged out.");
}
