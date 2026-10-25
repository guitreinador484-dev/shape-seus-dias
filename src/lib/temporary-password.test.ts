import { describe, expect, it } from "vitest";
import { generateStudentRegistrationPassword, generateTemporaryPassword } from "./temporary-password";

describe("senhas provisórias", () => {
  it("gera senha de cadastro com o mínimo exigido de 10 caracteres", () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      expect(generateStudentRegistrationPassword()).toHaveLength(10);
    }
  });
  it("mantém a senha simples de redefinição com 8 caracteres", () => {
    expect(generateTemporaryPassword()).toHaveLength(8);
  });
});