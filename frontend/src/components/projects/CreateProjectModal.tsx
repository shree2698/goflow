"use client";
import React from "react";

export const CreateProjectModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card w-full max-w-md p-6 rounded-lg border border-border">
        <h2 className="text-2xl font-bold mb-4">Create New Project</h2>
        <form onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input type="text" className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" required />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground" rows={3}></textarea>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md hover:bg-hover">Cancel</button>
            <button type="submit" className="bg-accent text-white px-4 py-2 rounded-md hover:bg-red-600">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};
