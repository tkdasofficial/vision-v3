import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Plus, Pencil, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/lib/cloud/client";
import WorkspaceShell from "@/components/workspace-shell";
import BottomSearch from "@/components/bottom-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { projectIcons } from "@/lib/project-options";

type Project = { id: string; name: string; icon?: string; category?: string; session_id?: string; created_at?: string; updated_at?: string };

function friendlyDate(value?: string) {
  if (!value) return "";
  const d = new Date(value); if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export default function Projects() {
  const { user } = useAuth();
  const { history, setChatProject } = useChatHistory();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!user) return;
    const result = await supabase.from("workspace_projects").select("*").eq("user_id", user.id);
    if (result.error) toast.error(result.error.message);
    else setProjects(((result.data || []) as Project[]).sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "")));
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);
  const save = async () => {
    if (!user || !name.trim() || !editing) return;
    const result = await supabase.from("workspace_projects").update({ name: name.trim() }).eq("id", editing).eq("user_id", user.id);
    if (result.error) { toast.error(result.error.message); return; }
    setName(""); setEditing(null); void load();
  };
  const remove = async (project: Project) => {
    if (!user || !window.confirm(`Delete ${project.name}?`)) return;
    const result = await supabase.from("workspace_projects").delete().eq("id", project.id).eq("user_id", user.id);
    if (result.error) toast.error(result.error.message); else { setSelected(null); void load(); }
  };
  const attach = async (sessionId: string) => {
    if (!selected) return;
    if (!(await setChatProject(sessionId, selected))) toast.error("Couldn't add the chat. Please try again.");
  };
  const shown = useMemo(() => projects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())), [projects, query]);
  const active = projects.find((project) => project.id === selected);
  const projectChats = active ? history.filter((chat) => chat.projectId === active.id) : [];
  const otherChats = history.filter((chat) => !chat.projectId);

  return <WorkspaceShell title="Projects" backTo="/chat"
    actions={<Button variant="secondary" size="icon" className="rounded-full [&_svg]:size-5" aria-label="Create project" title="Create project" onClick={() => navigate("/projects/new")}><Plus /></Button>}
    footer={<BottomSearch value={query} onChange={setQuery} placeholder="Search" label="Search projects" />}>
    <div className="mb-4 flex gap-2"><span className="rounded-full bg-secondary px-5 py-2 text-base font-semibold text-foreground">All</span></div>
    {editing && <form className="mb-6 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" aria-label="Project name" maxLength={100} className="min-w-0 flex-1" />
      <Button type="submit" disabled={!name.trim()}>Save</Button>
      <Button type="button" variant="ghost" onClick={() => { setEditing(null); setName(""); }}>Cancel</Button>
    </form>}
    {loading ? <p role="status" className="py-12 text-center text-muted-foreground">Loading…</p> : shown.length === 0 ? <div className="py-20 text-center text-muted-foreground"><FolderOpen className="mx-auto mb-4 size-8" /><p>{query ? "No projects found" : "No projects yet"}</p></div> : <div className="space-y-1">
      {shown.map((project) => {
        const Icon = projectIcons.find((entry) => entry.value === project.icon)?.icon || FolderOpen;
        return <div key={project.id} className={`flex items-center gap-4 rounded-[1.5rem] px-1 py-2 transition-colors ${selected === project.id ? "bg-accent/60" : "hover:bg-accent/40"}`}>
          <button type="button" onClick={() => setSelected(selected === project.id ? null : project.id)} className="flex min-w-0 flex-1 items-center gap-4 text-left">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary"><Icon className="size-5 text-foreground" /></span>
            <span className="min-w-0"><span className="block truncate text-base font-medium text-foreground">{project.name}</span><span className="block text-sm text-muted-foreground">{friendlyDate(project.updated_at || project.created_at) || project.category || "General"}</span></span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full" aria-label={`Options for ${project.name}`}><MoreVertical /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditing(project.id); setName(project.name); }}><Pencil className="size-4" />Rename</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => void remove(project)}><Trash2 className="size-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>;
      })}
    </div>}
    {active && <section className="mt-8 border-t border-border pt-6"><h2 className="mb-4 font-display text-lg font-semibold text-foreground">{active.name}</h2>
      {projectChats.length === 0 ? <p className="mb-4 text-sm text-muted-foreground">No chats in this project yet</p> : projectChats.map((chat) => <Button key={chat.id} variant="outline" className="mb-2 w-full justify-start" onClick={() => navigate(`/chat/${chat.id}`)}>{chat.title}</Button>)}
      <h3 className="my-4 text-sm text-muted-foreground">Add a chat</h3>
      {otherChats.length === 0 ? <p className="text-sm text-muted-foreground">No other chats</p> : otherChats.map((chat) => <Button key={chat.id} variant="ghost" className="mb-1 w-full justify-start" onClick={() => void attach(chat.id)}>{chat.title}</Button>)}
    </section>}
  </WorkspaceShell>;
}
