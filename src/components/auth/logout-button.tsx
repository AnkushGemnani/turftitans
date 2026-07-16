import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:border-red-300/40 hover:bg-red-500/10 dark:hover:bg-red-400/10 hover:text-red-600 dark:hover:text-red-100"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        Logout
      </button>
    </form>
  );
}
