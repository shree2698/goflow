"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiClient } from "@/lib/api-client";
import { UserPlus, Edit2, Trash2, Shield, User, Key, X, CheckCircle } from "lucide-react";

interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

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
    loadEmployees();
  }, []);

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

  return (
    <ProtectedRoute>
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Employee Control Panel</h1>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
              Manage employee accounts, assign roles, reset passwords, and control login access.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors min-h-[44px] shrink-0 self-start sm:self-auto w-full sm:w-auto shadow-sm"
          >
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-foreground-secondary">Loading employees...</div>
        ) : (
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm text-foreground min-w-[540px]">
                <thead className="bg-canvas border-b border-border text-xs text-foreground-secondary uppercase tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold">Employee</th>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold">Email</th>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold">Role</th>
                    <th className="px-4 sm:px-6 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-hover transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-xs shrink-0">
                            {emp.full_name ? emp.full_name[0] : "E"}
                          </div>
                          <span className="truncate max-w-[160px] sm:max-w-xs">{emp.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-foreground-secondary text-xs sm:text-sm">{emp.email}</td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            emp.role === "admin"
                              ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          }`}
                        >
                          {emp.role === "admin" ? <Shield size={12} /> : <User size={12} />}
                          {emp.role || "employee"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 rounded-lg border border-border hover:bg-canvas text-foreground-secondary hover:text-foreground transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                            title="Edit / Reset Access"
                            aria-label="Edit Employee"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-2 rounded-lg border border-border hover:bg-canvas text-red-400 hover:text-red-300 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
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
                      <td colSpan={4} className="px-6 py-8 text-center text-foreground-secondary text-sm">
                        No employees found. Click "Add Employee" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <div className="w-full max-w-md bg-card border border-border rounded-xl p-4 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto my-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-foreground-secondary hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-hover min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-foreground pr-8">
                {editingEmployee ? "Edit Employee Credentials" : "Add New Employee"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 bg-canvas border border-border rounded-lg text-foreground focus:outline-none focus:border-accent transition-colors min-h-[42px]"
                    placeholder="Jane Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-medium">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3.5 py-2.5 bg-canvas border border-border rounded-lg text-foreground focus:outline-none focus:border-accent transition-colors min-h-[42px]"
                    placeholder="jane@goflow.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-medium">
                    Password {editingEmployee && <span className="text-foreground-secondary text-xs font-normal">(Leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingEmployee}
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-canvas border border-border rounded-lg text-foreground focus:outline-none focus:border-accent transition-colors min-h-[42px]"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-foreground-secondary mb-1 text-xs sm:text-sm font-medium">Role / Access Level</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-canvas border border-border rounded-lg text-foreground focus:outline-none focus:border-accent transition-colors min-h-[42px]"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-border rounded-lg text-foreground-secondary hover:text-foreground hover:bg-hover transition-colors min-h-[42px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors min-h-[42px]"
                  >
                    {editingEmployee ? "Update Employee" : "Create Employee"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
