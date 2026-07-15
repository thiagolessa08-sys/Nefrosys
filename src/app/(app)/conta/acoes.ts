"use server";

import { exigirUsuario } from "@/lib/auth/contexto";
import { alterarPropriaSenha } from "@/lib/usuarios/servico";

export type EstadoConta = { erro: string } | { sucesso: string } | undefined;

export async function acaoAlterarSenha(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const usuario = await exigirUsuario();
  const resultado = await alterarPropriaSenha(
    usuario.id,
    String(formData.get("senhaAtual") ?? ""),
    String(formData.get("novaSenha") ?? ""),
  );
  if (!resultado.ok) return { erro: resultado.erro };
  return { sucesso: "Senha alterada. Entre novamente com a nova senha." };
}
