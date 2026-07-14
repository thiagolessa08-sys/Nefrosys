import { describe, it, expect, beforeEach } from "vitest";
import { registrarEvento } from "@/lib/auditoria";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

describe("auditoria", () => {
  beforeEach(limparBanco);

  it("registra evento com autor, ação, entidade e detalhes", async () => {
    const usuario = await criarUsuarioTeste();
    await registrarEvento({
      usuarioId: usuario.id,
      acao: "usuario.criar",
      entidade: "Usuario",
      entidadeId: "abc123",
      detalhes: { perfil: "MEDICO" },
    });
    const eventos = await db.eventoAuditoria.findMany();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].acao).toBe("usuario.criar");
    expect(eventos[0].usuarioId).toBe(usuario.id);
    expect(eventos[0].entidadeId).toBe("abc123");
  });

  it("aceita evento sem usuário (ex.: tentativa de login com e-mail desconhecido)", async () => {
    await registrarEvento({ usuarioId: null, acao: "login.falha", detalhes: { email: "x@y.z" } });
    const eventos = await db.eventoAuditoria.findMany();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].usuarioId).toBeNull();
  });
});
