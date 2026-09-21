"use client";

import React, { useState, useEffect } from "react";
import { X, FolderKanban, Plus, Trash2, Loader2, CheckCircle, Search, ExternalLink } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  status: string;
}

interface EmployeeProjectsModalProps {
  employee: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmployeeProjectsModal: React.FC<EmployeeProjectsModalProps> = ({
  employee,
  isOpen,
  onClose,
}) => {
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    if (!employee) return;
    setLoading(true);
    setError(null);
    try {
      const [assignedRes, allRes] = await Promise.all([
        apiClient.get<Project[]>(`/users/${employee.id}/projects`),
        apiClient.get<Project[]>("/projects"),
      ]);

      setAssignedProjects(assignedRes.data || []);
      setAllProjects(allRes.data || []);
    } catch (err: any) {
      setError(err?.error?.message || "Failed to load employee project access.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employee) {
      loadData();
      setSelectedProjectId("");
      setSelectedRole("MEMBER");
      setError(null);
      setSuccess(null);
      setSearchQuery("");
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    setAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post(`/projects/${selectedProjectId}/members`, {
        user_id: employee.id,
        role: selectedRole,
      });

      setSuccess("Employee assigned to project successfully.");
      setSelectedProjectId("");
      await loadData();
    } catch (err: any) {
      setError(err?.error?.message || "Failed to assign project access.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (projectId: string, projectName: string) => {
    if (!confirm(`Revoke access to "${projectName}" for ${employee.full_name}?`)) {
      return;
    }

    setRevokingId(projectId);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.delete(`/projects/${projectId}/members/${employee.id}`);
      setSuccess(`Access revoked for "${projectName}".`);
      setAssignedProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err: any) {
      setError(err?.error?.message || "Failed to revoke access.");
    } finally {
      setRevokingId(null);
    }
  };

  const assignedIds = new Set(assignedProjects.map((p) => p.id));
  const availableToAssign = allProjects.filter((p) => !assignedIds.has(p.id));

  const filteredProjects = assignedProjects.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-canvas w-full max-w-xl p-5 sm:p-7 rounded-3xl border border-white/70 shadow-neu-flat-lg relative max-h-[90vh] overflow-y-auto my-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-canvas shadow-neu-flat-sm flex items-center justify-center text-accent border border-white/60">
              <FolderKanban size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Project Access Control
              </h2>
              <p className="text-xs sm:text-sm text-foreground-secondary">
                Assigned projects for <span className="font-semibold text-foreground">{employee.full_name}</span> ({employee.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-foreground-secondary hover:text-foreground transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 bg-canvas shadow-neu-flat rounded-2xl text-pink text-xs sm:text-sm border border-pink/30 font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3.5 bg-canvas shadow-neu-flat rounded-2xl text-emerald-600 text-xs sm:text-sm flex items-center gap-2 border border-emerald-500/30 font-medium">
            <CheckCircle size={16} className="shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {/* Assign to New Project Form */}
        <div className="p-4 bg-canvas shadow-neu-pressed rounded-2xl border border-white/40 space-y-3">
          <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <Plus size={16} className="text-accent" />
            <span>Assign to Project</span>
          </h3>
          <form onSubmit={handleAssign} className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-canvas shadow-neu-flat-sm rounded-xl text-foreground text-xs sm:text-sm focus:outline-none border border-white/60 min-h-[42px]"
                required
              >
                <option value="">Select Project to Assign...</option>
                {availableToAssign.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {availableToAssign.length === 0 && (
                  <option value="" disabled>
                    Already assigned to all available projects
                  </option>
                )}
              </select>
            </div>
            <div className="w-full sm:w-32">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-canvas shadow-neu-flat-sm rounded-xl text-foreground text-xs sm:text-sm focus:outline-none border border-white/60 min-h-[42px]"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={assigning || !selectedProjectId}
              className="px-4 py-2.5 bg-accent text-white rounded-xl text-xs sm:text-sm font-semibold shadow-neu-btn active:shadow-neu-btn-active hover:bg-accent-hover transition-all min-h-[42px] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
            >
              {assigning ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>Grant Access</span>
            </button>
          </form>
        </div>

        {/* Search & Counter */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-secondary/70" />
            <input
              type="text"
              placeholder="Search assigned projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-canvas shadow-neu-pressed rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-foreground-secondary/60 focus:outline-none min-h-[38px] transition-all"
            />
          </div>
          <span className="text-xs font-semibold text-foreground-secondary shrink-0 px-2.5 py-1 rounded-lg bg-canvas shadow-neu-flat-sm border border-white/60">
            {assignedProjects.length} {assignedProjects.length === 1 ? "Project" : "Projects"}
          </span>
        </div>

        {/* Project List */}
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-10 text-center text-foreground-secondary flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-accent" />
              <span className="text-xs sm:text-sm font-medium">Loading project access list...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-8 text-center text-foreground-secondary text-xs sm:text-sm font-medium bg-canvas shadow-neu-pressed rounded-2xl border border-white/40">
              {searchQuery
                ? "No projects match your search."
                : "This employee currently has no project assignments."}
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const isRevoking = revokingId === proj.id;

              return (
                <div
                  key={proj.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-canvas shadow-neu-flat-sm border border-white/60 hover:shadow-neu-flat transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: proj.color || "#6366F1" }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {proj.name}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-canvas shadow-neu-pressed text-foreground-secondary border border-white/50">
                          {proj.status || "active"}
                        </span>
                      </div>
                      {proj.description && (
                        <p className="text-[11px] sm:text-xs text-foreground-secondary truncate max-w-sm">
                          {proj.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/projects/${proj.id}`}
                      target="_blank"
                      className="p-2 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-foreground-secondary hover:text-accent transition-all min-w-[34px] min-h-[34px] flex items-center justify-center"
                      title="Open project board"
                    >
                      <ExternalLink size={14} />
                    </Link>
                    <button
                      onClick={() => handleRevoke(proj.id, proj.name)}
                      disabled={isRevoking}
                      title="Revoke access"
                      className="p-2 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-pink hover:opacity-80 transition-all min-w-[34px] min-h-[34px] flex items-center justify-center disabled:opacity-50"
                      aria-label="Revoke project access"
                    >
                      {isRevoking ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-foreground text-xs sm:text-sm font-semibold hover:text-accent transition-all min-h-[40px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
