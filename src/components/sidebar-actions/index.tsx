import { PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileMenu from "@/components/profile-menu";

export default function SidebarActions({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="mt-auto flex shrink-0 items-center justify-between gap-3 bg-sidebar px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Button variant="newChat" onClick={onNewChat} className="h-11 min-w-0 flex-1 rounded-full">
        <PenSquare />
        New Chat
      </Button>
      <ProfileMenu />
    </div>
  );
}