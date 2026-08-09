import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  signedAsset, listContinueWatching, listRecommendedModules,
  type Course, type ContinueItem, type RecommendedModule,
} from "@/lib/courses-api";
import { ContinueWatchingRail, RecommendedRail } from "@/components/platform/course-rails";
import LeftSidebar from "@/components/ui/left-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Play, ChevronLeft, ChevronRight, Sparkles,
  AlertTriangle, RotateCcw, Search, TrendingUp, Award, Clock,
  Menu, X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/plataforma/cursos")({
  component: MyCoursesPage,
});

type Row = {
  course: Course;
  totalLessons: number;
  completedLessons: number;
  coverUrl: string | null;
};

/* ─── Mobile header ─────────────────────────────────────────────────────── */
function MobileHeader({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl">
      <span className="font-display text-xl tracking-wide text-white">PERSONAL</span>
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-foreground/70 hover:text-white transition backdrop-blur-md"
        aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
      >
        {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
    </header>
  );
}

/* ─── Stat pill ──────────────────────────────────────────────────────────── */
function StatPill({
  icon: Icon, label, value, accent,
}: { icon: React.ElementType; label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition backdrop-blur-md ${
      accent
        ? "border-primary/30 bg-primary/10 text-primary shadow-md shadow-primary/10"
        : "border-white/10 bg-white/5 text-foreground/80 hover:bg-white/8"
    }`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${accent ? "bg-primary/20 text-primary" : "bg-white/10 text-white"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.15em] opacity-60 font-medium">{label}</p>
        <p className="font-display text-lg leading-none text-white">{value}</p>
      </div>
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
      className="group relative flex flex-col w-[200px] sm:w-[220px] shrink-0 snap-start text-left"
    >
      {/* Cover */}
      <div className="glass-card relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/12 shadow-2xl transition duration-300 group-hover:-translate-y-2 group-hover:border-primary/50 group-hover:shadow-primary/25">
        {r.coverUrl ? (
          <img
            src={r.coverUrl}
            alt={r.course.title}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/20 via-[#131316] to-[#0A0A0B] text-primary/40">
            <BookOpen className="h-10 w-10" />
          </div>
        )}

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B]/95 via-black/40 to-transparent" />

        {/* lesson badge */}
        <span className="glass-pill absolute right-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white">
          {r.totalLessons} {r.totalLessons === 1 ? "aula" : "aulas"}
        </span>

        {/* done badge */}
        {isDone && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-md backdrop-blur-md">
            <Award className="h-3 w-3" /> Concluído
          </span>
        )}

        {/* play overlay */}
        <div className="absolute inset-0 grid place-items-center opacity-0 transition duration-300 group-hover:opacity-100 scale-90 group-hover:scale-100">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/50 ring-4 ring-white/20">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </span>
        </div>

        {/* title + progress */}
        <div className="absolute inset-x-3.5 bottom-3.5 space-y-2 text-white">
          {r.course.category && (
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/60 font-medium">{r.course.category}</p>
          )}
          <p className="font-display text-xl leading-none line-clamp-2 uppercase text-white drop-shadow">{r.course.title}</p>
          <div>
            <Progress value={pct} className="h-1 bg-white/20" />
            <p className="mt-1.5 text-[10px] text-white/70 font-medium">
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
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-[200px] sm:w-[220px] shrink-0 space-y-2">
          <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          <Skeleton className="h-2.5 w-3/4" />
          <Skeleton className="h-2 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

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

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ?? "";

  const totalLessons = rows.reduce((s, r) => s + r.totalLessons, 0);
  const totalDone = rows.reduce((s, r) => s + r.completedLessons, 0);
  const globalPct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;
  const featured = rows[0] ?? null;

  const nextUp = continueItems[0] ?? null;

  return (
    <div className="relative flex min-h-screen bg-[#0A0A0B] text-foreground overflow-x-hidden">
      {/* Background ambient light orbs for real glass refraction */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[130px]" />
        <div className="absolute top-1/2 -right-40 h-[450px] w-[450px] rounded-full bg-blue-600/10 blur-[140px]" />
      </div>

      {/* Left sidebar — desktop */}
      <LeftSidebar />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-[#0E0E10] border-r border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <LeftSidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        <MobileHeader onMenu={() => setMobileMenuOpen((o) => !o)} menuOpen={mobileMenuOpen} />

        <main className="flex-1">
          {/* ── Hero band ─────────────────────────────────────────────── */}
          <div className="relative overflow-hidden border-b border-white/10">
            {/* background cover blur */}
            {featured?.coverUrl && (
              <img
                src={featured.coverUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover opacity-15 blur-md scale-105"
              />
            )}
            {/* color halos */}
            <div className="absolute -top-32 -left-20 h-[400px] w-[400px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 right-0 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B]/60 via-[#0A0A0B]/80 to-[#0A0A0B] pointer-events-none" />

            <div className="relative px-5 py-10 sm:px-8 sm:py-14 max-w-5xl">
              {/* Back link */}
              <Link
                to="/plataforma"
                className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition mb-6 font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar à plataforma
              </Link>

              {/* Badge */}
              <div className="glass-pill mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-md shadow-primary/20">
                <Sparkles className="h-3 w-3" /> Área de membros
              </div>

              {/* Greeting */}
              <h1 className="font-display text-4xl sm:text-6xl leading-none mb-2 text-white drop-shadow">
                {firstName ? `Olá, ${firstName}` : "Bem-vindo"}
              </h1>
              <p className="text-sm text-white/60 max-w-md mb-6 leading-relaxed">
                Todo o conteúdo da sua mentoria em um só lugar. Continue de onde parou.
              </p>

              {/* Stats row */}
              {rows.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  <StatPill
                    icon={TrendingUp}
                    label="Progresso geral"
                    value={`${globalPct}%`}
                    accent
                  />
                  <StatPill
                    icon={BookOpen}
                    label="Aulas concluídas"
                    value={`${totalDone}/${totalLessons}`}
                  />
                  {nextUp && (
                    <StatPill
                      icon={Clock}
                      label="Próxima aula"
                      value={nextUp.lessonTitle.length > 22 ? nextUp.lessonTitle.slice(0, 22) + "…" : nextUp.lessonTitle}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Continue Watching ────────────────────────────────────── */}
          {!loading && !error && continueItems.length > 0 && (
            <div className="px-5 sm:px-8 pt-8 pb-2 max-w-5xl">
              {/* CTA to jump to next lesson */}
              <div className="glass-block mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-3xl border border-primary/30 bg-primary/10 px-6 py-5 shadow-2xl shadow-primary/10">
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-bold mb-0.5">Continuar de onde parou</p>
                  <p className="font-semibold text-base text-white truncate">{continueItems[0].lessonTitle}</p>
                  <p className="text-xs text-white/50 truncate mt-0.5">{continueItems[0].courseTitle} · {continueItems[0].moduleTitle}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-full shrink-0 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
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
          <section className="px-5 sm:px-8 py-8 max-w-5xl">
            {/* Section header + search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="flex-1">
                <h2 className="font-display text-2xl sm:text-4xl text-white">Meus cursos</h2>
                <p className="text-sm text-white/50 mt-0.5">Escolha um curso para continuar assistindo.</p>
              </div>
              {/* Inline search */}
              {rows.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar curso..."
                    className="w-full rounded-full border border-white/14 bg-white/5 py-2 pl-9 pr-3 text-sm text-white backdrop-blur-xl focus:border-primary/60 focus:ring-2 focus:ring-primary/30 placeholder:text-white/30 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <SkeletonCards />
            ) : error ? (
              <Card className="border-destructive/30 bg-card/40">
                <CardContent className="space-y-3 py-16 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
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
              <Card className="border-border/30 bg-card/30">
                <CardContent className="py-20 text-center space-y-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
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
              <div className="relative">
                {/* Nav arrows */}
                <button
                  type="button"
                  aria-label="Anterior"
                  onClick={() => railRef.current?.scrollBy({ left: -460, behavior: "smooth" })}
                  className="absolute -left-4 top-1/3 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border/50 bg-card/80 shadow-lg backdrop-blur transition hover:bg-card sm:grid"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Próximo"
                  onClick={() => railRef.current?.scrollBy({ left: 460, behavior: "smooth" })}
                  className="absolute -right-4 top-1/3 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border/50 bg-card/80 shadow-lg backdrop-blur transition hover:bg-card sm:grid"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div
                  ref={railRef}
                  className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-none"
                >
                  {filteredRows.map((r) => (
                    <CourseCard
                      key={r.course.id}
                      r={r}
                      onClick={() => navigate({ to: "/plataforma/cursos/$slug", params: { slug: r.course.slug } })}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Recommended ──────────────────────────────────────────── */}
          {!loading && !error && (
            <div className="px-5 sm:px-8 pb-16 max-w-5xl">
              <RecommendedRail items={recommended} loading={railsLoading} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}