import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  signedAsset, listContinueWatching, listRecommendedModules,
  type Course, type ContinueItem, type RecommendedModule,
} from "@/lib/courses-api";
import { ContinueWatchingRail, RecommendedRail } from "@/components/platform/course-rails";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Play,
  AlertTriangle, RotateCcw, Search, Award,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/_authenticated/plataforma/cursos")({
  component: CoursesRoute,
  head: () => ({ meta: [{ title: "Meus cursos — Gui Treinador" }, { name: "description", content: "Continue seus cursos, aulas e conteúdos de treinamento." }, { property: "og:title", content: "Meus cursos — Gui Treinador" }, { property: "og:description", content: "Continue seus cursos, aulas e conteúdos de treinamento." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

type Row = {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  coverUrl: string | null;
};

/* ─── Stat ───────────────────────────────────────────────────────── */
function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-3xl leading-none tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

/* ─── Course card ────────────────────────────────────────────────────────── */
function CourseCard({ r, onClick }: { r: Row; onClick: () => void }) {
  const pct = r.totalLessons ? Math.round((r.completedLessons / r.totalLessons) * 100) : 0;
  const isDone = pct === 100;

  return (
    <button
      onClick={onClick}
      className="group relative flex w-full flex-col text-left"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150 group-hover:border-primary/40">
        {r.coverUrl ? (
          <img
            src={r.coverUrl}
            alt={r.course.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-card pb-20 text-muted-foreground/40">
            <BookOpen className="h-10 w-10" />
          </div>
        )}

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-background/95 via-background/40 to-transparent" />

        {/* lesson badge */}
        <span className="absolute right-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium text-foreground">
          {r.totalLessons} {r.totalLessons === 1 ? "aula" : "aulas"}
        </span>

        {/* done badge */}
        {isDone && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-success/90 px-2 py-0.5 text-[11px] font-medium text-foreground">
            <Award className="h-3 w-3" /> Concluído
          </span>
        )}

        {/* title + progress */}
        <div className="absolute inset-x-3 bottom-3 space-y-2 text-foreground">
          {r.course.category && (
            <p className="truncate text-[11px] font-medium text-muted-foreground">{r.course.category}</p>
          )}
          <p className="font-display text-xl leading-none line-clamp-2 uppercase text-foreground">{r.course.title}</p>
          <div>
            <Progress value={pct} className="h-1 bg-secondary" />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {r.completedLessons}/{r.totalLessons} concluídas · {pct}%
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Skeleton cards ─────────────────────────────────────────────────────── */
function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
function CoursesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/plataforma/cursos" ? <MyCoursesPage /> : <Outlet />;
}

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
  const [railsLoading, setRailsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRows = useMemo(
    () => rows.filter((r) => r.course.title.toLowerCase().includes(searchTerm.toLowerCase())),
    [rows, searchTerm],
  );

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
            .from("courses").select("*").eq("is_published", true).order("order_index");
          if (e) throw e;
          courses = (data ?? []) as Course[];
        } else {
          const { data: enrolls, error: e } = await supabase
            .from("course_enrollments").select("course_id, courses(*)").eq("user_id", user.id);
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
          }),
        );

        setRows(built);
        setRailsLoading(true);
        const [cont, recs] = await Promise.all([
          listContinueWatching(user.id),
          listRecommendedModules(user.id, courses.map((c) => c.id)),
        ]);
        setContinueItems(cont);
        setRecommended(recs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível carregar seus cursos.");
      } finally {
        setLoading(false);
        setRailsLoading(false);
      }
    })();
  }, [authLoading, user, isAdmin, reloadKey]);

  const totalLessons = rows.reduce((s, r) => s + r.totalLessons, 0);
  const totalDone = rows.reduce((s, r) => s + r.completedLessons, 0);
  const globalPct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;


  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-background text-foreground">

      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background px-3 sm:px-6 lg:hidden">
          <BrandLogo className="h-7 w-auto max-w-[9rem]" />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-[1_1_16rem]">
              <h1 className="font-display text-3xl leading-none text-foreground sm:text-4xl">Meus cursos</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Escolha um curso para continuar assistindo.
              </p>
            </div>
            {rows.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar curso..."
                  aria-label="Buscar curso"
                  className="pl-9"
                />
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Stat label="Progresso geral" value={`${globalPct}%`} accent />
              <Stat label="Aulas concluídas" value={`${totalDone}/${totalLessons}`} />
            </div>
          )}

          {/* ── Continue Watching ────────────────────────────────────── */}
          {!loading && !error && continueItems.length > 0 && (
            <div>
              {/* CTA to jump to next lesson */}
              <div className="mb-6 flex flex-col items-start gap-4 rounded-lg border border-primary/25 bg-primary/10 p-4 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <p className="mb-0.5 text-xs font-medium text-primary">Continuar de onde parou</p>
                  <p className="font-semibold text-base text-foreground truncate">{continueItems[0].lessonTitle}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{continueItems[0].courseTitle} · {continueItems[0].moduleTitle}</p>
                </div>
                <Button
                  className="shrink-0"
                  onClick={() => {
                    const c = continueItems[0];
                    navigate({ to: "/plataforma/cursos/$slug", params: { slug: c.courseSlug }, search: { aula: c.lessonId } as never });
                  }}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Assistir
                </Button>
              </div>

              <ContinueWatchingRail items={continueItems} loading={railsLoading} />
            </div>
          )}

          {/* ── My Courses ───────────────────────────────────────────── */}
          <section>
            {/* Content */}
            {loading ? (
              <SkeletonCards />
            ) : error ? (
              <Card className="border-destructive/30">
                <CardContent className="space-y-3 py-16 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <p className="font-display text-2xl">Erro ao carregar cursos</p>
                  <p className="text-sm text-foreground/55">{error}</p>
                  <Button className="mt-2 rounded-full" onClick={() => setReloadKey((k) => k + 1)}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : rows.length === 0 ? (
              <Card>
                <CardContent className="py-20 text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <p className="font-display text-2xl">
                    {isAdmin ? "Nenhum curso publicado ainda" : "Você ainda não tem cursos"}
                  </p>
                  <p className="text-sm text-foreground/55">
                    {isAdmin ? "Crie e publique um curso na área administrativa." : "Fale com seu personal para liberar acesso."}
                  </p>
                  {isAdmin && (
                    <Button asChild size="sm" className="mt-2 rounded-full">
                      <Link to="/admin/cursos">Ir para admin</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : filteredRows.length === 0 ? (
              <div className="py-12 text-center text-foreground/50 text-sm">
                Nenhum curso encontrado para "<span className="text-primary">{searchTerm}</span>".
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredRows.map((r) => (
                  <CourseCard
                    key={r.course.id}
                    r={r}
                    onClick={() => navigate({ to: "/plataforma/cursos/$slug", params: { slug: r.course.slug }, search: { aula: undefined } })}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Recommended ──────────────────────────────────────────── */}
          {!loading && !error && (
            <div>
              <RecommendedRail items={recommended} loading={railsLoading} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}