import { useEffect, useRef, useState } from "react";
import { Loader2, Play, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExerciseVideo } from "@/hooks/use-exercise-video";

export function ExerciseVideoPreview({ exerciseName, exerciseId, gymId, onOpen }: {
  exerciseName: string;
  exerciseId: string | null;
  gymId: string | null;
  onOpen: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [frame, setFrame] = useState(false);
  const [failed, setFailed] = useState(false);
  const { data, isPending, isError } = useExerciseVideo(exerciseName, exerciseId, gymId, visible);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFrame(false);
    setFailed(false);
    if (!data?.url) return;
    const timeout = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [data?.url]);

  const unavailable = isError || (!isPending && !data?.url);
  return (
    <div ref={container} className="w-full max-w-64 sm:max-w-none">
      <Button variant="outline" onClick={onOpen} aria-label={`Assistir vídeo de ${exerciseName}`}
        className="group/preview relative aspect-video h-auto w-full overflow-hidden p-0 text-foreground">
        {data?.url && !failed ? (
          <video key={data.url} src={data.url} muted playsInline preload="metadata" aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
            }}
            onLoadedData={() => setFrame(true)} onSeeked={() => setFrame(true)} onError={() => setFailed(true)} />
        ) : null}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/25 transition-colors group-hover/preview:bg-background/40">
          {unavailable ? <VideoOff className="size-6 text-muted-foreground" />
            : !frame && !failed ? <Loader2 className="size-6 animate-spin text-muted-foreground" />
            : <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="size-5 fill-current" /></span>}
          {unavailable || failed ? <span className="rounded bg-background/90 px-2 py-1 text-xs text-muted-foreground">{unavailable ? "Vídeo não disponível" : "Prévia indisponível"}</span> : null}
        </span>
        {!unavailable && <span className="absolute bottom-0 inset-x-0 bg-background/85 px-2 py-1 text-center text-xs font-semibold">Assistir execução</span>}
      </Button>
    </div>
  );
}