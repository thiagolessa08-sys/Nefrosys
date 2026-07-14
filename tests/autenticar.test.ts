import { describe, it, expect, beforeEach } from "vitest";
import { autenticar } from "@/lib/auth/autenticar";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

describe("autenticar", () => {
  beforeEach(limparBanco);

  it("retorna o usuário com credenciais válidas e audita o sucesso", async () => {
    const usuario = await criarUsuarioTeste({ email: "medico@clinica.local", senha: "SenhaForte123" });
    const resultado = await autenticar("medico@clinica.local", "SenhaForte123");
    expect(resultado?.id).toBe(usuario.id);
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "login.sucesso" } });
    expect(eventos).toHaveLength(1);
  });

  it("normaliza o e-mail (maiúsculas e espaços)", async () => {
    await criarUsuarioTeste({ email: "medico@clinica.local" });
    const resultado = await autenticar("  MEDICO@clinica.local ", "SenhaForte123");
    expect(resultado).not.toBeNull();
  });

  it("rejeita senha errada e audita a falha", async () => {
    await criarUsuarioTeste({ email: "medico@clinica.local" });
    const resultado = await autenticar("medico@clinica.local", "senhaErrada");
    expect(resultado).toBeNull();
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "login.falha" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita e-mail desconhecido e audita a falha", async () => {
    expect(await autenticar("ninguem@clinica.local", "qualquer")).toBeNull();
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "login.falha" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita usuário desativado", async () => {
    await criarUsuarioTeste({ email: "ex@clinica.local", ativo: false });
    expect(await autenticar("ex@clinica.local", "SenhaForte123")).toBeNull();
  });
});
