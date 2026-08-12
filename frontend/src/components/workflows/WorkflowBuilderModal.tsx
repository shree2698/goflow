"use client";
import React, { useState } from "react";

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1b1315] border border-[#40262b] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#40262b] flex justify-between items-center">
          <h2 className="text-xl font-bold">Create Workflow Rule</h2>
          <button onClick={onClose} className="text-foreground-secondary hover:text-white">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? 'bg-[#e6193c]' : 'bg-[#40262b]'}`} />
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-foreground-secondary">Rule Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High Priority Notification" 
              className="w-full bg-[#0e090a] border border-[#40262b] rounded-md px-4 py-2 focus:outline-none focus:border-[#e6193c]"
            />
          </div>

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold mb-4">Step 1: Select Trigger</h3>
              <div className="grid grid-cols-2 gap-4">
                {TRIGGERS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTrigger(t.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${trigger === t.id ? 'border-[#e6193c] bg-[#e6193c]/10' : 'border-[#40262b] bg-[#0e090a] hover:border-foreground-secondary'}`}
                  >
                    <div className="font-medium">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold mb-4">Step 2: Define Conditions</h3>
              <div className="space-y-4">
                {conditions.map((cond, index) => (
                  <div key={index} className="flex flex-wrap gap-2 items-center bg-[#0e090a] p-3 rounded-lg border border-[#40262b]">
                    {index > 0 && (
                      <select 
                        value={cond.logic}
                        onChange={(e) => {
                          const newC = [...conditions];
                          newC[index].logic = e.target.value;
                          setConditions(newC);
                        }}
                        className="bg-[#1b1315] border border-[#40262b] rounded px-2 py-1 text-sm"
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}
                    <span className="text-sm font-medium ml-2 text-foreground-secondary">IF</span>
                    <select 
                      value={cond.field}
                      onChange={(e) => {
                        const newC = [...conditions];
                        newC[index].field = e.target.value;
                        setConditions(newC);
                      }}
                      className="bg-[#1b1315] border border-[#40262b] rounded px-3 py-1"
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
                      className="bg-[#1b1315] border border-[#40262b] rounded px-3 py-1"
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
                      className="flex-1 min-w-[100px] bg-[#1b1315] border border-[#40262b] rounded px-3 py-1 focus:outline-none focus:border-[#e6193c]"
                    />
                    {conditions.length > 1 && (
                      <button 
                        onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
                        className="text-red-400 hover:text-red-300 ml-2"
                      >&times;</button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setConditions([...conditions, { field: FIELDS[0], comparator: COMPARATORS[0], value: '', logic: 'AND' }])}
                  className="text-sm text-[#e6193c] hover:text-[#c91634] font-medium"
                >
                  + Add Condition
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold mb-4">Step 3: Choose Action</h3>
              <div className="grid grid-cols-2 gap-4">
                {ACTIONS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAction(a.id)}
                    className={`p-4 rounded-lg border text-left transition-colors ${action === a.id ? 'border-[#e6193c] bg-[#e6193c]/10' : 'border-[#40262b] bg-[#0e090a] hover:border-foreground-secondary'}`}
                  >
                    <div className="font-medium">{a.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#40262b] flex justify-between bg-[#1b1315] rounded-b-xl">
          {step > 1 ? (
            <button 
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 border border-[#40262b] rounded-md hover:bg-[#0e090a] transition-colors"
            >
              Back
            </button>
          ) : <div></div>}
          
          {step < 3 ? (
            <button 
              onClick={() => setStep(s => s + 1)}
              className="px-4 py-2 bg-[#e6193c] hover:bg-[#c91634] text-white rounded-md transition-colors"
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Save Rule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
