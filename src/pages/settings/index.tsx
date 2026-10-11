import { UserRound, CircleHelp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { Palette, Languages, Sparkles, MessagesSquare, Database, ShieldCheck, Accessibility, Bell, Info, User, Inbox, Crown, LayoutDashboard, FileText, Shield, HelpCircle, LifeBuoy, LogOut, Mail, ChevronRight } from "lucide-react";
import PageHeader from "@/components/page-header";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@/lib/router-compat";
import { cn } from "@/lib/utils";

export const SETTINGS_CATEGORIES = [
  { to: "/settings/appearance", icon: Palette, title: "Appearance", desc: "Theme, accent colour and text size" },
  { to: "/settings/language", icon: Languages, title: "Language", desc: "Interface language" },
  { to: "/settings/ai", icon: Sparkles, title: "AI Preferences", desc: "Default mode, answer style, custom instructions" },
  { to: "/settings/chat", icon: MessagesSquare, title: "Chat & History", desc: "Export or clear conversations" },
  { to: "/settings/privacy", icon: Database, title: "Privacy & Data", desc: "Your data, research documents and deletion" },
  { to: "/settings/security", icon: ShieldCheck, title: "Security", desc: "Password and two-step sign-in" },
  { to: "/settings/accessibility", icon: Accessibility, title: "Accessibility", desc: "Motion, contrast and tap size" },
  { to: "/settings/notifications", icon: Bell, title: "Notifications", desc: "Browser alerts" },
  { to: "/settings/about", icon: Info, title: "About VISION", desc: "Version, help and legal" },
] as const;

type Row = { to: string; icon: ComponentType<{ className?: string }>; title: string; sub?: string; tone?: "primary" };

function Group({ title, rows }: { title?: string; rows: Row[] }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-6 text-sm text-muted-foreground">{title}</h2>}
      <div className="space-y-0.5 overflow-hidden rounded-[2rem]">
        {rows.map(({ to, icon: Icon, title: label, sub, tone }) => (
          <Link key={to + label} to={to} className="flex min-h-14 items-center gap-4 bg-secondary px-5 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <Icon className={cn("size-5 shrink-0", tone === "primary" ? "text-primary" : "text-foreground")} />
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-base", tone === "primary" ? "text-primary" : "text-foreground")}>{label}</span>
              {sub && <span className="block truncate text-sm text-muted-foreground">{sub}</span>}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function SettingsDirectory() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const name = profile?.full_name || "User";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "U";

  const account: Row[] = [
    { to: "/account", icon: User, title: "Account", sub: "Name and picture" },
    ...(profile?.email ? [{ to: "/account", icon: Mail, title: "Email", sub: profile.email }] : []),
    { to: "/inbox", icon: Inbox, title: "Inbox" },
    { to: "/billing/plans", icon: Crown, title: "Upgrade plan", tone: "primary" as const },
    ...(isAdmin ? [{ to: "/admin/dashboard", icon: LayoutDashboard, title: "Admin Panel" }] : []),
  ];
  const help: Row[] = [
    { to: "/support", icon: LifeBuoy, title: "Support" },
    { to: "/help/faq", icon: HelpCircle, title: "FAQ" },
    { to: "/legal/terms", icon: FileText, title: "Terms of Service" },
    { to: "/legal/privacy", icon: Shield, title: "Privacy Policy" },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <PageHeader title="Settings" backTo="/chat" menu={[{ label: "Account", icon: UserRound, onSelect: () => navigate("/account") }, { label: "Help & FAQ", icon: CircleHelp, onSelect: () => navigate("/help/faq") }, { label: "Support", icon: LifeBuoy, onSelect: () => navigate("/support") }, { label: "About", icon: Info, onSelect: () => navigate("/settings/about"), separatorBefore: true }]} />
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-12">
        <div className="mx-auto max-w-lg space-y-7">
          <Link to="/account" className="flex flex-col items-center gap-3 pt-1">
            <span className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : initials}
            </span>
            <span className="font-display text-xl font-semibold text-foreground">{name}</span>
          </Link>
          <Group title="Account" rows={account} />
          <Group title="App" rows={SETTINGS_CATEGORIES.map(({ to, icon, title }) => ({ to, icon, title }))} />
          <Group title="Help & legal" rows={help} />
          <button type="button" onClick={async () => { await signOut(); navigate("/auth/login", { replace: true }); }}
            className="flex min-h-14 w-full items-center gap-4 rounded-full bg-secondary px-5 py-3 text-left text-base text-destructive transition-colors hover:bg-accent">
            <LogOut className="size-5" />Log out
          </button>
        </div>
      </div>
    </div>
  );
}
