"use client";

import React, { useState, useEffect } from "react";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<any>(`/tasks/search?q=${encodeURIComponent(query)}`);
        // Search response can be res.data.data or res.data
        const items = res.data?.data || res.data || [];
        setResults(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectTask = (task: any) => {
    setIsOpen(false);
    if (task.project_id) {
      router.push(`/projects/${task.project_id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-8 sm:pt-16 md:pt-24 p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto sm:my-0">
        <div className="p-3 sm:p-4 border-b border-border flex items-center gap-2 sm:gap-3 bg-canvas">
          {loading ? (
            <Loader2 size={18} className="text-accent animate-spin shrink-0" />
          ) : (
            <SearchIcon size={18} className="text-foreground-secondary shrink-0" />
          )}
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks across your projects..."
            className="w-full bg-transparent text-foreground placeholder:text-foreground-secondary focus:outline-none text-sm sm:text-base font-medium min-h-[36px]"
          />
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-foreground-secondary hover:text-foreground p-1.5 rounded-md hover:bg-hover min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-3 sm:p-4 max-h-[60vh] overflow-y-auto">
          {query.trim() === "" ? (
            <div className="text-xs text-foreground-secondary font-medium uppercase tracking-wider py-4 text-center">
              Type to search tasks by title, description, or status
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="text-sm text-foreground-secondary py-6 text-center">
              No tasks found matching &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((task) => (
                <div 
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className="p-3 rounded-lg border border-border bg-canvas/40 hover:bg-hover cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all shadow-neu-flat-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="text-xs text-foreground-secondary mt-0.5 line-clamp-1">
                      {task.description || "No description provided"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                      {task.priority || "medium"}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-canvas shadow-neu-flat-sm text-foreground-secondary border border-border/40">
                      {task.status || "todo"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
