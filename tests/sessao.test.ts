import { describe, it, expect, beforeEach } from "vitest";
import { criarSessao, validarSessao, invalidarSessao } from "@/lib/auth/sessao";
import { criarUsuarioTeste, limparBanco } from "./ajuda";
import { db } from "@/lib/db";

describe("sessao", () => {
  beforeEach(limparBanco);

  it("cria sessão e valida o token retornando o usuário", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    const validado = await validarSessao(token);
    expect(validado?.id).toBe(usuario.id);
  });

  it("não armazena o token em texto puro", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    const sessoes = await db.sessao.findMany();
    expect(sessoes).toHaveLength(1);
    expect(sessoes[0].id).not.toBe(token);
  });

  it("rejeita token inexistente", async () => {
    expect(await validarSessao("token-que-nao-existe")).toBeNull();
  });

  it("rejeita sessão expirada e a remove do banco", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    await db.sessao.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } });
    expect(await validarSessao(token)).toBeNull();
    expect(await db.sessao.count()).toBe(0);
  });

  it("rejeita sessão de usuário desativado", async () => {
    const usuario = await criarUsuarioTeste({ ativo: false });
    const token = await criarSessao(usuario.id);
    expect(await validarSessao(token)).toBeNull();
  });

  it("invalida a sessão no logout", async () => {
    const usuario = await criarUsuarioTeste();
    const token = await criarSessao(usuario.id);
    await invalidarSessao(token);
    expect(await validarSessao(token)).toBeNull();
  });
});
