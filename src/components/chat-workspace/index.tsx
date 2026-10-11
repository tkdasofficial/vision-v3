import { useState, useRef, useEffect, useCallback } from "react";
import { Crown, Menu } from "lucide-react";
import { IncognitoIcon } from "@/components/icons/incognito-icon";
import { useNavigate } from "@/lib/router-compat";
import ChatActionsMenu from "@/components/chat-actions-menu";
import AnnouncementBanner from "@/components/announcement-banner";

import type { AITool, ChatMessage as ChatMessageType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useChatHistory } from "@/context/ChatHistoryContext";
import ChatInput from "@/components/chat-input";
import ChatMessage from "@/components/chat-message";
import EmptyState from "@/components/empty-state";
import CreationEmptyState from "@/components/creation-empty-state";
import type { CreationMode } from "@/lib/creation-references";
import TypingIndicator, { detectPhase, type ThinkingPhase } from "@/components/typing-indicator";
import { detectAspectRatio } from "@/lib/detect-aspect-ratio";
import { getCategory } from "@/lib/file-converter";
import { runJob, listJobs, fetchJob, cancelJob } from "@/lib/builder/jobs-client";
import { isTerminal } from "@/lib/builder/statuses";
import type { ChatMode } from "@/lib/ai/modes";
import { saveDocumentFn } from "@/lib/cloud/documents.functions";
import { useBackgroundTasks, type BackgroundTask } from "@/hooks/useBackgroundTasks";
import { supabase, AI_FEATURE_UNAVAILABLE } from "@/lib/cloud/client";
import { streamChat } from "@/lib/cloud/chat-stream";
import { useAuth } from "@/context/AuthContext";

type Props = {
  tool?: AITool;
  creationMode?: CreationMode;
  onMenuClick: () => void;
  initialMessages?: ChatMessageType[];
  chatId?: string;
  onChatCreated?: (id: string) => void;
  isIncognito?: boolean;
  onIncognitoChat: () => void;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const CODE_GEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/code-generator`;
const AGENT_PLANNER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-planner`;

const ChatWorkspace = ({ tool, onMenuClick, initialMessages, chatId: externalChatId, onChatCreated, isIncognito = false, onIncognitoChat, creationMode }: Props) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages || []);
  const [isTyping, setIsTyping] = useState(false);
  // Anything in flight that the send button can stop: a streaming reply and/or backend tasks of this chat.
  const [streaming, setStreaming] = useState(false);
  const [activeJobs, setActiveJobs] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const trackJob = useCallback((id: string, running: boolean) => setActiveJobs((cur) => {
    if (cur.has(id) === running) return cur;
    const next = new Set(cur); running ? next.add(id) : next.delete(id); return next;
  }), []);
  const [creationError, setCreationError] = useState<string | null>(null);
  const initialMsgCount = useRef((initialMessages || []).length);
  const [thinkingPhase, setThinkingPhase] = useState<ThinkingPhase>("thinking");
  const [chatId, setChatId] = useState<string | null>(externalChatId || null);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addChat, updateChatMessages } = useChatHistory();
  const { tasks: bgTasks, activeTasks, dispatch: dispatchBgTask } = useBackgroundTasks(chatId);
  const { user } = useAuth();
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  // Track message IDs we've already seen to detect new ones
  const knownIdsRef = useRef<Set<string>>(new Set((initialMessages || []).map(m => m.id)));

  // Whenever messages change, mark any new assistant messages for typewriter animation
  useEffect(() => {
    const newAssistantIds: string[] = [];
    for (const msg of messages) {
      if (!knownIdsRef.current.has(msg.id)) {
        knownIdsRef.current.add(msg.id);
        if (msg.role === "assistant") {
          newAssistantIds.push(msg.id);
        }
      }
    }
    if (newAssistantIds.length > 0) {
      setNewMessageIds((prev) => {
        const next = new Set(prev);
        newAssistantIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [messages]);

  // Handle background task completion — inject result as assistant message
  const handleBgTaskResult = useCallback((task: BackgroundTask) => {
    if (!task.result) return;
    const r = task.result;
    const msgBase = { id: `bg-${task.id}`, role: "assistant" as const, timestamp: new Date() };

    if (r.type === "chat") {
      setMessages((prev) => [...prev, { ...msgBase, content: r.content }]);
    } else if (r.type === "image") {
      setMessages((prev) => [...prev, { ...msgBase, content: "Here is your generated image!", imageUrl: r.imageUrl }]);
    } else if (r.type === "code") {
      setMessages((prev) => [...prev, {
        ...msgBase,
        content: r.explanation || "Here's your generated web application!",
        webApp: { files: r.files, framework: r.framework, dependencies: r.dependencies || {}, entryPoint: r.entryPoint || "index.html", explanation: r.explanation || "", quality: "production" },
      }]);
    } else if (r.type === "file") {
      setMessages((prev) => [...prev, {
        ...msgBase,
        content: r.explanation || `Here's your generated file:`,
        generatedFile: { fileName: r.fileName, content: r.content, mimeType: r.mimeType, format: r.format },
      }]);
    } else if (r.type === "agent") {
      setMessages((prev) => [...prev, {
        ...msgBase,
        content: `🚀 **${r.plan?.title}** — ${r.stepResults?.length || 0} steps completed`,
        agentPlan: r.plan,
      }]);
    }
  }, []);

  // On mount: recover any completed background tasks that have no corresponding message
  useEffect(() => {
    if (isIncognito) return;
    for (const task of bgTasks) {
      if (task.status === "done" && task.result) {
        const hasBgMsg = messages.some((m) => m.id === `bg-${task.id}`);
        if (!hasBgMsg) handleBgTaskResult(task);
      }
    }
  }, [bgTasks, isIncognito]);

  // Set title from initial messages when loading an existing chat
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && !chatTitle) {
      const firstUser = initialMessages.find((m) => m.role === "user");
      if (firstUser) {
        const raw = firstUser.content.length > 100 ? firstUser.content.slice(0, 100) : firstUser.content;
        setChatTitle(raw.length > 40 ? raw.slice(0, 40) + "..." : raw);
      }
    }
  }, [initialMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Persist messages to history whenever they change
  useEffect(() => {
    if (!isIncognito && chatId && messages.length > 0) {
      updateChatMessages(chatId, messages);
    }
  }, [messages, chatId, updateChatMessages, isIncognito]);

  // Subscribe to new messages from Supabase Realtime
  useEffect(() => {
    if (isIncognito || !chatId || !user) return;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add AI messages (user messages are added immediately in handleSend)
          if (newMsg.role === "assistant") {
            const chatMsg: ChatMessageType = {
              id: newMsg.id,
              role: "assistant",
              content: newMsg.content || "",
              timestamp: new Date(newMsg.created_at),
              imageUrl: newMsg.image_url || undefined,
              toolId: newMsg.metadata?.toolId,
            };
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === chatMsg.id)) return prev;
              return [...prev, chatMsg];
            });
            setNewMessageIds((prev) => new Set(prev).add(newMsg.id));
            setIsTyping(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, isIncognito]);

  /** Runs a backend job and keeps one assistant message in this chat updated with its live status. */
  const runInlineJob = useCallback(async (type: "project_generate" | "code_export" | "agent_task", input: Record<string, unknown>, sessionId: string | null, files?: File[]) => {
    const jobId = crypto.randomUUID();
    const msgId = `job-${jobId}`;
    const intro = type === "project_generate" ? "Building your project. Progress, files and the ZIP download will appear here." : type === "agent_task" ? "Working on it. Each step, its results and any downloads will appear here." : "Writing your file. The download will appear here.";
    trackJob(jobId, true);
    const show = (job: import("@/lib/builder/statuses").JobView) => setMessages((prev) => {
      const content = job.status === "failed" || job.status === "timed_out" ? `That didn't work: ${job.error ?? "unknown error"}` : job.status === "cancelled" ? "Task cancelled." : intro;
      const msg: ChatMessageType = { id: msgId, role: "assistant", content, timestamp: new Date(), job };
      return prev.some((m) => m.id === msgId) ? prev.map((m) => (m.id === msgId ? msg : m)) : [...prev, msg];
    });
    try { await runJob(type, files ? { files, prompt: String(input.prompt ?? ""), sessionId } : { input, sessionId }, show, jobId); }
    catch (e: any) { trackJob(jobId, false); setMessages((prev) => [...prev.filter((m) => m.id !== msgId), { id: msgId, role: "assistant", content: `Sorry, that task couldn't start: ${e.message}`, timestamp: new Date() }]); }
  }, [trackJob]);

  // Restore this conversation's backend tasks (after a refresh or when the chat gets its own address).
  useEffect(() => {
    if (isIncognito || !chatId) return;
    let cancelled = false;
    listJobs(chatId).then((jobs) => {
      if (cancelled || !jobs.length) return;
      for (const j of jobs) if (!isTerminal(j.status)) trackJob(j.id, true);
      setMessages((prev) => {
        const have = new Set(prev.map((m) => m.job?.id).filter(Boolean));
        const missing = jobs.filter((j) => !have.has(j.id)).map((j): ChatMessageType => ({
          id: `job-${j.id}`, role: "assistant", timestamp: new Date(j.createdAt), job: j,
          content: j.status === "failed" || j.status === "timed_out" ? `That didn't work: ${j.error ?? "unknown error"}` : j.type === "zip_analyze" ? `Analysis of **${j.result?.fileName ?? "your ZIP"}**` : j.type === "project_generate" ? "Here's your project." : j.type === "agent_task" || j.type === "runtime_task" ? "Here's the result." : "Here's your file.",
        }));
        if (!missing.length) return prev;
        // A task starts the instant its question is sent, but older chats saved the question a moment later
        // (after a short save delay), so a task may look slightly older than its own question.
        // Place each task after the question that triggered it: allow a few seconds of slack.
        const SLACK = 8000;
        const key = (m: ChatMessageType) => new Date(m.timestamp).getTime() + (m.job ? SLACK : 0);
        console.log("JOBMERGE", JSON.stringify([...prev, ...missing].map((m) => [m.role, String(m.timestamp), !!m.job])));
        return [...prev, ...missing].map((m, i) => ({ m, i })).sort((a, b) => key(a.m) - key(b.m) || a.i - b.i).map((x) => x.m);
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [chatId, isIncognito, trackJob]);

  // Follow running tasks so the send button knows when everything has finished.
  useEffect(() => {
    if (!activeJobs.size) return;
    const t = window.setInterval(() => {
      for (const id of activeJobs) fetchJob(id).then((j) => { if (!j || isTerminal(j.status)) trackJob(id, false); }).catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(t);
  }, [activeJobs, trackJob]);

  /** Stops whatever is running: the streaming reply and every running task in this chat. */
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setIsTyping(false);
    for (const id of activeJobs) cancelJob(id).catch(() => undefined).finally(() => trackJob(id, false));
  }, [activeJobs, trackJob]);

  const handleSend = useCallback(async (content: string, imageData?: { base64: string; mimeType: string }, taskMode?: ChatMode) => {
    if (creationMode) {
      setCreationError(AI_FEATURE_UNAVAILABLE);
      return;
    }
    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      toolId: tool?.id,
      imageUrl: imageData ? `data:${imageData.mimeType};base64,${imageData.base64}` : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Private chats get real AI replies but never create saved rows or background jobs.
    if (isIncognito) {
      setIsTyping(true);
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      try {
        const reply = await streamChat(history, () => {}, tool?.id, { mode: taskMode });
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply || "I couldn't come up with an answer.", timestamp: new Date() }]);
      } catch (e: any) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `Sorry, an error occurred: ${e.message}`, timestamp: new Date() }]);
      }
      setIsTyping(false);
      return;
    }

    // Detect phase from content
    const phase = detectPhase(content, tool?.id);
    setThinkingPhase("thinking"); // Always start with thinking
    setIsTyping(true);

    // Save first message as chat history entry
    let sessionId = chatId;
    if (!chatId) {
      const rawTitle = content.length > 100 ? content.slice(0, 100) : content;
      const title = rawTitle.length > 40 ? rawTitle.slice(0, 40) + "..." : rawTitle;
      const newId = addChat(title, content, tool?.id);
      sessionId = newId;
      setChatId(newId);
      setChatTitle(title);
      onChatCreated?.(newId);
    }

    // Transition from "thinking" to the detected work phase after a delay
    const phaseTimer = window.setTimeout(() => {
      setThinkingPhase(phase);
    }, 1200);
    let fetchPhaseTimer: number | undefined;
    let researchPhaseTimer: number | undefined;

    const clearPhaseTimers = () => {
      clearTimeout(phaseTimer);
      if (fetchPhaseTimer) clearTimeout(fetchPhaseTimer);
      if (researchPhaseTimer) clearTimeout(researchPhaseTimer);
    };

    // Story Creation mode detection — runs before image/video/agent so "create a story" routes here
    const isStoryRequest = /\b(create|generate|make|write|build|i\s*want\s*to\s*make)\b.{0,20}\b(story|tale|narrative)\b/i.test(content)
      || /\b(horror|emotional|motivational|thriller|romance|mystery|fantasy|sci.?fi|comedy|drama)\s+story\b/i.test(content);
    if (isStoryRequest) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Let's create your story. Fill in the details below — I'll handle the script, characters, scenes, prompts, and image generation.",
        timestamp: new Date(),
        story: { initialPrompt: content },
      }]);
      clearTimeout(phaseTimer);
      setIsTyping(false);
      return;
    }

    // Designer mode: detect if it's a UI/web design request vs image generation
    const isUIDesign = false && /\b(ui|ux|website|web\s*app|mobile\s*app|landing\s*page|dashboard|layout|wireframe|mockup|prototype|interface|screen|page\s*design|app\s*design|redesign)\b/i.test(content);
    const isImageGen = tool?.id === "image-generator" || /\b(generate|create|make|draw|design)\b.*\b(image|picture|photo|illustration|graphic|visual|thumbnail|art|logo|icon|banner|poster|flyer|infographic|meme)\b/i.test(content);
    const detectedRatio = detectAspectRatio(content);
    const isImageToImage = imageData && isImageGen;

    // UI/Web design → route to code generator with design-focused prompt
    if (isUIDesign) {
      try {
        const designPrompt = `You are a world-class UI/UX designer. Design and build: ${content}. Focus on: stunning visual design, modern UI patterns, smooth animations, responsive layout, proper spacing, beautiful typography, and cohesive color palette. Make it production-quality and pixel-perfect.`;
        dispatchBgTask("code", { prompt: designPrompt, quality: "production" }, chatId || undefined).catch(() => {});
        const resp = await fetch(CODE_GEN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: designPrompt }],
            quality: "production",
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Design generation failed");

        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.explanation || "Here's your UI design!",
          timestamp: new Date(),
          webApp: {
            files: data.files,
            framework: data.framework,
            dependencies: data.dependencies || {},
            entryPoint: data.entryPoint || "index.html",
            explanation: data.explanation || "",
            quality: "production",
          },
        }]);
      } catch (e: any) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, design generation failed: ${e.message}`,
          timestamp: new Date(),
        }]);
      }
      clearTimeout(phaseTimer);
      setIsTyping(false);
      return;
    }

    if (isImageToImage) {
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-to-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            image: imageData.base64,
            mimeType: imageData.mimeType,
            instruction: content,
            aspect_ratio: detectedRatio,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Image generation failed");

        const firstImg = data.images?.[0];
        const imageUrl = firstImg?.base64
          ? `data:image/png;base64,${firstImg.base64}`
          : firstImg?.url || (typeof firstImg === "string" ? firstImg : undefined);

        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Here is your generated image based on the reference. Prompt used: ${data.prompt || "optimized prompt"}`,
          timestamp: new Date(),
          toolId: tool?.id,
          imageUrl,
        }]);
      } catch (e: any) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, image generation failed: ${e.message}`,
          timestamp: new Date(),
        }]);
      }
      clearTimeout(phaseTimer);
      setIsTyping(false);
      return;
    }

    if (isImageGen && !imageData) {
      try {
        dispatchBgTask("image", { prompt: content, aspect_ratio: detectedRatio }, chatId || undefined).catch(() => {});
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: content, aspect_ratio: detectedRatio, model: "flux" }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Image generation failed");

        const firstImg = data.images?.[0];
        const imageUrl = firstImg?.base64
          ? `data:image/png;base64,${firstImg.base64}`
          : firstImg?.url || (typeof firstImg === "string" ? firstImg : undefined);

        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Here is your generated image!",
          timestamp: new Date(),
          toolId: tool?.id,
          imageUrl,
        }]);
      } catch (e: any) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, image generation failed: ${e.message}`,
          timestamp: new Date(),
        }]);
      }
      clearTimeout(phaseTimer);
      setIsTyping(false);
      return;
    }

    // Tool requests (documents, PDFs, data, charts, QR, security, math, web pages) run as a backend agent task.
    const isToolTask = (!taskMode || taskMode === "default") && (
      /\b(qr\s*code|barcode|code ?128|code ?39|ean-?13|ean-?8|upc-?[ae]|sha-?(1|256|384|512)|checksum|hash of|base64|jwt|uuid|generate (a )?password|strong password|unit conver|convert \d|calculate|chart|bar graph|line graph|pie chart|diagram|flowchart|mermaid|gantt|word document|\.docx|docx|epub|e-?book|fetch (the )?(page|url|website)|scrape|extract (text|links)|validate (these|this|the)|redact|privacy scan|yaml|json to csv|csv to json)\b/i.test(content)
      || (/\b(create|make|generate|write|export|save|convert)\b/i.test(content) && /\b(pdf|docx|word|epub|excel|xlsx|spreadsheet|csv)\b/i.test(content))
      || /https?:\/\/\S+/.test(content) && /\b(summari[sz]e|extract|fetch|read|save|convert)\b/i.test(content));
    if (isToolTask) {
      clearPhaseTimers();
      setIsTyping(false);
      await runInlineJob("agent_task", { prompt: content }, sessionId);
      return;
    }

    // Agent mode: web apps & games (2D/3D) builder detection
    const isAgent = (!taskMode || taskMode === "default") && /\b(build|create|make|generate)\b.*\b(web\s*app|website|landing\s*page|dashboard|portfolio|SPA|single.page.app|game|2d|3d|platformer|rpg|puzzle|arcade|shooter|racing|runner|fighting|tower.defense|card.game|tetris|snake|pong|breakout|flappy|chess|checkers|fps|open.world|sandbox|survival|roguelike|roguelite|metroidvania|beat.em.up|rhythm|simulation|strategy|mmorpg|moba|battle.royale)\b/i.test(content);

    if (isAgent) {
      // Built on the server as a tracked job; progress, files and the ZIP download appear in this message.
      clearPhaseTimers();
      setIsTyping(false);
      await runInlineJob("project_generate", { prompt: content }, sessionId);
      return;
    }

    // File creation detection — user wants AI to create/write a file
    const fileFormatMatch = content.match(/\b(?:as|in|to|into)\s+(?:a\s+)?\.?(txt|pdf|md|html|css|csv|json|xml|js|ts|py|sql|yaml|toml|sh|bat|rtf|log|ini|cfg|env|xlsx|xls)\b/i)
      || content.match(/\.?(txt|pdf|md|html|css|csv|json|xml|js|ts|py|sql|yaml|toml|sh|bat|rtf|xlsx|xls)\s+(?:file|format|document)/i)
      || content.match(/\b(excel|spreadsheet|sheet|workbook)\b/i);
    const isFileCreate = /\b(write|create|generate|make|draft|compose|prepare)\b.*\b(file|document|script|letter|resume|report|essay|article|blog|story|poem|contract|invoice|receipt|plan|outline|notes|summary|readme|changelog|license|config|template|list|schedule|agenda|minutes|proposal|brief|spec|documentation|manual|guide|tutorial|faq|terms|policy|privacy|spreadsheet|sheet|excel|workbook|budget|ledger|tracker|timesheet|roster|inventory|catalog|database|table)\b/i.test(content)
      || /\b(save|export|download)\b.*\b(as|to|into)\b.*\b(txt|pdf|md|html|csv|json|xml|xlsx|xls|excel|file)\b/i.test(content)
      || /\b(write|create)\b.*\b(txt|pdf|md|html|csv|json|xml|xlsx|xls)\b/i.test(content)
      || /\b(create|make|generate|build)\b.*\b(excel|spreadsheet|sheet|workbook)\b/i.test(content);

    const codeFmt = fileFormatMatch?.[1]?.toLowerCase();
    if (isFileCreate && codeFmt && ["js", "ts", "py", "sql", "sh", "bat", "html", "css", "json", "yaml", "toml", "xml"].includes(codeFmt)) {
      clearPhaseTimers();
      setIsTyping(false);
      await runInlineJob("code_export", { prompt: content, language: codeFmt }, sessionId);
      return;
    }

    if (isFileCreate && !isAgent) {
      // Documents are written on the server by the task agent; the file and download appear in this message.
      const fmMatch = fileFormatMatch?.[1]?.toLowerCase();
      const isExcelKeyword = /\b(excel|spreadsheet|sheet|workbook)\b/i.test(content);
      const detectedFormat = isExcelKeyword && (!fmMatch || ["excel","spreadsheet","sheet","workbook"].includes(fmMatch)) ? "xlsx" : (fmMatch || "");
      clearPhaseTimers();
      setIsTyping(false);
      await runInlineJob("agent_task", { prompt: detectedFormat ? `${content}\n\n(Save the result as a .${detectedFormat} file.)` : content }, sessionId);
      return;
    }

    // TTS / Voiceover detection
    const isTTS = /\b(voice\s*over|voiceover|tts|text[\s-]*to[\s-]*speech|narrat|read\s*aloud|speak\s*this|audio\s*of|convert\s*to\s*(speech|audio|voice)|generate\s*(voice|audio|speech|narration))\b/i.test(content);
    if (isTTS) {
      // Extract the script — everything after intent words, or use full content
      let ttsScript = content
        .replace(/\b(create|make|generate|do|please|can you|could you)\b/gi, "")
        .replace(/\b(voice\s*over|voiceover|tts|text[\s-]*to[\s-]*speech|narration|audio|speech|voice)\b/gi, "")
        .replace(/\b(of|for|from|the|this|following|script|text|in|mp3|wav|ogg|format)\b/gi, "")
        .replace(/[:"""]/g, "")
        .trim();

      // If cleaned script is too short, use full content as script
      if (ttsScript.length < 10) ttsScript = content;

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Here's your voiceover generator. Select a voice, format, and click generate:`,
        timestamp: new Date(),
        ttsScript: ttsScript,
      }]);

      clearTimeout(phaseTimer);
      setIsTyping(false);
      return;
    }

    // AI Video editing / generation detection
    const isVideoEdit = /\b(edit|cut|trim|crop|add\s*(text|music|filter|transition|overlay|effect)|change\s*(speed|timing|pacing)|slow\s*mo|speed\s*up|reorder|split|delete\s*scene|regenerate|re-?render|improve\s*video|enhance\s*video|make\s*(it|the\s*video)\s*(better|shorter|longer|faster|slower)|analyz|check\s*quality|visual\s*consistency|quality\s*check)\b/i.test(content);
    const isVideoCreation = /\b(create|make|generate|produce)\b.*\b(video|short|reel|tiktok|clip|documentary|youtube|essay|explainer)\b.*\b(about|on|for|of)\b/i.test(content)
      || /\b(short[\s-]*form|short|long[\s-]*form|long)\b.*\b(video|content)\b/i.test(content)
      || /\b(create|make|generate)\b.*\b(video)\b/i.test(content);

    if (isVideoCreation || isVideoEdit) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isVideoCreation
          ? `Processing your video request...`
          : `Applying your edits...`,
        timestamp: new Date(),
        videoEdit: {
          userMessage: content,
          isNewProject: isVideoCreation,
        },
      }]);

      clearTimeout(phaseTimer);
      setIsTyping(false);
      return;
    }

    // Stock footage search for video mode
    const isVideoSearch = /\b(stock\s*(footage|video|clip)|b[\s-]*roll|video\s*clip)\b/i.test(content);
    if (isVideoSearch) {
      try {
        // Extract search query - use Gemini to parse intent or fall back to content
        const searchQuery = content.replace(/\b(find|search|get|show|stock|footage|video|clip|b[\s-]*roll)\b/gi, "").trim() || content;

        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pexels-videos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ query: searchQuery, per_page: 6 }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Stock footage search failed");

        const videos = data.videos || [];
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: videos.length > 0
            ? `Found ${data.total_results} stock videos for "${searchQuery}". Here are the top results:`
            : `No stock footage found for "${searchQuery}". Try a different search term.`,
          timestamp: new Date(),
          videos: videos.length > 0 ? videos : undefined,
        }]);
      } catch (e: any) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, stock footage search failed: ${e.message}`,
          timestamp: new Date(),
        }]);
      }
      clearTimeout(phaseTimer);
      setIsTyping(false);
      return;
    }

    // Multi-step agent detection — complex requests with multiple tasks
    const isMultiStep = /\b(and then|then|also|plus|after that|next|finally|step\s*\d|1\.|2\.|3\.)\b/i.test(content)
      && content.length > 80
      && (content.match(/\b(generate|create|make|write|build|design)\b/gi) || []).length >= 2;

    if (isMultiStep) {
      try {
        dispatchBgTask("agent", { prompt: content }, chatId || undefined).catch(() => {});
        const resp = await fetch(AGENT_PLANNER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: content }),
        });
        const plan = await resp.json();
        if (!resp.ok) throw new Error(plan.error || "Planning failed");

        if (plan.steps?.length > 1) {
          setMessages((prev) => [...prev, {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `🚀 **${plan.title}** — Executing ${plan.steps.length} steps...`,
            timestamp: new Date(),
            agentPlan: plan,
          }]);
          clearTimeout(phaseTimer);
          setIsTyping(false);
          return;
        }
        // If planner returned only 1 step, fall through to regular handling
      } catch (e: any) {
        console.warn("Agent planner failed, falling through to regular chat:", e.message);
        // Fall through to regular chat
      }
    }

    // Website analysis detection — user pasted a URL to analyze
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/i;
    const hasUrl = urlPattern.test(content);
    const isWebAnalysis = hasUrl && (
      /\b(analy[sz]e|check|review|inspect|scan|audit|examine|tell\s*me\s*about|what\s*is|details?\s*(about|of|on)|info(rmation)?\s*(about|of|on)|describe|explain|overview|look\s*at|visit|open|show\s*me|about\s*this|what.*website|website.*what)\b/i.test(content)
      || content.replace(urlPattern, "").trim().length < 30
    );

    if (isWebAnalysis) {
      clearTimeout(phaseTimer);
      fetchPhaseTimer = window.setTimeout(() => setThinkingPhase("fetching"), 1200);
      researchPhaseTimer = window.setTimeout(() => setThinkingPhase("researching"), 3500);
    }

    // Regular chat - send to backend, response will come via Realtime
    try {
      const chatMessages = messages
        .filter((m) => !m.imageUrl || m.role === "user")
        .map((m) => {
          if (m.imageUrl && m.role === "user") {
            return {
              role: "user",
              content: [
                { type: "text", text: m.content },
                { type: "image_url", image_url: { url: m.imageUrl } },
              ],
            };
          }
          return { role: m.role, content: m.content };
        });

      if (imageData) {
        chatMessages.push({
          role: "user",
          content: [
            { type: "text", text: content },
            { type: "image_url", image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } },
          ],
        });
      } else {
        chatMessages.push({ role: "user", content });
      }

      const replyId = crypto.randomUUID();
      let started = false;
      let meta: { executionMode: string; output: string } = { executionMode: "default", output: "chat" };
      const ctrl = new AbortController();
      abortRef.current = ctrl; setStreaming(true);
      const finalText = await streamChat(chatMessages, (full) => {
        const visible = full.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trimStart();
        if (!visible) return;
        if (!started) { started = true; clearTimeout(phaseTimer); setIsTyping(false); }
        setMessages((prev) => prev.some((m) => m.id === replyId)
          ? prev.map((m) => (m.id === replyId ? { ...m, content: visible } : m))
          : [...prev, { id: replyId, role: "assistant", content: visible, timestamp: new Date(), toolId: tool?.id }]);
      }, tool?.id, { mode: taskMode, onMeta: (m) => { meta = m; }, signal: ctrl.signal }).finally(() => { if (abortRef.current === ctrl) abortRef.current = null; setStreaming(false); });
      const stopped = ctrl.signal.aborted;
      const replyText = finalText || (stopped ? "Stopped." : "I couldn't come up with an answer. Please try again.");
      let reply: ChatMessageType = { id: replyId, role: "assistant", content: replyText, timestamp: new Date(), toolId: tool?.id, executionMode: meta.executionMode };
      // Research reports become a saved document shown as a compact card (saved once per reply).
      if (meta.output === "document" && finalText) {
        try {
          const title = finalText.match(/^#\s+(.+)$/m)?.[1]?.trim() || content.slice(0, 80);
          reply = { ...reply, document: await saveDocumentFn({ data: { title, content: finalText } }) };
        } catch { /* keep the report as a normal chat reply */ }
      }
      setMessages((prev) => prev.some((m) => m.id === replyId)
        ? prev.map((m) => (m.id === replyId ? reply : m))
        : [...prev, reply]);
      clearTimeout(phaseTimer);
      setIsTyping(false);
      // Save the reply even if this screen was replaced while it streamed.
      if (sessionId) updateChatMessages(sessionId, [...messages, userMsg, reply]);
    } catch (e: any) {
      if (e?.name === "AbortError") { clearTimeout(phaseTimer); setIsTyping(false); return; }
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, an error occurred: ${e.message}`,
        timestamp: new Date(),
      }]);
      clearTimeout(phaseTimer);
      setIsTyping(false);
    }
  }, [tool, chatId, addChat, messages, updateChatMessages, dispatchBgTask, isIncognito, creationMode]);

  /** Attached documents/data/audio plus an instruction → one backend agent task in this chat. */
  const handleSendFiles = useCallback(async (content: string, files: File[]) => {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: `${content}\n\n📎 ${files.map((f) => f.name).join(", ")}`, timestamp: new Date() }]);
    let sid: string | null = isIncognito ? null : chatId;
    if (!isIncognito && !chatId) {
      const title = content.slice(0, 60) || files[0].name;
      sid = addChat(title, content.slice(0, 120), tool?.id);
      setChatId(sid); setChatTitle(title); onChatCreated?.(sid);
    }
    await runInlineJob("agent_task", { prompt: content }, sid, files);
  }, [chatId, addChat, tool, isIncognito, runInlineJob]);

  const handleZipUpload = useCallback(async (file: File) => {
    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: `Uploaded ZIP file: ${file.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setThinkingPhase("thinking");

    let zipSession: string | null = isIncognito ? null : chatId;
    if (!isIncognito && !chatId) {
      const title = `ZIP: ${file.name}`;
      const newId = addChat(title, `Uploaded ${file.name}`, tool?.id);
      zipSession = newId;
      setChatId(newId);
      setChatTitle(title);
      onChatCreated?.(newId);
    }

    // Analysis runs on the server as a tracked job; the card shows its real status.
    const zipJobId = crypto.randomUUID();
    const msgId = `job-${zipJobId}`;
    trackJob(zipJobId, true);
    const show = (job: import("@/lib/builder/statuses").JobView) => setMessages((prev) => {
      const content = job.status === "failed" ? `Couldn't analyze **${file.name}**: ${job.error ?? "unknown error"}` : `Analysis of **${file.name}**`;
      const msg = { id: msgId, role: "assistant" as const, content, timestamp: new Date(), job };
      return prev.some((m) => m.id === msgId) ? prev.map((m) => (m.id === msgId ? msg : m)) : [...prev, msg];
    });
    setIsTyping(false);
    try {
      await runJob("zip_analyze", { file, sessionId: zipSession }, show, zipJobId);
    } catch (e: any) {
      setMessages((prev) => [...prev.filter((m) => m.id !== msgId), { id: msgId, role: "assistant", content: `Couldn't analyze the ZIP: ${e.message}`, timestamp: new Date() }]);
    }
    setIsTyping(false);
  }, [chatId, addChat, tool, isIncognito]);

  const handleFileConvert = useCallback((file: File) => {
    const cat = getCategory(file);
    if (!cat) return;

    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: `Convert file: ${file.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    if (!isIncognito && !chatId) {
      const title = `Convert: ${file.name}`;
      const newId = addChat(title, `Convert ${file.name}`, tool?.id);
      setChatId(newId);
      setChatTitle(title);
      onChatCreated?.(newId);
    }

    setMessages((prev) => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Here's the file converter for **${file.name}**. Select your target format and click convert:`,
      timestamp: new Date(),
      convertFile: file,
    }]);
  }, [chatId, addChat, tool, isIncognito]);

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  const hasMessages = messages.length > 0;
  const defaultTitle = tool ? tool.shortName : "Vision";
  
  // Truncate display title to ~2-3 words with ellipsis
  const displayTitle = chatTitle
    ? chatTitle.length > 30 ? chatTitle.slice(0, 30) + "…" : chatTitle
    : defaultTitle;

  return (
    <div className="flex flex-col h-full flex-1 min-w-0">
      <header className="relative flex shrink-0 items-center gap-3 bg-transparent px-3 py-1.5 sm:px-4 sm:py-2">
        <Button variant="secondary" size="icon" aria-label="Open sidebar" title="Open sidebar"
          onClick={onMenuClick}
          className="rounded-full text-foreground lg:hidden [&_svg]:size-[22px]"
        >
          <Menu className="w-[22px] h-[22px]" />
        </Button>
        <Button variant="secondary" size="icon" className="rounded-full [&_svg]:size-5" aria-label="Upgrade Plan" title="Upgrade Plan" onClick={() => navigate("/billing/plans")}>
          <Crown />
        </Button>
        {!isIncognito && chatId && messages.length > 0 ? (
          <ChatActionsMenu chatId={chatId} onNewChat={() => navigate(creationMode === "images" ? "/images" : creationMode === "videos" ? "/videos" : "/chat")} />
        ) : (
        <Button variant={isIncognito ? "default" : "secondary"} size="icon" className="ml-auto shrink-0 rounded-full transition-colors [&_svg]:size-5" aria-label={isIncognito ? "Turn off incognito" : "Turn on incognito"} title={isIncognito ? "Incognito on — tap to turn off" : "Incognito off — tap to turn on"} aria-pressed={isIncognito} onClick={onIncognitoChat}>
          <IncognitoIcon />
        </Button>
        )}
      </header>

      <AnnouncementBanner />
      {isIncognito && (
        <p className="flex items-center justify-center gap-1.5 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
          <IncognitoIcon className="h-3.5 w-3.5" /> Incognito on — this chat won't be saved
        </p>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">

        {hasMessages ? (
          <div className="py-3">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isNew={newMessageIds.has(msg.id)}
              />
            ))}
            {isTyping && <TypingIndicator phase={thinkingPhase} />}
          </div>
        ) : (
          creationMode ? <CreationEmptyState mode={creationMode} onPromptClick={(prompt) => handleSend(prompt)} /> : <EmptyState tool={tool} onPromptClick={(prompt) => handleSend(prompt)} />
        )}
      </div>

      {creationError && <p role="alert" className="mx-auto max-w-2xl px-4 pb-2 text-center text-sm text-destructive">{creationError}</p>}
      <ChatInput creationMode={creationMode} toolName={tool?.shortName} onSend={handleSend} onZipUpload={creationMode ? undefined : handleZipUpload} onFileConvert={creationMode ? undefined : handleFileConvert} onSendFiles={creationMode ? undefined : handleSendFiles} disabled={isTyping} busy={isTyping || streaming || activeJobs.size > 0} onStop={handleStop} />
    </div>
  );
};

export default ChatWorkspace;
