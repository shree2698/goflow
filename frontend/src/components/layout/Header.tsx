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
    <header className="h-16 bg-canvas px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 w-full shrink-0 shadow-neu-flat-sm border-b border-border/30">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-foreground-secondary hover:text-foreground shadow-neu-btn active:shadow-neu-btn-active min-w-[40px] min-h-[40px] flex items-center justify-center -ml-1 sm:ml-0"
            aria-label="Open mobile navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        <button
          onClick={triggerCommandPalette}
          className="flex items-center gap-2.5 bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2 text-sm text-foreground-secondary hover:text-foreground transition-all max-w-[200px] sm:max-w-xs md:max-w-sm w-full min-h-[40px] text-left"
          title="Open search (Ctrl+K)"
        >
          <SearchIcon size={16} className="text-lavender shrink-0" />
          <span className="truncate text-xs sm:text-sm text-foreground-secondary">Search GoFlow...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] uppercase font-mono bg-canvas shadow-neu-flat-sm px-1.5 py-0.5 rounded text-foreground-secondary">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="p-1 rounded-xl shadow-neu-btn flex items-center justify-center">
          <NotificationBell />
        </div>

        <span 
          className="inline-block w-2.5 h-2.5 bg-accent rounded-full shrink-0 shadow-neu-flat-sm animate-pulse" 
          title="Live WS Connected"
          aria-label="WebSocket Connected"
        />

        <div className="w-9 h-9 rounded-xl bg-canvas shadow-neu-flat-sm flex items-center justify-center text-sm font-bold text-accent uppercase shrink-0 border border-white/60">
          {user?.full_name ? user.full_name[0] : "U"}
        </div>

        {user && (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-canvas shadow-neu-btn hover:text-pink active:shadow-neu-btn-active text-foreground-secondary transition-all min-h-[40px]"
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
