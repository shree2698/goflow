"use client";
import React, { useState } from "react";
import { X, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";

interface WorkflowBuilderModalProps {
  onClose: () => void;
  onSave: (workflow: any) => void;
}

const TRIGGERS = [
  { id: 'TASK_CREATED', label: 'Task Created' },
  { id: 'TASK_STATUS_CHANGED', label: 'Task Status Changed' },
  { id: 'TASK_ASSIGNED', label: 'Task Assigned' },
  { id: 'TASK_DUE_SOON', label: 'Task Due Soon' }
];

const FIELDS = ['Priority', 'Status', 'Assignee', 'Tags'];
const COMPARATORS = ['EQUALS', 'NOT_EQUALS', 'CONTAINS'];
const ACTIONS = [
  { id: 'SEND_NOTIFICATION', label: 'Send Notification' },
  { id: 'CREATE_TASK', label: 'Create Task' },
  { id: 'UPDATE_TASK_STATUS', label: 'Update Task Status' },
  { id: 'ASSIGN_USER', label: 'Assign User' },
  { id: 'ADD_TAG', label: 'Add Tag' }
];

export default function WorkflowBuilderModal({ onClose, onSave }: WorkflowBuilderModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState(TRIGGERS[0].id);
  const [conditions, setConditions] = useState([{ field: FIELDS[0], comparator: COMPARATORS[0], value: '', logic: 'AND' }]);
  const [action, setAction] = useState(ACTIONS[0].id);

  const handleSave = () => {
    onSave({ name: name || 'New Workflow', trigger, conditions, action });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] my-auto">
        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center bg-canvas rounded-t-xl">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">Create Workflow Rule</h2>
            <p className="text-xs text-foreground-secondary mt-0.5">Configure event-driven automation in 3 steps</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-foreground-secondary hover:text-foreground p-1.5 rounded-lg hover:bg-hover min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-foreground-secondary">
              <span className={step >= 1 ? "text-accent" : ""}>1. Trigger</span>
              <span className={step >= 2 ? "text-accent" : ""}>2. Conditions</span>
              <span className={step >= 3 ? "text-accent" : ""}>3. Action</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? 'bg-accent' : 'bg-hover'}`} />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1.5 text-foreground-secondary">Rule Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Priority Escalation" 
              className="w-full bg-canvas border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent min-h-[42px] transition-colors"
            />
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">Select Trigger Event</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {TRIGGERS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTrigger(t.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all min-h-[48px] flex items-center justify-between ${
                      trigger === t.id 
                        ? 'border-accent bg-accent/10 text-accent font-semibold' 
                        : 'border-border bg-canvas/40 hover:bg-hover text-foreground'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{t.label}</span>
                    {trigger === t.id && <CheckCircle size={16} className="shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">Define Rule Conditions</h3>
              <div className="space-y-3">
                {conditions.map((cond, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-canvas/50 p-3 rounded-xl border border-border">
                    {index > 0 && (
                      <select 
                        value={cond.logic}
                        onChange={(e) => {
                          const newC = [...conditions];
                          newC[index].logic = e.target.value;
                          setConditions(newC);
                        }}
                        className="bg-card border border-border rounded-lg px-2.5 py-2 text-xs font-semibold min-h-[38px] text-foreground"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}
                    <span className="text-xs font-bold text-accent sm:ml-1 self-center sm:self-auto">IF</span>
                    <select 
                      value={cond.field}
                      onChange={(e) => {
                        const newC = [...conditions];
                        newC[index].field = e.target.value;
                        setConditions(newC);
                      }}
                      className="bg-card border border-border rounded-lg px-3 py-2 text-xs sm:text-sm min-h-[38px] text-foreground flex-1"
                    >
                      {FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select 
                      value={cond.comparator}
                      onChange={(e) => {
                        const newC = [...conditions];
                        newC[index].comparator = e.target.value;
                        setConditions(newC);
                      }}
                      className="bg-card border border-border rounded-lg px-3 py-2 text-xs sm:text-sm min-h-[38px] text-foreground flex-1"
                    >
                      {COMPARATORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input 
                      type="text" 
                      value={cond.value}
                      onChange={(e) => {
                        const newC = [...conditions];
                        newC[index].value = e.target.value;
                        setConditions(newC);
                      }}
                      placeholder="Value..." 
                      className="bg-card border border-border rounded-lg px-3 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:border-accent min-h-[38px] flex-1"
                    />
                    {conditions.length > 1 && (
                      <button 
                        onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-hover self-end sm:self-center min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Remove condition"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setConditions([...conditions, { field: FIELDS[0], comparator: COMPARATORS[0], value: '', logic: 'AND' }])}
                  className="text-xs sm:text-sm text-accent hover:underline font-semibold flex items-center gap-1.5 py-1"
                >
                  + Add Condition
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-semibold text-foreground">Choose Action</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {ACTIONS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all min-h-[48px] flex items-center justify-between ${
                      action === a.id 
                        ? 'border-accent bg-accent/10 text-accent font-semibold' 
                        : 'border-border bg-canvas/40 hover:bg-hover text-foreground'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{a.label}</span>
                    {action === a.id && <CheckCircle size={16} className="shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-border flex justify-between items-center bg-canvas rounded-b-xl gap-3">
          {step > 1 ? (
            <button 
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border rounded-lg hover:bg-hover text-foreground-secondary hover:text-foreground text-xs sm:text-sm font-medium transition-colors min-h-[42px]"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : <div />}
          
          {step < 3 ? (
            <button 
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[42px] shadow-sm ml-auto"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[42px] shadow-sm ml-auto"
            >
              Save Workflow Rule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
