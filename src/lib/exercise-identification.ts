export type Identification = {
  name: string | null;
  muscleGroup: string | null;
  confidence: "alta" | "media" | "baixa";
  reason: string;
  existingExerciseId: string | null;
};

export function exerciseKey(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchingVideos(name: string, gymId: string | null, exercises: { id: string; name: string }[], videos: { id: string; exercise_id: string; gym_id: string | null }[], excludeId?: string) {
  const ids = new Set(exercises.filter((exercise) => exerciseKey(exercise.name) === exerciseKey(name)).map((exercise) => exercise.id));
  return videos.filter((video) => video.id !== excludeId && ids.has(video.exercise_id) && video.gym_id === gymId);
}

/** Only representative stills leave the browser; the large video remains local. */
export async function extractExerciseFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const wait = (event: string) => new Promise<void>((resolve, reject) => {
    const cleanup = () => { video.removeEventListener(event, done); video.removeEventListener("error", fail); clearTimeout(timer); };
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("Não foi possível ler o vídeo. Informe o nome manualmente.")); };
    const timer = setTimeout(fail, 20000);
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", fail, { once: true });
  });
  try {
    const loaded = wait("loadeddata");
    video.src = url;
    await loaded;
    if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth) throw new Error("Não foi possível ler este formato de vídeo.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível capturar imagens do vídeo.");
    const frames: string[] = [];
    for (const fraction of [0.15, 0.4, 0.65, 0.85]) {
      const seeked = wait("seeked");
      video.currentTime = video.duration * fraction;
      await seeked;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.75));
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}