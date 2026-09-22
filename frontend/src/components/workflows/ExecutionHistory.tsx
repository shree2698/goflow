"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";

interface ExecutionLog {
  id: string;
  ruleName: string;
  status: string;
  eventType: string;
  durationMs: number;
  timestamp: string;
  payload?: any;
}

const StatusBadge = ({ status }: { status: string }) => {
  const upper = status.toUpperCase();
  switch (upper) {
    case 'SUCCESS':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">SUCCESS</span>;
    case 'FAILED':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/30">FAILED</span>;
    case 'SKIPPED':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-300 border border-gray-500/30">SKIPPED</span>;
    default:
      return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-accent/10 text-accent border border-accent/30">{upper}</span>;
  }
};

export default function ExecutionHistory({ workflowId }: { workflowId?: string }) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (!workflowId) return;

    const fetchExecutions = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<any[]>(`/workflows/${workflowId}/executions`);
        if (res.data && res.data.length > 0) {
          const formatted: ExecutionLog[] = res.data.map((ex: any) => ({
            id: ex.id,
            ruleName: "Workflow Automation Execution",
            status: ex.status || "SUCCESS",
            eventType: ex.event_type || "TASK_CREATED",
            durationMs: ex.execution_time_ms || 12,
            timestamp: ex.executed_at || new Date().toISOString(),
            payload: ex.error_message ? { error: ex.error_message } : { status: ex.status, executed_at: ex.executed_at },
          }));
          setLogs(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch workflow executions", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [workflowId]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-card rounded-xl border border-border">
        <Loader2 className="animate-spin text-accent" size={24} />
      </div>
    );
  }

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = logs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-border text-xs text-foreground-secondary">
        No execution logs recorded yet for this workflow.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto overflow-y-auto max-h-[300px] w-full relative">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead className="sticky top-0 z-10 bg-canvas shadow-sm">
            <tr className="border-b border-border text-xs text-foreground-secondary uppercase tracking-wider">
              <th className="p-3.5 sm:p-4 font-semibold">Status</th>
              <th className="p-3.5 sm:p-4 font-semibold">Rule / Event Type</th>
              <th className="p-3.5 sm:p-4 font-semibold">Duration</th>
              <th className="p-3.5 sm:p-4 font-semibold">Timestamp</th>
              <th className="p-3.5 sm:p-4 font-semibold w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedLogs.map(log => (
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
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-between bg-card text-xs">
          <div className="text-foreground-secondary font-medium">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, logs.length)} of {logs.length}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg bg-canvas shadow-sm disabled:opacity-50 disabled:shadow-none text-xs font-semibold border border-border"
            >
              Prev
            </button>
            <div className="flex items-center justify-center px-2 text-xs font-bold bg-canvas rounded-lg border border-border">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg bg-canvas shadow-sm disabled:opacity-50 disabled:shadow-none text-xs font-semibold border border-border"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
