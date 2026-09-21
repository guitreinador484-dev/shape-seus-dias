import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Loader2,
  LayoutDashboard,
  Users,
  Video,
  Dumbbell,
  ShoppingBag,
  Sparkles,
  BookOpen,
  Apple,
  Flame,
  LayoutGrid,
  Library,
  Tag,
  MessageSquareText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Alunos",
    items: [
      { title: "Alunos", url: "/admin/alunos", icon: Users },
      { title: "Plataforma do aluno", url: "/admin/plataforma", icon: LayoutGrid },
      { title: "Engajamento", url: "/admin/engajamento", icon: Flame },
      { title: "Feedbacks", url: "/admin/feedbacks", icon: MessageSquareText },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { title: "Treinos", url: "/admin/treinos", icon: Dumbbell },
      { title: "Biblioteca de exercícios", url: "/admin/biblioteca", icon: Library },
      { title: "Nutrição", url: "/admin/nutricao", icon: Apple },
      { title: "Cursos", url: "/admin/cursos", icon: BookOpen },
      { title: "Aulas em vídeo", url: "/admin/aulas", icon: Video },
    ],
  },
  {
    label: "Comercial",
    items: [
      { title: "Vendas", url: "/admin/vendas", icon: ShoppingBag },
      { title: "Funil de vendas", url: "/admin/funil-vendas", icon: Sparkles },
      { title: "Ofertas extras", url: "/admin/order-bump", icon: Tag },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = item.exact
                    ? pathname === item.url
                    : pathname === item.url || pathname.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-2" onClick={() => { if (isMobile) setOpenMobile(false); }}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

function AdminLayout() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin" || isAdminEmail(user?.email);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate({ to: "/plataforma", replace: true });
    }
  }, [loading, isAdmin, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-popover grid grid-cols-[auto_minmax(0,1fr)_auto] items-center px-3 gap-2 sm:gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-display text-lg truncate">Painel do personal</h1>
              <span className="hidden sm:inline text-xs px-2 py-0.5 rounded bg-primary/15 text-primary">Administrador</span>
            </div>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-muted-foreground hidden md:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={signOut} aria-label="Sair">
                <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>
          <main className="admin-mobile flex-1 p-3 sm:p-6 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}