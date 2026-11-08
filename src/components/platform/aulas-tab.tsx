import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ListVideo, Play, Timer, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPlatformLessons,
  LESSONS_STALE_MS,
  platformLessonsKey,
  type PlatformConfig,
  type PlatformLessons,
  type Workout,
} from "@/lib/platform-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/platform/video-player";
import { cn } from "@/lib/utils";

function EmbedOverlay({
  title,
  url,
  onClose,
}: {
  title: string;
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 animate-fade-in bg-black/95 p-0 sm:p-6">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-secondary text-foreground ring-1 ring-border hover:bg-surface-2"
      >
        <X className="h-5 w-5" />
      </button>
      <iframe
        src={url}
        title={title}
        allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full rounded-none border-0 bg-black sm:rounded-lg"
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
    if (h === "youtu.be")
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1&rel=0&modestbranding=1`;
    if (h === "vimeo.com")
      return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}?autoplay=1`;
    if (h === "player.vimeo.com") return raw;
    return null;
  } catch {
    return null;
  }
}

function LessonCard({
  workout,
  thumb,
  percent,
  completed,
  onPlay,
}: {
  workout: Workout;
  thumb?: string | null;
  percent: number;
  completed: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group w-[230px] shrink-0 snap-start text-left sm:w-[280px]"
    >
      <span className="relative block aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted-foreground/50">
            <Video className="h-8 w-8" />
          </span>
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-150 group-hover:bg-black/40 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
        {completed ? (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
            <Check className="h-3 w-3" strokeWidth={3} /> Assistida
          </span>
        ) : null}
        {percent > 0 && !completed ? (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
            <span className="block h-full bg-primary" style={{ width: `${percent}%` }} />
          </span>
        ) : null}
      </span>
      <span className="mt-2 block truncate text-sm font-semibold text-foreground">
        {workout.title}
      </span>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
        {[workout.duration_minutes ? `${workout.duration_minutes} min` : null, workout.difficulty]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </button>
  );
}

function LessonRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 font-display text-2xl leading-none text-foreground">{title}</h3>
      <div className="-mx-3 flex snap-x scroll-px-3 gap-3 overflow-x-auto px-3 pb-1 scrollbar-none sm:mx-0 sm:scroll-px-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}

export function AulasTab({ userId, config }: { userId: string; config: PlatformConfig }) {
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: platformLessonsKey(userId),
    queryFn: () => fetchPlatformLessons(userId, config.hero_image_path),
    staleTime: LESSONS_STALE_MS,
    gcTime: LESSONS_STALE_MS,
  });
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    url: string;
    title: string;
    startAt?: number;
  } | null>(null);
  const [embedVideo, setEmbedVideo] = useState<{ url: string; title: string } | null>(null);
  const lastSavedRef = useRef<Record<string, number>>({});

  if (isPending) {
    return (
      <div className="space-y-6" aria-hidden>
        <Skeleton className="h-72" />
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="aspect-video w-[230px] shrink-0 sm:w-[280px]" />
          <Skeleton className="aspect-video w-[230px] shrink-0 sm:w-[280px]" />
          <Skeleton className="aspect-video w-[230px] shrink-0 sm:w-[280px]" />
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <p className="font-medium">Não foi possível carregar as aulas.</p>
          <Button variant="outline" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { workouts, progress, signedUrls, heroBannerUrl } = data;
  if (workouts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma aula disponível ainda.
        </CardContent>
      </Card>
    );
  }

  const heroWorkout =
    workouts.find((w) => w.id === config.hero_workout_id) ??
    workouts.find((w) => w.is_featured) ??
    workouts[0];
  const byCategory = new Map<string, Workout[]>();
  workouts.forEach((w) => {
    const cat = w.category || "Geral";
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), w]);
  });
  const orderedCats = (() => {
    const cats = Array.from(byCategory.keys());
    const preferred = config.row_order
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const head = preferred.filter((c) => byCategory.has(c));
    const tail = cats.filter((c) => !head.includes(c));
    return [...head, ...tail];
  })();
  const percentOf = (w: Workout) => {
    const seconds = progress[w.id]?.watched_seconds ?? 0;
    const duration = (w.duration_minutes ?? 0) * 60;
    return duration > 0 ? Math.min(100, Math.round((seconds / duration) * 100)) : 0;
  };
  const inProgress = config.show_continue_watching
    ? workouts.filter(
        (w) =>
          progress[w.id] && !progress[w.id].completed_at && progress[w.id].watched_seconds > 30,
      )
    : [];

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
    const saved = progress[w.id];
    const resumed = saved && !saved.completed_at && saved.watched_seconds > 30;
    const dur = (w.duration_minutes ?? 0) * 60;
    const startAt =
      resumed && (!dur || saved.watched_seconds < dur - 10) ? saved.watched_seconds : 0;
    setActiveVideo({ id: w.id, url, title: w.title, startAt });
    window.scrollTo({ top: 0 });
  }

  function persistWorkoutProgress(id: string, seconds: number, completedAt: string | null) {
    supabase
      .from("workout_progress")
      .upsert(
        {
          user_id: userId,
          workout_id: id,
          watched_seconds: Math.floor(seconds),
          completed_at: completedAt,
        },
        { onConflict: "user_id,workout_id" },
      )
      .then(({ error: saveError }) => {
        if (saveError) console.error("[workout] falha ao salvar progresso", saveError.message);
      });
    queryClient.setQueryData<PlatformLessons>(platformLessonsKey(userId), (current) =>
      current
        ? {
            ...current,
            progress: {
              ...current.progress,
              [id]: { watched_seconds: Math.floor(seconds), completed_at: completedAt },
            },
          }
        : current,
    );
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

  const activeWorkout = activeVideo
    ? (workouts.find((w) => w.id === activeVideo.id) ?? null)
    : null;
  const moduleVideos = activeWorkout
    ? workouts.filter((w) => (w.category || "Geral") === (activeWorkout.category || "Geral"))
    : [];
  const nextUp = activeVideo ? nextPlayable(activeVideo.id) : null;
  const heroImage = heroBannerUrl || signedUrls[heroWorkout.id]?.thumb || heroWorkout.thumbnail_url;

  return (
    <div className="space-y-8">
      {activeVideo && activeWorkout ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {activeWorkout.category || "Assistindo"}
              </p>
              <h2 className="mt-1 font-display text-3xl leading-none sm:text-4xl">
                {activeWorkout.title}
              </h2>
              {activeWorkout.duration_minutes ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" /> {activeWorkout.duration_minutes} min
                </p>
              ) : null}
            </div>
            <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black">
              <VideoPlayer
                key={activeVideo.id}
                src={activeVideo.url}
                poster={
                  signedUrls[activeVideo.id]?.thumb || activeWorkout.thumbnail_url || undefined
                }
                subtitle={activeWorkout.category || "Assistindo"}
                autoPlay={false}
                startAt={activeVideo.startAt ?? 0}
                onTime={onWorkoutTime(activeVideo.id)}
                onEnded={
                  nextUp
                    ? () => {
                        onWorkoutEnded(activeVideo.id);
                        playWorkout(nextUp);
                      }
                    : () => onWorkoutEnded(activeVideo.id)
                }
                onNext={
                  nextUp
                    ? () => {
                        onWorkoutEnded(activeVideo.id);
                        playWorkout(nextUp);
                      }
                    : undefined
                }
                nextLabel="Próxima aula"
                onClose={() => setActiveVideo(null)}
                className="h-full w-full"
              />
            </div>
          </div>

          <aside className="min-w-0 space-y-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ListVideo className="h-4 w-4 text-muted-foreground" /> Neste módulo
            </p>
            {moduleVideos.map((w) => {
              const current = w.id === activeVideo.id;
              const thumb = signedUrls[w.id]?.thumb || w.thumbnail_url;
              return (
                <button
                  key={w.id}
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => playWorkout(w)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-150",
                    current ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-muted-foreground/50">
                        <Video className="h-5 w-5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm font-medium",
                        current ? "text-foreground" : "text-foreground/85",
                      )}
                    >
                      {w.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {progress[w.id]?.completed_at
                        ? "Assistida"
                        : w.duration_minutes
                          ? `${w.duration_minutes} min`
                          : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </aside>
        </div>
      ) : (
        <section className="relative overflow-hidden rounded-lg border border-border bg-card">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-r from-background via-background/75 to-background/10" />
          <div className="relative max-w-xl space-y-3 p-5 pt-24 sm:p-8 sm:pt-32">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Em destaque
            </p>
            <h2 className="font-display text-4xl leading-none text-foreground sm:text-6xl">
              {config.hero_title || heroWorkout.title}
            </h2>
            {config.hero_subtitle || heroWorkout.description ? (
              <p className="line-clamp-2 text-sm text-foreground/80 sm:text-base">
                {config.hero_subtitle || heroWorkout.description}
              </p>
            ) : null}
            <Button size="lg" className="mt-1" onClick={() => playWorkout(heroWorkout)}>
              <Play className="fill-current" /> Assistir
            </Button>
          </div>
        </section>
      )}

      {inProgress.length > 0 ? (
        <LessonRow title="Continuar assistindo">
          {inProgress.map((w) => (
            <LessonCard
              key={w.id}
              workout={w}
              thumb={signedUrls[w.id]?.thumb || w.thumbnail_url}
              percent={percentOf(w)}
              completed={false}
              onPlay={() => playWorkout(w)}
            />
          ))}
        </LessonRow>
      ) : null}

      {orderedCats.map((cat) => (
        <LessonRow key={cat} title={cat}>
          {(byCategory.get(cat) ?? []).map((w) => (
            <LessonCard
              key={w.id}
              workout={w}
              thumb={signedUrls[w.id]?.thumb || w.thumbnail_url}
              percent={percentOf(w)}
              completed={Boolean(progress[w.id]?.completed_at)}
              onPlay={() => playWorkout(w)}
            />
          ))}
        </LessonRow>
      ))}

      {embedVideo ? (
        <EmbedOverlay
          title={embedVideo.title}
          url={embedVideo.url}
          onClose={() => setEmbedVideo(null)}
        />
      ) : null}
    </div>
  );
}
