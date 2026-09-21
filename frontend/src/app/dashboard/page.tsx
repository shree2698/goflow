"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Ban, BarChart3, TrendingUp, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiClient } from "@/lib/api-client";

interface Summary {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  completion_rate: number;
  total_projects: number;
  total_workflows: number;
  workflow_executions: number;
}

interface ProjectAnalytics {
  project_id: string;
  project_name: string;
  total_tasks: number;
  completed_tasks: number;
  progress_pct: number;
}

interface ProductivityMetrics {
  completed_7_days: number;
  completed_30_days: number;
  velocity_per_day: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<ProjectAnalytics[]>([]);
  const [productivity, setProductivity] = useState<ProductivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [sumRes, projRes, prodRes] = await Promise.all([
          apiClient.get<Summary>("/analytics/summary").catch(() => null),
          apiClient.get<ProjectAnalytics[]>("/analytics/projects").catch(() => null),
          apiClient.get<ProductivityMetrics>("/analytics/productivity").catch(() => null),
        ]);

        if (sumRes?.data) setSummary(sumRes.data);
        if (projRes?.data) setProjects(projRes.data);
        if (prodRes?.data) setProductivity(prodRes.data);
      } catch (err) {
        console.error("Failed to load dashboard analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const stats = [
    { 
      label: "Total Tasks", 
      value: summary ? String(summary.total_tasks) : "0", 
      icon: BarChart3, 
      color: "text-accent", 
      bg: "bg-accent/15" 
    },
    { 
      label: "Completed", 
      value: summary ? String(summary.completed_tasks) : "0", 
      icon: CheckCircle2, 
      color: "text-emerald-500", 
      bg: "bg-emerald-500/15" 
    },
    { 
      label: "Pending", 
      value: summary ? String(summary.pending_tasks) : "0", 
      icon: Clock, 
      color: "text-lavender", 
      bg: "bg-lavender/20" 
    },
    { 
      label: "Overdue", 
      value: summary ? String(summary.overdue_tasks) : "0", 
      icon: AlertTriangle, 
      color: "text-pink", 
      bg: "bg-pink/20" 
    },
    { 
      label: "Blocked", 
      value: summary ? String(summary.blocked_tasks) : "0", 
      icon: Ban, 
      color: "text-rose-500", 
      bg: "bg-rose-500/15" 
    },
  ];

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Dashboard & Analytics</h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
            Real-time metrics, project completion rates, and workflow statistics
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="p-4 rounded-2xl bg-canvas shadow-neu-flat flex items-center justify-between transition-all hover:translate-y-[-2px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground-secondary font-medium truncate">{s.label}</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{s.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl shadow-neu-flat-sm ${s.bg} ${s.color} shrink-0 ml-2`}>
                      <Icon size={20} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Project Progress & Velocity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-canvas shadow-neu-flat">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm sm:text-base font-bold text-foreground">Project Progress</h2>
                  <span className="text-xs text-foreground-secondary">
                    Total: {summary?.total_projects || projects.length} Projects
                  </span>
                </div>
                <div className="space-y-4">
                  {projects.length === 0 ? (
                    <p className="text-xs text-foreground-secondary py-4 text-center">No project activity yet</p>
                  ) : (
                    projects.map((p) => {
                      const pct = Math.round(p.progress_pct || (p.total_tasks > 0 ? (p.completed_tasks / p.total_tasks) * 100 : 0));
                      return (
                        <div key={p.project_id}>
                          <div className="flex justify-between text-xs mb-2 font-medium">
                            <span className="text-foreground font-semibold truncate pr-2">{p.project_name}</span>
                            <span className="text-accent font-bold">
                              {p.completed_tasks}/{p.total_tasks} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-3 bg-canvas shadow-neu-pressed rounded-full overflow-hidden p-0.5">
                            <div 
                              className="h-full bg-gradient-to-r from-accent to-lavender rounded-full transition-all duration-500 shadow-sm" 
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Workflow & Productivity Stats */}
              <div className="p-5 rounded-2xl bg-canvas shadow-neu-flat flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm sm:text-base font-bold text-foreground">Productivity & Workflows</h2>
                    <div className="p-2 rounded-xl shadow-neu-flat-sm bg-canvas text-emerald-500">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-extrabold text-foreground">
                      {productivity ? productivity.velocity_per_day.toFixed(1) : "0.0"}
                    </span>
                    <span className="text-xs text-foreground-secondary font-medium">tasks completed / day (7-day avg)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border/40 text-xs">
                  <div>
                    <p className="text-foreground-secondary">Workflows Configured</p>
                    <p className="text-lg font-bold text-foreground mt-0.5">{summary?.total_workflows || 0}</p>
                  </div>
                  <div>
                    <p className="text-foreground-secondary">Automation Executions</p>
                    <p className="text-lg font-bold text-accent mt-0.5">{summary?.workflow_executions || 0}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-foreground-secondary">
                  <span>7-Day Completed: <strong className="text-foreground">{productivity?.completed_7_days || 0} tasks</strong></span>
                  <span>30-Day Completed: <strong className="text-foreground">{productivity?.completed_30_days || 0} tasks</strong></span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
