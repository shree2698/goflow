"use client";
import React, { useState } from "react";
import WorkflowBuilderModal from "@/components/workflows/WorkflowBuilderModal";
import ExecutionHistory from "@/components/workflows/ExecutionHistory";

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
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Project Workflows</h1>
          <p className="text-foreground-secondary text-sm mt-1">Automate actions based on task events.</p>
        </div>
        {activeTab === 'RULES' && (
          <button 
            onClick={() => setIsBuilderOpen(true)}
            className="bg-[#e6193c] hover:bg-[#c91634] text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Create Rule
          </button>
        )}
      </div>

      <div className="flex gap-4 border-b border-[#40262b] mb-6">
        <button 
          onClick={() => setActiveTab('RULES')}
          className={`pb-2 px-1 font-medium ${activeTab === 'RULES' ? 'text-[#e6193c] border-b-2 border-[#e6193c]' : 'text-foreground-secondary hover:text-foreground-primary'}`}
        >
          Active Rules
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2 px-1 font-medium ${activeTab === 'HISTORY' ? 'text-[#e6193c] border-b-2 border-[#e6193c]' : 'text-foreground-secondary hover:text-foreground-primary'}`}
        >
          Execution History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'RULES' ? (
          <div className="grid gap-4">
            {workflows.map(wf => (
              <div key={wf.id} className="bg-[#1b1315] p-5 rounded-lg border border-[#40262b] flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{wf.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-[#40262b] px-2 py-1 rounded text-foreground-secondary">
                      Trigger: {wf.trigger}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${wf.isActive ? 'text-green-400' : 'text-foreground-secondary'}`}>
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button 
                    onClick={() => toggleWorkflowStatus(wf.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wf.isActive ? 'bg-[#e6193c]' : 'bg-[#40262b]'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wf.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center p-10 text-foreground-secondary bg-[#1b1315] rounded-lg border border-[#40262b]">
                No workflows found. Create one to get started.
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
