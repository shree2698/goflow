"use client";

import React from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

export const Header: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

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
        <NotificationBell />
        <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full" title="Live WS Connected"></span>

        <div className="w-8 h-8 rounded-full bg-hover border border-border flex items-center justify-center text-sm font-semibold text-accent uppercase">
          {user?.full_name ? user.full_name[0] : "U"}
        </div>
        {user && (
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-canvas border border-border hover:bg-hover text-foreground-secondary hover:text-foreground transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        )}
      </div>
    </header>
  );
};
