"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Plus, Filter, Workflow as WorkflowIcon, ArrowLeft } from "lucide-react";

const COLUMNS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

export default function ProjectBoardPage({ params }: { params: { id: string } }) {
  const [tasks] = useState([
    { id: '1', title: 'Design DB Schema', status: 'TODO', priority: 'HIGH', tags: ['Backend'], assignee: 'Alice' },
    { id: '2', title: 'Setup Next.js', status: 'IN_PROGRESS', priority: 'MEDIUM', tags: ['Frontend'], assignee: 'Bob' },
  ]);
  const [filterText, setFilterText] = useState("");

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(filterText.toLowerCase()) || 
    t.tags.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/projects" 
            className="p-2 rounded-lg border border-border hover:bg-hover text-foreground-secondary hover:text-foreground transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Back to Projects"
            aria-label="Back to Projects"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Project Board {params.id}</h1>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">Manage tasks across sprint lifecycle</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href={`/projects/${params.id}/workflows`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border hover:bg-hover text-foreground text-xs sm:text-sm font-medium transition-colors min-h-[40px]"
          >
            <WorkflowIcon size={16} className="text-accent" />
            <span>Workflows</span>
          </Link>
          <div className="relative flex-1 sm:flex-initial min-w-[140px]">
            <input 
              type="text" 
              placeholder="Filter tasks..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-canvas border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:border-accent min-h-[40px] transition-colors" 
            />
          </div>
          <button className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[40px] shadow-sm">
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 flex-1 scroll-smooth touch-pan-x -mx-3 px-3 sm:mx-0 sm:px-0">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col);
          return (
            <div key={col} className="w-[270px] sm:w-80 flex-shrink-0 flex flex-col bg-card/70 rounded-xl p-3 sm:p-4 border border-border max-h-[calc(100vh-14rem)]">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-xs sm:text-sm uppercase tracking-wider text-foreground-secondary">
                  {col.replace('_', ' ')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-canvas border border-border text-foreground-secondary font-mono">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
                {colTasks.map(task => (
                  <div key={task.id} className="bg-card p-3.5 sm:p-4 rounded-lg border border-border hover:border-accent cursor-pointer transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-semibold border ${
                        task.priority === 'HIGH' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <h4 className="font-medium text-xs sm:text-sm text-foreground mb-3 line-clamp-2">{task.title}</h4>
                    <div className="flex justify-between items-center text-xs text-foreground-secondary">
                      <div className="flex gap-1 flex-wrap">
                        {task.tags.map(tag => (
                          <span key={tag} className="bg-hover px-2 py-0.5 rounded text-[10px] sm:text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                        {task.assignee[0]}
                      </div>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="p-4 rounded-lg border border-dashed border-border/60 text-center text-xs text-foreground-secondary/70">
                    No tasks in {col.toLowerCase().replace('_', ' ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
