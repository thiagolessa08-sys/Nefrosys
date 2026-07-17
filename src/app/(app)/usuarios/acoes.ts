"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_GESTAO } from "@/lib/perfis";
import { criarUsuario, definirAtivo } from "@/lib/usuarios/servico";
import type { Perfil } from "@prisma/client";

const PERFIS_VALIDOS: readonly Perfil[] = [
  "ADMINISTRADOR", "MEDICO", "ENFERMAGEM", "TECNICO", "RECEPCAO", "MULTIPROFISSIONAL", "DIRETOR",
];

export type EstadoFormularioUsuario = { erro: string } | undefined;

export async function acaoCriarUsuario(
  _anterior: EstadoFormularioUsuario,
  formData: FormData,
): Promise<EstadoFormularioUsuario> {
  const autor = await exigirPerfil(...PERFIS_GESTAO);
  const perfil = String(formData.get("perfil") ?? "");
  if (!PERFIS_VALIDOS.includes(perfil as Perfil)) return { erro: "Perfil inválido." };

  const resultado = await criarUsuario(
    {
      nome: String(formData.get("nome") ?? ""),
      email: String(formData.get("email") ?? ""),
      senha: String(formData.get("senha") ?? ""),
      perfil: perfil as Perfil,
    },
    autor.id,
  );
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function acaoAlternarAtivo(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_GESTAO);
  await definirAtivo(String(formData.get("id") ?? ""), formData.get("ativo") === "true", autor.id);
  revalidatePath("/usuarios");
}
