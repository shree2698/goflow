import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskAssistantDrawer } from "../components/assistant/TaskAssistantDrawer";
import { apiClient } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("TaskAssistantDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({
      data: [
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
      ],
    });
  });

  it("renders floating action button when closed and opens on click", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    render(<TaskAssistantDrawer isOpen={false} onOpen={onOpen} onClose={onClose} />);

    const fab = screen.getByLabelText(/open ai task assistant/i);
    expect(fab).toBeInTheDocument();

    fireEvent.click(fab);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("renders drawer panel and suggestions when open", async () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    render(<TaskAssistantDrawer isOpen={true} onOpen={onOpen} onClose={onClose} />);

    expect(screen.getByText("AI Task Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask me anything/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Overdue Tasks")).toBeInTheDocument();
    });
  });

  it("sends query and displays assistant reply with task cards", async () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    (apiClient.post as any).mockResolvedValue({
      data: {
        reply: "You have 1 overdue task:",
        intent: "search_tasks",
        tool_calls: [{ id: "call_1", name: "search_tasks", arguments: { overdue: true } }],
        tasks: [
          {
            id: "task-1",
            title: "Update Payment API",
            project_id: "proj-1",
            project_name: "Core Platform",
            status: "todo",
            priority: "high",
            due_date: "2026-09-25T18:00:00Z",
            assignee_name: "Alice Smith",
            is_overdue: true,
          },
        ],
      },
    });

    render(<TaskAssistantDrawer isOpen={true} onOpen={onOpen} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/ask me anything/i);
    fireEvent.change(input, { target: { value: "Show me all overdue tasks assigned to me." } });

    const submitBtn = screen.getByLabelText(/send query/i);
    fireEvent.click(submitBtn);

    // User message should appear
    expect(screen.getByText("Show me all overdue tasks assigned to me.")).toBeInTheDocument();

    // Assistant reply and task card should render
    await waitFor(() => {
      expect(screen.getByText("You have 1 overdue task:")).toBeInTheDocument();
      expect(screen.getByText("Update Payment API")).toBeInTheDocument();
      expect(screen.getByText("Core Platform")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });
  });

  it("displays batch action summary when tasks are moved", async () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    (apiClient.post as any).mockResolvedValue({
      data: {
        reply: "Successfully moved 3 tasks to archived.",
        intent: "batch_update_tasks",
        batch_summary: {
          count: 3,
          project_name: "Core Platform",
          source_status: "done",
          target_status: "archived",
        },
      },
    });

    render(<TaskAssistantDrawer isOpen={true} onOpen={onOpen} onClose={onClose} />);

    const input = screen.getByPlaceholderText(/ask me anything/i);
    fireEvent.change(input, { target: { value: "Move all completed tasks from Core Platform to archived." } });

    fireEvent.click(screen.getByLabelText(/send query/i));

    await waitFor(() => {
      expect(screen.getByText(/3 tasks moved/i)).toBeInTheDocument();
      expect(screen.getByText(/transitioned from/i)).toBeInTheDocument();
    });
  });

  it("handles suggestion chip click directly", async () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    (apiClient.post as any).mockResolvedValue({
      data: {
        reply: "Here is your agenda for today:",
        intent: "prioritize_tasks",
      },
    });

    render(<TaskAssistantDrawer isOpen={true} onOpen={onOpen} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Today's Focus")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Today's Focus"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/ai/assistant",
        expect.objectContaining({
          message: "What should I work on today?",
        })
      );
    });
  });

  it("closes when close button is clicked", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();

    render(<TaskAssistantDrawer isOpen={true} onOpen={onOpen} onClose={onClose} />);

    const closeBtn = screen.getByLabelText(/close assistant/i);
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
