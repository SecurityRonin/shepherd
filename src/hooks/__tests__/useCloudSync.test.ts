import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStore } from "../../store";
import type { Task } from "../../types/task";

vi.mock("../../lib/api", () => ({
  getCloudStatus: vi.fn(),
  syncTasksToCloud: vi.fn(),
}));

import { getCloudStatus, syncTasksToCloud } from "../../lib/api";
import { useCloudSync } from "../useCloudSync";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Test task",
    prompt: "Do something",
    agent_id: "claude-code",
    repo_path: "/tmp/repo",
    branch: "main",
    isolation_mode: "worktree",
    status: "running",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("useCloudSync", () => {
  let hookResult: ReturnType<typeof renderHook> | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useStore.setState({ tasks: {} });
    vi.mocked(getCloudStatus).mockResolvedValue({
      cloud_available: true,
      authenticated: true,
      plan: "pro",
      credits_balance: 100,
      cloud_generation_enabled: true,
    });
    vi.mocked(syncTasksToCloud).mockResolvedValue({ synced: 1 });
    hookResult = null;
  });

  afterEach(() => {
    if (hookResult) {
      hookResult.unmount();
      hookResult = null;
    }
    vi.useRealTimers();
  });

  it("calls getCloudStatus on mount", async () => {
    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(getCloudStatus).toHaveBeenCalledTimes(1);
  });

  it("does not sync when cloud is not available", async () => {
    vi.mocked(getCloudStatus).mockResolvedValue({
      cloud_available: false,
      authenticated: true,
      plan: "pro",
      credits_balance: 100,
      cloud_generation_enabled: true,
    });

    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask() } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(syncTasksToCloud).not.toHaveBeenCalled();
  });

  it("does not sync when not authenticated", async () => {
    vi.mocked(getCloudStatus).mockResolvedValue({
      cloud_available: true,
      authenticated: false,
      plan: "pro",
      credits_balance: 100,
      cloud_generation_enabled: true,
    });

    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask() } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(syncTasksToCloud).not.toHaveBeenCalled();
  });

  it("syncs tasks after 5s debounce when tasks change and authenticated", async () => {
    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask() } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(syncTasksToCloud).toHaveBeenCalledTimes(1);
    expect(syncTasksToCloud).toHaveBeenCalledWith([makeTask()]);
  });

  it("debounces multiple rapid task changes into one sync call", async () => {
    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask({ id: 1 }) } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask({ id: 1 }), 2: makeTask({ id: 2 }) } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask({ id: 1 }), 2: makeTask({ id: 2 }), 3: makeTask({ id: 3 }) } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(syncTasksToCloud).toHaveBeenCalledTimes(1);
  });

  it("does not sync when task list is empty", async () => {
    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      useStore.setState({ tasks: {} });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(syncTasksToCloud).not.toHaveBeenCalled();
  });

  it("handles getCloudStatus error gracefully", async () => {
    vi.mocked(getCloudStatus).mockRejectedValue(new Error("Network error"));

    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask() } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(syncTasksToCloud).not.toHaveBeenCalled();
  });

  it("cleans up timer and unsubscribes store on unmount", async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    hookResult = renderHook(() => useCloudSync());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      useStore.setState({ tasks: { 1: makeTask() } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    hookResult.unmount();
    hookResult = null;

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
