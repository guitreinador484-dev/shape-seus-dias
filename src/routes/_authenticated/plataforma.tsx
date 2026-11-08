import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Ban, CreditCard, Lightbulb, Loader2, Lock, LogOut, Megaphone, RefreshCw, Timer, type LucideIcon } from "lucide-react";
import { CheckinCard } from "@/components/platform/checkin-card";
import { ReferralCard } from "@/components/platform/referral-card";
import { TreinoPanel, TreinoSkeleton } from "@/components/platform/treino-panel";
import { useGymPreference } from "@/hooks/use-gym-preference";
import { LogoutConfirmation } from "@/components/platform/logout-confirmation";
import { MobileNav } from "@/components/platform/mobile-nav";
import { StudentSidebar } from "@/components/platform/student-sidebar";
import { CoursesShell } from "@/components/platform/courses-shell";
import { WelcomeGate } from "@/components/platform/welcome-gate";
import { BrandLogo } from "@/components/brand-logo";
import { defaultConfig, fetchPlatformHome, platformHomeKey } from "@/lib/platform-data";
import { accountNavItems } from "@/lib/student-nav";
import { cn } from "@/lib/utils";

// Cada aba só baixa o próprio código quando é aberta (o gráfico de Evolução e o player são pesados).
const NutritionTab = lazy(() => import("@/components/platform/nutrition-tab").then((m) => ({ default: m.NutritionTab })));
const EvolutionTab = lazy(() => import("@/components/platform/evolution-tab").then((m) => ({ default: m.EvolutionTab })));
const AnamneseTab = lazy(() => import("@/components/platform/anamnese-tab").then((m) => ({ default: m.AnamneseTab })));
const MentoriaTab = lazy(() => import("@/components/platform/mentoria-tab").then((m) => ({ default: m.MentoriaTab })));
const FeedbackTab = lazy(() => import("@/components/platform/feedback-tab").then((m) => ({ default: m.FeedbackTab })));
const AulasTab = lazy(() => import("@/components/platform/aulas-tab").then((m) => ({ default: m.AulasTab })));
const SubscriptionsPanel = lazy(() => import("@/components/subscriptions-panel").then((m) => ({ default: m.SubscriptionsPanel })));

function LockedExtra({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatusScreen({ icon: Icon, tone, title, children, email, action }: {
  icon: LucideIcon;
  tone: "destructive" | "warning" | "neutral";
  title: string;
  children: ReactNode;
  email?: string;
  action?: ReactNode;
}) {
  const toneClass = { destructive: "bg-destructive/15 text-primary", warning: "bg-warning/15 text-warning", neutral: "bg-muted text-muted-foreground" }[tone];
  return (
    <Card>
      <CardContent className="space-y-3 py-12 text-center">
        <div className={cn("mx-auto grid h-14 w-14 place-items-center rounded-lg", toneClass)}>
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="font-display text-3xl leading-none text-foreground">{title}</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p>
        {email ? <p className="pt-1 text-xs text-muted-foreground">{email}</p> : null}
        {action}
      </CardContent>
    </Card>
  );
}

function TabFallback() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
    </div>
  );
}

/** Depois da primeira visita a aba continua montada: trocar é instantâneo e rascunhos não se perdem. */
function KeptTab({ value, active, children }: { value: string; active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  useEffect(() => { if (active) setVisited(true); }, [active]);
  if (!visited) return null;
  return (
    <TabsContent value={value} forceMount hidden={!active} className="mt-0">
      <Suspense fallback={<TabFallback />}>{children}</Suspense>
    </TabsContent>
  );
}

const PLATFORM_TABS = ["treino", "aulas", "dieta", "evolucao", "ficha", "mentoria", "feedback", "assinatura", "checkin"];

export const Route = createFileRoute("/_authenticated/plataforma")({
  component: PlatformRoute,
  validateSearch: (search: Record<string, unknown>): { aba?: string } =>
    typeof search.aba === "string" && PLATFORM_TABS.includes(search.aba) ? { aba: search.aba } : {},
  head: () => ({ meta: [
    { title: "Minha plataforma — Gui Treinador" },
    { name: "description", content: "Treinos, evolução e acompanhamento personalizado." },
    { property: "og:title", content: "Minha plataforma — Gui Treinador" },
    { property: "og:description", content: "Treinos, evolução e acompanhamento personalizado." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
});

function PlatformRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/plataforma" ? <PlataformaPage /> : <CoursesShell><Outlet /></CoursesShell>;
}

function PlataformaPage() {
  const { user, role, loading, isMentoria } = useAuth();
  const { gymId } = useGymPreference(isMentoria ? (user?.id ?? null) : null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { aba } = Route.useSearch();
  const [selectedTab, setActiveTab] = useState(!aba || aba === "checkin" ? "treino" : aba);
  const activeTab = selectedTab === "mentoria" && !loading && !isMentoria ? "treino" : selectedTab;
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [welcomeReady, setWelcomeReady] = useState(false);

  const homeQuery = useQuery({
    queryKey: platformHomeKey(user?.id ?? ""),
    queryFn: () => fetchPlatformHome(user!.id),
    enabled: Boolean(user),
  });
  const home = homeQuery.data;
  const dataLoading = homeQuery.isPending;
  const config = home?.config ?? defaultConfig;
  const hasClassAccess = home?.hasClassAccess ?? false;
  const isActive = home?.isActive ?? true;
  const accessExpiresAt = home?.accessExpiresAt ?? null;
  const isExpired = accessExpiresAt !== null && new Date(accessExpiresAt).getTime() <= Date.now();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (config.theme === "light") {
      root.classList.add("platform-light");
      body.classList.add("platform-light");
    }
    return () => {
      root.classList.remove("platform-light");
      body.classList.remove("platform-light");
    };
  }, [config.theme]);

  useEffect(() => {
    if (!aba) return;
    if (aba !== "checkin") {
      setActiveTab(aba);
      return;
    }
    setActiveTab("treino");
    // O card de check-in só aparece depois que os dados do treino carregam.
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const section = document.getElementById("checkin-section");
      if (!section && Date.now() - startedAt < 8000) return;
      window.clearInterval(timer);
      section?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => window.clearInterval(timer);
  }, [aba]);

  const finishWelcome = useCallback(() => setWelcomeReady(true), []);
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function changeTab(tab: string) {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  }

  function goToCheckin() {
    setActiveTab("treino");
    requestAnimationFrame(() => document.getElementById("checkin-section")?.scrollIntoView({ behavior: "smooth" }));
  }

  if (user && !welcomeReady && !isPreview && role !== "admin" && !isAdminEmail(user.email)) {
    return <WelcomeGate userId={user.id} onReady={finishWelcome} />;
  }

  // Alunos online só acessam Dieta e Aulas em vídeo com o adicional (order bump).
  const privileged = role === "presencial" || role === "admin" || isAdminEmail(user?.email);
  const canSeeNutrition = Boolean(home?.hasNutritionAccess) || privileged;
  const canSeeVideos = Boolean(home?.hasVideoAccess) || privileged;
  const hasAccess = hasClassAccess && isActive && !isExpired;
  const showVideos = hasAccess && canSeeVideos;
  const firstName = (home?.fullName ?? "").split(/\s+/).filter(Boolean)[0] ?? "";
  const todayLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  // Durante o carregamento o menu já fica no lugar, para o conteúdo não pular quando os dados chegam.
  const showNav = hasAccess || dataLoading;
  const moreItems = accountNavItems(isMentoria);
  // Quem está sem acesso também precisa conseguir ver ou cancelar a assinatura.
  const subscriptionAction = (
    <Button variant="outline" onClick={() => changeTab("assinatura")}><CreditCard /> Minha assinatura</Button>
  );

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background text-foreground">
      {showNav ? (
        <StudentSidebar
          activeTab={activeTab}
          accountItems={moreItems}
          onTabChange={changeTab}
          onGoToCheckin={goToCheckin}
          onLogout={() => setLogoutDialogOpen(true)}
          userName={home?.fullName}
          userEmail={user?.email}
        />
      ) : null}
      <Tabs value={activeTab} className={cn("flex min-h-dvh w-full flex-col", showNav && "lg:pl-60")}>
        <header className={cn("sticky top-0 z-30 border-b border-border bg-background", showNav && "lg:hidden")}>
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-3 sm:px-6">
            <BrandLogo className="h-7 w-auto max-w-[9rem] shrink-0" />
            <Button variant="ghost" size="sm" onClick={() => setLogoutDialogOpen(true)} aria-label="Sair" className="shrink-0 text-muted-foreground">
              <LogOut /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        {config.announcement_enabled && config.announcement_text ? (
          <div
            role="status"
            className={cn(
              "flex items-center justify-center gap-2 border-b border-border px-4 py-2 text-center text-xs font-medium",
              config.announcement_type === "success" ? "bg-success/10 text-success"
                : config.announcement_type === "warning" ? "bg-warning/10 text-warning"
                : "bg-secondary text-foreground",
            )}
          >
            <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{config.announcement_text}</span>
          </div>
        ) : null}

        <main className={cn("mx-auto w-full max-w-6xl flex-1 space-y-5 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:pb-8", showNav && "pb-[calc(6rem+env(safe-area-inset-bottom))]")}>
          {homeQuery.error ? (
            <StatusScreen
              icon={AlertCircle}
              tone="destructive"
              title="Não foi possível carregar a plataforma"
              action={<Button variant="outline" onClick={() => void homeQuery.refetch()}><RefreshCw /> Tentar novamente</Button>}
            >
              {homeQuery.error.message}
            </StatusScreen>
          ) : dataLoading ? (
            <TreinoSkeleton />
          ) : !hasAccess && activeTab === "assinatura" ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => changeTab("treino")} className="text-muted-foreground"><ArrowLeft /> Voltar</Button>
              <Suspense fallback={<TabFallback />}><SubscriptionsPanel /></Suspense>
            </>
          ) : !isActive ? (
            <StatusScreen icon={Ban} tone="destructive" title="Acesso bloqueado" email={user?.email} action={subscriptionAction}>
              Sua conta foi desativada. Fale com seu personal trainer para reativar o acesso.
            </StatusScreen>
          ) : isExpired ? (
            <StatusScreen icon={Timer} tone="warning" title="Acesso expirado" email={user?.email} action={subscriptionAction}>
              Seu período de acesso chegou ao fim. Fale com seu personal trainer para renovar e continuar treinando.
            </StatusScreen>
          ) : !hasClassAccess ? (
            <StatusScreen icon={Lock} tone="neutral" title="Acesso pendente" email={user?.email} action={subscriptionAction}>
              Sua conta foi criada, mas o acesso à plataforma ainda não foi liberado. Assim que o pagamento for confirmado, seu personal libera o seu acesso.
            </StatusScreen>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-xs font-medium first-letter:uppercase text-muted-foreground">{todayLabel}</p>
                  <h1 className="font-display text-3xl leading-none text-foreground sm:text-4xl">{firstName ? `Olá, ${firstName}` : "Olá"}</h1>
                </div>
                {accessExpiresAt ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Acesso até {new Date(accessExpiresAt).toLocaleDateString("pt-BR")}
                  </p>
                ) : null}
              </div>

              <TabsContent value="treino" forceMount hidden={activeTab !== "treino"} className="mt-0 space-y-5">
                {user ? (
                  <TreinoPanel userId={user.id} plans={home?.plans ?? []} loading={false} showVideos gymId={gymId} onGoToCheckin={goToCheckin} />
                ) : null}
                {user ? <CheckinCard userId={user.id} /> : null}
                {user && showVideos ? <ReferralCard userId={user.id} /> : null}
                <button type="button" onClick={() => changeTab("feedback")} className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors duration-150 hover:border-primary/60">
                  <Lightbulb className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Tem uma ideia para melhorar a plataforma?</span>
                    <span className="block text-sm text-muted-foreground">Deixe sua sugestão, lemos todas.</span>
                  </span>
                  <span className="text-sm font-semibold text-primary">Sugerir</span>
                </button>
              </TabsContent>

              <KeptTab value="dieta" active={activeTab === "dieta"}>
                {!canSeeNutrition ? (
                  <LockedExtra
                    title="Dieta liberada com o adicional"
                    description="A área de Dieta faz parte do acompanhamento completo. Fale com o professor para liberar no seu plano."
                  />
                ) : user ? (
                  <NutritionTab userId={user.id} />
                ) : null}
              </KeptTab>

              <KeptTab value="evolucao" active={activeTab === "evolucao"}>
                {user ? <EvolutionTab userId={user.id} /> : null}
              </KeptTab>

              <KeptTab value="ficha" active={activeTab === "ficha"}>
                {user ? <AnamneseTab userId={user.id} /> : null}
              </KeptTab>

              <KeptTab value="feedback" active={activeTab === "feedback"}>
                {user ? <FeedbackTab userId={user.id} /> : null}
              </KeptTab>

              <KeptTab value="assinatura" active={activeTab === "assinatura"}>
                <SubscriptionsPanel />
              </KeptTab>

              {/* Mentoria e Aulas têm vídeo: desmontar ao sair garante que nada siga tocando escondido. */}
              {isMentoria && user ? (
                <TabsContent value="mentoria" className="mt-0">
                  <Suspense fallback={<TabFallback />}><MentoriaTab userId={user.id} /></Suspense>
                </TabsContent>
              ) : null}

              <TabsContent value="aulas" className="mt-0">
                {showVideos && user ? (
                  <Suspense fallback={<TabFallback />}><AulasTab userId={user.id} config={config} /></Suspense>
                ) : (
                  <LockedExtra
                    title="Aulas em vídeo liberadas com o adicional"
                    description="As aulas em vídeo fazem parte do acompanhamento completo. Fale com o professor para liberar no seu plano."
                  />
                )}
              </TabsContent>
            </>
          )}
        </main>
      </Tabs>
      {showNav ? (
        <MobileNav
          activeTab={activeTab}
          onTabChange={changeTab}
          onLogout={() => setLogoutDialogOpen(true)}
          onGoToCheckin={goToCheckin}
          userEmail={user?.email}
          moreItems={moreItems}
        />
      ) : null}
      <LogoutConfirmation
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={signOut}
      />
    </div>
  );
}
