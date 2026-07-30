import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Play, Sparkles, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { signedAsset, type ContinueItem, type RecommendedModule } from "@/lib/courses-api";

function Rail({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
          {subtitle && <p className="text-sm text-foreground/55">{subtitle}</p>}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button" aria-label="Anterior"
            onClick={() => ref.current?.scrollBy({ left: -480, behavior: "smooth" })}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 transition hover:bg-card"
          ><ChevronLeft className="h-4 w-4" /></button>
          <button
            type="button" aria-label="Próximo"
            onClick={() => ref.current?.scrollBy({ left: 480, behavior: "smooth" })}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card/60 transition hover:bg-card"
          ><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={ref} className="flex snap-x gap-4 overflow-x-auto pb-3 scrollbar-none">{children}</div>
    </section>
  );
}

function useSignedCover(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    signedAsset(path).then((u) => alive && setUrl(u));
    return () => { alive = false; };
  }, [path]);
  return url;
}

function fmtLeft(item: ContinueItem) {
  if (!item.durationSeconds) return "Continuar";
  const left = Math.max(0, item.durationSeconds - item.watchedSeconds);
  const m = Math.ceil(left / 60);
  return `Faltam ${m} min`;
}

export function ContinueWatchingRail({ items, loading }: { items: ContinueItem[]; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <Rail title="Continuar assistindo">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-[300px] shrink-0 space-y-2">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </Rail>
    );
  }
  if (!items.length) return null;

  return (
    <Rail title="Continuar assistindo" subtitle="Retome exatamente de onde você parou.">
      {items.map((item) => (
        <ContinueCard
          key={item.lessonId}
          item={item}
          onOpen={() => navigate({ to: "/plataforma/cursos/$slug", params: { slug: item.courseSlug }, search: { aula: item.lessonId } as never })}
        />
      ))}
    </Rail>
  );
}

function ContinueCard({ item, onOpen }: { item: ContinueItem; onOpen: () => void }) {
  const cover = useSignedCover(item.thumbnailPath ?? item.coverPath);
  return (
    <button onClick={onOpen} className="group w-[280px] shrink-0 snap-start text-left sm:w-[320px]">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/50 bg-muted shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-primary/20">
        {cover ? (
          <img src={cover} alt={item.lessonTitle} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/25 via-card to-background text-primary/50"><BookOpen className="h-8 w-8" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl">
            <Play className="h-5 w-5 fill-current" />
          </span>
        </div>
        <div className="absolute inset-x-3 bottom-3">
          <Progress value={item.pct} className="h-1 bg-white/20" />
        </div>
      </div>
      <p className="mt-2 truncate text-sm font-medium">{item.lessonTitle}</p>
      <p className="truncate text-xs text-foreground/50">{item.courseTitle} · {item.moduleTitle}</p>
      <p className="text-xs text-primary">{fmtLeft(item)}</p>
    </button>
  );
}

export function RecommendedRail({ items, loading }: { items: RecommendedModule[]; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <Rail title="Próximos módulos">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[130px] w-[280px] shrink-0 rounded-2xl" />)}
      </Rail>
    );
  }
  if (!items.length) return null;

  return (
    <Rail title="Próximos módulos" subtitle="Sugestões com base no que você já começou.">
      {items.map((m) => {
        const pct = Math.round((m.completedLessons / m.totalLessons) * 100);
        return (
          <button
            key={m.moduleId}
            onClick={() => navigate({ to: "/plataforma/cursos/$slug", params: { slug: m.courseSlug } })}
            className="group w-[280px] shrink-0 snap-start rounded-2xl border border-border/50 bg-card/50 p-4 text-left transition hover:-translate-y-1 hover:border-primary/50 hover:bg-card"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3 w-3" /> {m.completedLessons > 0 ? "Em andamento" : "Novo"}
            </div>
            <p className="mt-2 line-clamp-2 font-display text-xl leading-tight">{m.moduleTitle}</p>
            <p className="mt-1 truncate text-xs text-foreground/50">{m.courseTitle}</p>
            <Progress value={pct} className="mt-3 h-1" />
            <p className="mt-1.5 text-[11px] text-foreground/55">{m.completedLessons}/{m.totalLessons} aulas concluídas</p>
          </button>
        );
      })}
    </Rail>
  );
}
