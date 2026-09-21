"use client";
import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export const CreateProjectModal: React.FC<{
  onClose: () => void;
  onSuccess?: () => void;
}> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/projects", { name, description, color });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.error?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card w-full max-w-md p-5 sm:p-6 rounded-xl border border-border shadow-2xl relative max-h-[90vh] overflow-y-auto my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-foreground-secondary hover:text-foreground p-1.5 rounded-lg hover:bg-hover min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg sm:text-xl font-bold mb-4 text-foreground pr-8">Create New Project</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground-secondary">Project Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-canvas border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent text-sm min-h-[42px] transition-colors" 
              placeholder="e.g., Mobile App Launch"
              required 
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground-secondary">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-canvas border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent text-sm transition-colors" 
              rows={3}
              placeholder="Brief description of the project goals..."
            ></textarea>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground-secondary">Theme Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded border border-border cursor-pointer bg-canvas"
              />
              <span className="text-xs text-foreground-secondary font-mono">{color}</span>
            </div>
          </div>
          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border hover:bg-hover text-foreground-secondary hover:text-foreground text-sm font-medium transition-colors min-h-[42px]"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors min-h-[42px] flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              <span>{loading ? "Creating..." : "Create Project"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
