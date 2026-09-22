"use client";

import React, { useState, useEffect } from "react";
import { X, User, Key, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield, Globe } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient, getImageUrl } from "@/lib/api-client";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profile" | "password";
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = "profile",
}) => {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "password">(initialTab);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || "");
      setTimezone(user.timezone || "UTC");
      setAvatarUrl(user.avatar_url || "");
      setAvatarFile(null);
      setActiveTab(initialTab);
      setProfileSuccess(null);
      setProfileError(null);
      setPasswordSuccess(null);
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [isOpen, user, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileError("Full name is required");
      return;
    }

    setIsSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const { useAuthStore } = require("../../stores/auth-store");
        const token = useAuthStore.getState().accessToken;
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        
        const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1"}/users/me/avatar`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        });
        
        if (!uploadRes.ok) throw new Error("Failed to upload avatar");
        const uploadData = await uploadRes.json();
        finalAvatarUrl = uploadData.data.avatar_url;
      }
      const payload: { full_name: string; timezone: string; avatar_url: string | null } = {
        full_name: fullName.trim(),
        timezone: timezone || "UTC",
        avatar_url: finalAvatarUrl?.trim() ? finalAvatarUrl.trim() : null,
      };

      await apiClient.patch("/users/me", payload);

      updateUser(payload);
      setProfileSuccess("Profile settings updated successfully!");
    } catch (err: any) {
      const msg =
        err?.error?.message ||
        err?.message ||
        "Failed to update profile settings. Please try again.";
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiClient.patch("/users/me", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg =
        err?.error?.message ||
        err?.message ||
        "Failed to update password. Please verify your current password.";
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-canvas border border-border/70 rounded-3xl shadow-neu-flat-lg w-full max-w-lg overflow-hidden my-auto relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/30 bg-canvas">
          <div>
            <h2 id="profile-modal-title" className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              Profile & Settings
            </h2>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Manage your personal information and account security
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground-secondary hover:text-foreground p-2 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active min-w-[36px] min-h-[36px] flex items-center justify-center transition-all"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-border/20">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "profile"
                ? "bg-canvas text-accent shadow-neu-pressed"
                : "text-foreground-secondary hover:text-foreground hover:bg-canvas/50"
            }`}
          >
            <User size={16} />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "password"
                ? "bg-canvas text-accent shadow-neu-pressed"
                : "text-foreground-secondary hover:text-foreground hover:bg-canvas/50"
            }`}
          >
            <Key size={16} />
            <span>Change Password</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === "profile" ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-2.5 shadow-neu-flat-sm">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2.5 shadow-neu-flat-sm">
                  <AlertCircle size={18} className="shrink-0 text-rose-500" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Avatar info */}
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-canvas shadow-neu-flat-sm border border-white/60">
                <div className="w-14 h-14 rounded-2xl bg-canvas shadow-neu-pressed flex items-center justify-center text-xl font-bold text-accent uppercase shrink-0 overflow-hidden border border-border/40">
                  {avatarUrl ? (
                    <img
                      src={getImageUrl(avatarUrl)}
                      alt={fullName || "User"}
                      className="w-full h-full object-cover"
                      onError={() => {
                        // Fallback silently if image URL is broken
                      }}
                    />
                  ) : fullName ? (
                    fullName[0]
                  ) : (
                    "U"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{fullName || "User Profile"}</p>
                  <p className="text-xs text-foreground-secondary truncate">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/25">
                      <Shield size={10} />
                      {user?.role || "Employee"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="full-name" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent min-h-[42px]"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Email Address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  disabled
                  value={user?.email || ""}
                  className="w-full bg-canvas/60 shadow-neu-pressed-sm rounded-xl px-3.5 py-2.5 text-sm text-foreground-secondary opacity-75 cursor-not-allowed min-h-[42px]"
                />
                <p className="text-[11px] text-foreground-secondary mt-1">
                  Email address cannot be modified directly. Contact your administrator if needed.
                </p>
              </div>

              <div>
                <label htmlFor="profile-timezone" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Timezone
                </label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-secondary pointer-events-none" />
                  <select
                    id="profile-timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent min-h-[42px] appearance-none"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="profile-avatar" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Avatar Image (Optional)
                </label>
                <input
                  id="profile-avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      setAvatarUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-canvas shadow-neu-btn hover:text-foreground text-foreground-secondary text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white shadow-neu-btn text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSavingProfile && <Loader2 size={16} className="animate-spin" />}
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-2.5 shadow-neu-flat-sm">
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2.5 shadow-neu-flat-sm">
                  <AlertCircle size={18} className="shrink-0 text-rose-500" />
                  <span>{passwordError}</span>
                </div>
              )}

              <p className="text-xs text-foreground-secondary">
                Ensure your account is using a strong, unique password to prevent unauthorized access.
              </p>

              <div>
                <label htmlFor="current-password" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground p-1"
                    aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground p-1"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground p-1"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-canvas shadow-neu-btn hover:text-foreground text-foreground-secondary text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white shadow-neu-btn text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isChangingPassword && <Loader2 size={16} className="animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
