import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Dumbbell, MapPin, Pencil, Plus, Trash2, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AdminPageHeader, ConfirmDialog, EmptyBox, ErrorBox, LoadingBox, RowActions } from "@/components/admin/ui-kit";
import { cn } from "@/lib/utils";
import {
  createExercise,
  createGym,
  createVideo,
  deleteExercise,
  deleteGym,
  deleteVideo,
  listExercises,
  listGyms,
  listVideos,
  MAX_VIDEO_MB,
  MUSCLE_GROUPS,
  normalizeName,
  signedVideoUrl,
  updateExercise,
  updateGym,
  updateVideo,
  uploadVideoFile,
  VIDEO_ACCEPT,
  type Exercise,
  type ExerciseVideo,
  type Gym,
} from "@/lib/exercise-videos";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function ExerciseLibraryPanel() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<ExerciseVideo | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const [ex, gy, vd] = await Promise.all([listExercises(), listGyms(), listVideos()]);
      setExercises(ex);
      setGyms(gy);
      setVideos(vd);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Biblioteca de exercícios"
        description="Cadastre os exercícios, as academias de Volta Redonda e envie os vídeos de execução que os alunos da mentoria vão assistir."
        action={
          <Button
            onClick={() => {
              setEditingVideo(null);
              setVideoOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar vídeo
          </Button>
        }
      />

      {error ? (
        <ErrorBox message={error} onRetry={() => void reload()} />
      ) : loading ? (
        <LoadingBox />
      ) : (
        <Tabs defaultValue="videos">
          <TabsList className="mb-4 flex w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="exercicios">Exercícios</TabsTrigger>
            <TabsTrigger value="academias">Academias</TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            <VideosSection
              videos={videos}
              exercises={exercises}
              gyms={gyms}
              onEdit={(v) => {
                setEditingVideo(v);
                setVideoOpen(true);
              }}
              onChanged={() => void reload()}
            />
          </TabsContent>

          <TabsContent value="exercicios">
            <ExercisesSection exercises={exercises} onChanged={() => void reload()} />
          </TabsContent>

          <TabsContent value="academias">
            <GymsSection gyms={gyms} onChanged={() => void reload()} />
          </TabsContent>
        </Tabs>
      )}

      <VideoDialog
        open={videoOpen}
        onOpenChange={setVideoOpen}
        exercises={exercises}
        gyms={gyms}
        video={editingVideo}
        onSaved={() => void reload()}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ vídeos */

function VideosSection({
  videos,
  exercises,
  gyms,
  onEdit,
  onChanged,
}: {
  videos: ExerciseVideo[];
  exercises: Exercise[];
  gyms: Gym[];
  onEdit: (v: ExerciseVideo) => void;
  onChanged: () => void;
}) {
  const [exFilter, setExFilter] = useState("todos");
  const [gymFilter, setGymFilter] = useState("todas");
  const [removing, setRemoving] = useState<ExerciseVideo | null>(null);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  const exName = (id: string) => exercises.find((e) => e.id === id)?.name ?? "Exercício removido";
  const gymName = (id: string | null) => (id ? (gyms.find((g) => g.id === id)?.name ?? "Academia removida") : "Todas as academias");

  const filtered = videos.filter(
    (v) => (exFilter === "todos" || v.exercise_id === exFilter) && (gymFilter === "todas" || (gymFilter === "geral" ? v.gym_id === null : v.gym_id === gymFilter)),
  );

  async function openPreview(v: ExerciseVideo) {
    const url = await signedVideoUrl(v.video_path);
    if (!url) {
      toast.error("Não conseguimos abrir este vídeo.");
      return;
    }
    setPreview({ url, title: v.title || exName(v.exercise_id) });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:max-w-2xl">
        <Select value={exFilter} onValueChange={setExFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os exercícios</SelectItem>
            {exercises.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={gymFilter} onValueChange={setGymFilter}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as academias</SelectItem>
            <SelectItem value="geral">Somente vídeos gerais</SelectItem>
            {gyms.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyBox
          title="Nenhum vídeo por aqui"
          description="Use o botão “Adicionar vídeo” no topo para enviar a gravação de um exercício."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <Card key={v.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{v.title || exName(v.exercise_id)}</p>
                    <p className="truncate text-xs text-muted-foreground">{exName(v.exercise_id)}</p>
                  </div>
                  <RowActions>
                    <DropdownMenuItem onClick={() => void openPreview(v)}>
                      <Video className="mr-2 h-4 w-4" /> Assistir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(v)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar / trocar vídeo
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setRemoving(v)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </RowActions>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={v.gym_id ? "secondary" : "outline"}>{gymName(v.gym_id)}</Badge>
                  <span className="text-muted-foreground">{formatDate(v.created_at)}</span>
                </div>
                {v.notes ? <p className="text-xs text-muted-foreground">{v.notes}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir este vídeo?"
        description="Os alunos deixam de ver a gravação deste exercício nesta academia."
        confirmLabel="Sim, excluir"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await deleteVideo(removing);
            toast.success("Vídeo excluído.");
            onChanged();
          } catch (e) {
            toast.error("Não foi possível excluir", { description: e instanceof Error ? e.message : undefined });
          } finally {
            setRemoving(null);
          }
        }}
      />

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-6 text-left">{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <video src={preview.url} controls playsInline preload="metadata" className="aspect-video w-full rounded-lg bg-black" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoDialog({
  open,
  onOpenChange,
  exercises,
  gyms,
  video,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: Exercise[];
  gyms: Gym[];
  video: ExerciseVideo | null;
  onSaved: () => void;
}) {
  const [exerciseId, setExerciseId] = useState<string>("");
  const [gymId, setGymId] = useState<string>("geral");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setExerciseId(video?.exercise_id ?? "");
    setGymId(video?.gym_id ?? "geral");
    setTitle(video?.title ?? "");
    setNotes(video?.notes ?? "");
    setFile(null);
    setProgress(0);
  }, [open, video]);

  function acceptFile(f: File | null | undefined) {
    if (!f) return;
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`O vídeo passa de ${MAX_VIDEO_MB} MB. Grave um vídeo mais curto.`);
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (!exerciseId) {
      toast.error("Escolha a qual exercício o vídeo pertence.");
      return;
    }
    if (!video && !file) {
      toast.error("Selecione o arquivo do vídeo.");
      return;
    }
    setBusy(true);
    try {
      let path = video?.video_path;
      if (file) path = await uploadVideoFile(file, setProgress);
      const payload = {
        exercise_id: exerciseId,
        gym_id: gymId === "geral" ? null : gymId,
        title: title.trim() || null,
        notes: notes.trim() || null,
        video_path: path!,
      };
      if (video) await updateVideo(video.id, payload);
      else await createVideo(payload);
      toast.success(video ? "Vídeo atualizado." : "Vídeo adicionado.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error("Não foi possível salvar o vídeo", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{video ? "Editar vídeo" : "Adicionar vídeo"}</DialogTitle>
          <DialogDescription>
            Envie a gravação do exercício e diga em qual academia ela foi feita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "rounded-xl border border-dashed p-6 text-center transition",
              dragging ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <Upload className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">{file ? file.name : "Arraste o vídeo aqui"}</p>
            <p className="mt-1 text-xs text-muted-foreground">MP4, MOV ou WEBM — até {MAX_VIDEO_MB} MB</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => inputRef.current?.click()}>
              Escolher arquivo
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={VIDEO_ACCEPT}
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
            {busy && file ? <Progress value={progress} className="mt-4" /> : null}
            {video && !file ? <p className="mt-3 text-xs text-muted-foreground">Já existe um vídeo enviado. Escolha um arquivo só se quiser trocar.</p> : null}
          </div>

          <div className="space-y-1">
            <Label>Exercício</Label>
            <ExerciseCombobox exercises={exercises} value={exerciseId} onChange={setExerciseId} />
          </div>

          <div className="space-y-1">
            <Label>Academia</Label>
            <Select value={gymId} onValueChange={setGymId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Todas as academias (vídeo geral)</SelectItem>
                {gyms.filter((g) => g.is_active).map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leg press 45° – ajuste do banco no 3" />
          </div>

          <div className="space-y-1">
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Enviando..." : "Salvar vídeo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Seletor de exercício com busca e criação rápida. */
function ExerciseCombobox({
  exercises,
  value,
  onChange,
}: {
  exercises: Exercise[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<string>(MUSCLE_GROUPS[0]);

  const selected = exercises.find((e) => e.id === value);
  const filtered = useMemo(() => {
    const t = normalizeName(term);
    return t ? exercises.filter((e) => normalizeName(e.name).includes(t)) : exercises;
  }, [exercises, term]);

  async function createNow() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createExercise({ name: newName.trim(), muscle_group: newGroup });
      onChange(created.id);
      toast.success("Exercício criado.");
      setNewOpen(false);
      setNewName("");
    } catch (e) {
      toast.error("Não foi possível criar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="truncate">{selected ? selected.name : "Escolher exercício"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,calc(100vw-3rem))] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar exercício..." value={term} onValueChange={setTerm} />
            <CommandList>
              <CommandEmpty>Nenhum exercício com esse nome.</CommandEmpty>
              <CommandGroup>
                {filtered.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={e.id}
                    onSelect={() => {
                      onChange(e.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === e.id ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{e.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{e.muscle_group}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  value="__novo"
                  onSelect={() => {
                    setNewName(term);
                    setOpen(false);
                    setNewOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Criar novo exercício
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar exercício</DialogTitle>
            <DialogDescription>Ele já fica selecionado para o vídeo que você está enviando.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Leg press 45°" />
            </div>
            <div className="space-y-1">
              <Label>Grupo muscular</Label>
              <Select value={newGroup} onValueChange={setNewGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={() => void createNow()} disabled={creating}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------- exercícios */

function ExercisesSection({ exercises, onChanged }: { exercises: Exercise[]; onChanged: () => void }) {
  const [term, setTerm] = useState("");
  const [group, setGroup] = useState("todos");
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<Exercise | null>(null);

  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<string>(MUSCLE_GROUPS[0]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setMuscle(editing?.muscle_group ?? MUSCLE_GROUPS[0]);
    setDescription(editing?.description ?? "");
  }, [open, editing]);

  const filtered = exercises.filter((e) => {
    const t = normalizeName(term);
    if (group !== "todos" && e.muscle_group !== group) return false;
    if (t && !normalizeName(e.name).includes(t)) return false;
    return true;
  });

  async function save() {
    if (!name.trim()) {
      toast.error("Informe o nome do exercício.");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), muscle_group: muscle, description: description.trim() || null };
      if (editing) await updateExercise(editing.id, payload);
      else await createExercise(payload);
      toast.success(editing ? "Exercício atualizado." : "Exercício criado.");
      setOpen(false);
      onChanged();
    } catch (e) {
      toast.error("Não foi possível salvar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nome" />
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os grupos</SelectItem>
            {MUSCLE_GROUPS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Novo exercício
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyBox
          title="Nenhum exercício cadastrado"
          description="Cadastre os exercícios para depois enviar os vídeos de execução de cada academia."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium">
                    <Dumbbell className="h-4 w-4 shrink-0 text-muted-foreground" /> {e.name}
                  </p>
                  <Badge variant="secondary" className="mt-2">{e.muscle_group}</Badge>
                  {e.description ? <p className="mt-2 text-xs text-muted-foreground">{e.description}</p> : null}
                </div>
                <RowActions>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(e);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setRemoving(e)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </RowActions>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar exercício" : "Novo exercício"}</DialogTitle>
            <DialogDescription>O nome aparece para o aluno na biblioteca da mentoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Grupo muscular</Label>
              <Select value={muscle} onValueChange={setMuscle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observações (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={() => void save()} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir este exercício?"
        description="Os vídeos ligados a ele também deixam de aparecer para os alunos."
        confirmLabel="Sim, excluir"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await deleteExercise(removing.id);
            toast.success("Exercício excluído.");
            onChanged();
          } catch (e) {
            toast.error("Não foi possível excluir", { description: e instanceof Error ? e.message : undefined });
          } finally {
            setRemoving(null);
          }
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- academias */

function GymsSection({ gyms, onChanged }: { gyms: Gym[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gym | null>(null);
  const [removing, setRemoving] = useState<Gym | null>(null);
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setNeighborhood(editing?.neighborhood ?? "");
    setActive(editing?.is_active ?? true);
  }, [open, editing]);

  async function save() {
    if (!name.trim()) {
      toast.error("Informe o nome da academia.");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), neighborhood: neighborhood.trim() || null, is_active: active };
      if (editing) await updateGym(editing.id, payload);
      else await createGym(payload);
      toast.success(editing ? "Academia atualizada." : "Academia cadastrada.");
      setOpen(false);
      onChanged();
    } catch (e) {
      toast.error("Não foi possível salvar", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova academia
        </Button>
      </div>

      {gyms.length === 0 ? (
        <EmptyBox
          title="Nenhuma academia cadastrada"
          description="Cadastre as academias de Volta Redonda para o aluno escolher onde treina."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gyms.map((g) => (
            <Card key={g.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-medium">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" /> {g.name}
                  </p>
                  {g.neighborhood ? <p className="mt-1 truncate text-xs text-muted-foreground">{g.neighborhood}</p> : null}
                  <Badge variant={g.is_active ? "secondary" : "outline"} className="mt-2">
                    {g.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <RowActions>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(g);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setRemoving(g)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </RowActions>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar academia" : "Nova academia"}</DialogTitle>
            <DialogDescription>O aluno escolhe a academia para ver o vídeo certo das máquinas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Smart Fit Aterrado" />
            </div>
            <div className="space-y-1">
              <Label>Bairro ou endereço (opcional)</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Aterrado" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Academia ativa</p>
                <p className="text-xs text-muted-foreground">Só academias ativas aparecem para o aluno.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={() => void save()} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Excluir esta academia?"
        description="Os vídeos gravados nela deixam de aparecer para os alunos."
        confirmLabel="Sim, excluir"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          try {
            await deleteGym(removing.id);
            toast.success("Academia excluída.");
            onChanged();
          } catch (e) {
            toast.error("Não foi possível excluir", { description: e instanceof Error ? e.message : undefined });
          } finally {
            setRemoving(null);
          }
        }}
      />
    </div>
  );
}
