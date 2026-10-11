import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/page-header";
import { ArrowUpRight, FileText, MessageSquare, Search as SearchIcon, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/context/AuthContext";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { supabase } from "@/lib/cloud/client";
import { assetTypes, collectSearchItems, filterSearchItems, type AssetType, type SearchCategory, type SearchItem } from "@/lib/workspace-search";
import BottomSearch from "@/components/bottom-search";
import DesktopSidebar from "@/components/desktop-sidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categories = [
  { value: "chats", label: "Recent Chats", icon: MessageSquare },
  { value: "files", label: "Uploaded Files", icon: FileText },
  { value: "generated", label: "Generated Items", icon: Sparkles },
] as const;

export default function Search({ library = false }: { library?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { history } = useChatHistory();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory | "all">("all");
  const [assetType, setAssetType] = useState<AssetType | "all">("all");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const [sessions, messages, tasks, stories] = await Promise.all([
          supabase.from("chat_sessions").select("*").eq("user_id", user?.id),
          supabase.from("chat_messages").select("*"),
          supabase.from("background_tasks").select("*").eq("user_id", user?.id),
          supabase.from("story_projects").select("*").eq("user_id", user?.id),
        ]);
        if ([sessions, messages, tasks, stories].some((result) => result.error)) throw new Error("Search unavailable");
        const merged = new Map((messages.data || []).map((message: Record<string, any>) => [message.id, message]));
        // Cached messages retain file details that older saved rows may not contain.
        for (const session of sessions.data || []) {
          let cached: Record<string, any>[] = [];
          try { cached = JSON.parse(localStorage.getItem(`sc_chat_msgs_${session.id}`) || "[]"); } catch { /* Ignore malformed cache. */ }
          if (!Array.isArray(cached)) continue;
          for (const message of cached) {
            if (!message?.id) continue;
            const saved = merged.get(message.id) as Record<string, any> | undefined;
            merged.set(message.id, { ...saved, id: message.id, session_id: session.id, role: message.role, content: message.content, image_url: message.imageUrl || saved?.image_url, created_at: message.timestamp || saved?.created_at || session.created_at, metadata: { ...saved?.metadata, ...message } });
          }
        }
        if (!cancelled) setItems(collectSearchItems(sessions.data || [], [...merged.values()] as Record<string, any>[], tasks.data || [], stories.data || []));
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [user, history]);

  const libraryItems = useMemo(() => items.filter((item) => item.category !== "chats"), [items]);
  const availableTypes = assetTypes.filter((type) => libraryItems.some((item) => (item.assetType || "other") === type.value));
  const results = useMemo(() => filterSearchItems(library ? libraryItems.filter((item) => assetType === "all" || (item.assetType || "other") === assetType) : items, query, category), [items, libraryItems, query, category, library, assetType]);
  const sidebarProps = { onNewChat: () => navigate("/chat"), onSelectChat: (id: string) => navigate(`/chat/${id}`), isMainChat: false, chatHistory: history };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <DesktopSidebar {...sidebarProps} />
      <main className="flex min-w-0 flex-1 flex-col">
        <PageHeader title={library ? "Library" : "Search"} backTo="/chat" className="sm:px-8" />
        <div className="shrink-0 overflow-x-auto px-4 pb-3 sm:px-8">
            <Tabs value={library ? assetType : category} onValueChange={(value) => library ? setAssetType(value as AssetType | "all") : setCategory(value as SearchCategory | "all")}>
              <TabsList aria-label={library ? "Library file types" : "Search categories"} className="flex h-auto w-max flex-nowrap justify-start gap-2 bg-transparent p-0">
                <TabsTrigger className="h-10 flex-none rounded-full border-0 bg-transparent px-5 text-base font-semibold text-muted-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none" value="all">All</TabsTrigger>
                {(library ? availableTypes : categories).map((entry) => <TabsTrigger className="h-10 flex-none rounded-full border-0 bg-transparent px-5 text-base font-semibold text-muted-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none" key={entry.value} value={entry.value}>{entry.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {loading ? <p role="status" className="py-12 text-center text-muted-foreground">Loading…</p> : error ? <p role="alert" className="py-12 text-center text-destructive">Search couldn’t load. Please try refreshing.</p> : results.length === 0 ? <div className="py-16 text-center text-muted-foreground"><SearchIcon className="mx-auto mb-4 h-8 w-8" /><p>{query ? "No results found" : "No items yet"}</p></div> : categories.filter((entry) => category === "all" || category === entry.value).map((entry) => {
              const group = results.filter((item) => item.category === entry.value);
              if (!group.length) return null;
              if (library) return <div key={entry.value} className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{group.map((item) => {
                const card = <><p className="line-clamp-2 break-all text-base font-medium text-foreground">{item.title}</p><entry.icon className="size-6 text-primary" /></>;
                const cls = "flex aspect-square flex-col justify-between rounded-[1.75rem] border border-border bg-secondary p-4 text-left transition-colors hover:bg-accent";
                return item.sessionId ? <Link key={item.id} to="/chat/$chatId" params={{ chatId: item.sessionId }} className={cls}>{card}</Link> : <div key={item.id} className={cls}>{card}</div>;
              })}</div>;
              return <section key={entry.value} className="mb-8">
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{entry.label} <span className="ml-2">{group.length}</span></h2>
                <div className="divide-y divide-border">{group.map((item) => {
                  const content = <><entry.icon className="h-5 w-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.title}</p><p className="truncate text-sm text-muted-foreground">{item.detail}</p></div>{item.sessionId && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />}</>;
                  return item.sessionId ? <Link key={item.id} to="/chat/$chatId" params={{ chatId: item.sessionId }} className="flex items-center gap-4 rounded-lg px-3 py-4 transition-colors hover:bg-accent">{content}</Link> : <div key={item.id} className="flex items-center gap-4 px-3 py-4">{content}</div>;
                })}</div>
              </section>;
            })}
          </div>
        </div>
        <BottomSearch value={query} onChange={setQuery} placeholder={library ? "Search library" : "Search anything"} />
      </main>
    </div>
  );
}