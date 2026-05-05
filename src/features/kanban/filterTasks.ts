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
