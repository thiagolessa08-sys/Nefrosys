import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Usuario } from "@prisma/client";

const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // expira por inatividade em até 12h

function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function criarSessao(usuarioId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.sessao.create({
    data: {
      id: hashDoToken(token),
      usuarioId,
      expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS),
    },
  });
  return token;
}

export async function validarSessao(token: string): Promise<Usuario | null> {
  const sessao = await db.sessao.findUnique({
    where: { id: hashDoToken(token) },
    include: { usuario: true },
  });
  if (!sessao) return null;
  if (sessao.expiraEm < new Date()) {
    await db.sessao.delete({ where: { id: sessao.id } });
    return null;
  }
  if (!sessao.usuario.ativo) return null;
  // renovação deslizante: estende quando passou da metade da validade
  if (sessao.expiraEm.getTime() - Date.now() < DURACAO_SESSAO_MS / 2) {
    await db.sessao.update({
      where: { id: sessao.id },
      data: { expiraEm: new Date(Date.now() + DURACAO_SESSAO_MS) },
    });
  }
  return sessao.usuario;
}

export async function invalidarSessao(token: string): Promise<void> {
  await db.sessao.deleteMany({ where: { id: hashDoToken(token) } });
}
