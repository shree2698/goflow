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
    <div className="h-full flex flex-col space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href={`/projects/${params.id}`} 
            className="p-2.5 rounded-xl bg-canvas shadow-neu-btn hover:text-accent active:shadow-neu-btn-active text-foreground-secondary transition-all min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
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
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-lavender hover:opacity-95 text-white px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-neu-btn active:shadow-neu-btn-active transition-all min-h-[44px] shrink-0 self-start sm:self-auto w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>Create Rule</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-3 p-1.5 rounded-2xl bg-canvas shadow-neu-pressed w-fit">
        <button 
          onClick={() => setActiveTab('RULES')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center ${
            activeTab === 'RULES' 
              ? 'bg-canvas shadow-neu-btn text-accent' 
              : 'text-foreground-secondary hover:text-foreground'
          }`}
        >
          Active Automation Rules
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center ${
            activeTab === 'HISTORY' 
              ? 'bg-canvas shadow-neu-btn text-accent' 
              : 'text-foreground-secondary hover:text-foreground'
          }`}
        >
          Execution History & Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'RULES' ? (
          <div className="grid gap-4">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-canvas p-5 rounded-2xl shadow-neu-flat flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/60">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl shadow-neu-flat-sm bg-canvas text-accent shrink-0 mt-0.5">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">{wf.name}</h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] bg-canvas shadow-neu-pressed px-2.5 py-1 rounded-lg text-lavender font-bold font-mono">
                        Trigger: {wf.trigger}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <span className={`text-xs font-bold ${wf.isActive ? 'text-accent' : 'text-foreground-secondary'}`}>
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button 
                    onClick={() => toggleWorkflowStatus(wf.id)}
                    aria-label={`Toggle workflow ${wf.name}`}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 focus:outline-none ${wf.isActive ? 'bg-gradient-to-r from-accent to-lavender shadow-neu-flat-sm' : 'bg-canvas shadow-neu-pressed'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${wf.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center p-12 text-foreground-secondary bg-canvas rounded-2xl shadow-neu-pressed text-sm">
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
