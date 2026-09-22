"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  ChevronDown,
  User as UserIcon,
  Key as KeyIcon,
  Menu,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useWebSocket } from "@/lib/useWebSocket";
import { apiClient, getImageUrl } from "@/lib/api-client";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import Link from "next/link";
import { FolderKanban, LayoutDashboard, Users } from "lucide-react";

interface HeaderProps {
  onToggleSidebar?: () => void;
  onOpenAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenAssistant,
}) => {
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();


  // Dropdown & Modal state
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<"profile" | "password">("profile");

  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8081/api/v1/ws";
  const wsUrl = accessToken ? `${wsBase}?token=${accessToken}` : null;
  const { status: wsStatus } = useWebSocket(wsUrl);

  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiClient.post("/auth/logout");
    } catch (err) {
      console.error("Logout request error", err);
    } finally {
      clearAuth();
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
      router.push("/login");
    }
  };

  return (
    <header className="h-16 bg-canvas px-3 sm:px-6 sticky top-0 z-30 w-full shrink-0 shadow-neu-flat-sm border-b border-border/30">
      <div className="flex items-center justify-between w-full h-full gap-2 sm:gap-4 md:gap-6">
        <div className="flex items-center gap-2 sm:gap-3 ">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 -ml-2 rounded-xl text-foreground-secondary hover:text-foreground shadow-neu-btn active:shadow-neu-btn-active min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Open mobile navigation menu"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="flex items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-lavender flex items-center justify-center text-white font-black text-xl shadow-neu-flat-sm">
                G
              </span>
              <div>
                <span className="text-xl sm:text-xl font-bold tracking-tight text-foreground block">GoFlow</span>
                <span className="hidden sm:block text-xs text-foreground-secondary font-medium tracking-wide uppercase">Workflow Suite</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Link
              href="/dashboard"
              className={`flex items-center justify-center md:justify-start gap-0 md:gap-3.5 px-3 md:px-4 py-2 md:py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${isActive("/dashboard")
                ? "shadow-neu-pressed text-accent font-semibold bg-canvas"
                : "text-foreground-secondary hover:text-foreground hover:shadow-neu-btn bg-canvas"
                }`}
            >
              <LayoutDashboard size={18} className={isActive("/dashboard") ? "text-accent" : "text-lavender"} />
              <span className="hidden md:block">Dashboard</span>
            </Link>
          )}

          <Link
            href="/projects"
            className={`flex items-center justify-center md:justify-start gap-0 md:gap-3.5 px-3 md:px-4 py-2 md:py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${pathname.startsWith("/projects")
              ? "shadow-neu-pressed text-accent font-semibold bg-canvas"
              : "text-foreground-secondary hover:text-foreground hover:shadow-neu-btn bg-canvas"
              }`}
          >
            <FolderKanban size={18} className={pathname.startsWith("/projects") ? "text-accent" : "text-lavender"} />
            <span className="hidden md:block">{isAdmin ? "Projects" : "My Assigned Projects"}</span>
          </Link>

          {isAdmin && (
            <Link
              href="/employees"
              className={`flex items-center justify-center md:justify-start gap-0 md:gap-3.5 px-3 md:px-4 py-2 md:py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${isActive("/employees")
                ? "shadow-neu-pressed text-accent font-semibold bg-canvas"
                : "text-foreground-secondary hover:text-foreground hover:shadow-neu-btn bg-canvas"
                }`}
            >
              <Users size={18} className={isActive("/employees") ? "text-accent" : "text-lavender"} />
              <span className="hidden md:block">Employees Control</span>
            </Link>
          )}
        </div>

        {/* Right: AI Assistant, Notifications & Avatar Dropdown Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3">
          <div className="rounded-xl shadow-neu-btn flex items-center justify-center">
            <NotificationBell />
          </div>

          {/* User Avatar with Dropdown Menu */}
          <div className="relative" ref={avatarMenuRef}>
            <button
              onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 p-1 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active hover:text-accent transition-all focus:outline-none focus:ring-2 focus:ring-accent/40"
              aria-label="User account menu"
              aria-haspopup="true"
              aria-expanded={isAvatarMenuOpen}
            >
              <div className="w-9 h-9 rounded-xl bg-canvas shadow-neu-flat-sm flex items-center justify-center text-xs sm:text-sm font-bold text-accent uppercase shrink-0 border border-white/60 overflow-hidden">
                {user?.avatar_url ? (
                  <img
                    src={getImageUrl(user.avatar_url)}
                    alt={user.full_name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : user?.full_name ? (
                  user.full_name[0]
                ) : (
                  "U"
                )}
              </div>
              <ChevronDown
                size={14}
                className={`text-foreground-secondary transition-transform duration-200 hidden sm:block ${isAvatarMenuOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {/* Avatar Dropdown Menu */}
            {isAvatarMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-canvas border border-border/60 rounded-2xl shadow-neu-flat-lg z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User preview */}
                <div className="px-3 py-2.5 mb-1 rounded-xl bg-canvas shadow-neu-pressed-sm border border-white/60">
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {user?.full_name || "GoFlow User"}
                  </p>
                  <p className="text-[11px] text-foreground-secondary truncate mt-0.5">
                    {user?.email || "user@goflow.com"}
                  </p>
                  {user?.role && (
                    <span className="inline-block mt-1.5 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25">
                      {user.role}
                    </span>
                  )}
                </div>

                <div className="my-1 border-t border-border/30" />

                {/* Menu items */}
                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    setProfileModalTab("profile");
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium text-foreground hover:text-accent rounded-xl hover:bg-hover/50 transition-colors text-left"
                >
                  <UserIcon size={16} className="text-accent shrink-0" />
                  <span>Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    setProfileModalTab("password");
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium text-foreground hover:text-accent rounded-xl hover:bg-hover/50 transition-colors text-left"
                >
                  <KeyIcon size={16} className="text-lavender shrink-0" />
                  <span>Change Password</span>
                </button>

                <div className="my-1 border-t border-border/30" />

                <button
                  onClick={() => {
                    setIsAvatarMenuOpen(false);
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium text-rose-500 hover:text-rose-600 rounded-xl hover:bg-rose-500/10 transition-colors text-left"
                >
                  <LogOut size={16} className="shrink-0" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialTab={profileModalTab}
      />

      {/* Logout Confirmation Warning Dialog */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        isLoading={isLoggingOut}
      />
    </header>
  );
};
