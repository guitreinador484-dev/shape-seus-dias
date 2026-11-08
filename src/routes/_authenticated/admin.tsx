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
  Settings,
  Eye,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandLogo, BrandLogoMark } from "@/components/brand-logo";
import { AdminCommand } from "@/components/admin/admin-command";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
  head: () => ({ meta: [{ title: "Administração — Gui Treinador" }, { name: "description", content: "Painel administrativo da plataforma Gui Treinador." }, { property: "og:title", content: "Administração — Gui Treinador" }, { property: "og:description", content: "Painel administrativo da plataforma Gui Treinador." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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

const settingsItem: NavItem = { title: "Configurações", url: "/admin/configuracoes", icon: Settings };

export const navItems: NavItem[] = [...navGroups.flatMap((group) => group.items), settingsItem];

function currentPageTitle(pathname: string) {
  const match = [...navItems]
    .sort((a, b) => b.url.length - a.url.length)
    .find((item) => (item.exact ? pathname === item.url : pathname === item.url || pathname.startsWith(item.url + "/")));
  return match?.title ?? "Painel";
}

function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <BrandLogo className="mx-auto h-9 w-auto group-data-[collapsible=icon]:hidden" />
        <BrandLogoMark className="mx-auto hidden h-9 w-auto group-data-[collapsible=icon]:block" />
      </SidebarHeader>
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
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === settingsItem.url} tooltip={settingsItem.title}>
              <Link to={settingsItem.url} className="flex items-center gap-2" onClick={() => { if (isMobile) setOpenMobile(false); }}>
                <Settings className="h-4 w-4" />
                <span>{settingsItem.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Ver como aluno">
              <a href="/plataforma?preview=1" target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Ver como aluno</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminLayout() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin" || isAdminEmail(user?.email);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

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
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3">
            <SidebarTrigger />
            <h1 className="min-w-0 flex-1 truncate font-display text-xl leading-none">{currentPageTitle(pathname)}</h1>
            <AdminCommand pages={navItems} />
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground xl:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sair" className="text-muted-foreground">
              <LogOut /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </header>
          <main className="admin-mobile min-w-0 flex-1 overflow-x-clip p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}