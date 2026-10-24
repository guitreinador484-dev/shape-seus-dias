import { describe, expect, it } from "vitest";
import { uploadSummary, type UploadTask } from "./video-upload-tracker";
describe("acompanhamento de envios", () => {
  it("mantém arquivo ativo até concluir o cadastro, mesmo com 100% enviado", () => {
    const tasks: UploadTask[] = [{ id: "1", fileName: "video.mp4", status: "salvando", progress: 100 }];
    expect(uploadSummary(tasks)).toEqual({ active: 1, done: 0, errors: 0, progress: 99 });
  });
  it("contabiliza fila, conclusão e falhas separadamente", () => {
    expect(uploadSummary([
      { id: "1", fileName: "a.mp4", status: "aguardando", progress: 0 },
      { id: "2", fileName: "b.mp4", status: "concluido", progress: 100 },
      { id: "3", fileName: "c.mp4", status: "erro", progress: 0 },
    ])).toEqual({ active: 1, done: 1, errors: 1, progress: 33 });
  });
});