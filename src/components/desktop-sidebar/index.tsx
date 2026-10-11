import { cn } from "@/lib/utils";
import { recentChats } from "@/lib/recent-chats";
import { Search, Pencil, Trash2, Check, X, Pin } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { useState } from "react";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { Button } from "@/components/ui/button";
import SidebarActions from "@/components/sidebar-actions";
import SidebarFeatures from "@/components/sidebar-features";

type Props = {
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  isMainChat: boolean;
  activeChatId?: string;
  chatHistory: { id: string; title: string; toolId?: string; preview: string; date: string; createdAt: number; projectId?: string | null; pinned?: boolean }[];
};

const DesktopSidebar = ({ onNewChat, onSelectChat, isMainChat, activeChatId, chatHistory }: Props) => {
  const navigate = useNavigate();
  const { renameChat, deleteChat } = useChatHistory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  

  const displayHistory = recentChats(chatHistory);

  const startRename = (chat: { id: string; title: string }) => {
    setEditingId(chat.id);
    setEditValue(chat.title);
  };

  const confirmRename = () => {
    if (editingId && editValue.trim()) {
      renameChat(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="hidden lg:flex flex-col w-[260px] bg-sidebar border-r border-sidebar-border h-full min-h-0 shrink-0">
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-4">
        <span className="flex-1 font-display font-semibold text-foreground text-xl tracking-tight">Vision</span>
        <Button variant="secondary" size="icon" className="shrink-0 rounded-full [&_svg]:size-5" aria-label="Open search" title="Search" onClick={() => navigate("/search")}><Search /></Button>
      </div>

      <SidebarFeatures />

      {displayHistory.length > 0 && (
        <div className="px-3 pt-4 pb-2 min-h-0 flex-1 overflow-y-auto">
          <p className="px-3 pb-1.5 text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            Recent
          </p>
          <nav className="space-y-0.5">
            {displayHistory.map((chat) => (
              <div key={chat.id} className="group relative">
                {editingId === chat.id ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setEditingId(null); }}
                      className="flex-1 px-2 py-1 rounded text-sm bg-sidebar-accent text-sidebar-foreground outline-none border border-primary/40"
                    />
                    <button onClick={confirmRename} className="p-1 rounded text-primary hover:bg-sidebar-accent">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 rounded text-muted-foreground hover:bg-sidebar-accent">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <button
                      onClick={() => onSelectChat(chat.id)}
                      className={cn(
                        "flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors truncate flex items-center gap-2",
                        activeChatId === chat.id
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      {activeChatId === chat.id && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                      )}
                      <span className="truncate">{chat.title}</span>{chat.pinned && <Pin className="ml-auto size-3 shrink-0 text-muted-foreground" />}
                    </button>
                    <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
                      <button onClick={() => startRename(chat)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteChat(chat.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}
      <SidebarActions onNewChat={onNewChat} />
    </aside>
  );
};

export default DesktopSidebar;
