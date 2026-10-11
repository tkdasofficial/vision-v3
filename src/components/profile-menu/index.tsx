import { User } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

/** Sidebar profile button: opens the Settings page, which holds every account and app option. */
const ProfileMenu = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  return (
    <Button variant="secondary" size="icon" aria-label="Open settings" title="Settings" onClick={() => navigate("/settings")} className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-sidebar-border">
      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : <User className="size-5 text-foreground" />}
    </Button>
  );
};

export default ProfileMenu;
