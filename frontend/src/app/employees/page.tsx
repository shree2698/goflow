"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiClient, getImageUrl } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { UserPlus, Edit2, Trash2, Shield, User, Key, X, CheckCircle, FolderKanban } from "lucide-react";
import { EmployeeProjectsModal } from "@/components/employees/EmployeeProjectsModal";

interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

export default function EmployeesPage() {
  const user = useAuthStore((state) => state.user);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeForProjects, setSelectedEmployeeForProjects] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "employee",
  });

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Employee[]>("/users");
      setEmployees(res.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.error?.message || "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadEmployees();
    }
  }, [user]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({ email: "", full_name: "", password: "", role: "employee" });
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      email: emp.email,
      full_name: emp.full_name,
      password: "",
      role: emp.role || "employee",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingEmployee) {
        // Update Employee
        const updatePayload: any = {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
        };
        if (formData.password) {
          updatePayload.password = formData.password;
        }

        await apiClient.patch(`/users/${editingEmployee.id}`, updatePayload);
        setSuccessMsg("Employee updated successfully!");
      } else {
        // Create Employee
        await apiClient.post("/users", formData);
        setSuccessMsg("Employee created successfully!");
      }

      setIsModalOpen(false);
      loadEmployees();
    } catch (err: any) {
      setError(err.error?.message || "Failed to save employee.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee? They will no longer be able to log in.")) {
      return;
    }
    try {
      await apiClient.delete(`/users/${id}`);
      setSuccessMsg("Employee deleted successfully!");
      loadEmployees();
    } catch (err: any) {
      setError(err.error?.message || "Failed to delete employee.");
    }
  };

  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const paginatedEmployees = employees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Employee Control Panel</h1>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
              Manage employee accounts, assign roles, reset passwords, and control login access.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent to-lavender hover:opacity-95 text-white rounded-xl text-sm font-semibold shadow-neu-btn active:shadow-neu-btn-active transition-all min-h-[44px] shrink-0 self-start sm:self-auto w-full sm:w-auto"
          >
            <UserPlus size={18} />
            <span>Add Employee</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-canvas shadow-neu-flat rounded-2xl text-pink text-sm border border-pink/30 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-canvas shadow-neu-flat rounded-2xl text-emerald-600 text-sm flex items-center gap-2 border border-emerald-500/30 font-medium">
            <CheckCircle size={18} className="shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-foreground-secondary font-medium">Loading employees...</div>
        ) : (
          <div className="rounded-2xl bg-canvas shadow-neu-flat overflow-hidden border border-white/60">
            <div className="overflow-x-auto overflow-y-auto max-h-[400px] w-full relative">
              <table className="w-full text-left text-sm text-foreground min-w-[540px]">
                <thead className="bg-canvas border-b border-border/40 text-xs text-foreground-secondary uppercase tracking-wider font-bold sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Project Access</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-hover/30 transition-colors">
                      <td className="px-6 py-4 font-bold">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-canvas shadow-neu-flat-sm flex items-center justify-center text-xs sm:text-sm font-bold text-accent uppercase shrink-0 border border-white/60 overflow-hidden">
                            {emp.avatar_url ? (
                              <img
                                src={getImageUrl(emp.avatar_url)}
                                alt={emp.full_name || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : emp.full_name ? (
                              emp.full_name[0]
                            ) : (
                              "U"
                            )}
                          </div>
                          <span className="truncate max-w-[160px] sm:max-w-xs">{emp.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground-secondary text-xs sm:text-sm font-medium">{emp.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow-neu-flat-sm ${emp.role === "admin"
                              ? "bg-canvas text-lavender border border-white/60"
                              : "bg-canvas text-accent border border-white/60"
                            }`}
                        >
                          {emp.role === "admin" ? <Shield size={13} /> : <User size={13} />}
                          {emp.role || "employee"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedEmployeeForProjects(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-foreground hover:text-accent text-xs font-semibold border border-white/60 transition-all cursor-pointer"
                          title="View and Manage Project Assignments"
                        >
                          <FolderKanban size={14} className="text-accent" />
                          <span>Assigned Projects</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-foreground-secondary hover:text-accent transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                            title="Edit / Reset Access"
                            aria-label="Edit Employee"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-2 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-pink hover:opacity-80 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                            title="Delete Access"
                            aria-label="Delete Employee"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-foreground-secondary text-sm">
                        No employees found. Click "Add Employee" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border/40 flex items-center justify-between bg-canvas rounded-b-2xl">
                <div className="text-xs text-foreground-secondary font-medium">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, employees.length)} of {employees.length} entries
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg bg-canvas shadow-neu-btn active:shadow-neu-btn-active disabled:opacity-50 disabled:shadow-none text-xs font-semibold border border-white/60"
                  >
                    Previous
                  </button>
                  <div className="flex items-center justify-center px-3 text-xs font-bold bg-canvas shadow-neu-pressed rounded-lg border border-white/40">
                    {currentPage} / {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg bg-canvas shadow-neu-btn active:shadow-neu-btn-active disabled:opacity-50 disabled:shadow-none text-xs font-semibold border border-white/60"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <div className="w-full max-w-md bg-canvas border border-white/70 rounded-2xl p-6 shadow-neu-flat-lg relative space-y-4 max-h-[90vh] overflow-y-auto my-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-foreground-secondary hover:text-pink p-1.5 rounded-xl shadow-neu-btn active:shadow-neu-btn-active transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-foreground pr-8">
                {editingEmployee ? "Edit Employee Credentials" : "Add New Employee"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-semibold">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 bg-canvas shadow-neu-pressed rounded-xl text-foreground focus:outline-none transition-all min-h-[42px]"
                    placeholder="Jane Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-semibold">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3.5 py-2.5 bg-canvas shadow-neu-pressed rounded-xl text-foreground focus:outline-none transition-all min-h-[42px]"
                    placeholder="jane@goflow.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-semibold">
                    Password {editingEmployee && <span className="text-foreground-secondary text-xs font-normal">(Leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingEmployee}
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-canvas shadow-neu-pressed rounded-xl text-foreground focus:outline-none transition-all min-h-[42px]"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-semibold">Role / Access Level</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-canvas shadow-neu-pressed rounded-xl text-foreground focus:outline-none transition-all min-h-[42px]"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-canvas shadow-neu-btn active:shadow-neu-btn-active rounded-xl text-foreground-secondary hover:text-foreground font-semibold transition-all min-h-[42px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-accent to-lavender hover:opacity-95 text-white font-semibold rounded-xl shadow-neu-btn active:shadow-neu-btn-active transition-all min-h-[42px]"
                  >
                    {editingEmployee ? "Update Employee" : "Create Employee"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Employee Projects Access Modal */}
        <EmployeeProjectsModal
          employee={selectedEmployeeForProjects}
          isOpen={!!selectedEmployeeForProjects}
          onClose={() => setSelectedEmployeeForProjects(null)}
        />
      </div>
    </ProtectedRoute>
  );
}
