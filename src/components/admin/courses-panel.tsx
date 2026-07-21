import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listCoursesAdmin,
  slugify,
  uploadCourseAsset,
  signedAsset,
  deleteCourseAsset,
  type Course,
} from "@/lib/courses-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff, BookOpen, Upload } from "lucide-react";

export function AdminCoursesListPanel() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [covers, setCovers] = useState<Record<string, string | null>>({});
  const [openNew, setOpenNew] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const list = await listCoursesAdmin();
      setCourses(list);
      const entries = await Promise.all(list.map(async (c) => [c.id, await signedAsset(c.cover_path)] as const));
      setCovers(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  async function togglePublish(c: Course) {
    const { error } = await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(c.is_published ? "Rascunho" : "Publicado");
    reload();
  }
  async function remove(c: Course) {
    if (!confirm(`Excluir "${c.title}"? Aulas e progresso serão removidos.`)) return;
    await deleteCourseAsset(c.cover_path);
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Curso excluído");
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl">Cursos</h2>
          <p className="text-sm text-muted-foreground">Crie cursos com módulos e aulas, controle acesso e progresso dos alunos.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo curso</Button>
          </DialogTrigger>
          <NewCourseDialog onCreated={() => { setOpenNew(false); reload(); }} />
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="py-16 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted grid place-items-center">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-display text-xl">Nenhum curso ainda</p>
          <p className="text-sm text-muted-foreground">Clique em "Novo curso" pra começar.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id} className="overflow-hidden group">
              <div className="relative aspect-video bg-muted">
                {covers[c.id] ? (
                  <img src={covers[c.id]!} alt={c.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-muted-foreground/40">
                    <BookOpen className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {c.is_published ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-primary/90 text-primary-foreground uppercase tracking-widest">Publicado</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-widest">Rascunho</span>
                  )}
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-display text-lg leading-tight line-clamp-1">{c.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description || "Sem descrição"}</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="secondary" className="flex-1">
                    <Link to="/admin/cursos/$id" params={{ id: c.id }}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => togglePublish(c)} title={c.is_published ? "Despublicar" : "Publicar"}>
                    {c.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(c)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewCourseDialog({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return toast.error("Título obrigatório");
    setSaving(true);
    try {
      let cover_path: string | null = null;
      if (coverFile) cover_path = await uploadCourseAsset(coverFile, "covers");
      const slug = slugify(title) + "-" + crypto.randomUUID().slice(0, 6);
      const { error } = await supabase.from("courses").insert({
        title: title.trim(),
        slug,
        description: description.trim() || null,
        category: category.trim() || null,
        cover_path,
        is_published: published,
      });
      if (error) throw error;
      toast.success("Curso criado");
      setTitle(""); setDescription(""); setCategory(""); setCoverFile(null); setPublished(false);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo curso</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Emagrecimento em 30 dias" /></div>
        <div><Label>Categoria</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Iniciante" /></div>
        <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
        <div>
          <Label>Capa (imagem)</Label>
          <label className="flex items-center gap-2 mt-1 h-10 px-3 rounded-md border border-input bg-background hover:bg-accent cursor-pointer text-sm">
            <Upload className="h-4 w-4" />
            <span className="truncate">{coverFile ? coverFile.name : "Selecionar imagem"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={published} onCheckedChange={setPublished} />
          <Label className="!m-0">Publicar imediatamente</Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar curso"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}