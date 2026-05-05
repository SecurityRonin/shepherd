import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Task } from "../../types/task";

function makeSampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Fix auth bug",
    prompt: "Fix the authentication bug in login flow",
    agent_id: "claude-code",
    repo_path: "/home/user/project",
    branch: "fix/auth-bug",
    isolation_mode: "branch",
    status: "done",
    created_at: "2026-03-20T10:00:00Z",
    updated_at: "2026-03-20T10:30:00Z",
    summary: "Fixed the auth bug by updating token validation",
    diffs: [
      {
        file_path: "src/auth.ts",
        before_content: "old code",
        after_content: "new code",
        language: "typescript",
      },
      {
        file_path: "src/login.ts",
        before_content: "old login",
        after_content: "new login",
        language: "typescript",
      },
    ],
    gate_results: [
      { gate: "lint", passed: true },
      { gate: "test", passed: false },
    ],
    ...overrides,
  };
}

describe("exportTasksAsJson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns valid JSON with exported_at and tasks array", async () => {
    const { exportTasksAsJson } = await import("../export");
    const result = exportTasksAsJson([makeSampleTask()]);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty("exported_at");
    expect(parsed).toHaveProperty("tasks");
    expect(Array.isArray(parsed.tasks)).toBe(true);
    expect(parsed.exported_at).toBe("2026-03-23T12:00:00.000Z");
  });

  it("maps task fields correctly", async () => {
    const { exportTasksAsJson } = await import("../export");
    const task = makeSampleTask();
    const result = exportTasksAsJson([task]);
    const parsed = JSON.parse(result);
    const exported = parsed.tasks[0];
    expect(exported.id).toBe(1);
    expect(exported.title).toBe("Fix auth bug");
    expect(exported.prompt).toBe("Fix the authentication bug in login flow");
    expect(exported.agent_id).toBe("claude-code");
    expect(exported.status).toBe("done");
    expect(exported.branch).toBe("fix/auth-bug");
    expect(exported.repo_path).toBe("/home/user/project");
    expect(exported.isolation_mode).toBe("branch");
    expect(exported.created_at).toBe("2026-03-20T10:00:00Z");
    expect(exported.updated_at).toBe("2026-03-20T10:30:00Z");
    expect(exported.summary).toBe("Fixed the auth bug by updating token validation");
    expect(exported.files_changed).toBe(2);
  });

  it("handles tasks with no diffs or summary", async () => {
    const { exportTasksAsJson } = await import("../export");
    const task = makeSampleTask({ diffs: undefined, summary: undefined });
    const result = exportTasksAsJson([task]);
    const parsed = JSON.parse(result);
    const exported = parsed.tasks[0];
    expect(exported.summary).toBe("");
    expect(exported.files_changed).toBe(0);
    expect(exported.diffs).toEqual([]);
    expect(exported.gate_results).toEqual([
      { gate: "lint", passed: true },
      { gate: "test", passed: false },
    ]);
  });

  it("includes diff file paths and gate results", async () => {
    const { exportTasksAsJson } = await import("../export");
    const task = makeSampleTask();
    const result = exportTasksAsJson([task]);
    const parsed = JSON.parse(result);
    const exported = parsed.tasks[0];
    expect(exported.diffs).toEqual([
      { file_path: "src/auth.ts", language: "typescript" },
      { file_path: "src/login.ts", language: "typescript" },
    ]);
    expect(exported.gate_results).toEqual([
      { gate: "lint", passed: true },
      { gate: "test", passed: false },
    ]);
  });

  it("exports multiple tasks", async () => {
    const { exportTasksAsJson } = await import("../export");
    const tasks = [makeSampleTask({ id: 1 }), makeSampleTask({ id: 2, title: "Add feature" })];
    const result = exportTasksAsJson(tasks);
    const parsed = JSON.parse(result);
    expect(parsed.tasks).toHaveLength(2);
    expect(parsed.tasks[0].id).toBe(1);
    expect(parsed.tasks[1].id).toBe(2);
    expect(parsed.tasks[1].title).toBe("Add feature");
  });

  it("returns valid JSON for empty tasks array", async () => {
    const { exportTasksAsJson } = await import("../export");
    const result = exportTasksAsJson([]);
    const parsed = JSON.parse(result);
    expect(parsed.tasks).toHaveLength(0);
    expect(parsed.exported_at).toBe("2026-03-23T12:00:00.000Z");
  });
});

describe("exportTasksAsCsv", () => {
  it("returns CSV string with header row", async () => {
    const { exportTasksAsCsv } = await import("../export");
    const result = exportTasksAsCsv([makeSampleTask()]);
    const lines = result.split("\n");
    expect(lines[0]).toContain("id");
    expect(lines[0]).toContain("title");
    expect(lines[0]).toContain("agent_id");
    expect(lines[0]).toContain("status");
    expect(lines[0]).toContain("branch");
    expect(lines[0]).toContain("files_changed");
  });

  it("includes one data row per task", async () => {
    const { exportTasksAsCsv } = await import("../export");
    const tasks = [makeSampleTask({ id: 1 }), makeSampleTask({ id: 2 })];
    const result = exportTasksAsCsv(tasks);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3); // header + 2 data rows
  });

  it("escapes fields containing commas", async () => {
    const { exportTasksAsCsv } = await import("../export");
    const task = makeSampleTask({ title: "Fix auth, and also logout" });
    const result = exportTasksAsCsv([task]);
    expect(result).toContain('"Fix auth, and also logout"');
  });

  it("escapes fields containing double quotes", async () => {
    const { exportTasksAsCsv } = await import("../export");
    const task = makeSampleTask({ title: 'Say "hello"' });
    const result = exportTasksAsCsv([task]);
    expect(result).toContain('"Say ""hello"""');
  });

  it("returns header only for empty tasks", async () => {
    const { exportTasksAsCsv } = await import("../export");
    const result = exportTasksAsCsv([]);
    const lines = result.split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("id");
  });
});

describe("exportMetricsAsJson", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns valid JSON with exported_at and metrics fields", async () => {
    const { exportMetricsAsJson } = await import("../export");
    const metrics = {
      total_cost_usd: 5.67,
      total_tasks: 10,
      cost_by_agent: { "claude-code": 3.5, "codex-cli": 2.17 },
      cost_by_day: [{ date: "2026-03-20", cost: 5.67 }],
    };
    const result = exportMetricsAsJson(metrics);
    const parsed = JSON.parse(result);
    expect(parsed.exported_at).toBe("2026-03-23T12:00:00.000Z");
    expect(parsed.total_cost_usd).toBe(5.67);
    expect(parsed.total_tasks).toBe(10);
    expect(parsed.cost_by_agent).toEqual({ "claude-code": 3.5, "codex-cli": 2.17 });
    expect(parsed.cost_by_day).toEqual([{ date: "2026-03-20", cost: 5.67 }]);
  });
});

describe("triggerDownload", () => {
  it("creates an anchor element and programmatically clicks it", async () => {
    const { triggerDownload } = await import("../export");
    const createElementSpy = vi.spyOn(document, "createElement");
    const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation((el) => el);
    const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation((el) => el);
    const clickSpy = vi.fn();

    const mockAnchor = {
      href: "",
      download: "",
      click: clickSpy,
    };
    createElementSpy.mockReturnValue(mockAnchor as unknown as HTMLElement);

    triggerDownload("content", "file.json", "application/json");

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(mockAnchor.download).toBe("file.json");
    expect(clickSpy).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
