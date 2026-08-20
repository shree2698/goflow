"use client";
import React, { useState } from "react";

interface ExecutionLog {
  id: string;
  ruleName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  eventType: string;
  durationMs: number;
  timestamp: string;
  payload: any;
}

const MOCK_LOGS: ExecutionLog[] = [
  {
    id: 'log-1',
    ruleName: 'Auto-assign Backend Tasks',
    status: 'SUCCESS',
    eventType: 'TASK_CREATED',
    durationMs: 45,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    payload: { taskId: 'T-123', assignee: 'alice@example.com', matchedConditions: true }
  },
  {
    id: 'log-2',
    ruleName: 'Notify on Blocked',
    status: 'SKIPPED',
    eventType: 'TASK_STATUS_CHANGED',
    durationMs: 12,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    payload: { taskId: 'T-124', previousStatus: 'IN_PROGRESS', newStatus: 'DONE', reason: 'Condition not met (Status != BLOCKED)' }
  },
  {
    id: 'log-3',
    ruleName: 'Escalate High Priority',
    status: 'FAILED',
    eventType: 'TASK_CREATED',
    durationMs: 120,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    payload: { taskId: 'T-125', error: 'User mapping not found for escalation group' }
  }
];

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'SUCCESS':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">SUCCESS</span>;
    case 'FAILED':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/30">FAILED</span>;
    case 'SKIPPED':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-300 border border-gray-500/30">SKIPPED</span>;
    default:
      return <span>{status}</span>;
  }
};

export default function ExecutionHistory() {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-canvas border-b border-border text-xs text-foreground-secondary uppercase tracking-wider">
              <th className="p-3.5 sm:p-4 font-semibold">Status</th>
              <th className="p-3.5 sm:p-4 font-semibold">Rule / Event Type</th>
              <th className="p-3.5 sm:p-4 font-semibold">Duration</th>
              <th className="p-3.5 sm:p-4 font-semibold">Timestamp</th>
              <th className="p-3.5 sm:p-4 font-semibold w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {MOCK_LOGS.map(log => (
              <React.Fragment key={log.id}>
                <tr className="hover:bg-hover transition-colors">
                  <td className="p-3.5 sm:p-4">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="p-3.5 sm:p-4">
                    <div className="font-semibold text-xs sm:text-sm text-foreground">{log.ruleName}</div>
                    <div className="text-[11px] text-foreground-secondary mt-0.5 font-mono">{log.eventType}</div>
                  </td>
                  <td className="p-3.5 sm:p-4 text-xs sm:text-sm font-mono text-foreground-secondary">
                    {log.durationMs}ms
                  </td>
                  <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-foreground-secondary">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-3.5 sm:p-4 text-right">
                    <button 
                      onClick={() => toggleRow(log.id)}
                      className="p-1.5 hover:bg-hover rounded-md transition-colors text-foreground-secondary min-w-[32px] min-h-[32px] flex items-center justify-center ml-auto"
                      aria-label="Toggle payload details"
                    >
                      {expandedRows[log.id] ? '▼' : '▶'}
                    </button>
                  </td>
                </tr>
                {expandedRows[log.id] && (
                  <tr className="bg-canvas/50">
                    <td colSpan={5} className="p-3.5 sm:p-4">
                      <div className="text-xs font-mono bg-canvas p-3 sm:p-4 rounded-lg border border-border overflow-x-auto text-foreground-secondary">
                        <pre className="text-[11px] leading-relaxed">{JSON.stringify(log.payload, null, 2)}</pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
