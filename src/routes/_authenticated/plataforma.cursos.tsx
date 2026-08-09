import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import SearchInput from "@/components/ui/search-input";
import { useEffect, useRef, useState, useMemo } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  signedAsset, listContinueWatching, listRecommendedModules,
  type Course, type ContinueItem, type RecommendedModule,
} from "@/lib/courses-api";
import { ContinueWatchingRail, RecommendedRail } from "@/components/platform/course-rails";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, ArrowLeft, ChevronLeft, ChevronRight, Sparkles, AlertTriangle, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plataforma/cursos")({
  component: MyCoursesPage,
});

type Row = {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  coverUrl: string | null;
};

function MyCoursesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin" || isAdminEmail(user?.email);
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedModule[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const filteredRows = useMemo(() => rows.filter(r => r.course.title.toLowerCase().includes(searchTerm.toLowerCase())), [rows, searchTerm]);
  const [railsLoading, setRailsLoading] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      setError(null);
      try {
      let courses: Course[] = [];
      if (isAdmin) {
        const { data, error: e } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("order_index");
        if (e) throw e;
        courses = (data ?? []) as Course[];
      } else {
        const { data: enrolls, error: e } = await supabase
          .from("course_enrollments")
          .select("course_id, courses(*)")
          .eq("user_id", user.id);
        if (e) throw e;
        courses = (enrolls ?? [])
          .map((e) => (e as any).courses as Course)
          .filter((c): c is Course => !!c && c.is_published);
      }

      const built = await Promise.all(
        courses.map(async (course) => {
          const { data: mods } = await supabase.from("course_modules").select("id").eq("course_id", course.id);
          const modIds = (mods ?? []).map((m) => m.id);
          const { data: lessons } = modIds.length
            ? await supabase.from("course_lessons").select("id").in("module_id", modIds)
            : { data: [] as { id: string }[] };
          const lessonIds = (lessons ?? []).map((l) => l.id);
          const { data: progress } = lessonIds.length
            ? await supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", user.id).in("lesson_id", lessonIds)
            : { data: [] as { lesson_id: string; completed_at: string | null }[] };
          const completed = (progress ?? []).filter((p) => p.completed_at).length;
          return {
            course,
            totalLessons: lessonIds.length,
            completedLessons: completed,
            coverUrl: await signedAsset(course.cover_path),
          };
        })
      );
      setRows(built);
      setRailsLoading(true);
      try {
        const [cont, recs] = await Promise.all([
          listContinueWatching(user.id),
          listRecommendedModules(user.id, courses.map((c) => c.id)),
        ]);
        setContinueItems(cont);
        setRecommended(recs);
      } finally {
        setRailsLoading(false);
      }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível carregar seus cursos.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, isAdmin, reloadKey]);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";
  const featured = rows[0] ?? null;
  const totalLessons = rows.reduce((s, r) => s + r.totalLessons, 0);
  const totalDone = rows.reduce((s, r) => s + r.completedLessons, 0);
  const globalPct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {featured?.coverUrl ? (
            <img src={featured.coverUrl} alt="" aria-hidden className="h-full w-full scale-105 object-cover opacity-60 blur-[2px]" />
          ) : (
            <div className="h-full w-full bg-background" />
          )}
          {/* halo de cor */}
          <div className="absolute -top-40 -left-24 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute -bottom-52 right-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[130px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[62vh] max-w-6xl flex-col justify-center px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
          <Button asChild size="sm" variant="ghost" className="-ml-2 mb-10 w-fit text-foreground/60 hover:text-foreground">
            <Link to="/plataforma"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
          </Button>
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.25em] text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" /> Área de membros
          </span>
          <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl">
            Bem-vindo{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-5 max-w-lg text-base text-foreground/70 sm:text-lg">
            Todo o conteúdo liberado para você em um só lugar. Continue de onde parou e
            acompanhe sua evolução aula por aula.
          </p>

          {rows.length > 0 && (
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="rounded-full px-7"
                onClick={() => {
                  const c = continueItems?.[0];
                  if (c) navigate({ to: "/plataforma/cursos/$slug", params: { slug: c.courseSlug }, search: { aula: c.lessonId } as never });
                  else if (featured) navigate({ to: "/plataforma/cursos/$slug", params: { slug: featured.course.slug } });
                }}
              >
                <Play className="mr-2 h-4 w-4 fill-current" /> Continuar assistindo
              </Button>
              <div className="rounded-full border border-border/60 bg-card/40 px-5 py-3 text-xs backdrop-blur">
                <span className="font-semibold text-primary">{globalPct}%</span>
                <span className="text-foreground/60"> concluído · {totalDone}/{totalLessons} aulas</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Continuar assistindo */}
      {!loading && !error && (
        <div className="mx-auto max-w-6xl space-y-10 px-4 pb-10 sm:px-6">
          <ContinueWatchingRail items={continueItems} loading={railsLoading} />
        </div>
      )}

      {/* Search Bar */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar cursos..."
        />
      </div>
      {/* Carrossel de cursos */}
      <section className="mx-auto max-w-6xl space-y-6 px-4 pb-12 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl">Seus módulos</h2>
            <p className="text-sm text-foreground/55">Escolha um módulo para começar a assistir.</p>
          </div>
        </div>

      {loading ? (
        <div className="flex gap-5 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-[210px] shrink-0 space-y-2 sm:w-[235px]">
              <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/40 bg-card/40 backdrop-blur"><CardContent className="space-y-3 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <p className="font-display text-2xl">Erro ao carregar seus cursos</p>
          <p className="text-sm text-foreground/60">{error}</p>
          <Button className="mt-2 rounded-full" onClick={() => setReloadKey((k) => k + 1)}>
            <RotateCcw className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
        </CardContent></Card>
      ) : rows.length === 0 ? (
        <Card className="border-border/50 bg-card/40 backdrop-blur"><CardContent className="py-20 text-center space-y-3">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="font-display text-2xl">
            {isAdmin ? "Nenhum curso publicado ainda" : "Você ainda não tem cursos"}
          </p>
          <p className="text-sm text-foreground/60">
            {isAdmin ? "Crie e publique um curso na área administrativa." : "Fale com seu personal para liberar acesso."}
          </p>
          {isAdmin && (
            <Button asChild size="sm" className="mt-2 rounded-full">
              <Link to="/admin/cursos">Ir para admin</Link>
            </Button>
          )}
        </CardContent></Card>
      ) : (
        <div className="relative group/rail">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => railRef.current?.scrollBy({ left: -480, behavior: "smooth" })}
            className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-card/80 shadow-lg backdrop-blur transition hover:bg-card sm:grid"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => railRef.current?.scrollBy({ left: 480, behavior: "smooth" })}
            className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-card/80 shadow-lg backdrop-blur transition hover:bg-card sm:grid"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div ref={railRef} className="flex gap-5 overflow-x-auto pb-4 snap-x scrollbar-none">
            {filteredRows.map((r) => {
              const pct = r.totalLessons ? Math.round((r.completedLessons / r.totalLessons) * 100) : 0;
              return (
                <button
                  key={r.course.id}
                  onClick={() => navigate({ to: "/plataforma/cursos/$slug", params: { slug: r.course.slug } })}
                  className="group w-[210px] shrink-0 snap-start text-left sm:w-[235px]"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-border/50 bg-muted shadow-lg transition duration-300 group-hover:-translate-y-2 group-hover:border-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/20">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt={r.course.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/25 via-card to-background text-primary/50">
                        <BookOpen className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

                    <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur">
                      {r.totalLessons} {r.totalLessons === 1 ? "aula" : "aulas"}
                    </span>

                    <div className="absolute inset-x-4 bottom-4 text-white">
                      {r.course.category && (
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">{r.course.category}</p>
                      )}
                      <p className="font-display text-2xl leading-none line-clamp-2 uppercase">{r.course.title}</p>
                      <div className="mt-3">
                        <Progress value={pct} className="h-1 bg-white/20" />
                        <p className="mt-1.5 text-[10px] text-white/70">{r.completedLessons}/{r.totalLessons} concluídas · {pct}%</p>
                      </div>
                    </div>

                    <div className="absolute inset-0 grid place-items-center opacity-0 transition duration-300 group-hover:opacity-100">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40">
                        <Play className="h-6 w-6 fill-current" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      </section>

      {!loading && !error && (
        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <RecommendedRail items={recommended} loading={railsLoading} />
        </div>
      )}
    </div>
  );
}