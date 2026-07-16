"use server";

import { revalidatePath } from "next/cache";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { anexarDocumento, removerDocumento, definirFoto } from "@/lib/pacientes/documentos-servico";
import type { CategoriaDocumento } from "@prisma/client";

export type EstadoDocumento = { erro: string } | undefined;

const CATEGORIAS: CategoriaDocumento[] = ["LAUDO", "EXAME", "TERMO", "IDENTIDADE", "FOTO", "OUTRO"];

export async function acaoAnexar(_anterior: EstadoDocumento, formData: FormData): Promise<EstadoDocumento> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const categoria = String(formData.get("categoria") ?? "");
  const arquivo = formData.get("arquivo");
  if (!CATEGORIAS.includes(categoria as CategoriaDocumento)) return { erro: "Categoria inválida." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Selecione um arquivo." };

  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  const r = await anexarDocumento(
    {
      pacienteId,
      categoria: categoria as CategoriaDocumento,
      nomeOriginal: arquivo.name,
      tipoMime: arquivo.type,
      conteudo,
    },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  if (categoria === "FOTO") await definirFoto(pacienteId, r.id, autor.id);
  revalidatePath(`/pacientes/${pacienteId}/documentos`);
  return undefined;
}

export async function acaoRemover(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  await removerDocumento(String(formData.get("documentoId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${pacienteId}/documentos`);
}
