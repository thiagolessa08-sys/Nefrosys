import { db } from "@/lib/db";
import { verificarSenha } from "./senha";
import { registrarEvento } from "@/lib/auditoria";
import type { Usuario } from "@prisma/client";

export async function autenticar(email: string, senha: string): Promise<Usuario | null> {
  const emailNormalizado = email.trim().toLowerCase();
  const usuario = await db.usuario.findUnique({ where: { email: emailNormalizado } });
  // verifica a senha mesmo sem usuário para não vazar, pelo tempo de resposta, se o e-mail existe
  const senhaConfere = usuario ? await verificarSenha(senha, usuario.senhaHash) : false;
  if (!usuario || !usuario.ativo || !senhaConfere) {
    await registrarEvento({
      usuarioId: usuario?.id ?? null,
      acao: "login.falha",
      detalhes: { email: emailNormalizado },
    });
    return null;
  }
  await registrarEvento({ usuarioId: usuario.id, acao: "login.sucesso" });
  return usuario;
}
