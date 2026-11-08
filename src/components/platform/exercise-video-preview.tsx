import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { useExerciseVideo } from "@/hooks/use-exercise-video";

function prefersSavingData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

export function ExerciseVideoPreview({ exerciseName, exerciseId, gymId, onOpen }: {
  exerciseName: string;
  exerciseId: string | null;
  gymId: string | null;
  onOpen: () => void;
}) {
  const container = useRef<HTMLButtonElement>(null);
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
  }, [data?.url]);

  useEffect(() => {
    if (!data?.url || frame || failed) return;
    const timeout = window.setTimeout(() => setFailed(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [data?.url, frame, failed]);

  const unavailable = visible && (isError || (!isPending && !data?.url));
  const loadFrame = Boolean(data?.url) && !failed && !prefersSavingData();
  // Sem vídeo, o nome do exercício continua abrindo as orientações: a linha ganha o espaço.
  if (unavailable) return null;
  return (
    <button
      ref={container}
      type="button"
      onClick={onOpen}
      aria-label={`Assistir vídeo de ${exerciseName}`}
      className="group/preview relative aspect-video w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:w-40"
    >
      {loadFrame ? (
        <video key={data?.url} src={data?.url ?? undefined} muted playsInline preload="metadata" aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
          }}
          onLoadedData={() => setFrame(true)} onSeeked={() => setFrame(true)} onError={() => setFailed(true)} />
      ) : null}
      <span className="absolute inset-0 grid place-items-center bg-black/20 transition-colors duration-150 group-hover/preview:bg-black/40">
        {loadFrame && !frame ? <Loader2 className="size-4 animate-spin text-muted-foreground" />
          : <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground sm:size-10"><Play className="ml-0.5 size-4 fill-current sm:size-5" /></span>}
      </span>
    </button>
  );
}
