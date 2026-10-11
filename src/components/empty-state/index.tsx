import { ArrowUpRight, Brain, Code2, Image } from "lucide-react";
import type { AITool } from "@/lib/types";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";

type Props = {
  tool?: AITool;
  onPromptClick: (prompt: string) => void;
};

const suggestions = [
  { icon: Brain, label: "Can you help me explore a new idea?", prompt: "Can you help me explore a new idea?" },
  { icon: Code2, label: "How can I build my own website?", prompt: "How can I build my own website?" },
  { icon: Image, label: "Can you create an image for me?", prompt: "Can you create an image for me?" },
];

const EmptyState = ({ tool, onPromptClick }: Props) => {
  const prompts = tool ? tool.samplePrompts.slice(0, 3) : suggestions;
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-5 py-6 animate-fade-up">
      <img src={logo} alt="Vision" className="mb-5 size-16 shrink-0 rounded-full object-cover sm:size-20" />
      <h2 className="mb-6 text-center font-display text-lg font-semibold text-foreground sm:text-xl">
        {tool?.emptyStateTitle || "What can I help you with?"}
      </h2>
      <div aria-label="Suggested questions" className="grid w-full max-w-md gap-2">
        {prompts.map((item) => (
          <Button key={item.prompt} variant="outline" onClick={() => onPromptClick(item.prompt)} className="h-auto min-h-11 justify-start gap-3 rounded-lg px-4 py-3 text-left whitespace-normal">
            <item.icon className="shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm">{item.label}</span>
            <ArrowUpRight className="shrink-0 text-muted-foreground" />
          </Button>
        ))}
      </div>
    </div>
  );
};

export default EmptyState;
