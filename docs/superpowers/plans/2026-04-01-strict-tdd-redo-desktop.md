# Strict TDD Redo — shepherd Desktop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-implement all 5 desktop enhancement features (kanban filtering, AI summaries, cloud sync, session persistence, export/reporting) using strict TDD — every test must be written and verified failing BEFORE any implementation code.

**Architecture:** React + Zustand frontend in a Tauri 2.0 desktop app. Features are organized under `src/features/` (components) and `src/hooks/` (custom hooks). Tests use jsdom + React Testing Library.

**Tech Stack:** TypeScript, React, Zustand, Vitest (jsdom environment), React Testing Library

**Test command:** `npx vitest run src/path/to/test.ts`

**CRITICAL:** Never run multiple vitest processes concurrently.

---

## Task 0: Clean Slate — Delete All Enhancement Code

**Files:**
- Delete: `src/features/kanban/filterTasks.ts`
- Delete: `src/features/kanban/KanbanFilters.tsx`
- Delete: `src/features/kanban/__tests__/filterTasks.test.ts`
- Delete: `src/features/kanban/__tests__/KanbanFilters.test.tsx`
- Delete: `src/features/focus/TaskSummary.tsx`
- Delete: `src/features/focus/ResumePrompt.tsx`
- Delete: `src/features/focus/__tests__/TaskSummary.test.tsx`
- Delete: `src/features/focus/__tests__/ResumePrompt.test.tsx`
- Delete: `src/hooks/useCloudSync.ts`
- Delete: `src/hooks/useSessionPersistence.ts`
- Delete: `src/hooks/__tests__/useCloudSync.test.ts`
- Delete: `src/hooks/__tests__/useSessionPersistence.test.ts`
- Delete: `src/lib/export.ts`
- Delete: `src/lib/__tests__/export.test.ts`
- Delete: `src/features/observability/ExportButton.tsx`
- Delete: `src/features/observability/__tests__/ExportButton.test.tsx`
- Delete: `crates/shepherd-server/src/routes/summaries.rs`
- Revert: `src/App.tsx` — remove `useCloudSync()` hook call
- Revert: `src/features/focus/FocusView.tsx` — remove TaskSummary integration
- Revert: `src/features/kanban/KanbanBoard.tsx` — remove filter state and KanbanFilters component
- Revert: `src/lib/api.ts` — remove getTaskSummary, syncTasksToCloud, getInterruptedSessions, saveSessionState, clearSessionState
- Revert: `src/types/task.ts` — remove `summary?: string` from Task, remove SessionState interface
- Revert: `crates/shepherd-server/src/routes/mod.rs` — remove `pub mod summaries;`

- [ ] **Step 1: Delete all created source and test files**

```bash
cd /Users/4n6h4x0r/src/shepherd
rm -f src/features/kanban/filterTasks.ts src/features/kanban/KanbanFilters.tsx
rm -rf src/features/kanban/__tests__
rm -f src/features/focus/TaskSummary.tsx src/features/focus/ResumePrompt.tsx
rm -rf src/features/focus/__tests__
rm -f src/hooks/useCloudSync.ts src/hooks/useSessionPersistence.ts
rm -rf src/hooks/__tests__
rm -f src/lib/export.ts
rm -rf src/lib/__tests__
rm -f src/features/observability/ExportButton.tsx
rm -rf src/features/observability/__tests__
rm -f crates/shepherd-server/src/routes/summaries.rs
```

- [ ] **Step 2: Revert modifications to existing files**

Revert the specific changes in: `src/App.tsx`, `src/features/focus/FocusView.tsx`, `src/features/kanban/KanbanBoard.tsx`, `src/lib/api.ts`, `src/types/task.ts`, `crates/shepherd-server/src/routes/mod.rs`.

For `src/types/task.ts`: remove `summary?: string` from Task interface and remove the `SessionState` interface.

For `src/lib/api.ts`: remove the `getTaskSummary`, `syncTasksToCloud`, `getInterruptedSessions`, `saveSessionState`, `clearSessionState` functions and the `SessionState` import.

For `src/App.tsx`: remove the `useCloudSync()` call and its import.

For `src/features/kanban/KanbanBoard.tsx`: remove filter state, `useMemo` with `filterTasks`, and `KanbanFilters` component render.

For `src/features/focus/FocusView.tsx`: remove `TaskSummary` component integration.

For `crates/shepherd-server/src/routes/mod.rs`: remove `pub mod summaries;`.

- [ ] **Step 3: Verify clean state**

```bash
npx vitest run
```

Expected: All pre-enhancement tests pass.

- [ ] **Step 4: Commit clean slate**

```bash
git add -A && git commit -m "chore: remove all enhancement code for strict TDD redo

Delete all 5 desktop enhancement features (kanban filtering, AI summaries,
cloud sync, session persistence, export) — source, tests, and integration
changes — to re-implement with strict test-first TDD discipline.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 1: Kanban Filtering — Pure Logic

**Files:**
- Create: `src/features/kanban/__tests__/filterTasks.test.ts`
- Create: `src/features/kanban/filterTasks.ts`

### RED Phase

- [ ] **Step 1: Write failing tests — src/features/kanban/__tests__/filterTasks.test.ts**

```typescript
import { describe, it, expect } from "vitest";
import { filterTasks, hasActiveFilters, EMPTY_FILTERS, type KanbanFilters } from "../filterTasks";
import type { Task } from "../../../types/task";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Default task",
    prompt: "Do something",
    agent_id: "claude-code",
    repo_path: "/tmp/repo",
    branch: "main",
    isolation_mode: "none",
    status: "queued",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const sampleTasks: Record<number, Task> = {
  1: makeTask({ id: 1, title: "Fix auth bug", agent_id: "claude-code", status: "running", branch: "fix/auth", prompt: "Fix the authentication" }),
  2: makeTask({ id: 2, title: "Add dashboard", agent_id: "codex-cli", status: "done", branch: "feat/dashboard", prompt: "Create dashboard" }),
  3: makeTask({ id: 3, title: "Refactor API", agent_id: "claude-code", status: "queued", branch: "refactor/api", prompt: "Clean up API layer" }),
};

describe("hasActiveFilters", () => {
  it("returns false for EMPTY_FILTERS", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("returns true when search is non-empty", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, search: "fix" })).toBe(true);
  });

  it("returns true when agentId is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, agentId: "claude-code" })).toBe(true);
  });

  it("returns true when status is set", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: "done" })).toBe(true);
  });
});

describe("filterTasks", () => {
  it("returns all tasks when no filters active", () => {
    const result = filterTasks(sampleTasks, EMPTY_FILTERS);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it("filters by search (case-insensitive match on title)", () => {
    const result = filterTasks(sampleTasks, { ...EMPTY_FILTERS, search: "fix" });
    expect(Object.keys(result)).toHaveLength(1);
    expect(result[1].title).toBe("Fix auth bug");
  });

  it("filters by search matching branch", () => {
    const result = filterTasks(sampleTasks, { ...EMPTY_FILTERS, search: "dashboard" });
    expect(Object.keys(result)).toHaveLength(1);
    expect(result[2]).toBeDefined();
  });

  it("filters by search matching prompt", () => {
    const result = filterTasks(sampleTasks, { ...EMPTY_FILTERS, search: "clean up" });
    expect(Object.keys(result)).toHaveLength(1);
    expect(result[3]).toBeDefined();
  });

  it("filters by agentId", () => {
    const result = filterTasks(sampleTasks, { ...EMPTY_FILTERS, agentId: "claude-code" });
    expect(Object.keys(result)).toHaveLength(2);
    expect(result[1]).toBeDefined();
    expect(result[3]).toBeDefined();
  });

  it("filters by status", () => {
    const result = filterTasks(sampleTasks, { ...EMPTY_FILTERS, status: "done" });
    expect(Object.keys(result)).toHaveLength(1);
    expect(result[2]).toBeDefined();
  });

  it("combines search + agentId + status", () => {
    const result = filterTasks(sampleTasks, { search: "fix", agentId: "claude-code", status: "running" });
    expect(Object.keys(result)).toHaveLength(1);
    expect(result[1]).toBeDefined();
  });

  it("returns empty when no tasks match", () => {
    const result = filterTasks(sampleTasks, { ...EMPTY_FILTERS, search: "nonexistent" });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("handles empty tasks record", () => {
    const result = filterTasks({}, { ...EMPTY_FILTERS, search: "anything" });
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("search is case-insensitive", () => {
    const result = filterTasks(sampleTasks, { ...EMPTY_FILTERS, search: "FIX AUTH" });
    expect(Object.keys(result)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests — verify RED**

```bash
npx vitest run src/features/kanban/__tests__/filterTasks.test.ts
```

Expected: FAIL — `Cannot find module '../filterTasks'`

- [ ] **Step 3: Commit RED**

```bash
git add src/features/kanban/__tests__/filterTasks.test.ts
git commit -m "test(kanban): add failing tests for filterTasks

15 tests for filterTasks and hasActiveFilters. All fail because
filterTasks.ts does not exist.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### GREEN Phase

- [ ] **Step 4: Write minimal implementation — src/features/kanban/filterTasks.ts**

```typescript
import type { Task, TaskStatus } from "../../types/task";

export interface KanbanFilters {
  search: string;
  agentId: string | null;
  status: TaskStatus | null;
}

export const EMPTY_FILTERS: KanbanFilters = {
  search: "",
  agentId: null,
  status: null,
};

export function filterTasks(
  tasks: Record<number, Task>,
  filters: KanbanFilters,
): Record<number, Task> {
  if (!hasActiveFilters(filters)) {
    return tasks;
  }

  const searchLower = filters.search.toLowerCase();
  const result: Record<number, Task> = {};

  for (const [id, task] of Object.entries(tasks)) {
    if (filters.agentId !== null && task.agent_id !== filters.agentId) {
      continue;
    }
    if (filters.status !== null && task.status !== filters.status) {
      continue;
    }
    if (searchLower !== "") {
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        task.branch.toLowerCase().includes(searchLower) ||
        task.prompt.toLowerCase().includes(searchLower);
      if (!matchesSearch) {
        continue;
      }
    }
    result[Number(id)] = task;
  }

  return result;
}

export function hasActiveFilters(filters: KanbanFilters): boolean {
  return (
    filters.search !== "" ||
    filters.agentId !== null ||
    filters.status !== null
  );
}
```

- [ ] **Step 5: Run tests — verify GREEN**

```bash
npx vitest run src/features/kanban/__tests__/filterTasks.test.ts
```

Expected: 15 tests PASS

- [ ] **Step 6: Commit GREEN**

```bash
git add src/features/kanban/filterTasks.ts
git commit -m "feat(kanban): implement filterTasks and hasActiveFilters

Pure function for filtering tasks by search, agentId, status.
All 15 tests pass.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Kanban Filtering — UI Component

**Files:**
- Create: `src/features/kanban/__tests__/KanbanFilters.test.tsx`
- Create: `src/features/kanban/KanbanFilters.tsx`
- Modify: `src/features/kanban/KanbanBoard.tsx` (integration)

### RED Phase

- [ ] **Step 1: Write failing tests — src/features/kanban/__tests__/KanbanFilters.test.tsx**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KanbanFilters } from "../KanbanFilters";
import { EMPTY_FILTERS, type KanbanFilters as KanbanFiltersType } from "../filterTasks";

describe("KanbanFilters", () => {
  const defaultProps = {
    filters: EMPTY_FILTERS,
    onFiltersChange: vi.fn(),
  };

  it("renders search input", () => {
    render(<KanbanFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
  });

  it("renders agent filter dropdown", () => {
    render(<KanbanFilters {...defaultProps} />);
    expect(screen.getByLabelText("Agent filter")).toBeInTheDocument();
  });

  it("renders status filter dropdown", () => {
    render(<KanbanFilters {...defaultProps} />);
    expect(screen.getByLabelText("Status filter")).toBeInTheDocument();
  });

  it("calls onFiltersChange when search input changes", () => {
    const onFiltersChange = vi.fn();
    render(<KanbanFilters {...defaultProps} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByPlaceholderText("Search tasks..."), { target: { value: "fix" } });
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, search: "fix" });
  });

  it("calls onFiltersChange when agent dropdown changes", () => {
    const onFiltersChange = vi.fn();
    render(<KanbanFilters {...defaultProps} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByLabelText("Agent filter"), { target: { value: "claude-code" } });
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ agentId: "claude-code" }));
  });

  it("calls onFiltersChange when status dropdown changes", () => {
    const onFiltersChange = vi.fn();
    render(<KanbanFilters {...defaultProps} onFiltersChange={onFiltersChange} />);
    fireEvent.change(screen.getByLabelText("Status filter"), { target: { value: "done" } });
    expect(onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ status: "done" }));
  });

  it("does not show clear button when no filters active", () => {
    render(<KanbanFilters {...defaultProps} />);
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
  });

  it("shows clear button when filters are active", () => {
    const filters: KanbanFiltersType = { search: "test", agentId: null, status: null };
    render(<KanbanFilters {...defaultProps} filters={filters} />);
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("resets filters when clear button is clicked", () => {
    const onFiltersChange = vi.fn();
    const filters: KanbanFiltersType = { search: "test", agentId: null, status: null };
    render(<KanbanFilters {...defaultProps} filters={filters} onFiltersChange={onFiltersChange} />);
    fireEvent.click(screen.getByText("Clear"));
    expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
```

- [ ] **Step 2: Run tests — verify RED**

```bash
npx vitest run src/features/kanban/__tests__/KanbanFilters.test.tsx
```

Expected: FAIL — `Cannot find module '../KanbanFilters'`

- [ ] **Step 3: Commit RED**

```bash
git add src/features/kanban/__tests__/KanbanFilters.test.tsx
git commit -m "test(kanban): add failing tests for KanbanFilters component

9 tests for UI interactions. All fail because KanbanFilters.tsx
does not exist.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### GREEN Phase

- [ ] **Step 4: Write minimal implementation — src/features/kanban/KanbanFilters.tsx**

(Full component code with search input, agent dropdown, status dropdown, and clear button — identical to the read version.)

- [ ] **Step 5: Integrate into KanbanBoard.tsx**

Add filter state (`useState`), `useMemo` with `filterTasks`, and render `KanbanFilters` above columns.

- [ ] **Step 6: Run tests — verify GREEN**

```bash
npx vitest run src/features/kanban/__tests__/KanbanFilters.test.tsx
```

Expected: 9 tests PASS

- [ ] **Step 7: Commit GREEN**

```bash
git add src/features/kanban/KanbanFilters.tsx src/features/kanban/KanbanBoard.tsx
git commit -m "feat(kanban): implement KanbanFilters component and board integration

Search, agent, and status filters with clear button.
All 9 component tests pass.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: AI Task Summaries

**Files:**
- Create: `src/features/focus/__tests__/TaskSummary.test.tsx`
- Create: `src/features/focus/TaskSummary.tsx`
- Modify: `src/lib/api.ts` (add getTaskSummary)
- Modify: `src/types/task.ts` (add summary field)
- Modify: `src/features/focus/FocusView.tsx` (integration)
- Create: `crates/shepherd-server/src/routes/summaries.rs`

Follow same RED-GREEN-COMMIT pattern. 9 tests covering: renders nothing for non-done tasks, shows loading state, shows summary on success, shows error state, caches result. Component lazy-imports `getTaskSummary` from api.ts.

---

## Task 4: Cloud Sync

**Files:**
- Create: `src/hooks/__tests__/useCloudSync.test.ts`
- Create: `src/hooks/useCloudSync.ts`
- Modify: `src/lib/api.ts` (add syncTasksToCloud, getCloudStatus)
- Modify: `src/App.tsx` (add hook call)

Follow same RED-GREEN-COMMIT pattern. 10 tests covering: checks cloud status on mount, subscribes to store changes, debounce-pushes after 5s, skips sync when not authenticated, cleans up on unmount.

---

## Task 5: Session Persistence

**Files:**
- Create: `src/hooks/__tests__/useSessionPersistence.test.ts`
- Create: `src/hooks/useSessionPersistence.ts`
- Create: `src/features/focus/__tests__/ResumePrompt.test.tsx`
- Create: `src/features/focus/ResumePrompt.tsx`
- Modify: `src/lib/api.ts` (add getInterruptedSessions, saveSessionState, clearSessionState)
- Modify: `src/types/task.ts` (add SessionState interface)

Follow same RED-GREEN-COMMIT pattern. Hook: 6 tests. Component: 8 tests. Covers: fetches interrupted sessions, resume/dismiss/start-fresh actions, truncates long prompts, renders nothing for empty sessions.

---

## Task 6: Export/Reporting — Pure Logic

**Files:**
- Create: `src/lib/__tests__/export.test.ts`
- Create: `src/lib/export.ts`

### RED Phase

- [ ] **Step 1: Write failing tests — src/lib/__tests__/export.test.ts**

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { exportTasksAsJson, exportTasksAsCsv, exportMetricsAsJson, triggerDownload } from "../export";
import type { Task } from "../../types/task";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Test task",
    prompt: "Do something",
    agent_id: "claude-code",
    repo_path: "/tmp",
    branch: "main",
    isolation_mode: "none",
    status: "done",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    diffs: [],
    gate_results: [],
    ...overrides,
  };
}

describe("exportTasksAsJson", () => {
  it("returns valid JSON with exported_at and tasks array", () => {
    const tasks = [makeTask()];
    const result = JSON.parse(exportTasksAsJson(tasks));
    expect(result.exported_at).toBeDefined();
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe(1);
  });

  it("includes correct fields in exported tasks", () => {
    const tasks = [makeTask({ id: 42, title: "Special", summary: "A summary" })];
    const result = JSON.parse(exportTasksAsJson(tasks));
    const exported = result.tasks[0];
    expect(exported.id).toBe(42);
    expect(exported.title).toBe("Special");
    expect(exported.summary).toBe("A summary");
    expect(exported.files_changed).toBe(0);
  });

  it("handles tasks without summary", () => {
    const tasks = [makeTask()];
    const result = JSON.parse(exportTasksAsJson(tasks));
    expect(result.tasks[0].summary).toBe("");
  });

  it("handles empty task list", () => {
    const result = JSON.parse(exportTasksAsJson([]));
    expect(result.tasks).toHaveLength(0);
  });
});

describe("exportTasksAsCsv", () => {
  it("starts with header row", () => {
    const result = exportTasksAsCsv([]);
    expect(result.startsWith("id,title,agent_id")).toBe(true);
  });

  it("produces one data row per task", () => {
    const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 })];
    const lines = exportTasksAsCsv(tasks).split("\n");
    expect(lines).toHaveLength(3); // header + 2 rows
  });

  it("escapes fields containing commas", () => {
    const tasks = [makeTask({ title: "Fix, debug, deploy" })];
    const result = exportTasksAsCsv(tasks);
    expect(result).toContain('"Fix, debug, deploy"');
  });

  it("escapes fields containing quotes", () => {
    const tasks = [makeTask({ title: 'Fix "bug"' })];
    const result = exportTasksAsCsv(tasks);
    expect(result).toContain('"Fix ""bug"""');
  });
});

describe("exportMetricsAsJson", () => {
  it("returns valid JSON with metrics and exported_at", () => {
    const metrics = {
      total_cost_usd: 12.5,
      total_tasks: 10,
      cost_by_agent: { "claude-code": 10 },
      cost_by_day: [{ date: "2024-01-01", cost: 5 }],
    };
    const result = JSON.parse(exportMetricsAsJson(metrics));
    expect(result.exported_at).toBeDefined();
    expect(result.total_cost_usd).toBe(12.5);
    expect(result.total_tasks).toBe(10);
  });
});

describe("triggerDownload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates blob URL, clicks anchor, revokes URL", () => {
    const mockClick = vi.fn();
    const mockCreateElement = vi.spyOn(document, "createElement").mockReturnValue({
      set href(v: string) {},
      set download(v: string) {},
      click: mockClick,
    } as unknown as HTMLAnchorElement);

    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:test");
    const mockRevokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL });

    triggerDownload("content", "file.json", "application/json");

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
```

- [ ] **Step 2: Run tests — verify RED**

```bash
npx vitest run src/lib/__tests__/export.test.ts
```

Expected: FAIL — `Cannot find module '../export'`

- [ ] **Step 3: Commit RED**

```bash
git add src/lib/__tests__/export.test.ts
git commit -m "test(export): add failing tests for export utilities

12 tests for exportTasksAsJson, exportTasksAsCsv, exportMetricsAsJson,
triggerDownload. All fail because export.ts does not exist.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### GREEN Phase

- [ ] **Step 4: Write minimal implementation — src/lib/export.ts**

(Full implementation: ExportableTask interface, exportTasksAsJson, exportTasksAsCsv with escapeCsvField, MetricsExport interface, exportMetricsAsJson, triggerDownload — identical to the read version.)

- [ ] **Step 5: Run tests — verify GREEN**

```bash
npx vitest run src/lib/__tests__/export.test.ts
```

Expected: 12 tests PASS

- [ ] **Step 6: Commit GREEN**

```bash
git add src/lib/export.ts
git commit -m "feat(export): implement export utilities

exportTasksAsJson, exportTasksAsCsv, exportMetricsAsJson, triggerDownload.
All 12 tests pass.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Export/Reporting — UI Component

**Files:**
- Create: `src/features/observability/__tests__/ExportButton.test.tsx`
- Create: `src/features/observability/ExportButton.tsx`

Follow same RED-GREEN-COMMIT pattern. 8 tests covering: renders Export button, toggles dropdown, shows Tasks as JSON/CSV and Metrics as JSON options, calls export functions and triggerDownload, hides metrics option when no metrics passed.

---

## Verification

- [ ] **Final: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (pre-enhancement + 77 new enhancement tests).

- [ ] **Final: Push**

```bash
git push origin main
```
