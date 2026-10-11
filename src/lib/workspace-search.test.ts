import { describe, expect, it } from "vitest";
import { collectSearchItems, filterSearchItems, inferAssetType } from "./workspace-search";

describe("workspace search", () => {
  const sessions = [{ id: "chat-1", title: "Launch plan", preview: "Summer campaign", created_at: "2026-10-09" }];
  it("indexes chats, uploaded files, generated messages and completed tasks", () => {
    const items = collectSearchItems(sessions, [
      { id: "upload", session_id: "chat-1", role: "user", metadata: { zipAnalysis: { fileName: "campaign.zip" } } },
      { id: "output", session_id: "chat-1", role: "assistant", metadata: { generatedFile: { fileName: "plan.pdf" } } },
      { id: "other-user", session_id: "other-chat", role: "user", image_url: "image" },
    ], [{ id: "task", status: "completed", task_type: "image", result: { type: "image" } }, { id: "pending", status: "running" }], []);
    expect(items.map((item) => item.title)).toEqual(expect.arrayContaining(["Launch plan", "campaign.zip", "plan.pdf", "Generated image"]));
    expect(items).toHaveLength(4);
    expect(filterSearchItems(items, "PLAN", "generated")).toHaveLength(1);
  });
  it("matches multiple words across titles and previews, and handles empty searches", () => {
    const items = collectSearchItems(sessions, [], [], []);
    expect(filterSearchItems(items, " launch SUMMER ", "all")).toHaveLength(1);
    expect(filterSearchItems(items, "missing", "all")).toEqual([]);
    expect(filterSearchItems(items, "", "all")).toHaveLength(1);
    expect(filterSearchItems(items, "", "files")).toEqual([]);
  });
  it("classifies file types using filenames, MIME types, and creation metadata", () => {
    expect(inferAssetType({ fileName: "REPORT.PDF" })).toBe("pdf");
    expect(inferAssetType({ name: "photo", type: "image/webp" })).toBe("image");
    expect(inferAssetType({ fileName: "clip.mp4" })).toBe("video");
    expect(inferAssetType({ fileName: "notes.docx" })).toBe("document");
    expect(inferAssetType({ fileName: "assets.zip" })).toBe("archive");
    expect(inferAssetType({ fileName: "voice.mp3" })).toBe("audio");
    expect(inferAssetType({ name: "unknown" })).toBe("other");
    const items = collectSearchItems(sessions, [
      { id: "photo", session_id: "chat-1", role: "user", image_url: "photo" },
      { id: "pdf", session_id: "chat-1", role: "assistant", metadata: { generatedFile: { fileName: "plan.pdf" } } },
      { id: "video", session_id: "chat-1", role: "assistant", metadata: { videoGeneration: {} } },
    ], [{ id: "image-task", status: "completed", task_type: "image", result: { type: "image" } }], []);
    expect(items.find((item) => item.id === "message-photo")?.assetType).toBe("image");
    expect(items.find((item) => item.id === "message-pdf")?.assetType).toBe("pdf");
    expect(items.find((item) => item.id === "message-video")?.assetType).toBe("video");
    expect(items.find((item) => item.id === "task-image-task")?.assetType).toBe("image");
  });
});