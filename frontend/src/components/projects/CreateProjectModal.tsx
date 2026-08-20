"use client";
import React from "react";
import { X } from "lucide-react";

export const CreateProjectModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
        <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground-secondary">Project Name</label>
            <input 
              type="text" 
              className="w-full bg-canvas border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent text-sm min-h-[42px] transition-colors" 
              placeholder="e.g., Mobile App Launch"
              required 
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground-secondary">Description</label>
            <textarea 
              className="w-full bg-canvas border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:border-accent text-sm transition-colors" 
              rows={3}
              placeholder="Brief description of the project goals..."
            ></textarea>
          </div>
          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border hover:bg-hover text-foreground-secondary hover:text-foreground text-sm font-medium transition-colors min-h-[42px]"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors min-h-[42px]"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
