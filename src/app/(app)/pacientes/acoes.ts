"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CADASTRO_PACIENTE, PERFIS_CLINICO_PACIENTE } from "@/lib/pacientes/permissoes";
import {
  criarPaciente,
  atualizarIdentificacao,
  atualizarNefrologicos,
  mudarSituacao,
  type DadosIdentificacao,
} from "@/lib/pacientes/servico";
import type { Modalidade, Sexo, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export type EstadoPaciente = { erro: string } | undefined;

function texto(formData: FormData, campo: string): string | undefined {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor || undefined;
}

function data(formData: FormData, campo: string): Date | undefined {
  const valor = texto(formData, campo);
  return valor ? new Date(valor) : undefined;
}

function lerIdentificacao(formData: FormData): DadosIdentificacao | { erro: string } {
  const dataNascimento = data(formData, "dataNascimento");
  if (!dataNascimento) return { erro: "Informe a data de nascimento." };
  const sexo = String(formData.get("sexo") ?? "");
  if (!["FEMININO", "MASCULINO", "OUTRO"].includes(sexo)) return { erro: "Informe o sexo." };
  const tipoVinculo = String(formData.get("tipoVinculo") ?? "");
  if (!["SUS", "CONVENIO"].includes(tipoVinculo)) return { erro: "Informe o vínculo." };

  return {
    nome: String(formData.get("nome") ?? ""),
    cpf: String(formData.get("cpf") ?? ""),
    cns: texto(formData, "cns"),
    dataNascimento,
    sexo: sexo as Sexo,
    telefone: texto(formData, "telefone"),
    emailContato: texto(formData, "emailContato"),
    logradouro: texto(formData, "logradouro"),
    numero: texto(formData, "numero"),
    complemento: texto(formData, "complemento"),
    bairro: texto(formData, "bairro"),
    cidade: texto(formData, "cidade"),
    uf: texto(formData, "uf"),
    cep: texto(formData, "cep"),
    contatoEmergenciaNome: texto(formData, "contatoEmergenciaNome"),
    contatoEmergenciaTelefone: texto(formData, "contatoEmergenciaTelefone"),
    tipoVinculo: tipoVinculo as TipoVinculo,
    convenioNome: texto(formData, "convenioNome"),
    convenioMatricula: texto(formData, "convenioMatricula"),
    convenioValidade: data(formData, "convenioValidade"),
  };
}

export async function acaoCriarPaciente(
  _anterior: EstadoPaciente,
  formData: FormData,
): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const lido = lerIdentificacao(formData);
  if ("erro" in lido) return { erro: lido.erro };

  const resultado = await criarPaciente(lido, autor.id);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath("/pacientes");
  redirect(`/pacientes/${resultado.id}`);
}

export async function acaoAtualizarIdentificacao(
  _anterior: EstadoPaciente,
  formData: FormData,
): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  const id = String(formData.get("id") ?? "");
  const lido = lerIdentificacao(formData);
  if ("erro" in lido) return { erro: lido.erro };

  const resultado = await atualizarIdentificacao(id, lido, autor.id);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath(`/pacientes/${id}`);
  return undefined;
}

export async function acaoAtualizarNefrologicos(
  _anterior: EstadoPaciente,
  formData: FormData,
): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const id = String(formData.get("id") ?? "");
  const modalidade = String(formData.get("modalidade") ?? "");

  const resultado = await atualizarNefrologicos(
    id,
    {
      cidDoencaBase: texto(formData, "cidDoencaBase"),
      dataInicioDialise: data(formData, "dataInicioDialise"),
      modalidade: (modalidade || undefined) as Modalidade | undefined,
    },
    autor.id,
  );
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath(`/pacientes/${id}`);
  return undefined;
}

export async function acaoMudarSituacao(
  _anterior: EstadoPaciente,
  formData: FormData,
): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const id = String(formData.get("id") ?? "");
  const para = String(formData.get("situacao") ?? "");
  if (!["ATIVO", "TRANSPLANTADO", "OBITO", "TRANSFERIDO", "EM_TRANSITO"].includes(para))
    return { erro: "Situação inválida." };

  const resultado = await mudarSituacao(id, para as SituacaoPaciente, texto(formData, "motivo"), autor.id);
  if (!resultado.ok) return { erro: resultado.erro };
  revalidatePath(`/pacientes/${id}`);
  return undefined;
}
