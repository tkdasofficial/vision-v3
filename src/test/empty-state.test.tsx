import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmptyState from "@/components/empty-state";

describe("Empty chat suggestions", () => {
  it("shows exactly three questions and sends the selected question", () => {
    const onPromptClick = vi.fn();
    render(<EmptyState onPromptClick={onPromptClick} />);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Can you help me explore a new idea?" }));
    expect(onPromptClick).toHaveBeenCalledWith("Can you help me explore a new idea?");
  });
});