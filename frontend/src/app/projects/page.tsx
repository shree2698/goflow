"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreateProjectModal } from "../../components/projects/CreateProjectModal";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiClient } from "@/lib/api-client";
import { Plus, FolderKanban, Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  color?: string;
  status?: string;
}

export default function ProjectsPage() {
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

  return (
    <ProtectedRoute>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Projects</h1>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
              Manage your workspaces, tasks, and project workflows
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-lavender text-white px-5 py-2.5 rounded-xl shadow-neu-btn hover:opacity-95 active:shadow-neu-btn-active transition-all text-sm font-semibold min-h-[44px] shrink-0 self-start sm:self-auto w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Create Project</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center p-12 bg-canvas rounded-2xl border border-dashed border-border shadow-neu-flat">
            <FolderKanban className="mx-auto text-foreground-secondary mb-3" size={40} />
            <h3 className="text-base font-semibold text-foreground">No projects found</h3>
            <p className="text-xs text-foreground-secondary mt-1">Get started by creating your first project</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
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
                    <span className="font-medium text-foreground-secondary">Active Kanban</span>
                    <span className="text-accent font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Open Board →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

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
