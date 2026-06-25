import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and TurfTitans will send a secure recovery link."
      footer="Reset links expire automatically for your security."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
