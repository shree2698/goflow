import React from "react";

export const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search task (Cmd+K)..."
          className="bg-canvas border border-border rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-accent w-64"
        />
      </div>
      <div className="flex items-center gap-4">
        <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full" title="Live WS Connected"></span>
        <div className="w-8 h-8 rounded-full bg-hover border border-border flex items-center justify-center text-sm font-semibold text-accent">
          U
        </div>
      </div>
    </header>
  );
};
