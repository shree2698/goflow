"use client";
import React, { useState } from "react";
import Link from "next/link";
import { CreateProjectModal } from "../../components/projects/CreateProjectModal";
import { Plus, FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects] = useState([
    { id: '1', name: 'Frontend Refactor', description: 'Update the frontend to Next.js 14 and Tailwind' },
    { id: '2', name: 'Backend API', description: 'Build new REST endpoints and Redis worker pool' }
  ]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
            Manage your workspaces, tasks, and project workflows
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-accent text-white px-4 py-2.5 rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium min-h-[44px] shrink-0 self-start sm:self-auto w-full sm:w-auto shadow-sm"
        >
          <Plus size={16} />
          <span>Create Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {projects.map(p => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block group">
            <div className="bg-card p-5 sm:p-6 rounded-xl border border-border group-hover:border-accent transition-colors shadow-sm h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent">
                    <FolderKanban size={20} />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                    {p.name}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-foreground-secondary line-clamp-2">{p.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-foreground-secondary">
                <span>Active Kanban</span>
                <span className="text-accent font-medium group-hover:underline">Open Board →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isModalOpen && <CreateProjectModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
