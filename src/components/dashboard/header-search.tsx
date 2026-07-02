"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, Calendar, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

type TournamentResult = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  status: string;
};

export function HeaderSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // Update query state if search params change externally
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Handle Ctrl+K or Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch results when query changes (with debounce)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("tournaments")
          .select("id, name, location, start_date, status")
          .ilike("name", `%${query.trim()}%`)
          .limit(5);

        if (!error && data) {
          setResults(data as TournamentResult[]);
        }
      } catch (err) {
        console.warn("Error searching tournaments:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [query, supabase]);

  const handleSearchSubmit = () => {
    setIsOpen(false);
    if (query.trim()) {
      router.push(`/tournaments?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/tournaments");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < results.length) {
        // Navigate to the active tournament directly
        router.push(`/tournaments/${results[activeIndex].id}`);
        setIsOpen(false);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="hidden lg:flex items-center relative max-w-md w-full mx-4" ref={containerRef}>
      <Search className="absolute left-3.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search tournaments..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 focus:border-pitch-500 dark:focus:border-pitch-400 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl py-2 pl-10 pr-12 text-xs font-medium outline-none transition-all duration-200"
      />
      <kbd className="absolute right-3 inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-white/10 bg-slate-200/50 dark:bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400 select-none pointer-events-none">
        ⌘K
      </kbd>

      <AnimatePresence>
        {isOpen && (query.trim() || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-pitch-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 backdrop-blur-lg bg-white/95 dark:bg-pitch-900/95 p-1.5"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                <span className="animate-pulse">Searching leagues...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-5 px-4 text-center">
                <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">No tournaments found</p>
                <p className="text-[9.5px] text-slate-500 mt-0.5">Press Enter to search all public leagues.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {results.map((item, idx) => (
                  <Link
                    key={item.id}
                    href={`/tournaments/${item.id}`}
                    onClick={() => setIsOpen(false)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                      idx === activeIndex
                        ? "bg-slate-100 dark:bg-white/[0.04]"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.01]"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.start_date)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        item.status === "open"
                          ? "border-pitch-500/20 bg-pitch-500/10 text-pitch-500"
                          : "border-slate-500/20 bg-slate-500/10 text-slate-500"
                      }`}>
                        {item.status}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white" />
                    </div>
                  </Link>
                ))}
                
                <div className="border-t border-slate-100 dark:border-white/5 mt-1.5 pt-1.5 px-2 pb-1 flex items-center justify-between text-[9px] font-bold text-slate-450 dark:text-slate-500">
                  <span>Use ↑↓ to navigate, Enter to select</span>
                  <button 
                    onClick={handleSearchSubmit}
                    className="text-pitch-600 dark:text-pitch-400 hover:underline"
                  >
                    See all results
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
