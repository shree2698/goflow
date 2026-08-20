"use client";
import React, { useState } from "react";
import Link from "next/link";
import WorkflowBuilderModal from "@/components/workflows/WorkflowBuilderModal";
import ExecutionHistory from "@/components/workflows/ExecutionHistory";
import { Plus, ArrowLeft, Zap } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
}

export default function WorkflowsPage({ params }: { params: { id: string } }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([
    { id: '1', name: 'Auto-assign Backend Tasks', trigger: 'TASK_CREATED', isActive: true },
    { id: '2', name: 'Notify on Blocked', trigger: 'TASK_STATUS_CHANGED', isActive: false }
  ]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'RULES' | 'HISTORY'>('RULES');

  const toggleWorkflowStatus = (id: string) => {
    setWorkflows(prev => prev.map(wf => wf.id === id ? { ...wf, isActive: !wf.isActive } : wf));
  };

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href={`/projects/${params.id}`} 
            className="p-2 rounded-lg border border-border hover:bg-hover text-foreground-secondary hover:text-foreground transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
            title="Back to Board"
            aria-label="Back to Board"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Project Workflows</h1>
            <p className="text-xs sm:text-sm text-foreground-secondary mt-0.5">Automate actions based on task triggers and conditions</p>
          </div>
        </div>
        {activeTab === 'RULES' && (
          <button 
            onClick={() => setIsBuilderOpen(true)}
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-colors min-h-[44px] shrink-0 self-start sm:self-auto w-full sm:w-auto shadow-sm"
          >
            <Plus size={16} />
            <span>Create Rule</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-4 border-b border-border">
        <button 
          onClick={() => setActiveTab('RULES')}
          className={`pb-3 px-3 font-medium text-xs sm:text-sm transition-colors border-b-2 min-h-[44px] flex items-center ${
            activeTab === 'RULES' 
              ? 'text-accent border-accent font-semibold' 
              : 'text-foreground-secondary border-transparent hover:text-foreground hover:border-border'
          }`}
        >
          Active Automation Rules
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 px-3 font-medium text-xs sm:text-sm transition-colors border-b-2 min-h-[44px] flex items-center ${
            activeTab === 'HISTORY' 
              ? 'text-accent border-accent font-semibold' 
              : 'text-foreground-secondary border-transparent hover:text-foreground hover:border-border'
          }`}
        >
          Execution History & Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'RULES' ? (
          <div className="grid gap-3 sm:gap-4">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-card p-4 sm:p-5 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-accent/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0 mt-0.5">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-foreground">{wf.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[11px] bg-canvas border border-border px-2 py-0.5 rounded text-foreground-secondary font-mono">
                        Trigger: {wf.trigger}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <span className={`text-xs font-medium ${wf.isActive ? 'text-emerald-400' : 'text-foreground-secondary'}`}>
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button 
                    onClick={() => toggleWorkflowStatus(wf.id)}
                    aria-label={`Toggle workflow ${wf.name}`}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${wf.isActive ? 'bg-accent' : 'bg-canvas border border-border'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wf.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center p-8 sm:p-12 text-foreground-secondary bg-card rounded-xl border border-dashed border-border text-sm">
                No workflows found. Click "Create Rule" to configure an automation.
              </div>
            )}
          </div>
        ) : (
          <ExecutionHistory />
        )}
      </div>

      {isBuilderOpen && (
        <WorkflowBuilderModal 
          onClose={() => setIsBuilderOpen(false)} 
          onSave={(wf) => {
            setWorkflows(prev => [...prev, { ...wf, id: Math.random().toString(), isActive: true }]);
            setIsBuilderOpen(false);
          }} 
        />
      )}
    </div>
  );
}
