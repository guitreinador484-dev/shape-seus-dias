import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Trash2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createVideo,
  findOrCreateExercise,
  MAX_VIDEO_MB,
  tidyName,
  uploadVideoFile,
  VIDEO_ACCEPT,
  type Exercise,
  type Gym,
} from "@/lib/exercise-videos";

type Row = { key: string; file: File; name: string; gymId: string; progress: number; status: "pendente" | "enviando" | "ok" | "erro"; error?: string };

function nameFromFile(file: File) {
  return tidyName(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
}

export function BulkVideoDialog({ open, onOpenChange, exercises, gyms, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; exercises: Exercise[]; gyms: Gym[]; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [defaultGym, setDefaultGym] = useState("geral");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeGyms = gyms.filter((g) => g.is_active);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Row[] = [];
    Array.from(list).forEach((file) => {
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        toast.error(`${file.name} passa de ${MAX_VIDEO_MB} MB e foi ignorado.`);
        return;
      }
      next.push({ key: crypto.randomUUID(), file, name: nameFromFile(file), gymId: defaultGym, progress: 0, status: "pendente" });
    });
    setRows((r) => [...r, ...next]);
  }

  function update(key: string, patch: Partial<Row>) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function applyGymToAll(value: string) {
    setDefaultGym(value);
    setRows((r) => r.map((row) => (row.status === "ok" ? row : { ...row, gymId: value })));
  }

  async function sendAll() {
    const pending = rows.filter((r) => r.status !== "ok");
    if (pending.some((r) => !r.name.trim())) {
      toast.error("Preencha o nome do exercício de todos os vídeos.");
      return;
    }
    setBusy(true);
    let ok = 0;
    for (const row of pending) {
      update(row.key, { status: "enviando", progress: 0, error: undefined });
      try {
        const { exercise } = await findOrCreateExercise(row.name, null);
        const path = await uploadVideoFile(row.file, (p) => update(row.key, { progress: p }));
        await createVideo({ exercise_id: exercise.id, gym_id: row.gymId === "geral" ? null : row.gymId, video_path: path });
        update(row.key, { status: "ok", progress: 100 });
        ok++;
      } catch (e) {
        update(row.key, { status: "erro", error: e instanceof Error ? e.message : "Falha no envio" });
      }
    }
    setBusy(false);
    onSaved();
    if (ok === pending.length) toast.success(`${ok} vídeo(s) enviados`);
    else toast.error(`${ok} de ${pending.length} enviados. Confira os que deram erro e tente de novo.`);
  }

  function close(o: boolean) {
    if (busy) return;
    if (!o) setRows([]);
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Enviar vários vídeos</DialogTitle>
          <DialogDescription>Escolha os vídeos, confira o nome do exercício e a academia de cada um e envie todos de uma vez.</DialogDescription>
        </DialogHeader>

        <datalist id="bulk-exercise-names">
          {exercises.map((e) => <option key={e.id} value={e.name} />)}
        </datalist>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Academia para todos</Label>
            <Select value={defaultGym} onValueChange={applyGymToAll} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Todas as academias</SelectItem>
                {activeGyms.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Upload className="mr-2 h-4 w-4" /> Escolher vídeos
          </Button>
          <input ref={inputRef} type="file" accept={VIDEO_ACCEPT} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {rows.length === 0 ? (
          <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }} className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground hover:border-primary">
            Arraste os vídeos aqui ou toque para escolher. O nome do arquivo vira o nome do exercício (você pode mudar).
          </button>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.key} className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {row.status === "ok" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : row.status === "erro" ? <XCircle className="h-4 w-4 text-destructive" /> : row.status === "enviando" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span className="min-w-0 flex-1 truncate">{row.file.name} · {(row.file.size / 1024 / 1024).toFixed(1)} MB</span>
                  {row.status !== "enviando" && row.status !== "ok" ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remover" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))} disabled={busy}><Trash2 className="h-4 w-4" /></Button>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
                  <Input list="bulk-exercise-names" value={row.name} onChange={(e) => update(row.key, { name: e.target.value })} placeholder="Nome do exercício" disabled={busy || row.status === "ok"} />
                  <Select value={row.gymId} onValueChange={(v) => update(row.key, { gymId: v })} disabled={busy || row.status === "ok"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Todas as academias</SelectItem>
                      {activeGyms.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {row.status === "enviando" ? <Progress value={row.progress} /> : null}
                {row.error ? <p className="text-xs text-destructive">{row.error}</p> : null}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>Fechar</Button>
          <Button onClick={() => void sendAll()} disabled={busy || rows.every((r) => r.status === "ok")}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Enviar {rows.filter((r) => r.status !== "ok").length} vídeo(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
