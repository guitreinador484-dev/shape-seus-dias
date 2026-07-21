import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { signedAsset, type Course } from "@/lib/courses-api";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, PlayCircle, ArrowLeft } from "lucide-react";

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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="ghost"><Link to="/plataforma"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link></Button>
      </div>
      <div>
        <h1 className="font-display text-3xl">Meus cursos</h1>
        <p className="text-muted-foreground text-sm">Continue de onde parou.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const pct = r.totalLessons ? Math.round((r.completedLessons / r.totalLessons) * 100) : 0;
            return (
              <button
                key={r.course.id}
                onClick={() => navigate({ to: "/plataforma/cursos/$slug", params: { slug: r.course.slug } })}
                className="text-left group"
              >
                <Card className="overflow-hidden transition hover:shadow-lg hover:-translate-y-0.5">
                  <div className="relative aspect-video bg-muted">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt={r.course.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-muted-foreground/40"><BookOpen className="h-10 w-10" /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="font-display text-lg leading-tight line-clamp-2">{r.course.title}</p>
                      {r.course.category && <p className="text-[11px] uppercase tracking-widest opacity-80">{r.course.category}</p>}
                    </div>
                    <div className="absolute top-3 right-3 grid place-items-center h-10 w-10 rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition"><PlayCircle className="h-5 w-5" /></div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{r.completedLessons}/{r.totalLessons} aulas</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}