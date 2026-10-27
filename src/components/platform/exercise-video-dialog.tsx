import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoOff } from "lucide-react";
import { useExerciseVideo } from "@/hooks/use-exercise-video";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome como aparece no treino do aluno. */
  exerciseName: string;
  /** Vínculo direto com a biblioteca, quando existir. */
  exerciseId?: string | null;
  /** Academia escolhida pelo aluno. */
  gymId: string | null;
  /** Observações do treino, mostradas junto com as da biblioteca. */
  planNotes?: string | null;
};

export function ExerciseVideoDialog({ open, onOpenChange, exerciseName, exerciseId, gymId, planNotes }: Props) {
  const { data, isPending: loading } = useExerciseVideo(exerciseName, exerciseId, gymId, open);
  const { exercise = null, video = null, url = null } = data ?? {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-left">{exercise?.name ?? exerciseName}</DialogTitle>
          <DialogDescription className="text-left">
            {exercise?.muscle_group ? `Grupo muscular: ${exercise.muscle_group}` : "Vídeo de execução"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <Skeleton className="aspect-video w-full rounded-xl" />
        ) : url ? (
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            <video
              key={url}
              src={url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <VideoOff className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Vídeo ainda não disponível para esta academia</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Assim que o vídeo for gravado nesta academia, ele aparece aqui.
            </p>
          </div>
        )}

        {video?.gym_id === null && url ? (
          <Badge variant="secondary" className="w-fit">Vídeo geral (serve para todas as academias)</Badge>
        ) : null}
        {video?.gym_id && video.gym_id !== gymId && url ? (
          <Badge variant="secondary" className="w-fit">Demonstração gravada em outra academia</Badge>
        ) : null}

        {video?.title ? <p className="text-sm font-medium">{video.title}</p> : null}
        {video?.notes ? <p className="text-sm text-muted-foreground">{video.notes}</p> : null}
        {planNotes ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações do seu treino</p>
            <p className="mt-1 text-sm">{planNotes}</p>
          </div>
        ) : null}
        {exercise?.description ? <p className="text-sm text-muted-foreground">{exercise.description}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
