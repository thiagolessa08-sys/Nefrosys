import { db } from "@/lib/db";
import { gerarHashSenha, verificarSenha } from "@/lib/auth/senha";
import { registrarEvento } from "@/lib/auditoria";
import type { Perfil } from "@prisma/client";

export type ResultadoUsuario = { ok: true; id: string } | { ok: false; erro: string };

const TAMANHO_MINIMO_SENHA = 10;

export async function criarUsuario(
  dados: { nome: string; email: string; senha: string; perfil: Perfil },
  autorId: string,
): Promise<ResultadoUsuario> {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  if (!nome) return { ok: false, erro: "Informe o nome." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
  if (dados.senha.length < TAMANHO_MINIMO_SENHA)
    return { ok: false, erro: `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.` };
  if (await db.usuario.findUnique({ where: { email } }))
    return { ok: false, erro: "Já existe usuário com este e-mail." };

  const usuario = await db.usuario.create({
    data: { nome, email, senhaHash: await gerarHashSenha(dados.senha), perfil: dados.perfil },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "usuario.criar",
    entidade: "Usuario",
    entidadeId: usuario.id,
    detalhes: { perfil: dados.perfil },
  });
  return { ok: true, id: usuario.id };
}

export async function definirAtivo(usuarioId: string, ativo: boolean, autorId: string): Promise<ResultadoUsuario> {
  if (usuarioId === autorId && !ativo)
    return { ok: false, erro: "Você não pode desativar o próprio usuário." };

  await db.usuario.update({ where: { id: usuarioId }, data: { ativo } });
  if (!ativo) await db.sessao.deleteMany({ where: { usuarioId } });
  await registrarEvento({
    usuarioId: autorId,
    acao: ativo ? "usuario.ativar" : "usuario.desativar",
    entidade: "Usuario",
    entidadeId: usuarioId,
  });
  return { ok: true, id: usuarioId };
}

export async function redefinirSenha(usuarioId: string, novaSenha: string, autorId: string): Promise<ResultadoUsuario> {
  if (novaSenha.length < TAMANHO_MINIMO_SENHA)
    return { ok: false, erro: `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.` };

  await db.usuario.update({ where: { id: usuarioId }, data: { senhaHash: await gerarHashSenha(novaSenha) } });
  await db.sessao.deleteMany({ where: { usuarioId } }); // sessões antigas caem junto
  await registrarEvento({
    usuarioId: autorId,
    acao: "usuario.redefinir_senha",
    entidade: "Usuario",
    entidadeId: usuarioId,
  });
  return { ok: true, id: usuarioId };
}

export async function alterarPropriaSenha(
  usuarioId: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<ResultadoUsuario> {
  if (novaSenha.length < TAMANHO_MINIMO_SENHA)
    return { ok: false, erro: `A senha deve ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.` };

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return { ok: false, erro: "Usuário não encontrado." };
  if (!(await verificarSenha(senhaAtual, usuario.senhaHash)))
    return { ok: false, erro: "Senha atual incorreta." };
  if (await verificarSenha(novaSenha, usuario.senhaHash))
    return { ok: false, erro: "A nova senha deve ser diferente da atual." };

  await db.usuario.update({
    where: { id: usuarioId },
    data: { senhaHash: await gerarHashSenha(novaSenha) },
  });
  await db.sessao.deleteMany({ where: { usuarioId } }); // força novo login em todos os dispositivos
  await registrarEvento({
    usuarioId,
    acao: "usuario.alterar_propria_senha",
    entidade: "Usuario",
    entidadeId: usuarioId,
  });
  return { ok: true, id: usuarioId };
}
