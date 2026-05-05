import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { TaskSummaryResponse } from "../../../lib/api";

const mockGetTaskSummary = vi.fn<(taskId: number) => Promise<TaskSummaryResponse>>();

vi.mock("../../../lib/api", () => ({
  getTaskSummary: (...args: unknown[]) => mockGetTaskSummary(args[0] as number),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TaskSummary", () => {
  it("renders nothing when task status is not done", async () => {
    const { TaskSummary } = await import("../TaskSummary");
    const { container } = render(
      <TaskSummary taskId={1} taskStatus="running" />,
    );
    expect(container.innerHTML).toBe("");
    expect(mockGetTaskSummary).not.toHaveBeenCalled();
  });

  it("renders nothing for queued status", async () => {
    const { TaskSummary } = await import("../TaskSummary");
    const { container } = render(
      <TaskSummary taskId={1} taskStatus="queued" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for error status", async () => {
    const { TaskSummary } = await import("../TaskSummary");
    const { container } = render(
      <TaskSummary taskId={1} taskStatus="error" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows loading state when fetching summary for done task", async () => {
    let resolvePromise: (value: TaskSummaryResponse) => void;
    mockGetTaskSummary.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { TaskSummary } = await import("../TaskSummary");
    render(<TaskSummary taskId={1} taskStatus="done" />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-loading")).toBeInTheDocument();
    });
    expect(screen.getByText("Generating summary...")).toBeInTheDocument();

    resolvePromise!({ summary: "Done", generated_at: "2026-01-01T00:00:00Z" });
  });

  it("shows summary text after successful fetch", async () => {
    mockGetTaskSummary.mockResolvedValue({
      summary: "Task completed: refactored auth module with 95% coverage.",
      generated_at: "2026-01-01T00:00:00Z",
    });

    const { TaskSummary } = await import("../TaskSummary");
    render(<TaskSummary taskId={42} taskStatus="done" />);

    await waitFor(() => {
      expect(screen.getByTestId("task-summary")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Task completed: refactored auth module with 95% coverage.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(mockGetTaskSummary).toHaveBeenCalledWith(42);
  });

  it("shows error state when fetch fails", async () => {
    mockGetTaskSummary.mockRejectedValue(new Error("Network error"));

    const { TaskSummary } = await import("../TaskSummary");
    render(<TaskSummary taskId={1} taskStatus="done" />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-error")).toBeInTheDocument();
    });
    expect(screen.getByText("Summary unavailable")).toBeInTheDocument();
  });

  it("shows error state for non-Error rejections", async () => {
    mockGetTaskSummary.mockRejectedValue("string error");

    const { TaskSummary } = await import("../TaskSummary");
    render(<TaskSummary taskId={1} taskStatus="done" />);

    await waitFor(() => {
      expect(screen.getByTestId("summary-error")).toBeInTheDocument();
    });
  });

  it("does not fetch again when same taskId re-renders with done status (cache)", async () => {
    mockGetTaskSummary.mockResolvedValue({
      summary: "Cached summary",
      generated_at: "2026-01-01T00:00:00Z",
    });

    const { TaskSummary } = await import("../TaskSummary");
    const { rerender } = render(<TaskSummary taskId={5} taskStatus="done" />);

    await waitFor(() => {
      expect(screen.getByTestId("task-summary")).toBeInTheDocument();
    });

    expect(mockGetTaskSummary).toHaveBeenCalledTimes(1);

    rerender(<TaskSummary taskId={5} taskStatus="done" />);
    await waitFor(() => {
      expect(screen.getByTestId("task-summary")).toBeInTheDocument();
    });

    expect(mockGetTaskSummary).toHaveBeenCalledTimes(1);
  });

  it("fetches again when taskId changes", async () => {
    mockGetTaskSummary.mockResolvedValue({
      summary: "Summary for task",
      generated_at: "2026-01-01T00:00:00Z",
    });

    const { TaskSummary } = await import("../TaskSummary");
    const { rerender } = render(<TaskSummary taskId={10} taskStatus="done" />);

    await waitFor(() => {
      expect(screen.getByTestId("task-summary")).toBeInTheDocument();
    });

    expect(mockGetTaskSummary).toHaveBeenCalledTimes(1);
    expect(mockGetTaskSummary).toHaveBeenCalledWith(10);

    rerender(<TaskSummary taskId={11} taskStatus="done" />);
    await waitFor(() => {
      expect(mockGetTaskSummary).toHaveBeenCalledTimes(2);
    });
    expect(mockGetTaskSummary).toHaveBeenCalledWith(11);
  });
});
