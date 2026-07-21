import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Loader2, Dumbbell, Video, Play, Info, Timer, Flame, CheckCircle2, X, Volume2, VolumeX, Maximize2, BookOpen } from "lucide-react";

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

function ImmersivePlayer({ title, url, poster, onClose }: { title: string; url: string; poster?: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showChrome, setShowChrome] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); const v = videoRef.current; if (v) { v.paused ? v.play() : v.pause(); } }
      if (e.key === "f" || e.key === "F") { videoRef.current?.requestFullscreen?.(); }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const bumpChrome = () => {
    setShowChrome(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowChrome(false), 2600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in" onMouseMove={bumpChrome}>
      {poster && (
        <img src={poster} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-40 blur-3xl scale-110" />
      )}
      <div className="absolute inset-0 bg-black/70" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className={`absolute top-4 right-4 z-20 h-11 w-11 rounded-full bg-black/60 hover:bg-black/80 text-white grid place-items-center backdrop-blur ring-1 ring-white/20 transition-opacity ${showChrome ? "opacity-100" : "opacity-0"}`}
      >
        <X className="h-5 w-5" />
      </button>
      <div className={`absolute top-4 left-4 right-20 z-20 transition-opacity ${showChrome ? "opacity-100" : "opacity-0"}`}>
        <p className="text-white/60 text-xs uppercase tracking-widest">Assistindo</p>
        <h3 className="text-white font-display text-xl sm:text-2xl truncate drop-shadow">{title}</h3>
      </div>
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        controls
        autoPlay
        controlsList="nodownload"
        className="relative z-10 w-full h-full max-h-screen bg-black object-contain"
      />
    </div>
  );
}

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
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")) return;
    if (!loading && (role === "admin" || isAdminEmail(user?.email))) {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, role, user?.email, navigate]);

  useEffect(() => {
    const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");
    if (loading || !user) return;
    if (!isPreview && (role === "admin" || isAdminEmail(user?.email))) return;
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

  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");
  if (loading || (!isPreview && (role === "admin" || isAdminEmail(user?.email)))) {
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
  const isLight = config.theme === "light";
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
      <Tabs defaultValue="treino" className="flex flex-col min-h-screen w-full">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <h1 className="font-display text-xl sm:text-2xl shrink-0">PERSONAL</h1>
            <TabsList className="h-11 bg-muted/60 p-1 rounded-full">
              <TabsTrigger value="treino" className="rounded-full px-4 data-[state=active]:bg-background data-[state=active]:shadow">
                <Dumbbell className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Meu treino</span>
              </TabsTrigger>
              {showVideos && (
                <TabsTrigger value="aulas" className="rounded-full px-4 data-[state=active]:bg-background data-[state=active]:shadow">
                  <Video className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Aulas em vídeo</span>
                </TabsTrigger>
              )}
            </TabsList>
            <Link
              to="/plataforma/cursos"
              className="inline-flex items-center gap-2 rounded-full px-4 h-10 text-sm bg-muted/60 hover:bg-background transition shrink-0"
            >
              <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Cursos</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user?.email}</p>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="sm:hidden shrink-0" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 min-w-0 w-full flex flex-col">
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
            <div>
              <h2 className="font-display text-3xl">Olá!</h2>
              <p className="text-muted-foreground text-sm">Acompanhe seu treino e {showVideos ? "aulas em vídeo" : "acesse seu plano"}.</p>
            </div>

          <TabsContent value="treino" className="mt-0">
            <TreinoPanel plans={plans} loading={dataLoading} light={config.theme === "light"} />
          </TabsContent>

          {showVideos && (
            <TabsContent value="aulas" className="mt-0 -mx-4 sm:-mx-4">
              {dataLoading ? <Skeleton className="h-64 mx-4" /> : workouts.length === 0 ? (
                <Card className="mx-4"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma aula disponível ainda.</CardContent></Card>
              ) : (
                <div className="space-y-10 pb-12 -mt-2 bg-background text-foreground">
                  {heroWorkout && (
                    <div className="relative h-[72vh] min-h-[460px] w-full overflow-hidden">
                      {(heroBannerUrl || signedUrls[heroWorkout.id]?.thumb || heroWorkout.thumbnail_url) && (
                        <img
                          src={heroBannerUrl || signedUrls[heroWorkout.id]?.thumb || heroWorkout.thumbnail_url || ""}
                          alt={config.hero_title || heroWorkout.title}
                          className="absolute inset-0 w-full h-full object-cover animate-[kenburns_20s_ease-in-out_infinite_alternate]"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                      <div className="relative h-full flex items-end px-4 sm:px-12 pb-16 max-w-7xl mx-auto">
                        <div className="max-w-2xl space-y-4 animate-fade-in">
                          <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground ring-1 ring-primary/40">
                            <Flame className="h-3.5 w-3.5" /> Em destaque
                          </div>
                          <h2 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.05] text-foreground drop-shadow-2xl">
                            {config.hero_title || heroWorkout.title}
                          </h2>
                          <p className="text-base sm:text-lg text-foreground/80 line-clamp-3 drop-shadow max-w-xl">
                            {config.hero_subtitle || heroWorkout.description || ""}
                          </p>
                          <div className="flex gap-3 pt-3">
                            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/30 h-12 px-8 text-base" onClick={() => playWorkout(heroWorkout)}>
                              <Play className="h-5 w-5 mr-2 fill-current" /> Assistir
                            </Button>
                            <Button size="lg" variant="secondary" className="h-12 px-8 text-base backdrop-blur">
                              <Info className="h-5 w-5 mr-2" /> Mais informações
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-background" />
                    </div>
                  )}

                  {orderedCats.map((cat) => (
                    <section key={cat} className="px-4 sm:px-12 max-w-7xl mx-auto">
                      <h3 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-3">
                        <span className="inline-block h-6 w-1.5 rounded-full bg-primary" /> {cat}
                      </h3>
                      <div className="relative">
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scroll-smooth">
                        {(byCategory.get(cat) ?? []).map((w) => {
                          const thumb = signedUrls[w.id]?.thumb || w.thumbnail_url;
                          return (
                            <button
                              key={w.id}
                              onClick={() => playWorkout(w)}
                              className="group relative shrink-0 snap-start w-[260px] sm:w-[320px] aspect-video rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.08] hover:z-10 hover:shadow-2xl hover:shadow-primary/30 bg-muted ring-1 ring-border hover:ring-2 hover:ring-primary"
                            >
                              {thumb ? (
                                <img src={thumb} alt={w.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              ) : (
                                <div className="absolute inset-0 grid place-items-center text-muted-foreground/40"><Video className="h-10 w-10" /></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-90 group-hover:opacity-100" />
                              <div className="absolute inset-x-0 bottom-0 p-4 text-white translate-y-1 group-hover:translate-y-0 transition-transform">
                                <p className="font-semibold text-sm sm:text-base line-clamp-1 drop-shadow">{w.title}</p>
                                <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{w.difficulty || w.category}</p>
                              </div>
                              <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                                <div className="h-14 w-14 rounded-full bg-primary grid place-items-center shadow-2xl shadow-primary/50 ring-4 ring-white/20">
                                  <Play className="h-6 w-6 text-primary-foreground fill-current ml-0.5" />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        </div>
                        <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-background to-transparent" />
                        <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-background to-transparent" />
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
          </main>
        </div>
      </Tabs>
      {activeVideo && (
        <ImmersivePlayer
          title={activeVideo.title}
          url={activeVideo.url}
          poster={signedUrls[activeVideo.id]?.thumb || workouts.find((w) => w.id === activeVideo.id)?.thumbnail_url || undefined}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}