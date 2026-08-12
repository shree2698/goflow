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
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/30 text-green-400 border border-green-800/50">SUCCESS</span>;
    case 'FAILED':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-900/30 text-red-400 border border-red-800/50">FAILED</span>;
    case 'SKIPPED':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-300 border border-gray-700">SKIPPED</span>;
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
    <div className="bg-[#1b1315] border border-[#40262b] rounded-lg overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#0e090a] border-b border-[#40262b] text-sm text-foreground-secondary">
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Rule / Event Type</th>
            <th className="p-4 font-medium">Duration</th>
            <th className="p-4 font-medium">Timestamp</th>
            <th className="p-4 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody>
          {MOCK_LOGS.map(log => (
            <React.Fragment key={log.id}>
              <tr className="border-b border-[#40262b] hover:bg-[#0e090a]/50 transition-colors">
                <td className="p-4">
                  <StatusBadge status={log.status} />
                </td>
                <td className="p-4">
                  <div className="font-medium text-foreground-primary">{log.ruleName}</div>
                  <div className="text-xs text-foreground-secondary mt-1">{log.eventType}</div>
                </td>
                <td className="p-4 text-sm font-mono text-foreground-secondary">
                  {log.durationMs}ms
                </td>
                <td className="p-4 text-sm text-foreground-secondary">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => toggleRow(log.id)}
                    className="p-1 hover:bg-[#40262b] rounded transition-colors text-foreground-secondary"
                  >
                    {expandedRows[log.id] ? '▼' : '▶'}
                  </button>
                </td>
              </tr>
              {expandedRows[log.id] && (
                <tr className="bg-[#0e090a] border-b border-[#40262b]">
                  <td colSpan={5} className="p-4">
                    <div className="text-xs font-mono bg-black/50 p-4 rounded border border-[#40262b] overflow-x-auto text-gray-300">
                      <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
