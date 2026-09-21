export interface AssistantTask {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  due_date?: string | null;
  assignee_id?: string | null;
  assignee_name?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  is_overdue?: boolean;
}

export interface BatchSummary {
  count: number;
  project_name: string;
  source_status: string;
  target_status: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AssistantResponseData {
  reply: string;
  intent: string;
  tool_calls?: ToolCall[];
  tasks?: AssistantTask[];
  created_task?: AssistantTask;
  batch_summary?: BatchSummary;
  timestamp: string;
}

export interface AssistantChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  tasks?: AssistantTask[];
  createdTask?: AssistantTask;
  batchSummary?: BatchSummary;
  timestamp: string;
  isError?: boolean;
}

export interface AssistantSuggestion {
  title: string;
  prompt: string;
  category: "search" | "work" | "create" | "batch";
  description: string;
}
