import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/ui-kit";
import { Loader2, Pencil, Plus, Save, Eye, Trash2, Video, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Field, type Workout, type WorkoutInsert, type WorkoutUpdate } from "./shared";

export const emptyWorkoutForm: WorkoutInsert = {
  title: "",
  category: "Geral",
  video_url: "",
  thumbnail_url: "",
  description: "",
  difficulty: "Iniciante",
  duration_minutes: 30,
  is_featured: false,
  display_order: 0,
};

export function AdminLessonsPanel() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("workouts").select("*").order("display_order", { ascending: true });
    if (error) throw error;
    setWorkouts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch((error) => {
      setLoading(false);
      toast.error("Erro ao carregar aulas", { description: error.message });
    });
  }, []);

  async function saveWorkout(values: WorkoutInsert | WorkoutUpdate, id?: string) {
    const payload = {
      ...values,
      video_url: values.video_url || null,
      thumbnail_url: values.thumbnail_url || null,
      video_path: values.video_path || null,
      thumbnail_path: values.thumbnail_path || null,
      description: values.description || null,
      difficulty: values.difficulty || null,
      duration_minutes: Number(values.duration_minutes || 0),
      display_order: Number(values.display_order || 0),
    };
    const result = id ? await supabase.from("workouts").update(payload).eq("id", id) : await supabase.from("workouts").insert(payload as WorkoutInsert);
    if (result.error) throw result.error;
    toast.success(id ? "Aula atualizada" : "Aula criada");
    setOpen(false);
    await load();
  }

  async function removeWorkout(id: string) {
    const workout = workouts.find((w) => w.id === id);
    if (!confirm(`Excluir a aula "${workout?.title ?? ""}"?`)) return;
    try {
      if (workout?.video_path) await supabase.storage.from("workout-videos").remove([workout.video_path]);
      if (workout?.thumbnail_path) await supabase.storage.from("workout-thumbnails").remove([workout.thumbnail_path]);
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Aula removida");
      await load();
    } catch (error) {
      toast.error("Erro ao excluir aula", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <AdminPageHeader
        title="Aulas em vídeo"
        description="Cadastre aulas, categorias, links de vídeo, duração e destaque."
        action={<WorkoutDialog open={open} onOpenChange={setOpen} onSave={saveWorkout} />}
      />
      {loading ? <Skeleton className="h-80" /> : workouts.length === 0 ? <EmptyState title="Nenhuma aula cadastrada" description="Crie a primeira aula para liberar conteúdo aos alunos online." /> : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {workouts.map((workout) => (
              <div key={workout.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <div className="min-w-0 flex-[1_1_16rem]">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{workout.title}</p>
                    {workout.is_featured && <Badge>Destaque</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {workout.category} · {workout.difficulty || "Nível livre"} · {workout.duration_minutes ?? 0} min · Ordem {workout.display_order}
                  </p>
                  {workout.description ? <p className="mt-1 hidden truncate text-sm text-muted-foreground sm:block">{workout.description}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <WorkoutDialog workout={workout} onSave={saveWorkout} />
                  <Button variant="ghost" size="icon" aria-label={`Excluir ${workout.title}`} className="text-muted-foreground hover:text-destructive" onClick={() => removeWorkout(workout.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function WorkoutDialog({ workout, open, onOpenChange, onSave }: { workout?: Workout; open?: boolean; onOpenChange?: (open: boolean) => void; onSave: (values: WorkoutInsert | WorkoutUpdate, id?: string) => Promise<void> }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlledOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [form, setForm] = useState<WorkoutInsert | WorkoutUpdate>(workout ?? emptyWorkoutForm);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  useEffect(() => {
    setForm(workout ?? emptyWorkoutForm);
  }, [workout, controlledOpen]);

  async function uploadFile(file: File, bucket: "workout-videos" | "workout-thumbnails"): Promise<string> {
    const ext = file.name.split(".").pop() || "bin";
    const key = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(key, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return key;
  }

  async function removeFile(bucket: "workout-videos" | "workout-thumbnails", key: string) {
    const { error } = await supabase.storage.from(bucket).remove([key]);
    if (error) throw error;
  }

  async function deleteVideo() {
    if (!form.video_path) return;
    try {
      await removeFile("workout-videos", form.video_path);
      setForm((f) => ({ ...f, video_path: null }));
      toast.success("Vídeo removido");
    } catch (error) {
      toast.error("Erro ao remover vídeo", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function deleteThumb() {
    if (!form.thumbnail_path) return;
    try {
      await removeFile("workout-thumbnails", form.thumbnail_path);
      setForm((f) => ({ ...f, thumbnail_path: null }));
      toast.success("Capa removida");
    } catch (error) {
      toast.error("Erro ao remover capa", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function handleVideoFile(file: File) {
    setUploadingVideo(true);
    try {
      const key = await uploadFile(file, "workout-videos");
      setForm((f) => ({ ...f, video_path: key }));
      toast.success("Vídeo enviado");
    } catch (error) {
      toast.error("Erro ao enviar vídeo", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setUploadingVideo(false);
    }
  }

  async function handleThumbFile(file: File) {
    setUploadingThumb(true);
    try {
      const key = await uploadFile(file, "workout-thumbnails");
      setForm((f) => ({ ...f, thumbnail_path: key }));
      toast.success("Capa enviada");
    } catch (error) {
      toast.error("Erro ao enviar capa", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setUploadingThumb(false);
    }
  }

  async function submit() {
    if (!form.title || !form.category) {
      toast.error("Informe título e categoria.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form, workout?.id);
      setOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar aula", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={controlledOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={workout ? "outline" : "default"}>{workout ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {workout ? "Editar" : "Nova aula"}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{workout ? "Editar aula" : "Nova aula"}</DialogTitle>
          <DialogDescription>Envie o vídeo direto pela plataforma — cada aluno acessa por link assinado individual.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título"><Input value={form.title ?? ""} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
          <Field label="Categoria"><Input value={form.category ?? ""} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
          <Field label="Vídeo da aula" className="sm:col-span-2">
            <div className="space-y-2">
              {form.video_path ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Video className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs truncate flex-1" title={form.video_path}>{form.video_path}</span>
                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteVideo}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="inline-flex">
                  <input type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleVideoFile(f); e.target.value = ""; }} />
                  <span className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted ${uploadingVideo ? "opacity-60 pointer-events-none" : ""}`}>
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingVideo ? "Enviando vídeo..." : "Enviar vídeo"}
                  </span>
                </label>
              )}
              <Input placeholder="ou cole uma URL externa (opcional)" value={form.video_url ?? ""} onChange={(event) => setForm({ ...form, video_url: event.target.value })} />
            </div>
          </Field>
          <Field label="Capa (imagem)" className="sm:col-span-2">
            <div className="space-y-2">
              {form.thumbnail_path ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Eye className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs truncate flex-1" title={form.thumbnail_path}>{form.thumbnail_path}</span>
                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteThumb}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="inline-flex">
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingThumb} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleThumbFile(f); e.target.value = ""; }} />
                  <span className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-muted ${uploadingThumb ? "opacity-60 pointer-events-none" : ""}`}>
                    {uploadingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingThumb ? "Enviando capa..." : "Enviar capa"}
                  </span>
                </label>
              )}
              <Input placeholder="ou cole uma URL externa (opcional)" value={form.thumbnail_url ?? ""} onChange={(event) => setForm({ ...form, thumbnail_url: event.target.value })} />
            </div>
          </Field>
          <Field label="Dificuldade"><Input value={form.difficulty ?? ""} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} /></Field>
          <Field label="Duração em minutos"><Input type="number" value={form.duration_minutes ?? 0} onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })} /></Field>
          <Field label="Ordem"><Input type="number" value={form.display_order ?? 0} onChange={(event) => setForm({ ...form, display_order: Number(event.target.value) })} /></Field>
          <label className="flex items-center gap-2 pt-7 text-sm"><Checkbox checked={Boolean(form.is_featured)} onCheckedChange={(checked) => setForm({ ...form, is_featured: checked === true })} /> Aula em destaque</label>
          <Field label="Descrição" className="sm:col-span-2"><Textarea value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || uploadingVideo || uploadingThumb}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
