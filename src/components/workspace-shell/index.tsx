import { useState, type ReactNode } from "react";
import { ArrowLeft, Menu } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { useChatHistory } from "@/context/ChatHistoryContext";
import DesktopSidebar from "@/components/desktop-sidebar";
import MobileSidebar from "@/components/mobile-sidebar";
import PageHeader from "@/components/page-header";

export default function WorkspaceShell({ title, children, actions, backTo, footer }: { title: string; children: ReactNode; actions?: ReactNode; backTo?: string; footer?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { history } = useChatHistory();
  const props = { onNewChat: () => navigate("/chat"), onSelectChat: (id: string) => navigate(`/chat/${id}`), chatHistory: history, isMainChat: false };
  return <div className="flex h-[100dvh] overflow-hidden bg-background">
    <DesktopSidebar {...props} /><MobileSidebar {...props} open={open} onClose={() => setOpen(false)} />
    <main className="flex min-w-0 flex-1 flex-col">
      <PageHeader title={title} backTo={backTo} onMenu={backTo ? undefined : () => setOpen(true)} menuClassName="lg:hidden" actions={actions} />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8"><div className="mx-auto max-w-4xl">{children}</div></div>
      {footer}
    </main>
  </div>;
}