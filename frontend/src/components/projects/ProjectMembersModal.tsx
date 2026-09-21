"use client";

import React, { useState, useEffect } from "react";
import { X, Users, UserPlus, UserMinus, Shield, ShieldAlert, Loader2, CheckCircle, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | string;
  joined_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface CompanyUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface ProjectMembersModalProps {
  projectId: string;
  projectName?: string;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  projectId,
  projectName,
  isOpen,
  onClose,
  isAdmin = false,
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New member form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ProjectMember[]>(`/projects/${projectId}/members`);
      setMembers(res.data || []);

      if (isAdmin) {
        const usersRes = await apiClient.get<CompanyUser[]>("/users");
        setCompanyUsers(usersRes.data || []);
      }
    } catch (err: any) {
      setError(err?.error?.message || "Failed to load project members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      loadData();
      setSelectedUserId("");
      setSelectedRole("MEMBER");
      setSuccess(null);
      setError(null);
    }
  }, [isOpen, projectId, isAdmin]);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post(`/projects/${projectId}/members`, {
        user_id: selectedUserId,
        role: selectedRole,
      });
      setSuccess("Employee successfully assigned to project.");
      setSelectedUserId("");
      setSelectedRole("MEMBER");
      await loadData();
    } catch (err: any) {
      setError(err?.error?.message || "Failed to assign employee to project.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to revoke project access for ${memberName || "this user"}?`)) {
      return;
    }

    setRemovingId(userId);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.delete(`/projects/${projectId}/members/${userId}`);
      setSuccess(`Revoked access for ${memberName || "member"}.`);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      setError(err?.error?.message || "Failed to revoke member access.");
    } finally {
      setRemovingId(null);
    }
  };

  // Available employees who are not yet members
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableUsers = companyUsers.filter((u) => !memberUserIds.has(u.id));

  const filteredMembers = members.filter(
    (m) =>
      m.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role?.toLowerCase().includes(searchQuery.toLowerCase())
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
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Project Access & Members
              </h2>
              <p className="text-xs sm:text-sm text-foreground-secondary">
                {projectName ? `Manage team access for ${projectName}` : "Manage who can view and edit this project"}
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

        {/* Admin Section: Add Member */}
        {isAdmin && (
          <div className="p-4 bg-canvas shadow-neu-pressed rounded-2xl border border-white/40 space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <UserPlus size={16} className="text-accent" />
              <span>Grant Project Access</span>
            </h3>
            <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-canvas shadow-neu-flat-sm rounded-xl text-foreground text-xs sm:text-sm focus:outline-none border border-white/60 min-h-[42px]"
                  required
                >
                  <option value="">Select Employee...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email}) - {u.role}
                    </option>
                  ))}
                  {availableUsers.length === 0 && (
                    <option value="" disabled>
                      All company employees are already assigned
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
                disabled={adding || !selectedUserId}
                className="px-4 py-2.5 bg-accent text-white rounded-xl text-xs sm:text-sm font-semibold shadow-neu-btn active:shadow-neu-btn-active hover:bg-accent-hover transition-all min-h-[42px] disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                {adding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                <span>Add</span>
              </button>
            </form>
          </div>
        )}

        {/* Member Search */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-secondary/70" />
            <input
              type="text"
              placeholder="Search assigned members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-canvas shadow-neu-pressed rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-foreground-secondary/60 focus:outline-none min-h-[38px] transition-all"
            />
          </div>
          <span className="text-xs font-semibold text-foreground-secondary shrink-0 px-2 py-1 rounded-lg bg-canvas shadow-neu-flat-sm border border-white/60">
            {members.length} {members.length === 1 ? "Member" : "Members"}
          </span>
        </div>

        {/* Members List */}
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-10 text-center text-foreground-secondary flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-accent" />
              <span className="text-xs sm:text-sm font-medium">Loading project members...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-foreground-secondary text-xs sm:text-sm font-medium bg-canvas shadow-neu-pressed rounded-2xl border border-white/40">
              {searchQuery ? "No members match your search." : "No members assigned to this project."}
            </div>
          ) : (
            filteredMembers.map((m) => {
              const isOwner = m.role?.toUpperCase() === "OWNER";
              const isRemoving = removingId === m.user_id;

              return (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-canvas shadow-neu-flat-sm border border-white/60 hover:shadow-neu-flat transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-9 h-9 rounded-xl bg-canvas shadow-neu-pressed flex items-center justify-center text-accent font-bold text-xs shrink-0 border border-white/60">
                      {m.user?.full_name ? m.user.full_name[0].toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {m.user?.full_name || "Unknown User"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isOwner
                              ? "bg-lavender/15 text-lavender border border-lavender/30"
                              : m.role?.toUpperCase() === "ADMIN"
                              ? "bg-accent/15 text-accent border border-accent/30"
                              : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                          }`}
                        >
                          {m.role}
                        </span>
                      </div>
                      <span className="text-[11px] sm:text-xs text-foreground-secondary truncate block">
                        {m.user?.email}
                      </span>
                    </div>
                  </div>

                  {isAdmin && !isOwner && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id, m.user?.full_name)}
                      disabled={isRemoving}
                      title="Revoke access"
                      className="p-2 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-pink hover:opacity-80 transition-all min-w-[34px] min-h-[34px] flex items-center justify-center shrink-0 disabled:opacity-50"
                      aria-label="Revoke member access"
                    >
                      {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                    </button>
                  )}
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
