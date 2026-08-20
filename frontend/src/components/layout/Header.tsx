"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Search as SearchIcon } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const triggerCommandPalette = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      })
    );
  };

  return (
    <header className="h-16 border-b border-border bg-card px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 w-full shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-hover min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 sm:ml-0"
            aria-label="Open mobile navigation menu"
          >
            <Menu size={22} />
          </button>
        )}

        <button
          onClick={triggerCommandPalette}
          className="flex items-center gap-2 bg-canvas border border-border rounded-lg px-2.5 sm:px-3 py-1.5 text-sm text-foreground-secondary hover:border-accent transition-colors max-w-[200px] sm:max-w-xs md:max-w-sm w-full min-h-[40px] text-left"
          title="Open search (Ctrl+K)"
        >
          <SearchIcon size={16} className="text-foreground-secondary shrink-0" />
          <span className="truncate text-xs sm:text-sm">Search...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] uppercase font-mono bg-card border border-border px-1.5 py-0.5 rounded text-foreground-secondary">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <NotificationBell />
        <span 
          className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" 
          title="Live WS Connected"
          aria-label="WebSocket Connected"
        />

        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm font-bold text-accent uppercase shrink-0">
          {user?.full_name ? user.full_name[0] : "U"}
        </div>

        {user && (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-canvas border border-border hover:bg-hover text-foreground-secondary hover:text-foreground transition-colors min-h-[40px]"
            title="Log out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline font-medium">Log out</span>
          </button>
        )}
      </div>
    </header>
  );
};
