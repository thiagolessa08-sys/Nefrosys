import { describe, it, expect, beforeEach } from "vitest";
import { criarUsuario, definirAtivo, redefinirSenha } from "@/lib/usuarios/servico";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { criarSessao, validarSessao } from "@/lib/auth/sessao";
import { verificarSenha } from "@/lib/auth/senha";
import { db } from "@/lib/db";

describe("servico de usuarios", () => {
  beforeEach(limparBanco);

  it("cria usuário com senha em hash e audita", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const resultado = await criarUsuario(
      { nome: "Dra. Ana", email: "Ana@Clinica.Local", senha: "SenhaForte123", perfil: "MEDICO" },
      admin.id,
    );
    expect(resultado.ok).toBe(true);
    const criado = await db.usuario.findUnique({ where: { email: "ana@clinica.local" } });
    expect(criado).not.toBeNull();
    expect(criado!.senhaHash).not.toBe("SenhaForte123");
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "usuario.criar" } });
    expect(eventos).toHaveLength(1);
  });

  it("rejeita e-mail duplicado", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    await criarUsuario({ nome: "A", email: "dup@clinica.local", senha: "SenhaForte123", perfil: "MEDICO" }, admin.id);
    const resultado = await criarUsuario(
      { nome: "B", email: "dup@clinica.local", senha: "SenhaForte123", perfil: "ENFERMAGEM" },
      admin.id,
    );
    expect(resultado).toEqual({ ok: false, erro: "Já existe usuário com este e-mail." });
  });

  it("rejeita senha curta e nome vazio", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    expect(
      await criarUsuario({ nome: "A", email: "a@clinica.local", senha: "curta", perfil: "MEDICO" }, admin.id),
    ).toEqual({ ok: false, erro: "A senha deve ter ao menos 10 caracteres." });
    expect(
      await criarUsuario({ nome: "  ", email: "b@clinica.local", senha: "SenhaForte123", perfil: "MEDICO" }, admin.id),
    ).toEqual({ ok: false, erro: "Informe o nome." });
  });

  it("desativar usuário derruba as sessões dele", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const alvo = await criarUsuarioTeste({ email: "alvo@clinica.local" });
    const token = await criarSessao(alvo.id);
    const resultado = await definirAtivo(alvo.id, false, admin.id);
    expect(resultado.ok).toBe(true);
    expect(await validarSessao(token)).toBeNull();
  });

  it("impede o administrador de desativar a si mesmo", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const resultado = await definirAtivo(admin.id, false, admin.id);
    expect(resultado).toEqual({ ok: false, erro: "Você não pode desativar o próprio usuário." });
  });

  it("redefine senha e audita sem registrar a senha nos detalhes", async () => {
    const admin = await criarUsuarioTeste({ perfil: "ADMINISTRADOR", email: "admin@clinica.local" });
    const alvo = await criarUsuarioTeste({ email: "alvo@clinica.local" });
    const resultado = await redefinirSenha(alvo.id, "NovaSenhaForte1", admin.id);
    expect(resultado.ok).toBe(true);
    const atualizado = await db.usuario.findUnique({ where: { id: alvo.id } });
    expect(await verificarSenha("NovaSenhaForte1", atualizado!.senhaHash)).toBe(true);
    const eventos = await db.eventoAuditoria.findMany({ where: { acao: "usuario.redefinir_senha" } });
    expect(eventos).toHaveLength(1);
    expect(JSON.stringify(eventos[0].detalhes ?? {})).not.toContain("NovaSenhaForte1");
  });
});
