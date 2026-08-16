import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

const navItems = [
  { to: "/plataforma", label: "Meu Treino", icon: Dumbbell, exact: true },
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
    <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen border-r border-white/5 bg-[#0E0E10]/80 backdrop-blur-xl">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-white/5">
        <span className="font-display text-2xl tracking-wide text-white">PERSONAL</span>
        <p className="text-[11px] text-white/30 mt-0.5 uppercase tracking-widest">Área de Membros</p>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full grid place-items-center font-display text-sm text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #7C5CFF 0%, #5B8CFF 100%)" }}
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? "bg-primary/15 text-white shadow-md shadow-primary/15 border border-primary/20"
                  : "text-white/55 hover:text-white hover:bg-white/6 border border-transparent"
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
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/35 hover:text-red-400 hover:bg-red-500/8 transition-all duration-200 border border-transparent hover:border-red-500/15"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
