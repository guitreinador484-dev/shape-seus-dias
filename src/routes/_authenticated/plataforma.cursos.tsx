import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { signedAsset, type Course } from "@/lib/courses-api";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, PlayCircle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

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

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      let courses: Course[] = [];
      if (isAdmin) {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("order_index");
        courses = (data ?? []) as Course[];
      } else {
        const { data: enrolls } = await supabase
          .from("course_enrollments")
          .select("course_id, courses(*)")
          .eq("user_id", user.id);
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
      setLoading(false);
    })();
  }, [authLoading, user, isAdmin]);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "";
  const featured = rows[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="dark relative isolate overflow-hidden bg-background text-foreground">
        <div className="absolute inset-0">
          {featured?.coverUrl ? (
            <img src={featured.coverUrl} alt="" aria-hidden className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/30 via-background to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 sm:pb-24">
          <Button asChild size="sm" variant="ghost" className="-ml-2 mb-8 text-foreground/70 hover:text-foreground">
            <Link to="/plataforma"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
          </Button>
          <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3">Área de membros</p>
          <h1 className="font-display text-4xl sm:text-5xl italic leading-none">
            Seja bem-vindo(a){firstName ? `, ${firstName}` : ""},
          </h1>
          <p className="mt-4 max-w-md text-sm sm:text-base text-foreground/75">
            Aqui você encontra todo o conteúdo liberado para você. Assista aos módulos abaixo e
            acompanhe seu progresso em cada curso.
          </p>
          <p className="mt-4 font-semibold text-primary">Assista aos módulos abaixo.</p>
        </div>
      </section>

      {/* Carrossel de cursos */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-primary" />
          <p className="text-sm sm:text-base font-medium">
            Clique em um dos módulos abaixo para assistir as aulas.
          </p>
        </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[330px] w-[220px] shrink-0 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted grid place-items-center">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-display text-xl">
            {isAdmin ? "Nenhum curso publicado ainda" : "Você ainda não tem cursos"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Crie e publique um curso na área administrativa." : "Fale com seu personal para liberar acesso."}
          </p>
          {isAdmin && (
            <Button asChild size="sm" className="mt-2">
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
            className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 h-9 w-9 place-items-center rounded-full border border-border bg-card shadow-md sm:grid"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => railRef.current?.scrollBy({ left: 480, behavior: "smooth" })}
            className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 h-9 w-9 place-items-center rounded-full border border-border bg-card shadow-md sm:grid"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div ref={railRef} className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-none">
            {rows.map((r) => {
              const pct = r.totalLessons ? Math.round((r.completedLessons / r.totalLessons) * 100) : 0;
              return (
                <button
                  key={r.course.id}
                  onClick={() => navigate({ to: "/plataforma/cursos/$slug", params: { slug: r.course.slug } })}
                  className="group w-[200px] sm:w-[220px] shrink-0 snap-start text-left"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-muted transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:ring-2 group-hover:ring-primary/60">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt={r.course.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-muted-foreground/40"><BookOpen className="h-10 w-10" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

                    <span className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                      {r.totalLessons} {r.totalLessons === 1 ? "aula" : "aulas"}
                    </span>

                    <div className="absolute inset-x-3 bottom-3 text-center text-white">
                      {r.course.category && (
                        <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">{r.course.category}</p>
                      )}
                      <p className="font-display text-xl leading-tight line-clamp-2 uppercase">{r.course.title}</p>
                      <div className="mt-2">
                        <Progress value={pct} className="h-1 bg-white/25" />
                        <p className="mt-1 text-[10px] opacity-80">{r.completedLessons}/{r.totalLessons} · {pct}%</p>
                      </div>
                    </div>

                    <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                        <PlayCircle className="h-6 w-6" />
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
    </div>
  );
}