import { describe, it, expect, beforeEach } from "vitest";
import { alterarPropriaSenha } from "@/lib/usuarios/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { criarSessao, validarSessao } from "@/lib/auth/sessao";
import { verificarSenha } from "@/lib/auth/senha";
import { db } from "@/lib/db";

describe("alterar a propria senha", () => {
  beforeEach(limparBanco);

  it("troca a senha quando a atual confere e audita", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "SenhaNovaForte1");
    expect(resultado.ok).toBe(true);
    const atualizado = await db.usuario.findUnique({ where: { id: usuario.id } });
    expect(await verificarSenha("SenhaNovaForte1", atualizado!.senhaHash)).toBe(true);
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "usuario.alterar_propria_senha" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita quando a senha atual está errada", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaErrada9", "SenhaNovaForte1");
    expect(resultado).toEqual({ ok: false, erro: "Senha atual incorreta." });
    const atualizado = await db.usuario.findUnique({ where: { id: usuario.id } });
    expect(await verificarSenha("SenhaAntiga1", atualizado!.senhaHash)).toBe(true);
  });

  it("rejeita senha nova curta", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "curta");
    expect(resultado).toEqual({ ok: false, erro: "A senha deve ter ao menos 10 caracteres." });
  });

  it("rejeita quando a nova senha é igual à atual", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "SenhaAntiga1");
    expect(resultado).toEqual({ ok: false, erro: "A nova senha deve ser diferente da atual." });
  });

  it("derruba as outras sessões do usuário ao trocar a senha", async () => {
    const usuario = await criarUsuarioTeste({ senha: "SenhaAntiga1", email: "u@clinica.local" });
    const token = await criarSessao(usuario.id);
    const resultado = await alterarPropriaSenha(usuario.id, "SenhaAntiga1", "SenhaNovaForte1");
    expect(resultado.ok).toBe(true);
    expect(await validarSessao(token)).toBeNull();
  });
});
