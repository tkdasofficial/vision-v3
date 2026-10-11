import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreationEmptyState from "@/components/creation-empty-state";
import { referencePrompt } from "@/lib/creation-references";
afterEach(cleanup);
describe("Creation references", () => {
  it.each(["images", "videos"] as const)("has eight references and submits a %s prompt", (mode) => {
    const submit = vi.fn();
    render(<CreationEmptyState mode={mode} onPromptClick={submit} />);
    expect(screen.getAllByRole("img")).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "Create editorial portrait" }));
    expect(submit).toHaveBeenCalledWith(referencePrompt(0, mode));
    expect(referencePrompt(0, mode)).toMatch(mode === "images" ? /^Create an image:/ : /^Create a video:/);
  });
});
