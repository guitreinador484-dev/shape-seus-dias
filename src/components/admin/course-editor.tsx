import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  loadCourseFull,
  uploadCourseAsset,
  signedAsset,
  deleteCourseAsset,
  slugify,
  listAllProfiles,
  listCourseEnrollments,
  type CourseFull,
  type CourseLesson,
  type CourseModule,
  type LessonMaterial,
} from "@/lib/courses-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Video, Upload, Save, X, FileText, Link2, Users, MessageSquare } from "lucide-react";

export function AdminCourseEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseFull | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const c = await loadCourseFull(courseId);
      setCourse(c);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, [courseId]);

  if (loading) return <Skeleton className="h-96" />;
  if (!course) return <Card><CardContent className="py-16 text-center text-muted-foreground">Curso não encontrado</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl">{course.title}</h2>
        <p className="text-sm text-muted-foreground">Slug: <code>{course.slug}</code></p>
      </div>
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="enrollments"><Users className="h-3.5 w-3.5 mr-1.5" /> Alunos</TabsTrigger>
          <TabsTrigger value="comments"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Comentários</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-4"><ModulesEditor course={course} onChange={reload} /></TabsContent>
        <TabsContent value="settings" className="mt-4"><CourseSettings course={course} onChange={reload} /></TabsContent>
        <TabsContent value="enrollments" className="mt-4"><EnrollmentsPanel courseId={course.id} /></TabsContent>
        <TabsContent value="comments" className="mt-4"><ModerationPanel courseId={course.id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function CourseSettings({ course, onChange }: { course: CourseFull; onChange: () => void }) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [category, setCategory] = useState(course.category ?? "");
  const [published, setPublished] = useState(course.is_published);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { signedAsset(course.cover_path).then(setCoverUrl); }, [course.cover_path]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("courses").update({
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      is_published: published,
    }).eq("id", course.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    onChange();
  }

  async function changeCover(file: File) {
    const path = await uploadCourseAsset(file, "covers");
    await deleteCourseAsset(course.cover_path);
    await supabase.from("courses").update({ cover_path: path }).eq("id", course.id);
    toast.success("Capa atualizada");
    onChange();
  }
  async function removeCover() {
    await deleteCourseAsset(course.cover_path);
    await supabase.from("courses").update({ cover_path: null }).eq("id", course.id);
    setCoverUrl(null);
    onChange();
  }

  return (
    <Card><CardContent className="p-6 space-y-4">
      <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Categoria</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
      <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></div>
      <div>
        <Label>Capa</Label>
        <div className="mt-2 flex gap-3 items-start">
          {coverUrl && <img src={coverUrl} alt="" className="h-24 w-40 object-cover rounded" />}
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background hover:bg-accent cursor-pointer text-sm">
              <Upload className="h-4 w-4" /> Enviar imagem
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) changeCover(f); }} />
            </label>
            {course.cover_path && <Button size="sm" variant="ghost" onClick={removeCover} className="text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Remover</Button>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={published} onCheckedChange={setPublished} />
        <Label className="!m-0">Publicado</Label>
      </div>
      <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar alterações"}</Button>
    </CardContent></Card>
  );
}

function ModulesEditor({ course, onChange }: { course: CourseFull; onChange: () => void }) {
  const [openModule, setOpenModule] = useState(false);
  const [modTitle, setModTitle] = useState("");

  async function addModule() {
    if (!modTitle.trim()) return;
    const order_index = course.modules.length;
    const { error } = await supabase.from("course_modules").insert({ course_id: course.id, title: modTitle.trim(), order_index });
    if (error) return toast.error(error.message);
    setModTitle(""); setOpenModule(false); onChange();
  }
  async function renameModule(m: CourseModule) {
    const title = prompt("Novo título do módulo:", m.title);
    if (!title) return;
    await supabase.from("course_modules").update({ title }).eq("id", m.id);
    onChange();
  }
  async function removeModule(m: CourseModule) {
    if (!confirm(`Excluir módulo "${m.title}" e suas aulas?`)) return;
    await supabase.from("course_modules").delete().eq("id", m.id);
    onChange();
  }
  async function moveModule(m: CourseModule, dir: -1 | 1) {
    const sorted = [...course.modules].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((x) => x.id === m.id);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const other = sorted[target];
    await supabase.from("course_modules").update({ order_index: other.order_index }).eq("id", m.id);
    await supabase.from("course_modules").update({ order_index: m.order_index }).eq("id", other.id);
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={openModule} onOpenChange={setOpenModule}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> Novo módulo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo módulo</DialogTitle></DialogHeader>
            <Input value={modTitle} onChange={(e) => setModTitle(e.target.value)} placeholder="Título do módulo" autoFocus />
            <DialogFooter><Button onClick={addModule}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {course.modules.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sem módulos. Adicione o primeiro.</CardContent></Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {course.modules.map((m) => (
            <AccordionItem key={m.id} value={m.id} className="border rounded-lg px-3">
              <div className="flex items-center gap-2 py-1">
                <AccordionTrigger className="flex-1 py-2 hover:no-underline">
                  <span className="font-medium">{m.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">({m.lessons.length} aula{m.lessons.length !== 1 ? "s" : ""})</span>
                </AccordionTrigger>
                <Button size="icon" variant="ghost" onClick={() => moveModule(m, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => moveModule(m, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => renameModule(m)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => removeModule(m)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
              <AccordionContent className="pt-2 pb-4">
                <LessonsEditor module={m} onChange={onChange} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

function LessonsEditor({ module, onChange }: { module: CourseModule & { lessons: CourseLesson[] }; onChange: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  async function addLesson() {
    const order_index = module.lessons.length;
    const { data, error } = await supabase.from("course_lessons").insert({
      module_id: module.id,
      title: "Nova aula",
      order_index,
    }).select("id").single();
    if (error || !data) return toast.error(error?.message ?? "Erro");
    setEditingId(data.id);
    onChange();
  }
  async function removeLesson(l: CourseLesson) {
    if (!confirm(`Excluir aula "${l.title}"?`)) return;
    await deleteCourseAsset(l.video_path);
    await deleteCourseAsset(l.thumbnail_path);
    await supabase.from("course_lessons").delete().eq("id", l.id);
    onChange();
  }
  async function moveLesson(l: CourseLesson, dir: -1 | 1) {
    const sorted = [...module.lessons].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((x) => x.id === l.id);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const other = sorted[target];
    await supabase.from("course_lessons").update({ order_index: other.order_index }).eq("id", l.id);
    await supabase.from("course_lessons").update({ order_index: l.order_index }).eq("id", other.id);
    onChange();
  }

  return (
    <div className="space-y-2">
      {module.lessons.map((l) => (
        <div key={l.id} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
          <Video className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{l.title}</p>
            <p className="text-xs text-muted-foreground">
              {l.video_path ? "Vídeo ✓" : "Sem vídeo"} · Libera em {l.release_days || 0}d
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => moveLesson(l, -1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => moveLesson(l, 1)}><ArrowDown className="h-4 w-4" /></Button>
          <Button size="sm" variant="secondary" onClick={() => setEditingId(l.id)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
          <Button size="icon" variant="ghost" onClick={() => removeLesson(l)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addLesson}><Plus className="h-4 w-4 mr-2" /> Nova aula</Button>
      {editingId && <LessonDialog lessonId={editingId} onClose={() => { setEditingId(null); onChange(); }} />}
    </div>
  );
}

function LessonDialog({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const [lesson, setLesson] = useState<CourseLesson | null>(null);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDays, setReleaseDays] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [thumbPath, setThumbPath] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from("course_lessons").select("*").eq("id", lessonId).single();
      if (!l) return;
      setLesson(l);
      setTitle(l.title); setDescription(l.description ?? ""); setReleaseDays(l.release_days ?? 0);
      setDurationSeconds(l.duration_seconds); setVideoPath(l.video_path); setThumbPath(l.thumbnail_path);
      setVideoUrl(await signedAsset(l.video_path));
      setThumbUrl(await signedAsset(l.thumbnail_path));
      const { data: mats } = await supabase.from("lesson_materials").select("*").eq("lesson_id", lessonId).order("order_index");
      setMaterials(mats ?? []);
    })();
  }, [lessonId]);

  async function uploadVideo(file: File) {
    setUploadingVideo(true);
    try {
      if (videoPath) await deleteCourseAsset(videoPath);
      const path = await uploadCourseAsset(file, "videos");
      setVideoPath(path);
      setVideoUrl(await signedAsset(path));
      toast.success("Vídeo enviado");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setUploadingVideo(false); }
  }
  async function uploadThumb(file: File) {
    setUploadingThumb(true);
    try {
      if (thumbPath) await deleteCourseAsset(thumbPath);
      const path = await uploadCourseAsset(file, "thumbs");
      setThumbPath(path);
      setThumbUrl(await signedAsset(path));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setUploadingThumb(false); }
  }
  async function removeVideo() { if (videoPath) await deleteCourseAsset(videoPath); setVideoPath(null); setVideoUrl(null); }
  async function removeThumb() { if (thumbPath) await deleteCourseAsset(thumbPath); setThumbPath(null); setThumbUrl(null); }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("course_lessons").update({
      title: title.trim(),
      description: description.trim() || null,
      release_days: releaseDays,
      video_path: videoPath,
      thumbnail_path: thumbPath,
      duration_seconds: durationSeconds,
    }).eq("id", lessonId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Aula salva");
    onClose();
  }

  async function addMaterial(kind: "file" | "link") {
    if (kind === "link") {
      const url = prompt("URL do material:");
      const t = prompt("Título:");
      if (!url || !t) return;
      await supabase.from("lesson_materials").insert({ lesson_id: lessonId, title: t, external_url: url, kind: "link", order_index: materials.length });
    } else {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "application/pdf,image/*,application/zip";
      input.onchange = async () => {
        const file = input.files?.[0]; if (!file) return;
        try {
          const path = await uploadCourseAsset(file, "materials");
          await supabase.from("lesson_materials").insert({ lesson_id: lessonId, title: file.name, file_path: path, kind: "file", order_index: materials.length });
          const { data: mats } = await supabase.from("lesson_materials").select("*").eq("lesson_id", lessonId).order("order_index");
          setMaterials(mats ?? []);
        } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
      };
      input.click(); return;
    }
    const { data: mats } = await supabase.from("lesson_materials").select("*").eq("lesson_id", lessonId).order("order_index");
    setMaterials(mats ?? []);
  }
  async function removeMaterial(m: LessonMaterial) {
    if (m.file_path) await deleteCourseAsset(m.file_path);
    await supabase.from("lesson_materials").delete().eq("id", m.id);
    setMaterials((prev) => prev.filter((x) => x.id !== m.id));
  }

  if (!lesson) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar aula</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Vídeo</Label>
              {videoUrl ? (
                <div className="mt-1 space-y-2">
                  <video src={videoUrl} controls className="w-full aspect-video rounded bg-black" onLoadedMetadata={(e) => setDurationSeconds(Math.round(e.currentTarget.duration))} />
                  <Button size="sm" variant="ghost" onClick={removeVideo} className="text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Remover</Button>
                </div>
              ) : (
                <label className="mt-1 flex items-center justify-center gap-2 aspect-video rounded border border-dashed cursor-pointer hover:bg-accent text-sm text-muted-foreground">
                  {uploadingVideo ? "Enviando..." : (<><Upload className="h-4 w-4" /> Enviar vídeo</>)}
                  <input type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }} />
                </label>
              )}
            </div>
            <div>
              <Label>Thumbnail (capa da aula)</Label>
              {thumbUrl ? (
                <div className="mt-1 space-y-2">
                  <img src={thumbUrl} alt="" className="w-full aspect-video object-cover rounded" />
                  <Button size="sm" variant="ghost" onClick={removeThumb} className="text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Remover</Button>
                </div>
              ) : (
                <label className="mt-1 flex items-center justify-center gap-2 aspect-video rounded border border-dashed cursor-pointer hover:bg-accent text-sm text-muted-foreground">
                  {uploadingThumb ? "Enviando..." : (<><Upload className="h-4 w-4" /> Enviar imagem</>)}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingThumb} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumb(f); }} />
                </label>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Libera após (dias da matrícula)</Label>
              <Input type="number" min={0} value={releaseDays} onChange={(e) => setReleaseDays(Math.max(0, parseInt(e.target.value) || 0))} />
              <p className="text-xs text-muted-foreground mt-1">0 = disponível na matrícula</p>
            </div>
            <div>
              <Label>Duração (segundos)</Label>
              <Input type="number" min={0} value={durationSeconds ?? ""} onChange={(e) => setDurationSeconds(parseInt(e.target.value) || null)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Materiais</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addMaterial("file")}><FileText className="h-3.5 w-3.5 mr-1" /> Arquivo</Button>
                <Button size="sm" variant="outline" onClick={() => addMaterial("link")}><Link2 className="h-3.5 w-3.5 mr-1" /> Link</Button>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {materials.length === 0 && <p className="text-xs text-muted-foreground">Nenhum material anexado.</p>}
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/40">
                  {m.kind === "link" ? <Link2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                  <span className="flex-1 truncate">{m.title}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeMaterial(m)} className="text-destructive h-7 w-7"><X className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar aula"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EnrollmentsPanel({ courseId }: { courseId: string }) {
  const [profiles, setProfiles] = useState<{ id: string; email: string | null; full_name: string | null }[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function reload() {
    setLoading(true);
    const [p, e] = await Promise.all([listAllProfiles(), listCourseEnrollments(courseId)]);
    setProfiles(p); setEnrolled(new Set(e.map((x) => x.user_id)));
    setLoading(false);
  }
  useEffect(() => { reload(); }, [courseId]);

  async function toggle(userId: string) {
    if (enrolled.has(userId)) {
      await supabase.from("course_enrollments").delete().eq("course_id", courseId).eq("user_id", userId);
    } else {
      await supabase.from("course_enrollments").insert({ course_id: courseId, user_id: userId });
    }
    reload();
  }

  const filtered = profiles.filter((p) => {
    const s = q.toLowerCase();
    return !s || (p.full_name?.toLowerCase().includes(s)) || (p.email?.toLowerCase().includes(s));
  });

  return (
    <Card><CardContent className="p-4 space-y-3">
      <Input placeholder="Buscar aluno por nome ou email..." value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? <Skeleton className="h-40" /> : (
        <div className="max-h-96 overflow-y-auto divide-y">
          {filtered.map((p) => (
            <label key={p.id} className="flex items-center gap-3 py-2 cursor-pointer hover:bg-accent/50 px-2 rounded">
              <Switch checked={enrolled.has(p.id)} onCheckedChange={() => toggle(p.id)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.full_name || "(sem nome)"}</p>
                <p className="text-xs text-muted-foreground truncate">{p.email}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </CardContent></Card>
  );
}

function ModerationPanel({ courseId }: { courseId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    // fetch comments joined with lesson title + user email
    const { data } = await supabase
      .from("lesson_comments")
      .select("id, content, created_at, user_id, lesson_id, parent_id, course_lessons!inner(title, module_id, course_modules!inner(course_id))")
      .eq("course_lessons.course_modules.course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(100);
    setComments(data ?? []); setLoading(false);
  }
  useEffect(() => { reload(); }, [courseId]);

  async function remove(id: string) {
    if (!confirm("Excluir comentário?")) return;
    await supabase.from("lesson_comments").delete().eq("id", id);
    reload();
  }

  if (loading) return <Skeleton className="h-40" />;
  if (comments.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhum comentário ainda.</CardContent></Card>;
  return (
    <div className="space-y-2">
      {comments.map((c) => (
        <Card key={c.id}><CardContent className="p-3 flex gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Aula: {c.course_lessons?.title} · {new Date(c.created_at).toLocaleString()}</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{c.content}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => remove(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </CardContent></Card>
      ))}
    </div>
  );
}