import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ error: null as null | { message: string }, saves: [] as any[], rows: [
  { id: "legs", name: "Cadeira Extensora", muscle_group: "Pernas", description: null, exercise_videos: [{ video_path: "legs.mp4" }] },
  { id: "back", name: "Remada Articulada maquina", muscle_group: "Costas", description: null, exercise_videos: [{ video_path: "back.mp4" }] },
  { id: "no-video", name: "Supino Maquina", muscle_group: "Peito", description: null, exercise_videos: [] },
] }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from(table: string) {
    const q: any = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: { full_name: "Teste" } }), upsert: async () => ({ error: null }),
      then: (r: any) => Promise.resolve({ data: table === "exercises" ? state.rows : [], error: null }).then(r) };
    return q;
  },
  rpc: async (_name: string, args: any) => { state.saves.push(args); return { error: state.error, data: args._plans.map((p: any) => ({ id: `day-${p.day_of_week}`, day_of_week: p.day_of_week })) }; },
  storage: { from: () => ({ upload: async () => ({ error: null }) }) },
} }));
vi.mock("./workout-pdf", () => ({ buildWorkoutPdf: () => ({ base64: "dGVzdA==", fileName: "treino.pdf" }) }));
beforeEach(() => { state.saves = []; state.error = null; });

it("gera novamente a grade de quatro dias somente com vídeos, mesmo com catálogo pequeno", async () => {
  const { generateVideoTrainingGrid } = await import("./video-training.server");
  const input = { student_id: "teste", days_count: 4, level: "iniciante" as const, workout_type: "tradicional" as const };
  expect((await generateVideoTrainingGrid(input)).plansCount).toBe(4);
  expect((await generateVideoTrainingGrid(input)).plansCount).toBe(4);
  expect(state.saves).toHaveLength(2);
  for (const saved of state.saves) {
    expect(saved._plans.map((p: any) => p.day_of_week)).toEqual([1, 2, 4, 5]);
    expect(saved._plans.flatMap((p: any) => p.exercises).map((e: any) => e.exercise_id)).toEqual(["back", "legs", "back", "legs"]);
  }
});

it("não anuncia sucesso quando o salvamento da grade falha", async () => {
  state.error = { message: "falha transacional" };
  const { generateVideoTrainingGrid } = await import("./video-training.server");
  await expect(generateVideoTrainingGrid({ student_id: "teste", days_count: 4, workout_type: "tradicional" })).rejects.toThrow("falha transacional");
});