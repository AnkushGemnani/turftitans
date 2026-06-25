"use client";

import { useSearchParams } from "next/navigation";
import { Notice } from "@/components/ui/notice";

export function AuthStatusNotice() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const error = searchParams.get("error");

  if (error) {
    return <Notice type="error" message={error} />;
  }

  if (message) {
    return <Notice type="success" message={message} />;
  }

  return null;
}
