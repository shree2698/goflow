import React, { useState, useEffect } from "react";
import Link from "next/link";
// Mock API fetch
const fetchProjects = async () => [
  { id: '1', name: 'Frontend Refactor' },
  { id: '2', name: 'Backend API' }
];

export const Sidebar: React.FC = () => {
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-8 px-2">
          <span className="text-xl font-bold text-accent">GoFlow</span>
        </div>
        <nav className="space-y-2">
          <Link href="/dashboard" className="block px-3 py-2 rounded-md bg-hover text-accent font-medium">
            Dashboard
          </Link>
          <Link href="/projects" className="block px-3 py-2 rounded-md hover:bg-hover text-foreground-secondary hover:text-foreground">
            Projects
          </Link>
          <div className="pl-6 space-y-1">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} className="block px-3 py-1 text-sm rounded-md hover:bg-hover text-foreground-secondary hover:text-foreground">
                {p.name}
              </Link>
            ))}
          </div>
          <Link href="/notifications" className="block px-3 py-2 rounded-md hover:bg-hover text-foreground-secondary hover:text-foreground">
            Notifications
          </Link>
        </nav>
      </div>
      <div className="p-2 text-xs text-foreground-secondary border-t border-border">
        GoFlow v1.0.0
      </div>
    </aside>
  );
};
