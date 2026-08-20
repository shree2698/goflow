"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Bell, Users, X } from "lucide-react";

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const mockProjects = [
  { id: "1", name: "Frontend Refactor" },
  { id: "2", name: "Backend API" }
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const [projects] = useState<{ id: string; name: string }[]>(mockProjects);

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-black text-lg">G</span>
            <span className="text-xl font-bold tracking-tight text-foreground">GoFlow</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-hover min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="space-y-1.5">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              isActive("/dashboard")
                ? "bg-hover text-accent font-semibold"
                : "text-foreground-secondary hover:text-foreground hover:bg-hover"
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/projects"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              pathname === "/projects"
                ? "bg-hover text-accent font-semibold"
                : "text-foreground-secondary hover:text-foreground hover:bg-hover"
            }`}
          >
            <FolderKanban size={18} />
            <span>Projects</span>
          </Link>

          <div className="pl-9 space-y-1 py-1">
            {projects.map((p) => {
              const isProjActive = pathname.startsWith(`/projects/${p.id}`);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  onClick={onCloseMobile}
                  className={`block px-3 py-2 text-xs rounded-md transition-colors min-h-[36px] flex items-center ${
                    isProjActive
                      ? "text-accent font-semibold bg-hover/60"
                      : "text-foreground-secondary hover:text-foreground hover:bg-hover"
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
          </div>

          <Link
            href="/employees"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              isActive("/employees")
                ? "bg-hover text-accent font-semibold"
                : "text-foreground-secondary hover:text-foreground hover:bg-hover"
            }`}
          >
            <Users size={18} />
            <span>Employees Control</span>
          </Link>
        </nav>
      </div>

      <div className="p-3 text-xs text-foreground-secondary border-t border-border mt-6">
        <div className="flex items-center justify-between">
          <span>GoFlow System</span>
          <span className="font-mono text-[10px] bg-card border border-border px-1.5 py-0.5 rounded">v1.0.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-card border-r border-border min-h-screen p-4 flex-col justify-between shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-card border-r border-border p-4 flex flex-col justify-between shadow-2xl transform transition-transform duration-200 ease-in-out md:hidden ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation"
      >
        {navContent}
      </aside>
    </>
  );
};
