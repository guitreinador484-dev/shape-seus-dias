import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarCheck, LogOut, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import type { MoreItem } from "@/components/platform/profile-more";
import { PRIMARY_TABS } from "@/lib/student-nav";
import { cn } from "@/lib/utils";

interface StudentSidebarProps {
  activeTab: string;
  accountItems: MoreItem[];
  onTabChange: (tab: string) => void;
  onGoToCheckin: () => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
}

const ITEM = "flex min-h-10 w-full items-center gap-3 rounded-md border border-transparent px-3 text-left text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground";
const ITEM_ACTIVE = "border-primary/25 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary";

function GroupLabel({ children }: { children: string }) {
  return <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">{children}</p>;
}

function TabItem({ id, label, icon: Icon, activeTab, onTabChange }: {
  id: string;
  label: string;
  icon: LucideIcon;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const active = activeTab === id;
  return (
    <button type="button" aria-current={active ? "page" : undefined} onClick={() => onTabChange(id)} className={cn(ITEM, active && ITEM_ACTIVE)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function StudentSidebar({ activeTab, accountItems, onTabChange, onGoToCheckin, onLogout, userName, userEmail }: StudentSidebarProps) {
  const displayName = userName || userEmail || "Aluno";
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-5">
        <BrandLogo className="h-7 w-auto max-w-[9rem]" />
      </div>

      <nav aria-label="Navegação principal" className="min-h-0 flex-1 space-y-6 overflow-y-auto p-3">
        <div>
          <GroupLabel>Treinar</GroupLabel>
          <div className="space-y-0.5">
            {PRIMARY_TABS.map((item) => (
              <TabItem key={item.id} {...item} activeTab={activeTab} onTabChange={onTabChange} />
            ))}
            <button type="button" onClick={onGoToCheckin} className={ITEM}>
              <CalendarCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">Check-in de hoje</span>
            </button>
            <Link to="/plataforma/cursos" aria-current={activeTab === "cursos" ? "page" : undefined} className={cn(ITEM, activeTab === "cursos" && ITEM_ACTIVE)}>
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">Meus cursos</span>
            </Link>
          </div>
        </div>

        <div>
          <GroupLabel>Minha conta</GroupLabel>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <TabItem key={item.id} {...item} activeTab={activeTab} onTabChange={onTabChange} />
            ))}
          </div>
        </div>
      </nav>

      <div className="flex shrink-0 items-center gap-2 border-t border-sidebar-border p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-foreground" aria-hidden>
          {displayName.trim()[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {userName ? <p className="truncate text-xs text-muted-foreground">{userEmail}</p> : null}
        </div>
        <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sair da conta" className="shrink-0 text-muted-foreground">
          <LogOut />
        </Button>
      </div>
    </aside>
  );
}
