"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Plus, Workflow as WorkflowIcon, ArrowLeft, GripVertical, X, CheckCircle2, Clock, AlertTriangle, HelpCircle, LucideIcon } from "lucide-react";

type ColumnType = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: ColumnType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  tags: string[];
  assignee: string;
}

const COLUMNS: { id: ColumnType; label: string; icon: LucideIcon }[] = [
  { id: 'TODO', label: 'To Do', icon: HelpCircle },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { id: 'BLOCKED', label: 'Blocked', icon: AlertTriangle },
  { id: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

export default function ProjectBoardPage({ params }: { params: { id: string } }) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Design DB Schema', description: 'Define PostgreSQL schema with migrations for users, projects and tasks', status: 'TODO', priority: 'HIGH', tags: ['Backend', 'Database'], assignee: 'Alice' },
    { id: '2', title: 'Setup Next.js', description: 'Configure Tailwind, App Router and responsive layouts', status: 'IN_PROGRESS', priority: 'MEDIUM', tags: ['Frontend', 'UI'], assignee: 'Bob' },
    { id: '3', title: 'Configure Redis Streams', description: 'Setup queue workers for background processing', status: 'TODO', priority: 'HIGH', tags: ['Backend', 'Redis'], assignee: 'Charlie' },
    { id: '4', title: 'OAuth2 Authentication', description: 'Implement JWT refresh tokens and session handling', status: 'COMPLETED', priority: 'LOW', tags: ['Auth', 'Security'], assignee: 'Alice' },
  ]);

  const [filterText, setFilterText] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnType | null>(null);

  // New Task Modal state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newTaskStatus, setNewTaskStatus] = useState<ColumnType>('TODO');
  const [newTaskAssignee, setNewTaskAssignee] = useState("Alice");
  const [newTaskTags, setNewTaskTags] = useState("Feature");

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(filterText.toLowerCase()) || 
    t.tags.some(tag => tag.toLowerCase().includes(filterText.toLowerCase())) ||
    t.assignee.toLowerCase().includes(filterText.toLowerCase())
  );

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: ColumnType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: ColumnType) => {
    if (dragOverCol === colId) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colId: ColumnType) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return { ...task, status: colId };
      }
      return task;
    }));

    setDraggedTaskId(null);
    setDragOverCol(null);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tagsArray = newTaskTags.split(',').map(tag => tag.trim()).filter(Boolean);

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      status: newTaskStatus,
      priority: newTaskPriority,
      tags: tagsArray.length > 0 ? tagsArray : ['General'],
      assignee: newTaskAssignee.trim() || 'Unassigned',
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskTags("Feature");
    setIsNewTaskModalOpen(false);
  };

  // Project metadata lookup
  const projectData: Record<string, { name: string; description: string }> = {
    '1': { name: 'Frontend Refactor', description: 'Update the frontend to Next.js 14, App Router, and Tailwind CSS' },
    '2': { name: 'Backend API', description: 'Build new REST endpoints, PostgreSQL migrations, and Redis worker pool' },
  };

  const currentProject = projectData[params.id] || {
    name: `Project ${params.id}`,
    description: 'Manage sprint lifecycle, tasks, and team workflows',
  };

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/projects" 
            className="p-2.5 rounded-xl bg-canvas shadow-neu-btn hover:text-accent active:shadow-neu-btn-active text-foreground-secondary transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Back to Projects"
            aria-label="Back to Projects"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{currentProject.name}</h1>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">{currentProject.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/projects/${params.id}/workflows`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canvas shadow-neu-btn hover:text-accent active:shadow-neu-btn-active text-foreground text-xs sm:text-sm font-semibold transition-all min-h-[40px]"
          >
            <WorkflowIcon size={16} className="text-lavender" />
            <span>Workflows</span>
          </Link>
          <div className="relative flex-1 sm:flex-initial min-w-[160px]">
            <input 
              type="text" 
              placeholder="Filter tasks or tags..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-foreground-secondary/60 focus:outline-none min-h-[40px] transition-all" 
            />
          </div>
          <button 
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-accent to-lavender hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-neu-btn active:shadow-neu-btn-active transition-all min-h-[40px] cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-2 flex-1 min-h-0">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const isOver = dragOverCol === col.id;
          const Icon = col.icon;

          return (
            <div 
              key={col.id} 
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-2xl p-3.5 bg-canvas transition-all duration-200 min-h-[400px] xl:min-h-0 max-h-[calc(100vh-12rem)] border border-white/60 ${
                isOver 
                  ? 'shadow-neu-pressed ring-2 ring-accent/50' 
                  : 'shadow-neu-flat'
              }`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg shadow-neu-flat-sm bg-canvas text-accent shrink-0">
                    <Icon size={14} />
                  </div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-foreground truncate">
                    {col.label}
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-canvas shadow-neu-pressed text-lavender font-bold font-mono shrink-0">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-0.5 min-h-[120px]">
                {colTasks.map(task => {
                  const isBeingDragged = draggedTaskId === task.id;
                  return (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-canvas p-3.5 rounded-xl transition-all select-none border border-white/70 ${
                        isBeingDragged 
                          ? 'shadow-neu-pressed opacity-50 scale-95' 
                          : 'shadow-neu-flat hover:shadow-neu-flat-lg cursor-grab active:cursor-grabbing hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shadow-neu-flat-sm ${
                          task.priority === 'HIGH' 
                            ? 'bg-pink/15 text-pink' 
                            : task.priority === 'MEDIUM'
                            ? 'bg-lavender/20 text-lavender' 
                            : 'bg-accent/15 text-accent'
                        }`}>
                          {task.priority}
                        </span>
                        <div className="text-foreground-secondary/50 hover:text-foreground cursor-grab">
                          <GripVertical size={14} />
                        </div>
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm text-foreground mb-1 line-clamp-2 leading-snug">{task.title}</h4>
                      {task.description && (
                        <p className="text-[11px] text-foreground-secondary line-clamp-2 mb-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-[11px] text-foreground-secondary mt-2.5 pt-2 border-t border-border/40">
                        <div className="flex gap-1.5 flex-wrap max-w-[80%]">
                          {task.tags.map(tag => (
                            <span key={tag} className="bg-canvas shadow-neu-flat-sm text-[10px] text-foreground-secondary px-2 py-0.5 rounded-md truncate font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div 
                          className="w-6 h-6 rounded-lg bg-canvas shadow-neu-flat-sm flex items-center justify-center text-[10px] font-bold text-accent shrink-0 border border-white/60"
                          title={`Assigned to ${task.assignee}`}
                        >
                          {task.assignee ? task.assignee[0].toUpperCase() : 'U'}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className={`p-6 rounded-xl text-center text-xs transition-all flex flex-col items-center justify-center flex-1 ${
                    isOver ? 'shadow-neu-pressed text-accent' : 'shadow-neu-pressed text-foreground-secondary/70'
                  }`}>
                    {isOver ? "Drop task here" : `No tasks in ${col.label.toLowerCase()}`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-canvas border border-white/70 w-full max-w-md rounded-2xl p-6 shadow-neu-flat-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-lg font-bold text-foreground">Create New Task</h3>
              <button 
                onClick={() => setIsNewTaskModalOpen(false)}
                className="text-foreground-secondary hover:text-pink p-1.5 rounded-xl shadow-neu-btn active:shadow-neu-btn-active transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground-secondary mb-1">Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Implement WebSocket reconnects"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground-secondary mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Task details and expectations..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground-secondary mb-1">Status Column</label>
                  <select 
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as ColumnType)}
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
                  >
                    {COLUMNS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground-secondary mb-1">Priority</label>
                  <select 
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground-secondary mb-1">Assignee</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Alice"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground-secondary mb-1">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    placeholder="Frontend, Bug"
                    value={newTaskTags}
                    onChange={(e) => setNewTaskTags(e.target.value)}
                    className="w-full bg-canvas shadow-neu-pressed rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                <button 
                  type="button" 
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active text-xs sm:text-sm font-semibold text-foreground-secondary hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-lavender hover:opacity-95 text-white text-xs sm:text-sm font-semibold shadow-neu-btn active:shadow-neu-btn-active transition-all"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
