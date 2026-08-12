"use client";

import React, { useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Notification } from "@/types/notification";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      user_id: "user-1",
      type: "TASK_ASSIGNED",
      title: "New Task Assigned",
      message: "You have been assigned to 'Implement Redis Queue Worker'",
      is_read: false,
      created_at: new Date().toISOString(),
      data: { taskId: "task-101", projectId: "proj-1" }
    },
    {
      id: "2",
      user_id: "user-1",
      type: "WORKFLOW_ALERT",
      title: "Workflow Execution Success",
      message: "Workflow 'Auto-assign On Creation' executed successfully",
      is_read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    }
  ]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:bg-hover text-foreground-secondary hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between bg-canvas">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
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

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-foreground-secondary">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 text-sm flex gap-3 transition-colors ${
                    n.is_read ? "opacity-70 bg-card" : "bg-card/40 font-medium"
                  } hover:bg-hover`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground text-xs uppercase tracking-wider text-accent">
                        {n.type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-foreground-secondary">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      )}
    </div>
  );
};
