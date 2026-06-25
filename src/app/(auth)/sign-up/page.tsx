import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join TurfTitans to host auctions, register as a player, and track tournament budgets."
      footer="All users share the same account type."
    >
      <SignUpForm />
    </AuthShell>
  );
}
