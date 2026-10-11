import { useState, useCallback, useEffect, useRef, useMemo, forwardRef } from "react";
import type { ChatMessage as ChatMessageType, StockVideo } from "@/lib/types";
import { Copy, Check, Play, ExternalLink, Download, Volume2, VolumeX, ThumbsUp, ThumbsDown, Flag, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import VideoGenerationCard from "@/components/video-generation-card";
import VideoEditorCard from "@/components/video-editor-card";
import WebAppPreviewCard from "@/components/web-app-preview-card";
import ZipAnalysisCard from "@/components/zip-analysis-card";
import JobCard from "@/components/job-card";
import FileConverterCard from "@/components/file-converter-card";
import TTSCard from "@/components/tts-card";
import FileCreatorCard from "@/components/file-creator-card";
import AgentProgressCard from "@/components/agent-progress-card";
import StoryFlowCard from "@/components/story/story-flow-card";
import CodeBlock from "@/components/chat/code-block";
import DocumentCard from "@/components/chat/document-card";

type Props = { message: ChatMessageType; isNew?: boolean };

const getMessageSize = (content: string) => {
  if (content.length < 60) return "short";
  if (content.length < 200) return "medium";
  return "long";
};

const proseClasses = [
  "[&_p]:leading-[1.7] [&_p]:mb-2.5",
  "[&_li]:leading-[1.7]",
  "[&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-5 [&_h1]:mb-2",
  "[&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2",
  "[&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5",
  "[&_strong]:text-foreground [&_strong]:font-semibold",
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/40 hover:[&_a]:decoration-primary",
  "[&_code]:bg-accent [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[13px] [&_code]:font-mono",
  /* pre/code blocks handled by custom CodeBlock component */
  "[&_pre]:my-0",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px]",
  "[&_blockquote]:border-l-[3px] [&_blockquote]:border-foreground/15 [&_blockquote]:pl-4 [&_blockquote]:py-0.5 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 [&_blockquote]:bg-accent/50 [&_blockquote]:rounded-r-lg [&_blockquote]:pr-3",
  "[&_table]:border-collapse [&_table]:w-full [&_table]:my-3 [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:border [&_table]:border-border",
  "[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-accent [&_th]:text-xs [&_th]:font-semibold [&_th]:text-left [&_th]:uppercase [&_th]:tracking-wider",
  "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm",
  "[&_tr:hover]:bg-accent/30",
  "[&_ul]:space-y-1.5 [&_ul]:my-2 [&_ul]:pl-1",
  "[&_ol]:space-y-1.5 [&_ol]:my-2 [&_ol]:pl-1",
  "[&_li]:pl-1",
  "[&_hr]:border-border [&_hr]:my-4",
].join(" ");

/* Custom markdown components with code block copy */
const mdComponents: Components = {
  pre: ({ children }) => <>{children}</>,
  code: ({ children, className, ...props }: any) => {
    const isBlock = className?.startsWith("language-") || String(children).includes("\n");
    if (isBlock) {
      const meta = String(props.node?.data?.meta ?? "");
      const filename = meta.match(/title="([^"]+)"/)?.[1];
      return <CodeBlock code={String(children).replace(/\n$/, "")} language={className?.replace("language-", "") || undefined} filename={filename} />;
    }
    return <code className="bg-accent px-1.5 py-0.5 rounded-md text-[13px] font-mono" {...props}>{children}</code>;
  },
};

/* ── Copy button for task card ── */
const CardCopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/80 bg-accent border border-border transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const NORMAL_CPS = 50;
const TASK_CPS = 180;

/* ── Content splitter ──
   Splits AI content into segments: [text, task, text]
   "task" = the main structured body (story, code, blog, list, etc.)
   Intro/outro are the short plain text before/after.
*/
type Segment = { type: "text" | "task"; content: string };

const splitContent = (raw: string): Segment[] => {
  const lines = raw.split("\n");
  const totalLen = raw.length;

  // Short messages → all text, no card
  if (totalLen < 250) return [{ type: "text", content: raw }];

  // Find where "task" body starts: first heading, code fence, numbered list, or bold line after intro
  let taskStart = -1;
  let taskEnd = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (taskStart === -1) {
      // Detect task body start
      if (/^#{1,3}\s/.test(l) || /^```/.test(l) || /^\d+\.\s/.test(l) || /^\*\*[^*]+\*\*/.test(l) || /^[-*]\s/.test(l)) {
        // Only treat as task if there's enough content after
        const remaining = lines.slice(i).join("\n").length;
        if (remaining > 150) {
          taskStart = i;
        }
      }
    }
  }

  // No task body found → plain text
  if (taskStart === -1) return [{ type: "text", content: raw }];

  // Find task end: scan from bottom for a short plain closing paragraph
  for (let i = lines.length - 1; i > taskStart; i--) {
    const l = lines[i].trim();
    if (l === "") continue;
    // If the last non-empty lines are short plain text (no markdown markers), they're the outro
    if (!/^#{1,3}\s/.test(l) && !/^```/.test(l) && !/^\d+\.\s/.test(l) && !/^[-*]\s/.test(l) && !/^\*\*/.test(l) && l.length < 200) {
      // Check if this is truly a closing remark (short paragraph block)
      let outroStart = i;
      // Walk up to find the start of the outro block (consecutive short plain lines)
      for (let j = i - 1; j > taskStart; j--) {
        const lj = lines[j].trim();
        if (lj === "") { outroStart = j + 1; break; }
        if (/^#{1,3}\s/.test(lj) || /^```/.test(lj) || /^\d+\.\s/.test(lj) || /^[-*]\s/.test(lj) || /^\*\*/.test(lj)) {
          outroStart = j + 1;
          break;
        }
        outroStart = j;
      }
      const outroText = lines.slice(outroStart).join("\n").trim();
      if (outroText.length > 0 && outroText.length < 300) {
        taskEnd = outroStart;
      }
      break;
    } else {
      break; // last content is structured → no outro
    }
  }

  const segments: Segment[] = [];
  const preText = lines.slice(0, taskStart).join("\n").trim();
  const taskText = lines.slice(taskStart, taskEnd).join("\n").trim();
  const postText = lines.slice(taskEnd).join("\n").trim();

  if (preText) segments.push({ type: "text", content: preText });
  if (taskText) segments.push({ type: "task", content: taskText });
  if (postText) segments.push({ type: "text", content: postText });

  return segments.length > 0 ? segments : [{ type: "text", content: raw }];
};

/* ── Multi-segment typewriter ──
   Animates segments sequentially: text@50cps → task@200cps → text@50cps
*/
const useSegmentedTypewriter = (segments: Segment[], enabled: boolean) => {
  const [charCounts, setCharCounts] = useState<number[]>(() =>
    enabled ? segments.map(() => 0) : segments.map((s) => s.content.length)
  );
  const [allDone, setAllDone] = useState(!enabled);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  // Precompute timing: each segment starts after the previous finishes
  const timing = useMemo(() => {
    let offset = 0;
    return segments.map((s) => {
      const cps = s.type === "task" ? TASK_CPS : NORMAL_CPS;
      const duration = s.content.length / cps;
      const start = offset;
      offset += duration;
      return { cps, duration, start, len: s.content.length };
    });
  }, [segments]);

  useEffect(() => {
    if (!enabled) {
      setCharCounts(segments.map((s) => s.content.length));
      setAllDone(true);
      return;
    }
    setCharCounts(segments.map(() => 0));
    setAllDone(false);
    startRef.current = performance.now();

    const totalDuration = timing.reduce((a, t) => a + t.duration, 0);

    const animate = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      const counts = timing.map((t) => {
        if (elapsed < t.start) return 0;
        const segElapsed = elapsed - t.start;
        return Math.min(Math.floor(segElapsed * t.cps), t.len);
      });
      setCharCounts(counts);
      if (elapsed < totalDuration) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCharCounts(segments.map((s) => s.content.length));
        setAllDone(true);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [segments, enabled, timing]);

  return { charCounts, allDone };
};

const USER_PREVIEW_CHARS = 50;
const UserBubble = ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
  const [expanded, setExpanded] = useState(false);
  const long = (content || "").length > USER_PREVIEW_CHARS;
  const shown = long && !expanded ? content.slice(0, USER_PREVIEW_CHARS).trimEnd() + "…" : content;
  return (
    <div className="relative max-w-[50%] min-w-0 rounded-2xl rounded-br-sm bg-muted text-foreground px-3.5 py-2 text-[15px]">
      {imageUrl && (
        <img src={imageUrl} alt="Attached" className="w-28 sm:w-36 h-28 sm:h-36 rounded-xl object-cover mb-2.5 border border-background/10" />
      )}
      <p className="leading-relaxed whitespace-pre-wrap break-words">{shown}</p>
      {long && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          {expanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
};

const ChatMessage = forwardRef<HTMLDivElement, Props>(({ message, isNew = false }, ref) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [reported, setReported] = useState(false);
  const { toast } = useToast();
  const mountedRef = useRef(false);

  // Animate on first mount for new AI messages only
  const shouldAnimate = isNew && !isUser && !mountedRef.current;
  useEffect(() => { mountedRef.current = true; }, []);

  const segments = useMemo(() => splitContent(message.content), [message.content]);
  const { charCounts, allDone: typingDone } = useSegmentedTypewriter(segments, shouldAnimate);

  const size = getMessageSize(message.content);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = useCallback(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!("speechSynthesis" in window)) {
      toast({ title: "Not supported", description: "Text-to-speech is not supported in this browser.", variant: "destructive" });
      return;
    }
    const plainText = message.content
      .replace(/```[\s\S]*?```/g, " code block ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[#*_~>\-|]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\n+/g, ". ")
      .trim();
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [speaking, message.content, toast]);

  const handleFeedback = (type: "up" | "down") => {
    setFeedback(prev => prev === type ? null : type);
    toast({
      title: type === "up" ? "Thanks for the feedback!" : "We'll improve",
      description: type === "up" ? "Glad this was helpful." : "Sorry about that. We'll work on it.",
    });
  };

  const handleReport = () => {
    setReported(true);
    toast({ title: "Reported", description: "This response has been flagged for review." });
  };

  // Find which segment is currently animating (for cursor placement)
  const activeSegIdx = shouldAnimate && !typingDone
    ? charCounts.findIndex((c, i) => c < segments[i].content.length)
    : -1;

  return (
    <div
      ref={ref}
      className={cn(
        "px-3 sm:px-4 md:px-6 w-full max-w-2xl mx-auto transition-all duration-300",
        isUser ? "py-1.5" : "py-3",
        isNew && "animate-fade-in"
      )}
    >
      {isUser ? (
        <div className="flex justify-end">
          <UserBubble content={message.content} imageUrl={message.imageUrl} />
        </div>
      ) : (
        <div className="group relative w-full">
          <div className="space-y-3">
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Generated"
                className="max-w-xs sm:max-w-sm w-full rounded-xl border border-border shadow-sm"
              />
            )}

            {/* Render segments: text → task card → text */}
            {message.document && <DocumentCard id={message.document.id} title={message.document.title} />}
            {message.content && !message.document && !(message.job?.type === "code_export" && message.job.status !== "failed") && segments.map((seg, i) => {
              const displayed = seg.content.slice(0, charCounts[i] ?? seg.content.length);
              const isActive = activeSegIdx === i;
              const segVisible = charCounts[i] > 0 || !shouldAnimate;

              if (!segVisible) return null;

              return (
                <div key={i} className="relative w-full will-change-contents">
                  {seg.type === "task" && charCounts[i] >= seg.content.length && (
                    <div className="flex justify-end mb-1"><CardCopyButton content={seg.content} /></div>
                  )}
                  <div className={cn(
                    "prose prose-sm prose-neutral dark:prose-invert max-w-none text-foreground text-[13px] sm:text-sm break-words",
                    proseClasses
                  )}>
                    <ReactMarkdown components={mdComponents}>{displayed}</ReactMarkdown>
                    {isActive && <span className="inline-block w-[2px] h-[1em] bg-foreground/70 align-middle animate-pulse ml-0.5" />}
                  </div>
                </div>
              );
            })}

            {message.videos && message.videos.length > 0 && (
              <VideoGrid videos={message.videos} />
            )}
            {message.videoGeneration && (
              <VideoGenerationCard
                topic={message.videoGeneration.topic}
                duration={message.videoGeneration.duration}
                aspectRatio={message.videoGeneration.aspectRatio}
              />
            )}
            {message.videoEdit && (
              <VideoEditorCard userMessage={message.videoEdit.userMessage} />
            )}
            {message.webApp && (
              <WebAppPreviewCard project={message.webApp} />
            )}
            {message.job && <JobCard job={message.job} />}
            {message.zipAnalysis && (
              <ZipAnalysisCard analysis={message.zipAnalysis} />
            )}
            {message.convertFile && (
              <FileConverterCard file={message.convertFile} />
            )}
            {message.ttsScript && (
              <TTSCard script={message.ttsScript} />
            )}
            {message.generatedFile && (
              <FileCreatorCard file={message.generatedFile} />
            )}
            {message.agentPlan && (
              <AgentProgressCard plan={message.agentPlan} />
            )}
            {message.story && (
              <StoryFlowCard projectId={message.story.projectId} initialPrompt={message.story.initialPrompt} />
            )}

            {/* Action bar */}
            {message.content && typingDone && (
              <div className="flex items-center gap-0.5 pt-1">
                <ActionButton onClick={handleSpeak} active={speaking} title={speaking ? "Stop listening" : "Listen"}>
                  {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </ActionButton>
                <ActionButton onClick={handleCopy} active={copied} title="Copy">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </ActionButton>
                <ActionButton onClick={() => handleFeedback("up")} active={feedback === "up"} title="Good response">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </ActionButton>
                <ActionButton onClick={() => handleFeedback("down")} active={feedback === "down"} title="Bad response">
                  <ThumbsDown className="w-3.5 h-3.5" />
                </ActionButton>
                <ActionButton onClick={handleReport} active={reported} disabled={reported} title="Report">
                  <Flag className="w-3.5 h-3.5" />
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
ChatMessage.displayName = "ChatMessage";
/** Reusable small icon button for action bar */
const ActionButton = ({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "p-1.5 rounded-lg transition-colors",
      active
        ? "text-foreground bg-accent"
        : "text-muted-foreground hover:text-foreground hover:bg-accent",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

const VideoGrid = ({ videos }: { videos: StockVideo[] }) => {
  const [playingId, setPlayingId] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 gap-2">
      {videos.map((video) => (
        <div
          key={video.id}
          className="relative group/vid rounded-xl border border-border overflow-hidden bg-card"
        >
          {playingId === video.id ? (
            <video
              src={video.previewUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full aspect-video object-cover"
              onClick={() => setPlayingId(null)}
            />
          ) : (
            <div
              className="relative cursor-pointer"
              onClick={() => setPlayingId(video.id)}
            >
              <img
                src={video.image}
                alt="Video thumbnail"
                className="w-full aspect-video object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-background/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-foreground ml-0.5" />
                </div>
              </div>
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}
              </span>
            </div>
          )}
          <div className="px-2.5 py-2 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground truncate flex-1">
              by {video.user.name}
            </p>
            <div className="flex items-center gap-1">
              <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Download HD">
                <Download className="w-3.5 h-3.5" />
              </a>
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="View on Pexels">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatMessage;
