import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm font-semibold text-slate-200 transition hover:border-red-300/40 hover:bg-red-400/10 hover:text-red-100"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Logout
      </button>
    </form>
  );
}
