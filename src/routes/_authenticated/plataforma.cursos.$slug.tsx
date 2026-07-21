import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { ArrowLeft, CheckCircle2, Lock, PlayCircle, FileText, Link2, Award, Send, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/plataforma/cursos/$slug")({
  component: CourseDetailPage,
});

type Progress = { lesson_id: string; completed_at: string | null };

function CourseDetailPage() {
  const { slug } = useParams({ from: "/_authenticated/plataforma/cursos/$slug" });
  const { user, role } = useAuth();
  const isAdmin = role === "admin" || isAdminEmail(user?.email);
  const [course, setCourse] = useState<CourseFull | null>(null);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    if (!user) return;
    setLoading(true);
    const c = await loadCourseBySlug(slug);
    if (!c) { setLoading(false); return; }
    setCourse(c);
    const { data: enroll } = await supabase.from("course_enrollments").select("enrolled_at").eq("course_id", c.id).eq("user_id", user.id).maybeSingle();
    setEnrolledAt(enroll?.enrolled_at ?? (isAdmin ? c.created_at : null));
    const lessonIds = c.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length) {
      const { data } = await supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", user.id).in("lesson_id", lessonIds);
      setProgress(data ?? []);
    }
    const firstUnlocked = c.modules.flatMap((m) => m.lessons).find((l) => isLessonUnlocked(l, enroll?.enrolled_at ?? null));
    if (firstUnlocked) setActiveLessonId((prev) => prev ?? firstUnlocked.id);
    setLoading(false);
  }

  useEffect(() => { reload(); }, [slug, user?.id]);

  const allLessons = useMemo(() => course?.modules.flatMap((m) => m.lessons) ?? [], [course]);
  const totalLessons = allLessons.length;
  const completedCount = progress.filter((p) => p.completed_at).length;
  const pct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? null;

  if (loading) return <div className="p-6 max-w-6xl mx-auto"><Skeleton className="h-96" /></div>;
  if (!course) return (
    <div className="p-6 max-w-6xl mx-auto text-center space-y-3">
      <p className="font-display text-2xl">Curso não encontrado</p>
      <Button asChild variant="secondary"><Link to="/plataforma/cursos">Ver meus cursos</Link></Button>
    </div>
  );
  if (!enrolledAt) return (
    <div className="p-6 max-w-6xl mx-auto text-center space-y-3">
      <p className="font-display text-2xl">Você não está matriculado neste curso</p>
      <Button asChild variant="secondary"><Link to="/plataforma/cursos">Voltar</Link></Button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <Button asChild size="sm" variant="ghost"><Link to="/plataforma/cursos"><ArrowLeft className="h-4 w-4 mr-2" /> Meus cursos</Link></Button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {activeLesson ? (
            <LessonPlayer
              lesson={activeLesson}
              enrolledAt={enrolledAt}
              userId={user!.id}
              completed={progress.some((p) => p.lesson_id === activeLesson.id && p.completed_at)}
              onProgress={reload}
            />
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground">Selecione uma aula</CardContent></Card>
          )}

          <div>
            <h1 className="font-display text-2xl">{course.title}</h1>
            {course.description && <p className="text-muted-foreground mt-1">{course.description}</p>}
          </div>

          <Card><CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span className="text-muted-foreground">{completedCount}/{totalLessons} aulas · {pct}%</span>
            </div>
            <Progress value={pct} />
            {pct === 100 && <CertificateButton course={course} userId={user!.id} />}
          </CardContent></Card>

          {activeLesson && <LessonComments lessonId={activeLesson.id} userId={user!.id} />}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Conteúdo do curso</p>
          <Accordion type="multiple" defaultValue={course.modules.map((m) => m.id)} className="space-y-2">
            {course.modules.map((m) => (
              <AccordionItem key={m.id} value={m.id} className="border rounded-lg px-3 bg-card">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                  {m.title} <span className="text-xs text-muted-foreground ml-2">({m.lessons.length})</span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1">
                    {m.lessons.map((l) => {
                      const unlocked = isLessonUnlocked(l, enrolledAt);
                      const done = progress.some((p) => p.lesson_id === l.id && p.completed_at);
                      const active = l.id === activeLessonId;
                      return (
                        <button
                          key={l.id}
                          disabled={!unlocked}
                          onClick={() => setActiveLessonId(l.id)}
                          className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded text-sm transition ${
                            active ? "bg-primary/15 text-primary" : "hover:bg-accent"
                          } ${!unlocked ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {done ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : unlocked ? <PlayCircle className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
                          <span className="flex-1 min-w-0 truncate">{l.title}</span>
                          {!unlocked && <span className="text-[10px] text-muted-foreground">{daysUntilUnlock(l, enrolledAt)}d</span>}
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </aside>
      </div>
    </div>
  );
}

function LessonPlayer({ lesson, enrolledAt, userId, completed, onProgress }: {
  lesson: CourseLesson; enrolledAt: string; userId: string; completed: boolean; onProgress: () => void;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const unlocked = isLessonUnlocked(lesson, enrolledAt);

  useEffect(() => {
    setVideoUrl(null); setThumbUrl(null);
    if (!unlocked) return;
    signedAsset(lesson.video_path).then(setVideoUrl);
    signedAsset(lesson.thumbnail_path).then(setThumbUrl);
    (async () => {
      const { data } = await supabase.from("lesson_materials").select("*").eq("lesson_id", lesson.id).order("order_index");
      setMaterials(data ?? []);
    })();
  }, [lesson.id, unlocked]);

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
    if (m.external_url) { window.open(m.external_url, "_blank"); return; }
    if (m.file_path) {
      const url = await signedAsset(m.file_path);
      if (url) window.open(url, "_blank");
    }
  }

  if (!unlocked) {
    return (
      <Card><CardContent className="py-16 text-center space-y-2">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="font-display text-xl">Aula bloqueada</p>
        <p className="text-sm text-muted-foreground">Libera em {daysUntilUnlock(lesson, enrolledAt)} dias.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg overflow-hidden bg-black aspect-video">
        {videoUrl ? (
          <video src={videoUrl} poster={thumbUrl ?? undefined} controls controlsList="nodownload" className="w-full h-full" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">Vídeo indisponível</div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl">{lesson.title}</h2>
          {lesson.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{lesson.description}</p>}
        </div>
        {completed ? (
          <Button variant="secondary" onClick={unmark}><CheckCircle2 className="h-4 w-4 mr-2 text-primary" /> Concluída</Button>
        ) : (
          <Button onClick={markComplete}><CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como concluída</Button>
        )}
      </div>
      {materials.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Materiais</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {materials.map((m) => (
              <button key={m.id} onClick={() => openMaterial(m)} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent text-sm text-left">
                {m.kind === "link" ? <Link2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="flex-1 truncate">{m.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonComments({ lessonId, userId }: { lessonId: string; userId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function reload() {
    const { data } = await supabase
      .from("lesson_comments")
      .select("id, content, created_at, user_id, parent_id, profiles(full_name, email)")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    setComments(data ?? []);
  }
  useEffect(() => { reload(); }, [lessonId]);

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
    <Card><CardContent className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Comentários ({comments.length})</p>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {comments.length === 0 && <p className="text-xs text-muted-foreground">Seja o primeiro a comentar.</p>}
        {comments.map((c) => (
          <div key={c.id} className="p-3 rounded-lg bg-muted/40 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{c.profiles?.full_name || c.profiles?.email || "Aluno"}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                {c.user_id === userId && (
                  <button onClick={() => remove(c.id)} className="text-[10px] text-destructive hover:underline">excluir</button>
                )}
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{c.content}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário..." />
        <Button onClick={send} disabled={sending || !text.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </CardContent></Card>
  );
}

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

  return <Button onClick={download} disabled={issuing} className="w-full mt-2"><Award className="h-4 w-4 mr-2" /> {issuing ? "Gerando..." : "Baixar certificado"}</Button>;
}