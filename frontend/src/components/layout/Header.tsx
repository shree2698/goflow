"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Menu,
  Search as SearchIcon,
  X,
  Loader2,
  ChevronDown,
  User as UserIcon,
  Key as KeyIcon,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useWebSocket } from "@/lib/useWebSocket";
import { apiClient } from "@/lib/api-client";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Dropdown & Modal state
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<"profile" | "password">("profile");

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8081/api/v1/ws";
  const wsUrl = accessToken ? `${wsBase}?token=${accessToken}` : null;
  const { status: wsStatus } = useWebSocket(wsUrl);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiClient.get<any>(`/tasks/search?q=${encodeURIComponent(searchQuery.trim())}`);
        const items = res.data?.data || res.data || [];
        setSearchResults(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error("Search error", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut (Escape to close menus, Ctrl+K / Cmd+K to focus search input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsAvatarMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectTask = (task: any) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    if (task.project_id) {
      router.push(`/projects/${task.project_id}`);
    }
  };

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
    <header className="h-16 bg-canvas px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 w-full shrink-0 shadow-neu-flat-sm border-b border-border/30">
      {/* Left: Mobile Sidebar Toggle & Inline Search */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-foreground-secondary hover:text-foreground shadow-neu-btn active:shadow-neu-btn-active min-w-[40px] min-h-[40px] flex items-center justify-center -ml-1 sm:ml-0"
            aria-label="Open mobile navigation menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Inline Search (searches right there instead of popping out) */}
        <div className="relative flex-1 max-w-[220px] sm:max-w-xs md:max-w-sm lg:max-w-md" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none flex items-center justify-center">
              {isSearching ? (
                <Loader2 size={16} className="text-accent animate-spin" />
              ) : (
                <SearchIcon size={16} className="text-lavender" />
              )}
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim().length > 0 || searchResults.length > 0) {
                  setIsSearchOpen(true);
                }
              }}
              placeholder="Search tasks..."
              className="w-full bg-canvas shadow-neu-pressed rounded-xl pl-9 pr-14 py-2 text-xs sm:text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent min-h-[40px] transition-all"
              aria-label="Search tasks in GoFlow"
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearchOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 text-foreground-secondary hover:text-foreground p-1 rounded-md transition-colors"
                aria-label="Clear search query"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-3 text-[10px] uppercase font-mono bg-canvas shadow-neu-flat-sm px-1.5 py-0.5 rounded text-foreground-secondary pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Inline Search Dropdown Results */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-full min-w-[280px] sm:min-w-[380px] md:min-w-[440px] bg-canvas border border-border/60 rounded-2xl shadow-neu-flat-lg z-50 p-2 sm:p-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-border/20 text-[11px] font-bold uppercase tracking-wider text-foreground-secondary">
                <span>Search Results</span>
                {searchResults.length > 0 && (
                  <span className="text-accent font-semibold">{searchResults.length} found</span>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto space-y-1.5 pt-1">
                {isSearching ? (
                  <div className="flex items-center justify-center py-6 text-foreground-secondary text-xs gap-2">
                    <Loader2 size={16} className="text-accent animate-spin" />
                    <span>Searching tasks...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-6 text-foreground-secondary text-xs">
                    No tasks found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  searchResults.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className="p-2.5 rounded-xl border border-border/30 bg-canvas hover:bg-hover/60 cursor-pointer flex items-center justify-between gap-2 transition-all shadow-neu-flat-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-[11px] text-foreground-secondary truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.priority && (
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                            {task.priority}
                          </span>
                        )}
                        {task.status && (
                          <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-canvas shadow-neu-flat-sm text-foreground-secondary border border-border/40">
                            {task.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Notifications, Connection Status & Avatar Dropdown Menu */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
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
                  src={user.avatar_url}
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
              className={`text-foreground-secondary transition-transform duration-200 hidden sm:block ${
                isAvatarMenuOpen ? "rotate-180" : ""
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
