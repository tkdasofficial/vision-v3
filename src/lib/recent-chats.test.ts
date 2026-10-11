import { describe, it, expect } from "vitest";
import { recentChats } from "./recent-chats";
describe("recentChats", () => {
  it("hides chats that belong to a project", () => {
    expect(recentChats([{ id: "a", projectId: "p1" }, { id: "b" }]).map((c) => c.id)).toEqual(["b"]);
  });
  it("puts pinned chats first", () => {
    expect(recentChats([{ id: "a" }, { id: "b", pinned: true }]).map((c) => c.id)).toEqual(["b", "a"]);
  });
});
