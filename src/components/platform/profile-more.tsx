import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarCheck, ChevronRight, LogOut, Menu, Moon, Sun, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { floatingNavItemClass } from "@/lib/student-nav";
import { useTheme } from "@/lib/theme";
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
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === "light" ? Moon : Sun;
  const active = activeTab === "cursos" || items.some((item) => item.id === activeTab);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          className={floatingNavItemClass(active)}
        >
          <Menu className={cn("h-5 w-5", active && "text-primary")} />
          <span className="text-[11px] font-medium">Mais</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl border-border bg-popover px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-foreground">
        <SheetHeader className="px-1 text-left">
          <SheetTitle className="text-left font-display text-2xl">Mais opções</SheetTitle>
          <SheetDescription className="truncate text-left text-xs">{userEmail}</SheetDescription>
        </SheetHeader>

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
          <button type="button" onClick={toggleTheme} className={rowClass}>
            <ThemeIcon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">{theme === "light" ? "Usar tema escuro" : "Usar tema claro"}</span>
          </button>
          <button type="button" onClick={() => pick(onLogout)} className={cn(rowClass, "text-primary")}>
            <LogOut className="h-5 w-5" />
            <span className="flex-1">Sair da conta</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
