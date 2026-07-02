"use client";

import React, { useEffect, useState } from "react";

interface DashboardGreetingProps {
  userDisplayName: string;
}

export function DashboardGreeting({ userDisplayName }: DashboardGreetingProps) {
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setMounted(true);
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setGreeting("Good Morning");
    } else if (currentHour >= 12 && currentHour < 17) {
      setGreeting("Good Afternoon");
    } else if (currentHour >= 17 && currentHour < 22) {
      setGreeting("Good Evening");
    } else {
      setGreeting("Good Night"); // For late night / early morning
    }
  }, []);

  return (
    <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
      {mounted ? greeting : "Hello"}, {userDisplayName} 👋
    </h1>
  );
}
