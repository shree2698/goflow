"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Users, X, Bot } from "lucide-react";

import { useAuthStore } from "@/stores/auth-store";

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenAssistant?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
  onOpenAssistant,
}) => {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-8 px-2 pt-2">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-lavender flex items-center justify-center text-white font-black text-xl shadow-neu-flat-sm">
              G
            </span>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground block">GoFlow</span>
              <span className="text-[10px] text-foreground-secondary font-medium tracking-wide uppercase">Workflow Suite</span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-2 rounded-xl text-foreground-secondary hover:text-foreground shadow-neu-btn active:shadow-neu-btn-active min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="space-y-3">
          {isAdmin && (
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                isActive("/dashboard")
                  ? "shadow-neu-pressed text-accent font-semibold bg-canvas"
                  : "text-foreground-secondary hover:text-foreground hover:shadow-neu-btn bg-canvas"
              }`}
            >
              <LayoutDashboard size={18} className={isActive("/dashboard") ? "text-accent" : "text-lavender"} />
              <span>Dashboard</span>
            </Link>
          )}

          <Link
            href="/projects"
            onClick={onCloseMobile}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
              pathname.startsWith("/projects")
                ? "shadow-neu-pressed text-accent font-semibold bg-canvas"
                : "text-foreground-secondary hover:text-foreground hover:shadow-neu-btn bg-canvas"
            }`}
          >
            <FolderKanban size={18} className={pathname.startsWith("/projects") ? "text-accent" : "text-lavender"} />
            <span>{isAdmin ? "Projects" : "My Assigned Projects"}</span>
          </Link>

          {isAdmin && (
            <Link
              href="/employees"
              onClick={onCloseMobile}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                isActive("/employees")
                  ? "shadow-neu-pressed text-accent font-semibold bg-canvas"
                  : "text-foreground-secondary hover:text-foreground hover:shadow-neu-btn bg-canvas"
              }`}
            >
              <Users size={18} className={isActive("/employees") ? "text-accent" : "text-lavender"} />
              <span>Employees Control</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              onCloseMobile?.();
              onOpenAssistant?.();
            }}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] text-foreground-secondary hover:text-foreground hover:shadow-neu-btn bg-canvas text-left group"
          >
            <Bot size={18} className="text-accent group-hover:scale-110 transition-transform" />
            <span className="flex-1">AI Task Assistant</span>
            <span className="text-[10px] font-mono uppercase bg-canvas shadow-neu-flat-sm text-accent font-bold px-1.5 py-0.5 rounded">
              AI
            </span>
          </button>
        </nav>
      </div>

      <div className="p-3.5 rounded-xl shadow-neu-pressed text-xs text-foreground-secondary mt-6 bg-canvas">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground-secondary">GoFlow Engine</span>
          <span className="font-mono text-[10px] bg-canvas shadow-neu-flat-sm text-lavender font-bold px-2 py-0.5 rounded-lg">v1.0.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-canvas min-h-screen p-5 flex-col justify-between shrink-0 shadow-neu-flat-sm border-r border-border/40 z-20">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-canvas p-5 flex flex-col justify-between shadow-neu-flat-lg transform transition-transform duration-200 ease-in-out md:hidden ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation"
      >
        {navContent}
      </aside>
    </>
  );
};
