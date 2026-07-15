import { db } from "@/lib/db";
import { gerarHashSenha } from "@/lib/auth/senha";
import type { Perfil } from "@prisma/client";

export async function limparBanco() {
  await db.sessao.deleteMany();
  await db.eventoAuditoria.deleteMany();
  await db.usuario.deleteMany();
}

export async function criarUsuarioTeste(dados?: {
  email?: string;
  senha?: string;
  perfil?: Perfil;
  ativo?: boolean;
}) {
  return db.usuario.create({
    data: {
      nome: "Usuário Teste",
      email: dados?.email ?? "teste@clinica.local",
      senhaHash: await gerarHashSenha(dados?.senha ?? "SenhaForte123"),
      perfil: dados?.perfil ?? "MEDICO",
      ativo: dados?.ativo ?? true,
    },
  });
}
