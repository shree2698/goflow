"use client";

import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Ban, BarChart3, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Total Tasks", value: "42", icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Completed", value: "28", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending", value: "10", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Overdue", value: "3", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Blocked", value: "1", icon: Ban, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Dashboard & Analytics</h1>
        <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
          Real-time metrics, project completion rates, and workflow statistics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="p-4 rounded-xl border border-border bg-card flex items-center justify-between shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground-secondary font-medium truncate">{s.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{s.value}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${s.bg} ${s.color} shrink-0 ml-2`}>
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Progress & Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-card">
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-4">Project Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-foreground truncate pr-2">Backend Refactoring</span>
                <span className="text-accent font-semibold">75%</span>
              </div>
              <div className="w-full h-2 bg-canvas border border-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: "75%" }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-foreground truncate pr-2">Frontend Redesign</span>
                <span className="text-emerald-500 font-semibold">90%</span>
              </div>
              <div className="w-full h-2 bg-canvas border border-border rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: "90%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow & Productivity Stats */}
        <div className="p-4 sm:p-5 rounded-xl border border-border bg-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">Productivity Velocity</h2>
              <TrendingUp size={18} className="text-emerald-500 shrink-0" />
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground">4.0</span>
              <span className="text-xs text-foreground-secondary font-medium">tasks completed / day (7-day avg)</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-foreground-secondary">
            <span>7-Day Total: <strong className="text-foreground">28 tasks</strong></span>
            <span>30-Day Total: <strong className="text-foreground">84 tasks</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
