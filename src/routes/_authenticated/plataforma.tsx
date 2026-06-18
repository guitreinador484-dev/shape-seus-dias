import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Loader2, Dumbbell, Video, Play, Info } from "lucide-react";

type StudentPlan = Tables<"student_plans">;
type StudentPlanExercise = Tables<"student_plan_exercises">;
type Workout = Tables<"workouts">;
type PlanWithExercises = StudentPlan & { exercises: StudentPlanExercise[] };
type PlatformConfig = {
  hero_workout_id: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_path: string;
  row_order: string;
};
const defaultConfig: PlatformConfig = { hero_workout_id: "", hero_title: "", hero_subtitle: "", hero_image_path: "", row_order: "" };
function readConfig(value: Json | null): PlatformConfig {
  const d = (value && typeof value === "object" && !Array.isArray(value)) ? (value as Record<string, unknown>) : {};
  return {
    hero_workout_id: typeof d.platform_hero_workout_id === "string" ? d.platform_hero_workout_id : "",
    hero_title: typeof d.platform_hero_title === "string" ? d.platform_hero_title : "",
    hero_subtitle: typeof d.platform_hero_subtitle === "string" ? d.platform_hero_subtitle : "",
    hero_image_path: typeof d.platform_hero_image_path === "string" ? d.platform_hero_image_path : "",
    row_order: typeof d.platform_row_order === "string" ? d.platform_row_order : "",
  };
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const Route = createFileRoute("/_authenticated/plataforma")({
  component: PlataformaPage,
});

function PlataformaPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanWithExercises[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasClassAccess, setHasClassAccess] = useState<boolean>(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, { video?: string; thumb?: string }>>({});
  const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
  const [heroBannerUrl, setHeroBannerUrl] = useState<string>("");
  const [activeVideo, setActiveVideo] = useState<{ id: string; url: string; title: string } | null>(null);

  useEffect(() => {
    if (!loading && (role === "admin" || isAdminEmail(user?.email))) {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, role, user?.email, navigate]);

  useEffect(() => {
    if (loading || !user || role === "admin" || isAdminEmail(user?.email)) return;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      const [plansRes, exRes, workoutsRes, profileRes, cfgRes] = await Promise.all([
        supabase.from("student_plans").select("*").eq("student_id", user.id).order("day_of_week", { ascending: true }),
        supabase.from("student_plan_exercises").select("*").order("display_order", { ascending: true }),
        supabase.from("workouts").select("*").order("display_order", { ascending: true }),
        supabase.from("profiles").select("has_class_access").eq("id", user.id).maybeSingle(),
        supabase.from("quiz_config").select("content").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      const allPlans = plansRes.data ?? [];
      const allEx = exRes.data ?? [];
      setPlans(allPlans.map((p) => ({ ...p, exercises: allEx.filter((e) => e.plan_id === p.id) })));
      setWorkouts(workoutsRes.data ?? []);
      setHasClassAccess(Boolean(profileRes.data?.has_class_access));
      setConfig(readConfig(cfgRes.data?.content ?? null));
      setDataLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loading, user, role]);

  useEffect(() => {
    if (!hasClassAccess || !config.hero_image_path) { setHeroBannerUrl(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(config.hero_image_path, 3600);
      if (!cancelled && data?.signedUrl) setHeroBannerUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [hasClassAccess, config.hero_image_path]);

  useEffect(() => {
    if (!hasClassAccess || workouts.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(workouts.map(async (w) => {
        const result: { video?: string; thumb?: string } = {};
        if (w.video_path) {
          const { data } = await supabase.storage.from("workout-videos").createSignedUrl(w.video_path, 3600);
          if (data?.signedUrl) result.video = data.signedUrl;
        }
        if (w.thumbnail_path) {
          const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(w.thumbnail_path, 3600);
          if (data?.signedUrl) result.thumb = data.signedUrl;
        }
        return [w.id, result] as const;
      }));
      if (cancelled) return;
      setSignedUrls(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [hasClassAccess, workouts]);

  if (loading || role === "admin" || isAdminEmail(user?.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const showVideos = hasClassAccess;
  const heroWorkout = workouts.find((w) => w.id === config.hero_workout_id) ?? workouts.find((w) => w.is_featured) ?? workouts[0];

  // Group workouts by category, ordered by config.row_order
  const byCategory = new Map<string, Workout[]>();
  workouts.forEach((w) => {
    const cat = w.category || "Geral";
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), w]);
  });
  const orderedCats = (() => {
    const cats = Array.from(byCategory.keys());
    const preferred = config.row_order.split(",").map((s) => s.trim()).filter(Boolean);
    const head = preferred.filter((c) => byCategory.has(c));
    const tail = cats.filter((c) => !head.includes(c));
    return [...head, ...tail];
  })();

  function playWorkout(w: Workout) {
    const url = signedUrls[w.id]?.video;
    if (url) setActiveVideo({ id: w.id, url, title: w.title });
    else if (w.video_url) window.open(w.video_url, "_blank");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-popover">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display text-2xl">PERSONAL</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="font-display text-3xl">Olá!</h2>
          <p className="text-muted-foreground text-sm">Acompanhe seu treino e {showVideos ? "aulas em vídeo" : "acesse seu plano"}.</p>
        </div>

        <Tabs defaultValue="treino">
          <TabsList>
            <TabsTrigger value="treino"><Dumbbell className="h-4 w-4 mr-2" /> Meu treino</TabsTrigger>
            {showVideos && <TabsTrigger value="aulas"><Video className="h-4 w-4 mr-2" /> Aulas em vídeo</TabsTrigger>}
          </TabsList>

          <TabsContent value="treino" className="mt-4 space-y-4">
            {dataLoading ? <Skeleton className="h-64" /> : plans.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Seu treino ainda não foi cadastrado. Entre em contato com seu personal.
              </CardContent></Card>
            ) : plans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{plan.plan_name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{WEEKDAYS[plan.day_of_week] ?? ""}</p>
                  </div>
                  <Badge variant="secondary">{plan.exercises.length} exercícios</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.exercises.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum exercício adicionado ainda.</p>
                  ) : plan.exercises.map((ex) => (
                    <div key={ex.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{ex.exercise_name}</p>
                        <div className="flex gap-2 text-xs">
                          <Badge variant="outline">{ex.sets}x{ex.reps}</Badge>
                          {ex.rest_seconds ? <Badge variant="outline">Descanso {ex.rest_seconds}s</Badge> : null}
                        </div>
                      </div>
                      {ex.notes && <p className="text-sm text-muted-foreground mt-1">{ex.notes}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {showVideos && (
            <TabsContent value="aulas" className="mt-4 -mx-4 sm:-mx-4">
              {dataLoading ? <Skeleton className="h-64 mx-4" /> : workouts.length === 0 ? (
                <Card className="mx-4"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma aula disponível ainda.</CardContent></Card>
              ) : (
                <div className="space-y-10 bg-black/95 text-white pb-12 -mt-2">
                  {heroWorkout && (
                    <div className="relative h-[60vh] min-h-[380px] w-full overflow-hidden">
                      {(heroBannerUrl || signedUrls[heroWorkout.id]?.thumb || heroWorkout.thumbnail_url) && (
                        <img
                          src={heroBannerUrl || signedUrls[heroWorkout.id]?.thumb || heroWorkout.thumbnail_url || ""}
                          alt={config.hero_title || heroWorkout.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                      <div className="relative h-full flex items-end px-4 sm:px-12 pb-12 max-w-7xl mx-auto">
                        <div className="max-w-2xl space-y-4">
                          <h2 className="font-display text-4xl sm:text-6xl font-bold leading-tight">
                            {config.hero_title || heroWorkout.title}
                          </h2>
                          <p className="text-base sm:text-lg text-white/80 line-clamp-3">
                            {config.hero_subtitle || heroWorkout.description || ""}
                          </p>
                          <div className="flex gap-3 pt-2">
                            <Button size="lg" className="bg-white text-black hover:bg-white/90" onClick={() => playWorkout(heroWorkout)}>
                              <Play className="h-5 w-5 mr-2 fill-black" /> Assistir
                            </Button>
                            <Button size="lg" variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0">
                              <Info className="h-5 w-5 mr-2" /> Mais informações
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {orderedCats.map((cat) => (
                    <section key={cat} className="px-4 sm:px-12 max-w-7xl mx-auto">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-3">{cat}</h3>
                      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-thin">
                        {(byCategory.get(cat) ?? []).map((w) => {
                          const thumb = signedUrls[w.id]?.thumb || w.thumbnail_url;
                          return (
                            <button
                              key={w.id}
                              onClick={() => playWorkout(w)}
                              className="group relative shrink-0 snap-start w-[240px] sm:w-[280px] aspect-video rounded-md overflow-hidden bg-neutral-900 transition-transform hover:scale-105 hover:z-10 ring-1 ring-white/5"
                            >
                              {thumb ? (
                                <img src={thumb} alt={w.title} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 grid place-items-center text-white/30"><Video className="h-10 w-10" /></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 group-hover:opacity-100" />
                              <div className="absolute inset-x-0 bottom-0 p-3">
                                <p className="font-medium text-sm line-clamp-1">{w.title}</p>
                                <p className="text-xs text-white/60 line-clamp-1">{w.difficulty || w.category}</p>
                              </div>
                              <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="h-12 w-12 rounded-full bg-white/90 grid place-items-center">
                                  <Play className="h-6 w-6 text-black fill-black ml-0.5" />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setActiveVideo(null)}>
          <div className="bg-background rounded-xl overflow-hidden max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-border">
              <p className="font-medium text-sm">{activeVideo.title}</p>
              <Button size="sm" variant="ghost" onClick={() => setActiveVideo(null)}>Fechar</Button>
            </div>
            <video src={activeVideo.url} controls autoPlay controlsList="nodownload" className="w-full max-h-[70vh] bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}