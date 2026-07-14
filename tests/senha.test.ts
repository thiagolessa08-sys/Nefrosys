import { describe, it, expect } from "vitest";
import { gerarHashSenha, verificarSenha } from "@/lib/auth/senha";

describe("senha", () => {
  it("gera hash bcrypt diferente da senha original", async () => {
    const hash = await gerarHashSenha("SenhaForte123");
    expect(hash).not.toBe("SenhaForte123");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("aceita a senha correta", async () => {
    const hash = await gerarHashSenha("SenhaForte123");
    expect(await verificarSenha("SenhaForte123", hash)).toBe(true);
  });

  it("rejeita senha incorreta", async () => {
    const hash = await gerarHashSenha("SenhaForte123");
    expect(await verificarSenha("outraSenha", hash)).toBe(false);
  });
});
