import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Set a strong password to regain access to your TurfTitans account."
      footer="After updating, log in again with your new password."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
