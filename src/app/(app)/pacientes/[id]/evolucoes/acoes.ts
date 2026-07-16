"use server";

import { revalidatePath } from "next/cache";
import { exigirUsuario } from "@/lib/auth/contexto";
import { tiposPermitidos } from "@/lib/pacientes/evolucoes-perfis";
import {
  abrirRascunho,
  salvarRascunho,
  assinarEvolucao,
  adicionarAdendo,
} from "@/lib/pacientes/evolucoes";
import type { TipoEvolucao } from "@prisma/client";

export type EstadoEvolucao = { erro: string } | { rascunhoId: string } | undefined;

export async function acaoAbrirRascunho(pacienteId: string, tipo: TipoEvolucao): Promise<EstadoEvolucao> {
  const usuario = await exigirUsuario();
  if (!tiposPermitidos(usuario.perfil).includes(tipo)) {
    return { erro: "Seu perfil não registra esse tipo de evolução." };
  }
  const r = await abrirRascunho(pacienteId, tipo, usuario.id);
  if (!r.ok) return { erro: r.erro };
  return { rascunhoId: r.id };
}

// Salvamento automático: chamado pelo cliente com debounce. Retorna erro discreto se falhar.
export async function acaoSalvarRascunho(evolucaoId: string, texto: string): Promise<EstadoEvolucao> {
  const usuario = await exigirUsuario();
  const r = await salvarRascunho(evolucaoId, texto, usuario.id);
  if (!r.ok) return { erro: r.erro };
  return undefined;
}

export async function acaoAssinar(pacienteId: string, evolucaoId: string): Promise<EstadoEvolucao> {
  const usuario = await exigirUsuario();
  const r = await assinarEvolucao(evolucaoId, usuario.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}/evolucoes`);
  return undefined;
}

export async function acaoAdendo(_anterior: EstadoEvolucao, formData: FormData): Promise<EstadoEvolucao> {
  const usuario = await exigirUsuario();
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const evolucaoId = String(formData.get("evolucaoId") ?? "");
  const r = await adicionarAdendo(evolucaoId, String(formData.get("texto") ?? ""), usuario.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}/evolucoes`);
  return undefined;
}
