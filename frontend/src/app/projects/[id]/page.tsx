"use client";
import React, { useState } from "react";

const COLUMNS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'];

export default function ProjectBoardPage({ params }: { params: { id: string } }) {
  const [tasks] = useState([
    { id: '1', title: 'Design DB Schema', status: 'TODO', priority: 'HIGH', tags: ['Backend'], assignee: 'Alice' },
    { id: '2', title: 'Setup Next.js', status: 'IN_PROGRESS', priority: 'MEDIUM', tags: ['Frontend'], assignee: 'Bob' },
  ]);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Board {params.id}</h1>
        <div className="flex gap-4">
          <input type="text" placeholder="Filter tasks..." className="bg-background border border-border rounded-md px-3 py-1" />
          <button className="bg-accent text-white px-4 py-1 rounded-md">Add Task</button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
        {COLUMNS.map(col => (
          <div key={col} className="w-80 flex-shrink-0 flex flex-col bg-card/50 rounded-lg p-4 border border-border">
            <h3 className="font-semibold mb-4 text-foreground-secondary">{col.replace('_', ' ')}</h3>
            <div className="flex flex-col gap-3">
              {tasks.filter(t => t.status === col).map(task => (
                <div key={task.id} className="bg-[#1b1315] p-4 rounded-md border border-border hover:border-accent cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${task.priority === 'HIGH' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="font-medium mb-3">{task.title}</h4>
                  <div className="flex justify-between items-center text-sm text-foreground-secondary">
                    <div className="flex gap-1">
                      {task.tags.map(tag => <span key={tag} className="bg-hover px-2 py-0.5 rounded">{tag}</span>)}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs text-accent">
                      {task.assignee[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
