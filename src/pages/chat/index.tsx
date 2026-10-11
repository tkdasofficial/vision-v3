import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "@/lib/router-compat";
import type { CreationMode } from "@/lib/creation-references";
import { type AITool } from "@/lib/types";
import { useChatHistory } from "@/context/ChatHistoryContext";
import DesktopSidebar from "@/components/desktop-sidebar";
import MobileSidebar from "@/components/mobile-sidebar";
import ChatWorkspace from "@/components/chat-workspace";

const Index = ({ isIncognito = false, creationMode }: { isIncognito?: boolean; creationMode?: CreationMode }) => {
  const params = useParams<{ chatId: string; imageChatId: string; videoChatId: string }>();
  const urlChatId = params.chatId ?? params.imageChatId ?? params.videoChatId;
  const base = creationMode === "images" ? "/images" : creationMode === "videos" ? "/videos" : "/chat";
  const navigate = useNavigate();
  const { getChatById, history, loadChatMessages } = useChatHistory();

  const [selectedTool, setSelectedTool] = useState<AITool | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  // Starts empty so the effect below loads saved messages when a chat is opened by its address (including reloads).
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);
  const [loadedMessages, setLoadedMessages] = useState<any[] | undefined>(undefined);

  const [loadError, setLoadError] = useState<"not_found" | "unavailable" | null>(null);
  const [opening, setOpening] = useState(false);
  const wanted = useRef<string | undefined>(undefined);
  const justCreated = useRef<string | undefined>(undefined);

  // The address is the source of truth: direct links, refresh, new tabs and Back/Forward all open exactly that chat.
  const openFromUrl = useCallback((id: string) => {
    wanted.current = id;
    setActiveChatId(id);
    setLoadedMessages(undefined);
    setLoadError(null);
    setOpening(true);
    loadChatMessages(id).then((msgs) => {
      if (wanted.current !== id) return; // a newer navigation won
      setLoadedMessages(msgs);
      setChatKey((k) => k + 1);
    }).catch((e: Error) => {
      if (wanted.current !== id) return;
      setLoadError(e.message === "not_found" ? "not_found" : "unavailable");
    }).finally(() => { if (wanted.current === id) setOpening(false); });
  }, [loadChatMessages]);

  useEffect(() => {
    if (urlChatId) {
      // A chat that was just started here already shows its messages; don't reload over it.
      if (urlChatId === justCreated.current) { justCreated.current = undefined; return; }
      if (urlChatId !== wanted.current || loadError) openFromUrl(urlChatId);
    } else if (wanted.current || activeChatId) {
      wanted.current = undefined;
      setActiveChatId(undefined);
      setLoadedMessages(undefined);
      setLoadError(null);
      setChatKey((k) => k + 1);
    }
  }, [urlChatId]);

  const handleNewChat = () => {
    setSelectedTool(undefined);
    setActiveChatId(undefined);
    setLoadedMessages(undefined);
    setChatKey((k) => k + 1);
    navigate(base);
  };

  const handleIncognitoChat = () => {
    setSelectedTool(undefined);
    setActiveChatId(undefined);
    setLoadedMessages(undefined);
    setChatKey((k) => k + 1);
    navigate(isIncognito ? "/chat" : "/chat/incognito");
  };

  const handleSelectChat = useCallback((id: string) => {
    if (id === urlChatId) return openFromUrl(id);
    navigate(`${base}/${id}`); // the address change opens it
  }, [navigate, base, urlChatId, openFromUrl]);

  const handleChatCreated = useCallback((id: string) => {
    wanted.current = id;
    justCreated.current = id;
    setActiveChatId(id);
    navigate(`${base}/${id}`, { replace: true });
  }, [navigate, base]);

  const activeChat = activeChatId ? getChatById(activeChatId) : undefined;
  const initialMessages = activeChatId ? loadedMessages ?? (activeChatId === justCreatedId(activeChat) ? activeChat?.messages : undefined) : undefined;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      <DesktopSidebar
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        isMainChat={!selectedTool && !activeChatId}
        activeChatId={activeChatId}
        chatHistory={history}
      />
      <MobileSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        isMainChat={!selectedTool && !activeChatId}
        activeChatId={activeChatId}
        chatHistory={history}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {loadError || opening ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            {opening ? <div role="status" aria-label="Opening chat" className="size-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" /> : <>
              <p className="text-base font-medium text-foreground">{loadError === "not_found" ? "This chat doesn't exist or isn't yours." : "Couldn't open this chat right now."}</p>
              <div className="flex gap-2">
                {loadError === "unavailable" && <Button variant="secondary" className="rounded-full" onClick={() => urlChatId && openFromUrl(urlChatId)}>Try again</Button>}
                <Button className="rounded-full" onClick={handleNewChat}>New chat</Button>
              </div>
            </>}
          </div>
        ) : <ChatWorkspace
          key={`${isIncognito}-${creationMode}-${chatKey}`}
          creationMode={creationMode}
          tool={selectedTool}
          isIncognito={isIncognito}
          onIncognitoChat={handleIncognitoChat}
          onMenuClick={() => setSidebarOpen(true)}
          initialMessages={initialMessages && initialMessages.length > 0 ? initialMessages : undefined}
          chatId={activeChatId}
          onChatCreated={handleChatCreated}
        />}
      </main>
    </div>
  );
};

export default Index;
