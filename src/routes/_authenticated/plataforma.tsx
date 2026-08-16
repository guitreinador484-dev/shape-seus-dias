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
import { LogOut, Loader2, Dumbbell, Video, Play, Info, Timer, Flame, CheckCircle2, X, Menu, Megaphone, ListVideo, Lock, Ban, AlertCircle, RefreshCw, Apple, TrendingUp, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { VideoPlayer } from "@/components/platform/video-player";
import LeftSidebar from "@/components/ui/left-sidebar";
import { NutritionTab } from "@/components/platform/nutrition-tab";
import { EvolutionTab } from "@/components/platform/evolution-tab";
import { CheckinCard } from "@/components/platform/checkin-card";
import { AnamneseTab } from "@/components/platform/anamnese-tab";
import { ReferralCard } from "@/components/platform/referral-card";

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
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_type: "info" | "success" | "warning" | "purple";
};
const defaultConfig: PlatformConfig = {
  hero_workout_id: "",
  hero_title: "",
  hero_subtitle: "",
  hero_image_path: "",
  row_order: "",
  theme: "dark",
  announcement_enabled: false,
  announcement_text: "",
  announcement_type: "info",
};
function readConfig(value: Json | null): PlatformConfig {
  const d = (value && typeof value === "object" && !Array.isArray(value)) ? (value as Record<string, unknown>) : {};
  const validAnnounceTypes = ["info", "success", "warning", "purple"];
  const annType = typeof d.platform_announcement_type === "string" && validAnnounceTypes.includes(d.platform_announcement_type)
    ? (d.platform_announcement_type as "info" | "success" | "warning" | "purple")
    : "info";

  return {
    hero_workout_id: typeof d.platform_hero_workout_id === "string" ? d.platform_hero_workout_id : "",
    hero_title: typeof d.platform_hero_title === "string" ? d.platform_hero_title : "",
    hero_subtitle: typeof d.platform_hero_subtitle === "string" ? d.platform_hero_subtitle : "",
    hero_image_path: typeof d.platform_hero_image_path === "string" ? d.platform_hero_image_path : "",
    row_order: typeof d.platform_row_order === "string" ? d.platform_row_order : "",
    theme: d.platform_theme === "light" ? "light" : "dark",
    announcement_enabled: typeof d.platform_announcement_enabled === "boolean" ? d.platform_announcement_enabled : false,
    announcement_text: typeof d.platform_announcement_text === "string" ? d.platform_announcement_text : "",
    announcement_type: annType,
  };
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function EmbedOverlay({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 animate-fade-in bg-black/95 p-0 sm:p-6">
      <button
        type="button" onClick={onClose} aria-label="Fechar"
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur hover:bg-white/20"
      ><X className="h-5 w-5" /></button>
      <iframe
        src={url}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full rounded-none border-0 bg-black sm:rounded-2xl"
      />
    </div>
  );
}

/** Converts YouTube/Vimeo links into embeddable URLs; returns null when not embeddable. */
function toEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const h = u.hostname.replace("www.", "");
    if (h === "youtube.com" || h === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      if (u.pathname.startsWith("/embed/")) return raw;
    }
    if (h === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1&rel=0&modestbranding=1`;
    if (h === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}?autoplay=1`;
    if (h === "player.vimeo.com") return raw;
    return null;
  } catch { return null; }
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

  // Sincroniza o estado com o que veio do banco (exercícios já marcados).
  useEffect(() => {
    const completedIds = plans.flatMap((p) => p.exercises).filter((e) => e.completed_at).map((e) => e.id);
    setDone(new Set(completedIds));
  }, [plans]);

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
    const wasDone = done.has(id);
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    // Persiste no banco (optimistic; reverte em caso de erro).
    supabase
      .from("student_plan_exercises")
      .update({ completed_at: wasDone ? null : new Date().toISOString() })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          toast.error("Erro ao salvar progresso", { description: error.message });
          setDone((prev) => {
            const next = new Set(prev);
            if (next.has(id) === wasDone) {
              if (next.has(id)) next.delete(id); else next.add(id);
            }
            return next;
          });
        }
      });
  }

  return (
    <div className="space-y-6">
      {/* Day chips */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
        {WEEKDAYS_SHORT.map((label, idx) => {
          const has = plans.some((p) => p.day_of_week === idx);
          const active = idx === selectedDay;
          const isToday = idx === today;
          return (
            <button
              key={idx}
              disabled={!has}
              onClick={() => has && setSelectedDay(idx)}
              className={`shrink-0 w-16 h-18 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all duration-200 backdrop-blur-md ${
                active
                  ? "bg-primary text-primary-foreground border-primary/50 shadow-lg shadow-primary/30 scale-105"
                  : has
                  ? "bg-white/5 border-white/10 hover:border-primary/40 hover:bg-white/10 text-foreground"
                  : "bg-white/[0.02] border-white/5 text-muted-foreground/30 cursor-not-allowed"
              }`}
            >
              <span className="text-[10px] font-medium tracking-wider uppercase opacity-70">{label}</span>
              <span className="font-display text-xl leading-none">{has ? "•" : "·"}</span>
              {isToday && !active && <span className="text-[9px] uppercase font-bold text-primary">hoje</span>}
            </button>
          );
        })}
      </div>

      {/* Day hero / stats glass block */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-300 ${
        light ? "bg-card border border-border" : "glass-block shadow-2xl"
      }`}>
        {!light && <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/25 blur-3xl pointer-events-none" />}
        {light && <div className="absolute left-0 top-0 h-full w-1.5 bg-primary" />}
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold">{WEEKDAYS[selectedDay]}</p>
            <h3 className="font-display text-3xl sm:text-5xl mt-1 tracking-tight text-white drop-shadow">
              {dayPlans.map((p) => p.plan_name).join(" + ") || "Descanso"}
            </h3>
          </div>
          <div className="flex gap-4 sm:gap-6 text-sm">
            <div className="glass-pill rounded-2xl px-4.5 py-3 text-center min-w-[85px]">
              <p className="text-2xl font-display leading-none text-white">{totalEx}</p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">exercícios</p>
            </div>
            <div className="glass-pill rounded-2xl px-4.5 py-3 text-center min-w-[85px]">
              <p className="text-2xl font-display leading-none text-white">{totalSets}</p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">séries</p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/15 backdrop-blur-xl px-4.5 py-3 text-center min-w-[85px] shadow-lg shadow-primary/20">
              <p className="text-2xl font-display leading-none text-primary">{progress}%</p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">concluído</p>
            </div>
          </div>
        </div>
        <div className="relative mt-6 h-2 w-full rounded-full bg-white/10 overflow-hidden shadow-inner">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #7C5CFF 0%, #5B8CFF 100%)",
              boxShadow: progress > 0 ? "0 0 16px rgba(124,92,255,0.7)" : undefined,
            }}
          />
        </div>
      </div>

      {/* Plans + exercises glass blocks */}
      {dayPlans.length === 0 ? (
        <Card className="border-dashed border-white/14 bg-white/[0.02] backdrop-blur-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum treino programado para {WEEKDAYS[selectedDay].toLowerCase()}. Aproveite para descansar.
          </CardContent>
        </Card>
      ) : dayPlans.map((plan) => (
        <div key={plan.id} className="glass-block rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/20 border border-primary/30 text-primary grid place-items-center shadow-lg shadow-primary/20">
                <Flame className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-base text-white truncate">{plan.plan_name}</p>
                <p className="text-xs text-muted-foreground">{plan.exercises.length} exercícios</p>
              </div>
            </div>
          </div>
          {plan.exercises.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum exercício adicionado ainda.</p>
          ) : (
            <ol className="divide-y divide-white/5">
              {plan.exercises.map((ex, i) => {
                const isDone = done.has(ex.id);
                return (
                  <li key={ex.id} className={`group flex items-start gap-4 p-4 sm:p-5 transition-all duration-200 ${isDone ? "bg-primary/8" : "hover:bg-white/[0.04]"}`}>
                    <button
                      onClick={() => toggle(ex.id)}
                      className={`shrink-0 h-10 w-10 rounded-2xl grid place-items-center font-display text-sm transition-all duration-200 ${
                        isDone
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-105"
                          : "bg-white/5 text-muted-foreground border border-white/10 group-hover:border-primary/50 group-hover:text-white"
                      }`}
                      aria-label={isDone ? "Desmarcar" : "Marcar como feito"}
                    >
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : String(i + 1).padStart(2, "0")}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm sm:text-base leading-tight ${isDone ? "line-through text-muted-foreground/60" : "text-white"}`}>{ex.exercise_name}</p>
                      {ex.notes && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ex.notes}</p>}
                      <div className="flex flex-wrap gap-2 mt-2.5 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 border border-primary/20 text-primary px-3 py-1 font-semibold tabular-nums backdrop-blur-md">
                          <span className="font-display text-sm">{ex.sets}</span>
                          <span className="opacity-60">×</span>
                          <span className="font-display text-sm">{ex.reps}</span>
                        </span>
                        {ex.rest_seconds ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted-foreground backdrop-blur-md">
                            <Timer className="h-3 w-3 text-primary" /> {ex.rest_seconds}s
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
  const [isActive, setIsActive] = useState<boolean>(true);
  const [accessExpiresAt, setAccessExpiresAt] = useState<string | null>(null);
  const isExpired = accessExpiresAt !== null && new Date(accessExpiresAt).getTime() <= Date.now();
  const [signedUrls, setSignedUrls] = useState<Record<string, { video?: string; thumb?: string }>>({});
  const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
  const [heroBannerUrl, setHeroBannerUrl] = useState<string>("");
  const [activeVideo, setActiveVideo] = useState<{ id: string; url: string; title: string; startAt?: number } | null>(null);
  const [embedVideo, setEmbedVideo] = useState<{ url: string; title: string } | null>(null);
  const [workoutProgress, setWorkoutProgress] = useState<Record<string, { watched_seconds: number; completed_at: string | null }>>({});
  const lastSavedRef = useRef<Record<string, number>>({});
  const [dataError, setDataError] = useState<string | null>(null);

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
      setDataError(null);
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("has_class_access, is_active, access_expires_at")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (profileError) {
          const msg = profileError.message || profileError.details || profileError.hint || "Erro ao carregar perfil";
          throw new Error(msg);
        }
        setHasClassAccess(Boolean(profile?.has_class_access));
        setIsActive(profile?.is_active ?? true);
        setAccessExpiresAt(profile?.access_expires_at ?? null);
        const expiresAt = profile?.access_expires_at ? new Date(profile.access_expires_at).getTime() : null;
        const expired = expiresAt !== null && expiresAt <= Date.now();
        const hasAccess = Boolean(profile?.has_class_access) && (profile?.is_active ?? true) && !expired;
        if (!hasAccess) {
          setPlans([]);
          setWorkouts([]);
          setWorkoutProgress({});
          setConfig(defaultConfig);
          setDataLoading(false);
          return;
        }
        const [plansRes, exRes, workoutsRes, cfgRes, progRes] = await Promise.all([
          supabase.from("student_plans").select("*").eq("student_id", user.id).order("day_of_week", { ascending: true }),
          supabase.from("student_plan_exercises").select("*").order("display_order", { ascending: true }),
          supabase.from("workouts").select("*").order("display_order", { ascending: true }),
          supabase.from("quiz_config").select("content").eq("section", "configuracoes").order("updated_at", { ascending: false }).limit(1),
          supabase.from("workout_progress").select("workout_id, watched_seconds, completed_at").eq("user_id", user.id),
        ]);
        if (cancelled) return;
        const firstError = [plansRes, exRes, workoutsRes, cfgRes, progRes].find((r) => r.error);
        if (firstError?.error) {
          const err = firstError.error;
          throw new Error(err.message || err.details || err.hint || "Erro ao carregar dados da plataforma");
        }
        const allPlans = plansRes.data ?? [];
        const allEx = exRes.data ?? [];
        setPlans(allPlans.map((p) => ({ ...p, exercises: allEx.filter((e) => e.plan_id === p.id) })));
        setWorkouts(workoutsRes.data ?? []);
        setConfig(readConfig(cfgRes.data?.[0]?.content ?? null));
        setWorkoutProgress(Object.fromEntries((progRes.data ?? []).map((p) => [p.workout_id, { watched_seconds: p.watched_seconds, completed_at: p.completed_at }])));
      } catch (e) {
        if (!cancelled) setDataError(e instanceof Error ? e.message : String(e) || "Erro ao carregar a plataforma");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, user, role]);

  useEffect(() => {
    if (!hasClassAccess || !isActive || !config.hero_image_path) { setHeroBannerUrl(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("workout-thumbnails").createSignedUrl(config.hero_image_path, 3600);
      if (!cancelled && data?.signedUrl) setHeroBannerUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [hasClassAccess, isActive, config.hero_image_path]);

  useEffect(() => {
    if (!hasClassAccess || !isActive || workouts.length === 0) return;
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
  }, [hasClassAccess, isActive, workouts]);

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

  const showVideos = hasClassAccess && isActive;
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
    if (!url) {
      if (w.video_url) {
        const embed = toEmbedUrl(w.video_url);
        if (embed) setEmbedVideo({ url: embed, title: w.title });
        else setActiveVideo({ id: w.id, url: w.video_url, title: w.title });
      }
      return;
    }
    const saved = workoutProgress[w.id];
    const resumed = saved && !saved.completed_at && saved.watched_seconds > 30;
    const workout = workouts.find((x) => x.id === w.id);
    const dur = (workout?.duration_minutes ?? 0) * 60;
    const startAt = resumed && (!dur || saved.watched_seconds < dur - 10) ? saved.watched_seconds : 0;
    setActiveVideo({ id: w.id, url, title: w.title, startAt });
  }

  function persistWorkoutProgress(id: string, seconds: number, completedAt: string | null) {
    if (!user) return;
    supabase
      .from("workout_progress")
      .upsert(
        { user_id: user.id, workout_id: id, watched_seconds: Math.floor(seconds), completed_at: completedAt },
        { onConflict: "user_id,workout_id" },
      )
      .then(({ error }) => {
        if (error) console.error("[workout] falha ao salvar progresso", error.message);
      });
    setWorkoutProgress((prev) => ({ ...prev, [id]: { watched_seconds: Math.floor(seconds), completed_at: completedAt } }));
  }

  function onWorkoutTime(id: string) {
    return (seconds: number, duration: number) => {
      const cur = Math.floor(seconds);
      const last = lastSavedRef.current[id] ?? 0;
      const nearEnd = duration > 0 && cur >= duration - 2;
      if (cur >= last + 10 || nearEnd) {
        lastSavedRef.current[id] = cur;
        persistWorkoutProgress(id, cur, null);
      }
    };
  }

  function onWorkoutEnded(id: string) {
    const dur = (workouts.find((w) => w.id === id)?.duration_minutes ?? 0) * 60;
    persistWorkoutProgress(id, dur, new Date().toISOString());
  }

  /** Next playable workout in the same category, for the "next up" prompt. */
  function nextPlayable(currentId: string): Workout | null {
    const cat = workouts.find((w) => w.id === currentId)?.category;
    const list = workouts.filter((w) => (w.category || "Geral") === (cat || "Geral"));
    const idx = list.findIndex((w) => w.id === currentId);
    for (let i = idx + 1; i < list.length; i++) {
      if (signedUrls[list[i].id]?.video) return list[i];
    }
    return null;
  }

  const activeWorkout = activeVideo ? workouts.find((w) => w.id === activeVideo.id) ?? null : null;
  const moduleVideos = activeWorkout
    ? workouts.filter((w) => (w.category || "Geral") === (activeWorkout.category || "Geral"))
    : [];

  return (
    <div className={`relative min-h-screen bg-[#0A0A0B] text-foreground overflow-x-hidden ${config.theme === "light" ? "platform-light" : ""}`}>
      {/* Background ambient light orbs for real glass refraction */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[450px] w-[450px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute bottom-10 left-10 h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[130px]" />
      </div>

      <Tabs defaultValue="treino" className="relative z-10 flex flex-col min-h-screen w-full">
        <header className="sticky top-0 z-30 border-b border-white/12 bg-[#0A0A0B]/70 backdrop-blur-2xl backdrop-saturate-150">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <h1 className="font-display text-xl sm:text-2xl shrink-0 text-white tracking-wider">PERSONAL</h1>
            <TabsList className="h-11 bg-white/5 border border-white/12 p-1 rounded-full backdrop-blur-xl shadow-inner">
              <TabsTrigger value="treino" className="rounded-full px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/35 transition-all">
                <Dumbbell className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Meu treino</span>
              </TabsTrigger>
              {showVideos && (
                <TabsTrigger value="aulas" className="rounded-full px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/35 transition-all">
                  <Video className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Aulas em vídeo</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="dieta" className="rounded-full px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/35 transition-all">
                <Apple className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Dieta</span>
              </TabsTrigger>
              <TabsTrigger value="evolucao" className="rounded-full px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/35 transition-all">
                <TrendingUp className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Evolução</span>
              </TabsTrigger>
              <TabsTrigger value="ficha" className="rounded-full px-5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/35 transition-all">
                <ClipboardList className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Ficha</span>
              </TabsTrigger>
            </TabsList>

            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <p className="text-xs text-white/40 truncate max-w-[160px] font-mono">{user?.email}</p>
              <Button variant="ghost" size="sm" onClick={signOut} className="rounded-xl text-white/60 hover:text-white hover:bg-white/10">
                <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="sm:hidden shrink-0 rounded-xl text-white/60 hover:text-white hover:bg-white/10" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {config.announcement_enabled && config.announcement_text && (
          <div className={`w-full py-3 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 border-b backdrop-blur-xl ${
            config.announcement_type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : config.announcement_type === "warning" ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
            : config.announcement_type === "purple" ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
            : "bg-primary/10 border-primary/20 text-primary-foreground"
          }`}>
            <Megaphone className="h-4 w-4 shrink-0 text-primary" />
            <span>{config.announcement_text}</span>
          </div>
        )}

        <div className="flex-1 min-w-0 w-full flex flex-col">
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
            {dataError ? (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="py-12 text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-2xl text-white tracking-tight">Não foi possível carregar a plataforma</h2>
                  <p className="text-sm text-white/60 max-w-md mx-auto">{dataError}</p>
                  <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : !isActive && !dataLoading ? (
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="py-12 text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-500">
                    <Ban className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-3xl text-white tracking-tight">Acesso bloqueado</h2>
                  <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
                    Sua conta foi desativada. Fale com seu personal trainer para reativar o acesso.
                  </p>
                  <p className="text-xs text-white/40 pt-1">{user?.email}</p>
                </CardContent>
              </Card>
            ) : isExpired && !dataLoading ? (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="py-12 text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
                    <Timer className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-3xl text-white tracking-tight">Acesso expirado</h2>
                  <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
                    Seu período de acesso chegou ao fim. Fale com seu personal trainer para renovar e continuar treinando.
                  </p>
                  <p className="text-xs text-white/40 pt-1">{user?.email}</p>
                </CardContent>
              </Card>
            ) : !hasClassAccess && !dataLoading ? (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-12 text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h2 className="font-display text-3xl text-white tracking-tight">Acesso pendente</h2>
                  <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
                    Sua conta foi criada, mas o acesso à plataforma ainda não foi liberado.
                    Assim que o pagamento for confirmado, seu personal libera o seu acesso.
                  </p>
                  <p className="text-xs text-white/40 pt-1">{user?.email}</p>
                </CardContent>
              </Card>
            ) : (
            <>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-3xl sm:text-4xl text-white tracking-tight">Olá!</h2>
                {accessExpiresAt && !isExpired && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70">
                    <Timer className="h-3 w-3 text-primary" />
                    Acesso até {new Date(accessExpiresAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-sm mt-1">Acompanhe seu treino e {showVideos ? "aulas em vídeo" : "acesse seu plano"}.</p>
            </div>

          <TabsContent value="treino" className="mt-0">
            {user ? <CheckinCard userId={user.id} /> : null}
            {user && showVideos && !isExpired ? <ReferralCard userId={user.id} /> : null}
            <TreinoPanel plans={plans} loading={dataLoading} light={config.theme === "light"} />
          </TabsContent>

          <TabsContent value="dieta" className="mt-0">
            {user ? <NutritionTab userId={user.id} /> : null}
          </TabsContent>

          <TabsContent value="evolucao" className="mt-0">
            {user ? <EvolutionTab userId={user.id} /> : null}
          </TabsContent>

          <TabsContent value="ficha" className="mt-0">
            {user ? <AnamneseTab userId={user.id} /> : null}
          </TabsContent>

          {showVideos && (
            <TabsContent value="aulas" className="mt-0 -mx-4 sm:-mx-4">
              {dataLoading ? <Skeleton className="h-64 mx-4" /> : workouts.length === 0 ? (
                <Card className="mx-4"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma aula disponível ainda.</CardContent></Card>
              ) : (
                <div className="space-y-10 pb-12 -mt-2 bg-background text-foreground">
                  {activeVideo && activeWorkout && (
                    <div className="px-4 sm:px-12 max-w-7xl mx-auto pt-2">
                      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                        {/* Player + título da aula */}
                        <div className="min-w-0 space-y-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                              {activeWorkout.category || "Assistindo"}
                            </p>
                            <h2 className="mt-1 font-display text-3xl leading-none sm:text-4xl">{activeWorkout.title}</h2>
                            {activeWorkout.duration_minutes ? (
                              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Timer className="h-3.5 w-3.5" /> {activeWorkout.duration_minutes} min
                              </p>
                            ) : null}
                          </div>
                          <div className="aspect-video overflow-hidden rounded-2xl border border-border/50 bg-black shadow-2xl shadow-black/40">
                            <VideoPlayer
                              key={activeVideo.id}
                              src={activeVideo.url}
                              poster={signedUrls[activeVideo.id]?.thumb || activeWorkout.thumbnail_url || undefined}
                              subtitle={activeWorkout.category || "Assistindo"}
                              autoPlay={false}
                              startAt={activeVideo.startAt ?? 0}
                              onTime={onWorkoutTime(activeVideo.id)}
                              onEnded={nextPlayable(activeVideo.id) ? () => { onWorkoutEnded(activeVideo.id); playWorkout(nextPlayable(activeVideo.id)!); } : () => onWorkoutEnded(activeVideo.id)}
                              onNext={nextPlayable(activeVideo.id) ? () => { onWorkoutEnded(activeVideo.id); playWorkout(nextPlayable(activeVideo.id)!); } : undefined}
                              nextLabel="Próxima aula"
                              onClose={() => setActiveVideo(null)}
                              className="h-full w-full"
                            />
                          </div>
                        </div>

                        {/* Lista lateral: próximos vídeos */}
                        <aside className="min-w-0 space-y-3 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-1">
                          <div className="flex items-center gap-2">
                            <ListVideo className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Próximos vídeos</p>
                          </div>
                          <div className="space-y-1">
                            {moduleVideos.map((w) => {
                              const isActive = w.id === activeVideo.id;
                              const thumb = signedUrls[w.id]?.thumb || w.thumbnail_url;
                              return (
                                <button
                                  key={w.id}
                                  onClick={() => playWorkout(w)}
                                  className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                                    isActive
                                      ? "border-primary/40 bg-primary/10"
                                      : "border-transparent hover:border-border/60 hover:bg-accent/50"
                                  }`}
                                >
                                  <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                                    {thumb ? (
                                      <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                                    ) : (
                                      <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/20 via-card to-background/80 text-foreground/40">
                                        <Video className="h-5 w-5" />
                                      </span>
                                    )}
                                    {isActive && (
                                      <span className="absolute inset-0 grid place-items-center bg-black/40">
                                        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-white/30">
                                          <Play className="ml-0.5 h-4 w-4 fill-current" />
                                        </span>
                                      </span>
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className={`block truncate text-sm font-medium ${isActive ? "text-primary" : "text-foreground/85"}`}>
                                      {w.title}
                                    </span>
                                    {w.description && (
                                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-foreground/50">
                                        {w.description}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </aside>
                      </div>
                    </div>
                  )}

                  {!activeVideo && heroWorkout && (
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
                      <h3 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-3 text-white">
                        <span className="inline-block h-6 w-1.5 rounded-full bg-primary shadow-sm shadow-primary/50" /> {cat}
                      </h3>
                      <div className="relative">
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none scroll-smooth">
                        {(byCategory.get(cat) ?? []).map((w) => {
                          const thumb = signedUrls[w.id]?.thumb || w.thumbnail_url;
                          return (
                            <button
                              key={w.id}
                              onClick={() => playWorkout(w)}
                              className="group relative shrink-0 snap-start w-[260px] sm:w-[320px] aspect-video rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.04] hover:z-10 hover:shadow-2xl hover:shadow-primary/30 bg-[#131316]/80 backdrop-blur-md border border-white/10 hover:border-primary/50"
                            >
                              {thumb ? (
                                <img src={thumb} alt={w.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="absolute inset-0 grid place-items-center text-muted-foreground/40"><Video className="h-10 w-10" /></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute inset-x-0 bottom-0 p-4 text-white translate-y-1 group-hover:translate-y-0 transition-transform">
                                <p className="font-semibold text-sm sm:text-base line-clamp-1 drop-shadow text-white">{w.title}</p>
                                <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{w.difficulty || w.category}</p>
                              </div>
                              <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                                <div className="h-14 w-14 rounded-2xl bg-primary grid place-items-center shadow-2xl shadow-primary/50 ring-4 ring-white/20">
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
            </>
            )}
          </main>
        </div>
      </Tabs>
      {embedVideo && (
        <EmbedOverlay title={embedVideo.title} url={embedVideo.url} onClose={() => setEmbedVideo(null)} />
      )}
    </div>
  );
}