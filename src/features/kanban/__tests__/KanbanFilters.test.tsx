import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KanbanFilters } from "../KanbanFilters";
import { EMPTY_FILTERS, type KanbanFilters as KanbanFiltersType } from "../filterTasks";

describe("KanbanFilters", () => {
  it("renders search input, agent dropdown, and status dropdown", () => {
    const onChange = vi.fn();
    render(<KanbanFilters filters={EMPTY_FILTERS} onFiltersChange={onChange} />);

    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /agent/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /status/i })).toBeInTheDocument();
  });

  it("typing in search calls onFiltersChange with updated search", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <KanbanFilters filters={EMPTY_FILTERS} onFiltersChange={onChange} />,
    );

    const searchInput = screen.getByPlaceholderText("Search tasks...");

    await user.type(searchInput, "f");
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, search: "f" });

    rerender(
      <KanbanFilters
        filters={{ ...EMPTY_FILTERS, search: "f" }}
        onFiltersChange={onChange}
      />,
    );
    await user.type(searchInput, "i");
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, search: "fi" });

    rerender(
      <KanbanFilters
        filters={{ ...EMPTY_FILTERS, search: "fi" }}
        onFiltersChange={onChange}
      />,
    );
    await user.type(searchInput, "x");
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, search: "fix" });

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("selecting agent calls onFiltersChange with agentId", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KanbanFilters filters={EMPTY_FILTERS} onFiltersChange={onChange} />);

    const agentSelect = screen.getByRole("combobox", { name: /agent/i });
    await user.selectOptions(agentSelect, "claude-code");

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      agentId: "claude-code",
    });
  });

  it("selecting status calls onFiltersChange with status", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<KanbanFilters filters={EMPTY_FILTERS} onFiltersChange={onChange} />);

    const statusSelect = screen.getByRole("combobox", { name: /status/i });
    await user.selectOptions(statusSelect, "running");

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      status: "running",
    });
  });

  it("clear button appears when filters are active", () => {
    const onChange = vi.fn();
    const activeFilters: KanbanFiltersType = {
      search: "hello",
      agentId: null,
      status: null,
    };
    render(<KanbanFilters filters={activeFilters} onFiltersChange={onChange} />);

    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("clear button resets to EMPTY_FILTERS", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const activeFilters: KanbanFiltersType = {
      search: "hello",
      agentId: "claude-code",
      status: "running",
    };
    render(<KanbanFilters filters={activeFilters} onFiltersChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it("clear button is absent when no filters are active", () => {
    const onChange = vi.fn();
    render(<KanbanFilters filters={EMPTY_FILTERS} onFiltersChange={onChange} />);
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
  });

  it("selecting empty agent option resets agentId to null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const activeFilters: KanbanFiltersType = {
      search: "",
      agentId: "claude-code",
      status: null,
    };
    render(<KanbanFilters filters={activeFilters} onFiltersChange={onChange} />);

    const agentSelect = screen.getByRole("combobox", { name: /agent/i });
    await user.selectOptions(agentSelect, "");

    expect(onChange).toHaveBeenCalledWith({ ...activeFilters, agentId: null });
  });

  it("selecting empty status option resets status to null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const activeFilters: KanbanFiltersType = {
      search: "",
      agentId: null,
      status: "running",
    };
    render(<KanbanFilters filters={activeFilters} onFiltersChange={onChange} />);

    const statusSelect = screen.getByRole("combobox", { name: /status/i });
    await user.selectOptions(statusSelect, "");

    expect(onChange).toHaveBeenCalledWith({ ...activeFilters, status: null });
  });
});
