import { useState, useCallback, useEffect } from "react";
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
  const [activeChatId, setActiveChatId] = useState<string | undefined>(urlChatId);
  const [loadedMessages, setLoadedMessages] = useState<any[] | undefined>(undefined);

  // Sync URL param to state
  useEffect(() => {
    if (urlChatId && urlChatId !== activeChatId) {
      setActiveChatId(urlChatId);
      loadChatMessages(urlChatId).then((msgs) => {
        setLoadedMessages(msgs);
        setChatKey((k) => k + 1);
      });
    } else if (!urlChatId && activeChatId) {
      setActiveChatId(undefined);
      setLoadedMessages(undefined);
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

  const handleSelectChat = useCallback(async (id: string) => {
    setActiveChatId(id);
    const msgs = await loadChatMessages(id);
    setLoadedMessages(msgs);
    setChatKey((k) => k + 1);
    navigate(`${base}/${id}`);
  }, [loadChatMessages, navigate, base]);

  const handleChatCreated = useCallback((id: string) => {
    setActiveChatId(id);
    navigate(`${base}/${id}`, { replace: true });
  }, [navigate, base]);

  const activeChat = activeChatId ? getChatById(activeChatId) : undefined;
  const initialMessages = loadedMessages || activeChat?.messages;

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
        <ChatWorkspace
          key={`${isIncognito}-${creationMode}-${chatKey}`}
          creationMode={creationMode}
          tool={selectedTool}
          isIncognito={isIncognito}
          onIncognitoChat={handleIncognitoChat}
          onMenuClick={() => setSidebarOpen(true)}
          initialMessages={initialMessages && initialMessages.length > 0 ? initialMessages : undefined}
          chatId={activeChatId}
          onChatCreated={handleChatCreated}
        />
      </main>
    </div>
  );
};

export default Index;
