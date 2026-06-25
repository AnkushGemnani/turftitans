import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type NoticeProps = {
  type: "success" | "error" | "info";
  message: string;
};

export function Notice({ type, message }: NoticeProps) {
  const Icon = type === "success" ? CheckCircle2 : type === "info" ? Info : AlertCircle;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-sm",
        type === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100"
          : type === "info"
          ? "border-pitch-500/20 bg-pitch-500/10 text-pitch-800 dark:text-pitch-100 shadow-glow-green/10"
          : "border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-100",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}

