import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Dumbbell, MapPin, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGymPreference } from "@/hooks/use-gym-preference";
import { ExerciseVideoDialog } from "@/components/platform/exercise-video-dialog";
import { listExercises, listVideos, MUSCLE_GROUPS, normalizeName, type Exercise, type ExerciseVideo } from "@/lib/exercise-videos";

export function GymPicker({ userId }: { userId: string }) {
  const { gyms, gymId, choose, loading, needsChoice } = useGymPreference(userId);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    if (needsChoice) setAskOpen(true);
  }, [needsChoice]);

  async function pick(value: string) {
    try {
      await choose(value);
      setAskOpen(false);
      toast.success("Academia salva.");
    } catch {
      toast.error("Não conseguimos salvar a academia. Tente de novo.");
    }
  }

  if (loading) return <Skeleton className="h-24 w-full sm:max-w-sm" />;

  const selectedGym = gyms.find((gym) => gym.id === gymId) ?? null;

  return (
    <>
      <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 sm:min-w-80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><MapPin className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase text-primary">Academia selecionada</p><p className="truncate font-semibold">{selectedGym?.name ?? "Escolha sua academia"}</p>{selectedGym?.neighborhood ? <p className="text-xs text-muted-foreground">{selectedGym.neighborhood}, Volta Redonda</p> : null}</div></div>
          {selectedGym ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : null}
        </div>
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setAskOpen(true)}>{selectedGym ? "Alterar academia" : "Selecionar academia"}</Button>
      </div>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Em qual academia você treina?</DialogTitle>
            <DialogDescription>
              Assim mostramos o vídeo gravado nas máquinas da sua academia. Você pode mudar quando quiser.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {gyms.map((g) => (
              <button key={g.id} type="button" onClick={() => void pick(g.id)} className={`flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition ${gymId === g.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted"><MapPin className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{g.name}</span><span className="block text-xs text-muted-foreground">{g.neighborhood ? `${g.neighborhood}, Volta Redonda` : "Volta Redonda, RJ"}</span></span>{gymId === g.id ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <span className="text-xs font-semibold text-primary">Selecionar</span>}</button>
            ))}
            {gyms.length === 0 ? <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma academia disponível no momento.</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MentoriaTab({ userId }: { userId: string }) {
  const { gymId } = useGymPreference(userId);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [group, setGroup] = useState("todos");
  const [selected, setSelected] = useState<Exercise | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([listExercises(), listVideos()])
      .then(([ex, vd]) => {
        if (!alive) return;
        setExercises(ex);
        setVideos(vd);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Erro ao carregar");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const available = useMemo(() => {
    const t = normalizeName(term);
    return exercises.filter((e) => {
      if (group !== "todos" && e.muscle_group !== group) return false;
      if (t && !normalizeName(e.name).includes(t)) return false;
      return true;
    });
  }, [exercises, term, group]);

  function hasVideo(exerciseId: string) {
    const list = videos.filter((v) => v.exercise_id === exerciseId);
    return list.some((v) => v.gym_id === gymId) || list.some((v) => v.gym_id === null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Biblioteca de exercícios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Conteúdo exclusivo da mentoria. Toque em um exercício para ver o vídeo de execução na sua academia.
          </p>
        </div>
        <GymPicker userId={userId} />
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar exercício" className="pl-9" />
        </div>
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os grupos</SelectItem>
            {MUSCLE_GROUPS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
          Não conseguimos carregar a biblioteca agora. Atualize a página e tente de novo.
        </div>
      ) : available.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Dumbbell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-medium">Nenhum exercício encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Tente outro nome ou escolha outro grupo muscular.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setSelected(ex)}
              className="text-left transition hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Card className="h-full">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-muted">
                    <Play className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">{ex.muscle_group}</p>
                    <Badge variant={hasVideo(ex.id) ? "secondary" : "outline"} className="mt-2">
                      {hasVideo(ex.id) ? "Vídeo disponível" : "Sem vídeo ainda"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <ExerciseVideoDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        exerciseName={selected?.name ?? ""}
        exerciseId={selected?.id ?? null}
        gymId={gymId}
      />
    </div>
  );
}
