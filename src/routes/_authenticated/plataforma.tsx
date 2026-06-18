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
import { LogOut, Loader2, Dumbbell, Video, Play, Info, Timer, Flame, CheckCircle2 } from "lucide-react";

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
  theme: "dark" | "light";
};
const defaultConfig: PlatformConfig = { hero_workout_id: "", hero_title: "", hero_subtitle: "", hero_image_path: "", row_order: "", theme: "dark" };
function readConfig(value: Json | null): PlatformConfig {
  const d = (value && typeof value === "object" && !Array.isArray(value)) ? (value as Record<string, unknown>) : {};
  return {
    hero_workout_id: typeof d.platform_hero_workout_id === "string" ? d.platform_hero_workout_id : "",
    hero_title: typeof d.platform_hero_title === "string" ? d.platform_hero_title : "",
    hero_subtitle: typeof d.platform_hero_subtitle === "string" ? d.platform_hero_subtitle : "",
    hero_image_path: typeof d.platform_hero_image_path === "string" ? d.platform_hero_image_path : "",
    row_order: typeof d.platform_row_order === "string" ? d.platform_row_order : "",
    theme: d.platform_theme === "light" ? "light" : "dark",
  };
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function TreinoPanel({ plans, loading, light }: { plans: PlanWithExercises[]; loading: boolean; light: boolean }) {
  const today = new Date().getDay();
  const availableDays = Array.from(new Set(plans.map((p) => p.day_of_week))).sort();
  const initial = availableDays.includes(today) ? today : availableDays[0] ?? today;
  const [selectedDay, setSelectedDay] = useState<number>(initial);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!availableDays.includes(selectedDay) && availableDays.length > 0) {
      setSelectedDay(availableDays[0]);
    }
  }, [plans]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Skeleton className="h-64" />;
  if (plans.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted grid place-items-center">
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-display text-xl">Sem treino cadastrado</p>
          <p className="text-sm text-muted-foreground">Seu personal ainda não montou seu plano. Fale com ele para começar.</p>
        </CardContent>
      </Card>
    );
  }

  const dayPlans = plans.filter((p) => p.day_of_week === selectedDay);
  const totalEx = dayPlans.reduce((acc, p) => acc + p.exercises.length, 0);
  const totalSets = dayPlans.reduce((acc, p) => acc + p.exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0), 0);
  const completed = dayPlans.reduce((acc, p) => acc + p.exercises.filter((e) => done.has(e.id)).length, 0);
  const progress = totalEx ? Math.round((completed / totalEx) * 100) : 0;

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Day chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {WEEKDAYS_SHORT.map((label, idx) => {
          const has = plans.some((p) => p.day_of_week === idx);
          const active = idx === selectedDay;
          const isToday = idx === today;
          return (
            <button
              key={idx}
              disabled={!has}
              onClick={() => has && setSelectedDay(idx)}
              className={`shrink-0 w-14 h-16 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30 scale-105"
                  : has
                  ? "bg-card border-border hover:border-primary/50"
                  : "bg-muted/30 border-border/50 text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <span className="text-[10px] font-medium tracking-wider opacity-70">{label}</span>
              <span className="font-display text-lg leading-none">{has ? "•" : "·"}</span>
              {isToday && !active && <span className="text-[9px] uppercase font-bold text-primary">hoje</span>}
            </button>
          );
        })}
      </div>

      {/* Day hero / stats */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 ${light ? "bg-card border-border" : "border-border bg-gradient-to-br from-primary/15 via-card to-card"}`}>
        {!light && <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />}
        {light && <div className="absolute left-0 top-0 h-full w-1.5 bg-primary" />}
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">{WEEKDAYS[selectedDay]}</p>
            <h3 className="font-display text-3xl sm:text-4xl mt-1">
              {dayPlans.map((p) => p.plan_name).join(" + ") || "Descanso"}
            </h3>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-2xl font-display leading-none">{totalEx}</p>
              <p className="text-xs text-muted-foreground mt-1">exercícios</p>
            </div>
            <div>
              <p className="text-2xl font-display leading-none">{totalSets}</p>
              <p className="text-xs text-muted-foreground mt-1">séries</p>
            </div>
            <div>
              <p className="text-2xl font-display leading-none text-primary">{progress}%</p>
              <p className="text-xs text-muted-foreground mt-1">concluído</p>
            </div>
          </div>
        </div>
        <div className="relative mt-5 h-1.5 w-full rounded-full bg-background/60 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Plans + exercises */}
      {dayPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum treino programado para {WEEKDAYS[selectedDay].toLowerCase()}. Aproveite para descansar.
          </CardContent>
        </Card>
      ) : dayPlans.map((plan) => (
        <div key={plan.id} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/15 text-primary grid place-items-center">
                <Flame className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{plan.plan_name}</p>
                <p className="text-xs text-muted-foreground">{plan.exercises.length} exercícios</p>
              </div>
            </div>
          </div>
          {plan.exercises.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nenhum exercício adicionado ainda.</p>
          ) : (
            <ol className="divide-y divide-border">
              {plan.exercises.map((ex, i) => {
                const isDone = done.has(ex.id);
                return (
                  <li key={ex.id} className={`group flex items-start gap-4 p-4 sm:p-5 transition-colors ${isDone ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                    <button
                      onClick={() => toggle(ex.id)}
                      className={`shrink-0 h-10 w-10 rounded-full grid place-items-center font-display text-sm transition-all ${
                        isDone
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground border border-border group-hover:border-primary/50"
                      }`}
                      aria-label={isDone ? "Desmarcar" : "Marcar como feito"}
                    >
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : String(i + 1).padStart(2, "0")}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium leading-tight ${isDone ? "line-through text-muted-foreground" : ""}`}>{ex.exercise_name}</p>
                      {ex.notes && <p className="text-xs text-muted-foreground mt-1">{ex.notes}</p>}
                      <div className="flex flex-wrap gap-2 mt-2.5 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 font-semibold tabular-nums">
                          <span className="font-display text-sm">{ex.sets}</span>
                          <span className="opacity-60">×</span>
                          <span className="font-display text-sm">{ex.reps}</span>
                        </span>
                        {ex.rest_seconds ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-muted-foreground">
                            <Timer className="h-3 w-3" /> {ex.rest_seconds}s
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}

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
    <div className={`min-h-screen bg-background text-foreground ${config.theme === "light" ? "platform-light" : ""}`}>
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

        <Tabs defaultValue="treino" orientation="vertical" className="flex flex-col sm:flex-row gap-6 items-start">
          <TabsList className="flex sm:flex-col h-auto w-full sm:w-56 shrink-0 gap-1 bg-muted/40 p-2 justify-start">
            <TabsTrigger value="treino" className="w-full justify-start data-[state=active]:bg-background">
              <Dumbbell className="h-4 w-4 mr-2" /> Meu treino
            </TabsTrigger>
            {showVideos && (
              <TabsTrigger value="aulas" className="w-full justify-start data-[state=active]:bg-background">
                <Video className="h-4 w-4 mr-2" /> Aulas em vídeo
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 min-w-0 w-full">
          <TabsContent value="treino" className="mt-0">
            <TreinoPanel plans={plans} loading={dataLoading} />
          </TabsContent>

          {showVideos && (
            <TabsContent value="aulas" className="mt-0 -mx-4 sm:-mx-4">
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
          </div>
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