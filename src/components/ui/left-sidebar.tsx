import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Dumbbell, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/plataforma", label: "Meu Treino", icon: Dumbbell, exact: true },
  { to: "/plataforma/cursos", label: "Meus Cursos", icon: BookOpen, exact: false },
];

export default function LeftSidebar({ mobile = false, onNavigate, onRequestLogout }: {
  mobile?: boolean;
  onNavigate?: () => void;
  onRequestLogout?: () => void;
}) {
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Aluno";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside className={cn(
      "flex h-full w-72 max-w-[85vw] shrink-0 flex-col border-r border-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl",
      mobile ? "min-h-dvh" : "hidden min-h-dvh lg:flex",
    )}>
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-white/5">
        <span className="font-display text-2xl text-sidebar-foreground">PERSONAL</span>
        <p className="mt-0.5 text-[11px] uppercase text-muted-foreground">Área de Membros</p>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full grid place-items-center font-display text-sm text-white shrink-0"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-display text-sm text-primary-foreground"
          >
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{firstName}</p>
            <p className="text-[11px] text-white/35 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/25 font-medium">Navegação</p>
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`group flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "border-primary/20 bg-primary/15 text-sidebar-foreground shadow-md shadow-primary/15"
                  : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-colors duration-200 ${active ? "text-primary" : "group-hover:text-primary"}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-50 text-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/5">
        <Button
          variant="ghost"
          onClick={onRequestLogout ?? signOut}
          className="min-h-11 w-full justify-start text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair da conta
        </Button>
      </div>
    </aside>
  );
}
