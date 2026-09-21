"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { Notification } from "@/types/notification";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiClient.get<Notification[]>("/notifications");
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [isAuthenticated]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await apiClient.patch("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-hover text-foreground-secondary hover:text-foreground transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile dismiss */}
          <div
            className="fixed inset-0 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1.5rem)] sm:w-80 md:w-96 max-w-sm bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-canvas">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setNotifications([]) }} className="text-xs text-accent hover:underline flex items-center gap-1">
                  Clear all
                </button>
                <button onClick={() => setIsOpen(false)}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <X size={14} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-foreground-secondary">
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 text-sm flex gap-3 transition-colors ${n.is_read ? "opacity-70 bg-card" : "bg-card/40 font-medium"
                      } hover:bg-hover`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-xs uppercase tracking-wider text-accent">
                          {n.type ? n.type.replace("_", " ") : "ALERT"}
                        </span>
                        <span className="text-[10px] text-foreground-secondary">
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-0.5">{n.title}</p>
                      <p className="text-xs text-foreground-secondary mt-0.5">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        title="Mark as read"
                        className="self-start text-xs text-foreground-secondary hover:text-accent p-1"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
