import { type LucideIcon } from "lucide-react";
import type { AgentPlan } from "./agent-executor";

export type SamplePrompt = { icon: LucideIcon; label: string; prompt: string };

export type AITool = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  emptyStateTitle: string;
  emptyStateSubtitle: string;
  samplePrompts: SamplePrompt[];
};

export type StockVideo = {
  id: number;
  url: string;
  image: string;
  duration: number;
  width: number;
  height: number;
  user: { name: string; url: string };
  videoUrl: string;
  previewUrl: string;
};

export type VideoGeneration = {
  topic: string;
  duration: number;
  aspectRatio: string;
};

export type VideoEditRequest = {
  userMessage: string;
  isNewProject: boolean;
};

export type WebAppQuality = "prototype" | "production";

export type WebAppData = {
  files: { path: string; content: string }[];
  framework: "react-vite" | "nextjs-static" | "vanilla-html";
  dependencies: Record<string, string>;
  entryPoint: string;
  explanation: string;
  quality?: WebAppQuality;
};

export type ZipFileEntry = {
  path: string;
  name: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
  extension: string;
  content?: string; // text content for small text files
};

export type ZipAnalysis = {
  fileName: string;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  compressedSize: number;
  compressionRatio: number;
  fileTypes: Record<string, number>;
  largestFiles: ZipFileEntry[];
  tree: ZipTreeNode[];
  entries: ZipFileEntry[];
};

export type ZipTreeNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  children: ZipTreeNode[];
};

export type StoryRequest = {
  projectId?: string;
  initialPrompt: string;
};

export type PastedBlock = { title: string; lines: number; text: string };
export type MessageAttachment = { name: string; kind: "image" | "video" | "audio" | "file"; mime?: string; size?: number };

export type ChatMessage = {
  id: string;
  /** Long prompts pasted as their own card (50+ lines). `typed` is what the user wrote around them. */
  pasted?: PastedBlock[];
  typed?: string;
  /** Files sent with the message (shown as chips; images as square tiles). */
  attachments?: MessageAttachment[];
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolId?: string;
  imageUrl?: string;
  videos?: StockVideo[];
  videoGeneration?: VideoGeneration;
  videoEdit?: VideoEditRequest;
  webApp?: WebAppData;
  zipAnalysis?: ZipAnalysis;
  /** Backend job (ZIP analysis, project or code export) shown with live status. */
  job?: import("./builder/statuses").JobView;
  convertFile?: File;
  ttsScript?: string;
  generatedFile?: {
    fileName: string;
    content: string;
    mimeType: string;
    format: string;
  };
  agentPlan?: AgentPlan;
  story?: StoryRequest;
  /** Research report saved as a document; rendered as a compact card. */
  document?: { id: string; title: string };
  /** Internal workflow the server used; never changes the selected mode. */
  executionMode?: string;
};
