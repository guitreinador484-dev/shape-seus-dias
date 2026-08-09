import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Play, Dumbbell, Video, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

const navItems = [
  { to: "/plataforma", label: "Meu Treino", icon: Dumbbell, exact: true },
  { to: "/plataforma/cursos", label: "Cursos", icon: BookOpen, exact: false },
];

export default function LeftSidebar() {
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
    <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen border-r border-border/30 bg-card/20 backdrop-blur-sm">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-border/20">
        <span className="font-display text-2xl tracking-wide text-foreground">PERSONAL</span>
        <p className="text-[11px] text-foreground/40 mt-0.5 uppercase tracking-widest">Área de Membros</p>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/20 text-primary grid place-items-center font-display text-base shrink-0">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{firstName}</p>
            <p className="text-[11px] text-foreground/45 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-foreground/35 font-medium">Navegação</p>
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-foreground/70 hover:text-foreground hover:bg-border/30"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "" : "group-hover:text-primary transition-colors"}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border/20">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
