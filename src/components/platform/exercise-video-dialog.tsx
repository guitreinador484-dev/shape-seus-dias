import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Dumbbell, Flame, Info, Play, Sparkles, Video, VideoOff } from "lucide-react";
import { useExerciseVideo } from "@/hooks/use-exercise-video";
import { EXERCISE_GROUPS } from "@/lib/exercise-library";
import { getExerciseMuscleGroup } from "@/lib/workout-meta";

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
  const [playbackError, setPlaybackError] = useState(false);
  useEffect(() => { setPlaybackError(false); }, [url, open]);

  const muscleGroup = exercise?.muscle_group || getExerciseMuscleGroup(exerciseName);
  const matchedGroup = EXERCISE_GROUPS.find(
    (g) => g.name.toLowerCase() === muscleGroup.toLowerCase() || g.key === muscleGroup.toLowerCase(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-2xl bg-[#0F0F12] border-white/10 text-white">
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-xl sm:text-2xl font-display tracking-tight text-white">
              {exercise?.name ?? exerciseName}
            </DialogTitle>
            <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs">
              {muscleGroup}
            </Badge>
          </div>
          <DialogDescription className="text-white/60 text-xs sm:text-sm">
            {url ? "Demonstração e execução correta em vídeo por Gui Treinador." : "Guia técnico de execução e postura."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <Skeleton className="aspect-video w-full rounded-2xl bg-white/5" />
        ) : url ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <video
                key={url}
                src={url}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onError={() => setPlaybackError(true)}
                className="aspect-video w-full object-cover"
              />
              {playbackError && (
                <p role="alert" className="p-4 text-xs text-amber-400 bg-amber-500/10 border-t border-amber-500/20">
                  Não foi possível reproduzir este formato de vídeo neste navegador. Siga as orientações técnicas abaixo.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Vídeo oficial da consultoria
              </Badge>
              {video?.gym_id === null ? (
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70 text-xs">
                  Padrão biomecânico universal
                </Badge>
              ) : video?.gym_id && video.gym_id !== gymId ? (
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70 text-xs">
                  Gravado em equipamento similar
                </Badge>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center gap-4">
              {matchedGroup?.image ? (
                <img
                  src={matchedGroup.image}
                  alt={muscleGroup}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-primary/20 border border-primary/30 text-primary grid place-items-center shrink-0">
                  <Dumbbell className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-white text-base sm:text-lg">Técnica e Ativação Muscular</p>
                <p className="text-xs text-white/60 mt-0.5">
                  Foco na biomecânica ideal para máxima ativação de {muscleGroup.toLowerCase()}.
                </p>
              </div>
            </div>

            {/* Guia prático de postura */}
            <div className="grid gap-2.5 sm:grid-cols-3 pt-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-semibold text-primary block mb-1">1. Postura</span>
                <p className="text-white/70 leading-relaxed">Escápulas travadas, abdômen ativo e coluna neutra durante todo o movimento.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-semibold text-primary block mb-1">2. Cadência</span>
                <p className="text-white/70 leading-relaxed">Controle a descida (fase excêntrica em 2 a 3 segundos). Não balance o corpo.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="font-semibold text-primary block mb-1">3. Respiração</span>
                <p className="text-white/70 leading-relaxed">Expire na fase de força e inspire no retorno sem prender o ar.</p>
              </div>
            </div>
          </div>
        )}

        {/* Título e notas do vídeo da biblioteca */}
        {video?.title ? <p className="text-sm font-semibold text-white">{video.title}</p> : null}
        {video?.notes ? (
          <p className="text-xs text-white/70 leading-relaxed rounded-xl border border-white/10 bg-white/5 p-3">
            {video.notes}
          </p>
        ) : null}

        {/* Observações específicas prescritas pelo personal para este aluno */}
        {planNotes ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3.5 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Orientação personalizada do Gui
            </p>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">{planNotes}</p>
          </div>
        ) : null}

        {exercise?.description ? (
          <p className="text-xs text-white/60 leading-relaxed">{exercise.description}</p>
        ) : matchedGroup?.description ? (
          <p className="text-xs text-white/50 leading-relaxed">{matchedGroup.description}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
