"use client";

import React, { useEffect } from "react";
import { LogOut, AlertTriangle, Loader2 } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-description"
    >
      <div className="bg-canvas border border-border/70 rounded-3xl shadow-neu-flat-lg w-full max-w-sm p-6 relative animate-in fade-in zoom-in-95 duration-200 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-neu-flat-sm">
          <AlertTriangle size={28} />
        </div>

        <h3 id="logout-dialog-title" className="text-lg font-bold text-foreground">
          Confirm Logout
        </h3>

        <p id="logout-dialog-description" className="text-xs sm:text-sm text-foreground-secondary mt-2 leading-relaxed">
          Are you sure you want to log out? Any unsaved changes may be lost, and you will need to sign in again to access your projects.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-canvas shadow-neu-btn hover:text-foreground active:shadow-neu-btn-active text-foreground-secondary text-xs sm:text-sm font-semibold transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-neu-btn text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogOut size={16} />
            )}
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
