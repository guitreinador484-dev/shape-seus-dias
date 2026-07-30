import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { isAdminEmail, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  loadCourseBySlug,
  signedAsset,
  isLessonUnlocked,
  daysUntilUnlock,
  type CourseFull,
  type CourseLesson,
  type LessonMaterial,
} from "@/lib/courses-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, CheckCircle2, Lock, Play, FileText, Link2, Award, Send, MessageSquare,
  AlertTriangle, BookOpen, RotateCcw, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/plataforma/cursos/$slug")({
  component: CourseDetailPage,
});

type ProgressRow = { lesson_id: string; completed_at: string | null; updated_at: string };

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const m = Math.round(seconds / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

/* ---------------- states ---------------- */

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="dark min-h-screen bg-background text-foreground">{children}</div>;
}

function StateCard({
  icon, title, description, action,
}: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <PageShell>
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <Card className="w-full border-border/50 bg-card/40 backdrop-blur">
          <CardContent className="space-y-3 py-14 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
            <p className="font-display text-2xl">{title}</p>
            <p className="text-sm text-foreground/60">{description}</p>
            {action}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function CourseSkeleton() {
  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <Skeleton className="h-8 w-32 rounded-full" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------------- page ---------------- */

function CourseDetailPage() {
  const { slug } = useParams({ from: "/_authenticated/plataforma/cursos/$slug" });
  const { user, role, loading: authLoading } = useAuth();
  const isAdmin = role === "admin" || isAdminEmail(user?.email);
  const [course, setCourse] = useState<CourseFull | null>(null);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const c = await loadCourseBySlug(slug);
      if (!c) { setCourse(null); setLoading(false); return; }
      setCourse(c);
      const { data: enroll } = await supabase
        .from("course_enrollments").select("enrolled_at")
        .eq("course_id", c.id).eq("user_id", user.id).maybeSingle();
      const enrolled = enroll?.enrolled_at ?? (isAdmin ? c.created_at : null);
      setEnrolledAt(enrolled);
      const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
      let rows: ProgressRow[] = [];
      if (lessonIds.length) {
        const { data } = await supabase
          .from("lesson_progress").select("lesson_id, completed_at, updated_at")
          .eq("user_id", user.id).in("lesson_id", lessonIds);
        rows = (data ?? []) as ProgressRow[];
        setProgress(rows);
      }
      // "Continuar de onde parou": última aula tocada não concluída,
      // senão a primeira aula liberada ainda não concluída.
      const all = c.modules.flatMap((m) => m.lessons);
      const doneIds = new Set(rows.filter((r) => r.completed_at).map((r) => r.lesson_id));
      const lastTouched = [...rows]
        .filter((r) => !r.completed_at)
        .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))[0];
      const resume =
        (lastTouched && all.find((l) => l.id === lastTouched.lesson_id && isLessonUnlocked(l, enrolled))) ??
        all.find((l) => isLessonUnlocked(l, enrolled) && !doneIds.has(l.id)) ??
        all.find((l) => isLessonUnlocked(l, enrolled));
      if (resume) setActiveLessonId((prev) => prev ?? resume.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar o curso.");
    } finally {
      setLoading(false);
    }
  }, [slug, user, isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    setLoading(true);
    reload();
  }, [authLoading, user?.id, slug]);

  const allLessons = useMemo(() => course?.modules.flatMap((m) => m.lessons) ?? [], [course]);
  const totalLessons = allLessons.length;
  const completedCount = progress.filter((p) => p.completed_at).length;
  const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? null;
  const nextLesson = useMemo(() => {
    const doneIds = new Set(progress.filter((p) => p.completed_at).map((p) => p.lesson_id));
    return allLessons.find((l) => isLessonUnlocked(l, enrolledAt) && !doneIds.has(l.id)) ?? null;
  }, [allLessons, progress, enrolledAt]);

  if (loading || authLoading) return <CourseSkeleton />;

  if (error) return (
    <StateCard
      icon={<AlertTriangle className="h-7 w-7" />}
      title="Erro ao carregar"
      description={error}
      action={<Button className="mt-2 rounded-full" onClick={() => { setLoading(true); reload(); }}>
        <RotateCcw className="mr-2 h-4 w-4" /> Tentar novamente
      </Button>}
    />
  );

  if (!course) return (
    <StateCard
      icon={<BookOpen className="h-7 w-7" />}
      title="Curso não encontrado"
      description="Esse conteúdo pode ter sido removido ou despublicado."
      action={<Button asChild variant="secondary" className="mt-2 rounded-full"><Link to="/plataforma/cursos">Ver meus cursos</Link></Button>}
    />
  );

  if (!enrolledAt) return (
    <StateCard
      icon={<Lock className="h-7 w-7" />}
      title="Acesso não liberado"
      description="Você ainda não tem acesso a este curso. Fale com seu personal para liberar."
      action={<Button asChild variant="secondary" className="mt-2 rounded-full"><Link to="/plataforma/cursos">Voltar</Link></Button>}
    />
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <Button asChild size="sm" variant="ghost" className="-ml-2 w-fit text-foreground/60 hover:text-foreground">
          <Link to="/plataforma/cursos"><ArrowLeft className="mr-2 h-4 w-4" /> Meus cursos</Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {activeLesson ? (
              <LessonPlayer
                lesson={activeLesson}
                enrolledAt={enrolledAt}
                userId={user!.id}
                completed={progress.some((p) => p.lesson_id === activeLesson.id && p.completed_at)}
                onProgress={reload}
              />
            ) : (
              <Card className="border-border/50 bg-card/40">
                <CardContent className="py-20 text-center space-y-2">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Play className="h-6 w-6" />
                  </div>
                  <p className="font-display text-xl">Nenhuma aula disponível ainda</p>
                  <p className="text-sm text-foreground/60">Assim que novas aulas forem liberadas elas aparecem aqui.</p>
                </CardContent>
              </Card>
            )}

            <div>
              <h1 className="font-display text-3xl leading-none">{course.title}</h1>
              {course.description && (
                <p className="mt-2 text-sm leading-relaxed text-foreground/65">{course.description}</p>
              )}
            </div>

            {activeLesson && <LessonComments lessonId={activeLesson.id} userId={user!.id} />}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            {/* Resumo de progresso */}
            <Card className="border-border/50 bg-card/60 backdrop-blur">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Seu progresso</p>
                  <span className="font-display text-2xl text-primary">{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="text-xs text-foreground/60">{completedCount} de {totalLessons} aulas concluídas</p>
                {nextLesson ? (
                  <Button
                    className="mt-1 w-full rounded-full"
                    onClick={() => setActiveLessonId(nextLesson.id)}
                  >
                    <Play className="mr-2 h-4 w-4 fill-current" />
                    {completedCount === 0 ? "Começar agora" : "Continuar de onde parou"}
                  </Button>
                ) : pct === 100 ? (
                  <CertificateButton course={course} userId={user!.id} />
                ) : null}
                {nextLesson && (
                  <p className="truncate text-center text-[11px] text-foreground/50">Próxima: {nextLesson.title}</p>
                )}
              </CardContent>
            </Card>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/50">Conteúdo do curso</p>
              {course.modules.length === 0 ? (
                <Card className="border-border/50 bg-card/40">
                  <CardContent className="py-8 text-center text-sm text-foreground/60">
                    Nenhum módulo publicado ainda.
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" defaultValue={course.modules.map((m) => m.id)} className="space-y-2">
                  {course.modules.map((m) => {
                    const doneInModule = m.lessons.filter((l) => progress.some((p) => p.lesson_id === l.id && p.completed_at)).length;
                    return (
                      <AccordionItem key={m.id} value={m.id} className="rounded-xl border border-border/50 bg-card/40 px-3">
                        <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                          <span className="flex-1 truncate text-left">{m.title}</span>
                          <span className="ml-2 shrink-0 text-xs text-foreground/50">{doneInModule}/{m.lessons.length}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2">
                          {m.lessons.length === 0 ? (
                            <p className="px-2 py-3 text-xs text-foreground/50">Nenhuma aula neste módulo.</p>
                          ) : (
                            <div className="space-y-1">
                              {m.lessons.map((l) => {
                                const unlocked = isLessonUnlocked(l, enrolledAt);
                                const done = progress.some((p) => p.lesson_id === l.id && p.completed_at);
                                const active = l.id === activeLessonId;
                                const dur = formatDuration(l.duration_seconds);
                                return (
                                  <button
                                    key={l.id}
                                    disabled={!unlocked}
                                    onClick={() => setActiveLessonId(l.id)}
                                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition ${
                                      active ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-accent hover:text-foreground"
                                    } ${!unlocked ? "cursor-not-allowed opacity-50" : ""}`}
                                  >
                                    {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                                      : unlocked ? <Play className="h-4 w-4 shrink-0" />
                                      : <Lock className="h-4 w-4 shrink-0" />}
                                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                                    {!unlocked ? (
                                      <span className="shrink-0 text-[10px] text-foreground/50">{daysUntilUnlock(l, enrolledAt)}d</span>
                                    ) : dur ? (
                                      <span className="shrink-0 text-[10px] text-foreground/45">{dur}</span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------------- player ---------------- */

function LessonPlayer({ lesson, enrolledAt, userId, completed, onProgress }: {
  lesson: CourseLesson; enrolledAt: string; userId: string; completed: boolean; onProgress: () => void;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const unlocked = isLessonUnlocked(lesson, enrolledAt);

  useEffect(() => {
    let alive = true;
    setVideoUrl(null); setThumbUrl(null); setLoadingVideo(true);
    if (!unlocked) { setLoadingVideo(false); return; }
    (async () => {
      const [v, t] = await Promise.all([signedAsset(lesson.video_path), signedAsset(lesson.thumbnail_path)]);
      if (!alive) return;
      setVideoUrl(v); setThumbUrl(t); setLoadingVideo(false);
      const { data } = await supabase.from("lesson_materials").select("*").eq("lesson_id", lesson.id).order("order_index");
      if (alive) setMaterials(data ?? []);
    })();
    return () => { alive = false; };
  }, [lesson.id, unlocked]);

  async function touchProgress() {
    await supabase.from("lesson_progress").upsert({
      user_id: userId, lesson_id: lesson.id, completed_at: null, updated_at: new Date().toISOString(),
    });
  }

  async function markComplete() {
    const { error } = await supabase.from("lesson_progress").upsert({
      user_id: userId,
      lesson_id: lesson.id,
      completed_at: new Date().toISOString(),
      watched_seconds: lesson.duration_seconds ?? 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Aula concluída");
    onProgress();
  }
  async function unmark() {
    await supabase.from("lesson_progress").upsert({ user_id: userId, lesson_id: lesson.id, completed_at: null, watched_seconds: 0 });
    onProgress();
  }

  async function openMaterial(m: LessonMaterial) {
    if (m.external_url) { window.open(m.external_url, "_blank", "noopener"); return; }
    if (m.file_path) {
      const url = await signedAsset(m.file_path);
      if (url) window.open(url, "_blank", "noopener");
      else toast.error("Material indisponível");
    }
  }

  if (!unlocked) {
    return (
      <Card className="border-border/50 bg-card/40">
        <CardContent className="space-y-2 py-20 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <p className="font-display text-xl">Aula bloqueada</p>
          <p className="text-sm text-foreground/60">
            Libera em {daysUntilUnlock(lesson, enrolledAt)} dia(s).
          </p>
        </CardContent>
      </Card>
    );
  }

  const dur = formatDuration(lesson.duration_seconds);

  return (
    <div className="space-y-4">
      <div className="aspect-video overflow-hidden rounded-2xl border border-border/50 bg-black">
        {loadingVideo ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : videoUrl ? (
          <video
            key={lesson.id}
            src={videoUrl}
            poster={thumbUrl ?? undefined}
            controls
            controlsList="nodownload"
            onPlay={touchProgress}
            className="h-full w-full"
          />
        ) : (
          <div className="grid h-full w-full place-items-center gap-2 text-center text-sm text-foreground/50">
            <div>
              <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
              Vídeo indisponível no momento.
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-none">{lesson.title}</h2>
          {dur && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-foreground/50">
              <Clock className="h-3.5 w-3.5" /> {dur}
            </p>
          )}
          {lesson.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/65">{lesson.description}</p>
          )}
        </div>
        {completed ? (
          <Button variant="secondary" className="rounded-full" onClick={unmark}>
            <CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> Concluída
          </Button>
        ) : (
          <Button className="rounded-full" onClick={markComplete}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como concluída
          </Button>
        )}
      </div>

      {materials.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-foreground/50">Materiais</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {materials.map((m) => (
              <button
                key={m.id}
                onClick={() => openMaterial(m)}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/40 p-3 text-left text-sm transition hover:border-primary/40 hover:bg-accent"
              >
                {m.kind === "link" ? <Link2 className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                <span className="flex-1 truncate">{m.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- comments ---------------- */

function LessonComments({ lessonId, userId }: { lessonId: string; userId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const { data } = await supabase
      .from("lesson_comments")
      .select("id, content, created_at, user_id, parent_id, profiles(full_name, email)")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
    setLoading(false);
  }
  useEffect(() => { setLoading(true); reload(); }, [lessonId]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("lesson_comments").insert({ lesson_id: lessonId, user_id: userId, content: text.trim() });
    setSending(false);
    if (error) return toast.error(error.message);
    setText(""); reload();
  }
  async function remove(id: string) {
    await supabase.from("lesson_comments").delete().eq("id", id);
    reload();
  }

  return (
    <Card className="border-border/50 bg-card/40">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">Comentários {!loading && `(${comments.length})`}</p>
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading ? (
            <>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </>
          ) : comments.length === 0 ? (
            <p className="py-4 text-center text-xs text-foreground/50">Nenhum comentário ainda. Seja o primeiro.</p>
          ) : comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-border/40 bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">{c.profiles?.full_name || c.profiles?.email || "Aluno"}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-foreground/45">{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                  {c.user_id === userId && (
                    <button onClick={() => remove(c.id)} className="text-[10px] text-destructive hover:underline">excluir</button>
                  )}
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-foreground/80">{c.content}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário..." />
          <Button onClick={send} disabled={sending || !text.trim()} className="rounded-full"><Send className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- certificate ---------------- */

function CertificateButton({ course, userId }: { course: CourseFull; userId: string }) {
  const [issuing, setIssuing] = useState(false);

  async function download() {
    setIssuing(true);
    try {
      let { data: cert } = await supabase.from("course_certificates").select("*").eq("user_id", userId).eq("course_id", course.id).maybeSingle();
      if (!cert) {
        const { data, error } = await supabase.from("course_certificates").insert({ user_id: userId, course_id: course.id }).select("*").single();
        if (error) throw error;
        cert = data;
      }
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
      const name = profile?.full_name || profile?.email || "Aluno";

      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, w, h, "F");
      pdf.setDrawColor(59, 130, 246); pdf.setLineWidth(6); pdf.rect(30, 30, w - 60, h - 60);
      pdf.setDrawColor(15, 23, 42); pdf.setLineWidth(1); pdf.rect(42, 42, w - 84, h - 84);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(36);
      pdf.text("CERTIFICADO DE CONCLUSÃO", w / 2, 140, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(14);
      pdf.text("Certificamos que", w / 2, 200, { align: "center" });
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(30);
      pdf.text(name, w / 2, 250, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(14);
      pdf.text("concluiu com sucesso o curso", w / 2, 290, { align: "center" });
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(22);
      pdf.text(course.title, w / 2, 330, { align: "center", maxWidth: w - 200 });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(12);
      pdf.setTextColor(100, 116, 139);
      const issued = new Date(cert!.issued_at).toLocaleDateString("pt-BR");
      pdf.text(`Emitido em ${issued}  ·  Código: ${cert!.code}`, w / 2, h - 100, { align: "center" });
      pdf.setDrawColor(15, 23, 42); pdf.line(w / 2 - 120, h - 130, w / 2 + 120, h - 130);
      pdf.save(`certificado-${course.slug}.pdf`);
      toast.success("Certificado baixado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar certificado");
    } finally { setIssuing(false); }
  }

  return (
    <Button onClick={download} disabled={issuing} className="mt-1 w-full rounded-full">
      <Award className="mr-2 h-4 w-4" /> {issuing ? "Gerando..." : "Baixar certificado"}
    </Button>
  );
}
