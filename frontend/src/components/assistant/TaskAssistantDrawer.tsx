"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  X,
  Send,
  Loader2,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  FolderKanban,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  AssistantChatMessage,
  AssistantResponseData,
  AssistantTask,
  AssistantSuggestion,
} from "@/types/assistant";

interface TaskAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  activeProjectId?: string;
  activeProjectName?: string;
}

const DEFAULT_SUGGESTIONS: AssistantSuggestion[] = [
  {
    title: "Overdue Tasks",
    prompt: "Show me all overdue tasks assigned to me.",
    category: "search",
    description: "Find pending tasks past deadline",
  },
  {
    title: "Today's Focus",
    prompt: "What should I work on today?",
    category: "work",
    description: "Get smart prioritized recommendations",
  },
  {
    title: "Create Task",
    prompt: "Create a task to update the payment API, high priority, due Friday.",
    category: "create",
    description: "Natural language task scheduling",
  },
  {
    title: "Archive Completed",
    prompt: "Move all completed tasks from Core Platform & API to archived.",
    category: "batch",
    description: "Bulk transition finished tasks",
  },
];

export const TaskAssistantDrawer: React.FC<TaskAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onOpen,
  activeProjectId,
  activeProjectName,
}) => {
  const router = useRouter();
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>(DEFAULT_SUGGESTIONS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  // Global keyboard shortcut: Cmd+J or Ctrl+J to toggle assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  // Fetch contextual suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await apiClient.get<AssistantSuggestion[]>("/ai/assistant/suggestions");
        if (res.data && res.data.length > 0) {
          setSuggestions(res.data);
        }
      } catch {
        // Fallback to default suggestions
      }
    };
    fetchSuggestions();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build lightweight conversation history for contextual LLM resolution
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
        created_at: m.timestamp,
      }));

      const res = await apiClient.post<AssistantResponseData>("/ai/assistant", {
        message: text,
        history: historyPayload,
        context: {
          active_project_id: activeProjectId || undefined,
          active_project_name: activeProjectName || undefined,
        },
      });

      const data = res.data;
      const assistantMessage: AssistantChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Done!",
        toolCalls: data.tool_calls,
        tasks: data.tasks,
        createdTask: data.created_task,
        batchSummary: data.batch_summary,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("AI Assistant error:", err);
      const errorMessage: AssistantChatMessage = {
        id: `assistant-err-${Date.now()}`,
        role: "assistant",
        content:
          err?.error?.message ||
          "Sorry, I ran into an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    handleSendMessage(prompt);
  };

  const handleTaskClick = (task: AssistantTask) => {
    if (task.project_id) {
      router.push(`/projects/${task.project_id}`);
      onClose();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const formatDueDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        weekday: "short",
      });
    } catch {
      return dateStr;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-600 border border-rose-500/20">
            Urgent
          </span>
        );
      case "high":
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-accent/20 text-accent font-semibold border border-accent/30">
            High
          </span>
        );
      case "low":
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-canvas shadow-neu-flat-sm text-foreground-secondary border border-border/40">
            Low
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-lavender/15 text-lavender border border-lavender/25">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "done":
      case "completed":
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
            <CheckCheck size={11} /> Done
          </span>
        );
      case "in_progress":
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-accent/15 text-accent border border-accent/25">
            In Progress
          </span>
        );
      case "in_review":
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/20">
            In Review
          </span>
        );
      case "archived":
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-slate-500/15 text-slate-600 border border-slate-500/20">
            Archived
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-canvas shadow-neu-flat-sm text-foreground-secondary border border-border/40">
            To Do
          </span>
        );
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) to open assistant from anywhere */}
      {!isOpen && (
        <button
          onClick={onOpen}
          aria-label="Open AI Task Assistant"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-canvas text-foreground font-semibold text-xs sm:text-sm rounded-2xl shadow-neu-btn active:shadow-neu-btn-active border border-white/60 hover:text-accent transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-lavender flex items-center justify-center text-white shadow-neu-flat-sm group-hover:scale-105 transition-transform">
            <Bot size={18} />
          </div>
          <span className="hidden sm:inline font-bold">AI Assistant</span>
          <span className="hidden md:inline text-[10px] font-mono uppercase bg-canvas shadow-neu-pressed-sm px-1.5 py-0.5 rounded text-foreground-secondary">
            ⌘J
          </span>
        </button>
      )}

      {/* Drawer Backdrop on Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] md:w-[500px] lg:w-[540px] bg-canvas border-l border-border/60 shadow-neu-flat-lg flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        aria-label="AI Task Assistant Panel"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-canvas/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-lavender flex items-center justify-center text-white shadow-neu-flat-sm">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">AI Task Assistant</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/15 text-accent border border-accent/20">
                  Ready
                </span>
              </div>
              <p className="text-xs text-foreground-secondary">Interact with your tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-2 rounded-xl text-foreground-secondary hover:text-foreground hover:shadow-neu-btn active:shadow-neu-btn-active transition-all"
                aria-label="Clear chat history"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-foreground-secondary hover:text-foreground hover:shadow-neu-btn active:shadow-neu-btn-active transition-all"
              aria-label="Close assistant"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Message Body & Suggestions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Welcome & Prompt Chips when empty */}
          {messages.length === 0 && (
            <div className="py-4 space-y-5">
              <div className="p-4 rounded-2xl bg-canvas shadow-neu-flat-sm border border-white/60 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-neu-flat-sm mb-2">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-sm font-bold text-foreground">How can I help you today?</h3>
                <p className="text-xs text-foreground-secondary max-w-sm mx-auto leading-relaxed">
                  I can search overdue tasks, prioritize your workday, schedule new tasks with deadlines,
                  or perform batch project updates!
                </p>
              </div>

              {/* Sample Suggestions */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground-secondary px-1">
                  Try one of these examples:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(sug.prompt)}
                      className="w-full text-left p-3 rounded-xl bg-canvas shadow-neu-btn active:shadow-neu-btn-active border border-white/60 hover:text-accent transition-all group flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground group-hover:text-accent truncate">
                          {sug.title}
                        </p>
                        <p className="text-[11px] text-foreground-secondary truncate mt-0.5">
                          &quot;{sug.prompt}&quot;
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-foreground-secondary group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[88%] sm:max-w-[85%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-canvas shadow-neu-pressed border border-white/60 text-foreground font-medium"
                    : msg.isError
                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-neu-flat-sm"
                    : "bg-canvas shadow-neu-flat-sm border border-border/40 text-foreground"
                }`}
              >
                {/* Tool execution badge */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-mono text-accent font-semibold uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded-md w-fit">
                    <span>⚡ Tool: {msg.toolCalls[0].name}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Batch Action Summary */}
                {msg.batchSummary && (
                  <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold text-foreground">
                        {msg.batchSummary.count} task{msg.batchSummary.count === 1 ? "" : "s"} moved
                      </p>
                      <p className="text-foreground-secondary text-[11px] mt-0.5">
                        Transitioned from <span className="font-medium text-foreground">{msg.batchSummary.source_status}</span> to <span className="font-medium text-foreground">{msg.batchSummary.target_status}</span> in {msg.batchSummary.project_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Task Cards List */}
                {msg.tasks && msg.tasks.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-border/30">
                    {msg.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className="p-3 rounded-xl bg-canvas shadow-neu-flat-sm hover:shadow-neu-btn border border-white/60 transition-all cursor-pointer group flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground text-xs sm:text-sm group-hover:text-accent transition-colors">
                              {task.title}
                            </p>
                            {task.project_name && (
                              <div className="flex items-center gap-1 text-[11px] text-foreground-secondary mt-0.5">
                                <FolderKanban size={11} className="text-lavender shrink-0" />
                                <span className="truncate">{task.project_name}</span>
                              </div>
                            )}
                          </div>
                          <ExternalLink size={13} className="text-foreground-secondary group-hover:text-accent shrink-0 mt-0.5" />
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                          {task.due_date && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                task.is_overdue
                                  ? "bg-rose-500/15 text-rose-600 border-rose-500/20"
                                  : "bg-canvas shadow-neu-flat-sm text-foreground-secondary border-border/40"
                              }`}
                            >
                              <Calendar size={10} />
                              {task.is_overdue ? "Overdue: " : "Due: "}
                              {formatDueDate(task.due_date)}
                            </span>
                          )}
                          {task.assignee_name && (
                            <span className="text-[10px] text-foreground-secondary ml-auto truncate max-w-[120px]">
                              👤 {task.assignee_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-foreground-secondary mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-foreground-secondary text-xs p-3 rounded-2xl bg-canvas shadow-neu-flat-sm border border-border/40 w-fit">
              <Loader2 size={16} className="text-accent animate-spin" />
              <span>Analyzing intent & executing tools...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 sm:p-4 border-t border-border/40 bg-canvas/90 backdrop-blur-sm shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything... (e.g. 'Show overdue tasks')"
                disabled={isLoading}
                className="w-full bg-canvas shadow-neu-pressed rounded-xl px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-1 focus:ring-accent min-h-[42px] transition-all disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl bg-canvas text-foreground hover:text-accent shadow-neu-btn active:shadow-neu-btn-active disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 min-w-[42px] min-h-[42px] flex items-center justify-center border border-white/60"
              aria-label="Send query"
            >
              {isLoading ? (
                <Loader2 size={18} className="text-accent animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
          <div className="flex items-center justify-end text-[10px] text-foreground-secondary mt-2 px-1">
            <span className="font-mono">Press Enter to send</span>
          </div>
        </div>
      </aside>
    </>
  );
};
