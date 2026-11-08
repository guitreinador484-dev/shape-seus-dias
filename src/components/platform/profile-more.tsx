import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarCheck, ChevronRight, LogOut, Menu, type LucideIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { floatingNavItemClass } from "@/lib/student-nav";
import { cn } from "@/lib/utils";

export type MoreItem = { id: string; label: string; icon: LucideIcon };

interface ProfileMoreProps {
  userEmail?: string;
  activeTab: string;
  items: MoreItem[];
  onTabChange: (tab: string) => void;
  onGoToCheckin: () => void;
  onLogout: () => void;
}

const rowClass = "flex min-h-14 w-full items-center gap-3 px-1 text-left text-[15px] font-medium transition-colors duration-150 hover:text-primary";

export function ProfileMore({ userEmail, activeTab, items, onTabChange, onGoToCheckin, onLogout }: ProfileMoreProps) {
  const [open, setOpen] = useState(false);
  const active = activeTab === "cursos" || items.some((item) => item.id === activeTab);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          className={floatingNavItemClass(active)}
        >
          <Menu className={cn("h-5 w-5", active && "text-primary")} />
          <span className="text-[11px] font-medium">Mais</span>
        </button>
      </DrawerTrigger>
      <DrawerContent className="border-border bg-popover px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground">
        <DrawerHeader className="px-1">
          <DrawerTitle className="text-left font-display text-2xl">Mais opções</DrawerTitle>
          <p className="truncate text-left text-xs text-muted-foreground">{userEmail}</p>
        </DrawerHeader>

        <div className="divide-y divide-border">
          <button type="button" onClick={() => pick(onGoToCheckin)} className={rowClass}>
            <CalendarCheck className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">Check-in de hoje</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => pick(() => onTabChange(item.id))} className={rowClass}>
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <Link to="/plataforma/cursos" onClick={() => setOpen(false)} className={rowClass}>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">Meus cursos</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <button type="button" onClick={() => pick(onLogout)} className={cn(rowClass, "text-primary")}>
            <LogOut className="h-5 w-5" />
            <span className="flex-1">Sair da conta</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
