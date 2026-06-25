import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage tournaments, approve registrations, and run your next cricket auction."
      footer="One account can create a tournament and play in another."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
