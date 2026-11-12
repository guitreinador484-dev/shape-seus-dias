import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LogoutConfirmation } from "@/components/platform/logout-confirmation";
import { MobileNav } from "@/components/platform/mobile-nav";
import { StudentSidebar } from "@/components/platform/student-sidebar";
import { platformHomeKey, type PlatformHome } from "@/lib/platform-data";
import { accountNavItems } from "@/lib/student-nav";

/** Cursos ficam em rotas próprias, mas usam o mesmo menu da plataforma: as abas abrem por `?aba=`. */
export function CoursesShell({ children }: { children: ReactNode }) {
  const { user, isMentoria } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [logoutOpen, setLogoutOpen] = useState(false);
  // Só o nome para o menu: reaproveita o que a plataforma já carregou em vez de buscar os treinos de novo.
  const cachedName = queryClient.getQueryData<PlatformHome>(platformHomeKey(user?.id ?? ""))?.fullName;
  const userName = cachedName || (user?.user_metadata?.full_name as string | undefined);

  const openTab = (aba: string) => void navigate({ to: "/plataforma", search: { aba } });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const accountItems = accountNavItems(isMentoria);
  return (
    <>
      <StudentSidebar
        activeTab="cursos"
        accountItems={accountItems}
        onTabChange={openTab}
        onGoToCheckin={() => openTab("checkin")}
        onLogout={() => setLogoutOpen(true)}
        userName={userName}
        userEmail={user?.email}
      />
      <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60">{children}</div>
      <MobileNav
        activeTab="cursos"
        onTabChange={openTab}
        onLogout={() => setLogoutOpen(true)}
        onGoToCheckin={() => openTab("checkin")}
        userEmail={user?.email}
        moreItems={accountItems}
      />
      <LogoutConfirmation open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={signOut} />
    </>
  );
}
