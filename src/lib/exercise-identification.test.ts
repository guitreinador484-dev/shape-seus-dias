import { describe, expect, it } from "vitest";
import { exerciseKey, matchingVideos } from "./exercise-identification";

describe("duplicados da biblioteca", () => {
  const exercises = [{ id: "e1", name: "Flexão de braço" }];
  const videos = [{ id: "v1", exercise_id: "e1", gym_id: "gym1" }, { id: "v2", exercise_id: "e1", gym_id: null }];
  it("identifica o mesmo exercício ignorando acentos, maiúsculas e espaços", () => {
    expect(exerciseKey("  FLEXÃO   de braço ")).toBe("flexao de braco");
  });
  it("identifica possível vídeo duplicado na academia selecionada", () => {
    expect(matchingVideos("flexao de braco", "gym1", exercises, videos).map((video) => video.id)).toEqual(["v1"]);
  });
  it("não trata gravações de academias diferentes como duplicadas", () => {
    expect(matchingVideos("Flexão de braço", "gym2", exercises, videos)).toEqual([]);
  });
  it("exclui o próprio vídeo em edição", () => {
    expect(matchingVideos("Flexão de braço", "gym1", exercises, videos, "v1")).toEqual([]);
  });
});