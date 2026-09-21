"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { apiClient } from "@/lib/api-client";
import { Plus, Workflow as WorkflowIcon, ArrowLeft, GripVertical, X, CheckCircle2, Clock, AlertTriangle, HelpCircle, LucideIcon, Loader2 } from "lucide-react";

type ColumnType = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: ColumnType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  tags: string[];
  assignee: string;
  assignee_name?: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  color?: string;
}

const COLUMNS: { id: ColumnType; label: string; icon: LucideIcon }[] = [
  { id: 'TODO', label: 'To Do', icon: HelpCircle },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
  { id: 'BLOCKED', label: 'Blocked', icon: AlertTriangle },
  { id: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

function normalizeStatus(status: string): ColumnType {
  const s = status ? status.toUpperCase() : 'TODO';
  if (s === 'DONE' || s === 'COMPLETED') return 'COMPLETED';
  if (s === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (s === 'BLOCKED') return 'BLOCKED';
  return 'TODO';
}

function normalizePriority(p: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const pr = p ? p.toUpperCase() : 'MEDIUM';
  if (pr === 'HIGH' || pr === 'URGENT') return 'HIGH';
  if (pr === 'LOW') return 'LOW';
  return 'MEDIUM';
}

export default function ProjectBoardPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColumnType | null>(null);

  // New Task Modal state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newTaskStatus, setNewTaskStatus] = useState<ColumnType>('TODO');
  const [newTaskTags, setNewTaskTags] = useState("Feature");
  const [savingTask, setSavingTask] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setAccessError(null);
    try {
      const projRes = await apiClient.get<ProjectDetail>(`/projects/${params.id}`).catch((err: any) => {
        if (err?.error?.code === "FORBIDDEN" || err?.status === 403) {
          setAccessError("You do not have access to this project. Employees can only access projects assigned to them.");
        } else {
          setAccessError("Project not found or access restricted.");
        }
        return null;
      });

      if (!projRes || !projRes.data) {
        return;
      }

      setProject(projRes.data);

      const tasksRes = await apiClient.get<any[]>(`/projects/${params.id}/tasks`).catch(() => null);
      if (tasksRes && tasksRes.data) {
        const formatted: Task[] = tasksRes.data.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: normalizeStatus(t.status),
          priority: normalizePriority(t.priority),
          tags: Array.isArray(t.tags) ? t.tags : [],
          assignee: t.assignee_name || t.assignee || 'Unassigned',
        }));
        setTasks(formatted);
      }
    } catch (err) {
      console.error("Failed to load project board", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

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

  const handleDrop = async (e: React.DragEvent, colId: ColumnType) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    // Optimistic update
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return { ...task, status: colId };
      }
      return task;
    }));

    setDraggedTaskId(null);
    setDragOverCol(null);

    try {
      await apiClient.patch(`/tasks/${taskId}`, { status: colId });
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setSavingTask(true);
    const tagsArray = newTaskTags.split(',').map(tag => tag.trim()).filter(Boolean);

    try {
      const res = await apiClient.post<any>(`/projects/${params.id}/tasks`, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        status: newTaskStatus,
        priority: newTaskPriority.toLowerCase(),
        tags: tagsArray.length > 0 ? tagsArray : ['General'],
      });

      const createdTask: Task = {
        id: res.data?.id || Date.now().toString(),
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        status: newTaskStatus,
        priority: newTaskPriority,
        tags: tagsArray.length > 0 ? tagsArray : ['General'],
        assignee: 'Unassigned',
      };

      setTasks(prev => [...prev, createdTask]);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskTags("Feature");
      setIsNewTaskModalOpen(false);
    } catch (err) {
      console.error("Failed to create task", err);
    } finally {
      setSavingTask(false);
    }
  };

  if (accessError && !loading) {
    return (
      <ProtectedRoute>
        <div className="max-w-md mx-auto my-16 text-center p-8 bg-canvas rounded-3xl shadow-neu-flat border border-border/60">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 shadow-neu-flat-sm">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">Access Restricted</h2>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-2 leading-relaxed">
            {accessError}
          </p>
          <div className="mt-6">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white shadow-neu-btn text-xs sm:text-sm font-semibold hover:bg-accent-hover transition-all"
            >
              <ArrowLeft size={16} /> Back to My Projects
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
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
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {project ? project.name : "Project Board"}
              </h1>
              <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">
                {project?.description || "Manage sprint lifecycle, tasks, and team workflows"}
              </p>
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

        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        ) : (
          /* Kanban Columns */
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
                            <div className="flex gap-1.5 flex-wrap max-w-[75%]">
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
        )}

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
                    disabled={savingTask}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-lavender hover:opacity-95 text-white text-xs sm:text-sm font-semibold shadow-neu-btn active:shadow-neu-btn-active transition-all flex items-center gap-2"
                  >
                    {savingTask && <Loader2 size={16} className="animate-spin" />}
                    <span>{savingTask ? "Saving..." : "Add Task"}</span>
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
