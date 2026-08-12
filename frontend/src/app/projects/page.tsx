"use client";
import React, { useState } from "react";
import Link from "next/link";
import { CreateProjectModal } from "../../components/projects/CreateProjectModal";

export default function ProjectsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects] = useState([
    { id: '1', name: 'Frontend Refactor', description: 'Update the frontend to React 18' },
    { id: '2', name: 'Backend API', description: 'Build new REST endpoints' }
  ]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-accent text-white px-4 py-2 rounded-md hover:bg-red-600"
        >
          Create Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(p => (
          <Link key={p.id} href={`/projects/${p.id}`} className="block">
            <div className="bg-[#1b1315] p-6 rounded-lg border border-border hover:border-accent transition-colors">
              <h2 className="text-xl font-semibold mb-2">{p.name}</h2>
              <p className="text-foreground-secondary">{p.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {isModalOpen && <CreateProjectModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
