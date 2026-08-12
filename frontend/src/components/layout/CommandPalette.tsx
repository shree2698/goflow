"use client";

import React, { useState, useEffect } from "react";
import { Search as SearchIcon, Filter, X } from "lucide-react";

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <SearchIcon size={20} className="text-foreground-secondary" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, or workflows (type 'status:TODO', etc.)..."
            className="w-full bg-transparent text-foreground placeholder:text-foreground-secondary focus:outline-none text-base font-medium"
          />
          <button onClick={() => setIsOpen(false)} className="text-foreground-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {query.trim() === "" ? (
            <div className="text-xs text-foreground-secondary font-medium uppercase tracking-wider">
              Quick Suggestions
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 rounded-lg border border-border bg-canvas/40 hover:bg-hover cursor-pointer flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Implement Redis Queue Worker</p>
                  <p className="text-xs text-foreground-secondary mt-0.5">Project: Backend Architecture • Priority: High</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-semibold">IN_PROGRESS</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
