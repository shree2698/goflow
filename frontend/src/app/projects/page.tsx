"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreateProjectModal } from "../../components/projects/CreateProjectModal";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiClient } from "@/lib/api-client";
import { Plus, FolderKanban, Loader2 } from "lucide-react";

import { useAuthStore } from "@/stores/auth-store";

interface Project {
  id: string;
  name: string;
  description: string;
  color?: string;
  status?: string;
}

export default function ProjectsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Project[]>("/projects");
      setProjects(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.error?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const getProjectStatusBadge = (status?: string) => {
    const s = (status || "active").toLowerCase();
    switch (s) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-500 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Archived
          </span>
        );
      case "on_hold":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            On Hold
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-600 border border-indigo-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-500 border border-slate-500/30">
            {s.toUpperCase()}
          </span>
        );
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === "active") return (p.status || "active").toLowerCase() === "active";
    if (statusFilter === "inactive") return (p.status || "active").toLowerCase() !== "active";
    return true;
  });

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {isAdmin ? "Projects" : "My Assigned Projects"}
            </h1>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
              {isAdmin
                ? "Manage your workspaces, tasks, and project workflows"
                : "Projects and task boards assigned to you"}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-lavender text-white px-5 py-2.5 rounded-xl shadow-neu-btn hover:opacity-95 active:shadow-neu-btn-active transition-all text-sm font-semibold min-h-[44px] shrink-0 self-start sm:self-auto w-full sm:w-auto"
            >
              <Plus size={18} />
              <span>Create Project</span>
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === "all"
                ? "bg-canvas shadow-neu-pressed text-accent border border-white/60"
                : "bg-canvas shadow-neu-flat-sm text-foreground-secondary hover:text-foreground border border-white/40"
              }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === "active"
                ? "bg-canvas shadow-neu-pressed text-emerald-600 border border-white/60"
                : "bg-canvas shadow-neu-flat-sm text-foreground-secondary hover:text-foreground border border-white/40"
              }`}
          >
            Active ({projects.filter((p) => (p.status || "active").toLowerCase() === "active").length})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === "inactive"
                ? "bg-canvas shadow-neu-pressed text-slate-500 border border-white/60"
                : "bg-canvas shadow-neu-flat-sm text-foreground-secondary hover:text-foreground border border-white/40"
              }`}
          >
            Inactive / Archived ({projects.filter((p) => (p.status || "active").toLowerCase() !== "active").length})
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm">
            {error}
          </div>
        )}

        <div className="">

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="animate-spin text-accent" size={32} />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center p-12 bg-canvas rounded-2xl border border-dashed border-border shadow-neu-flat">
              <FolderKanban className="mx-auto text-foreground-secondary mb-3" size={40} />
              <h3 className="text-base font-semibold text-foreground">
                {isAdmin ? "No projects found" : "No assigned projects"}
              </h3>
              <p className="text-xs text-foreground-secondary mt-1">
                {statusFilter !== "all"
                  ? `No projects matching '${statusFilter}' status.`
                  : isAdmin
                    ? "Get started by creating your first project"
                    : "You will see projects here once an administrator assigns you to a project workspace"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                  <div className="bg-canvas p-6 rounded-2xl shadow-neu-flat group-hover:shadow-neu-flat-lg transition-all duration-300 h-full flex flex-col justify-between border border-white/50">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="p-3 rounded-xl shadow-neu-flat-sm bg-canvas text-accent group-hover:text-lavender transition-colors"
                          style={p.color ? { color: p.color } : undefined}
                        >
                          <FolderKanban size={22} />
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-foreground group-hover:text-accent transition-colors truncate">
                          {p.name}
                        </h2>
                      </div>
                      <p className="text-xs sm:text-sm text-foreground-secondary line-clamp-3 leading-relaxed">
                        {p.description || "No description provided."}
                      </p>
                    </div>
                    <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-foreground-secondary">
                      {getProjectStatusBadge(p.status)}
                      <span className="text-accent font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Open Board →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        {isModalOpen && (
          <CreateProjectModal
            onClose={() => setIsModalOpen(false)}
            onSuccess={loadProjects}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
