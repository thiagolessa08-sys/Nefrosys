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
import { registrarAcesso, marcarAcessoPerdido } from "@/lib/pacientes/acessos";
import { registrarSorologia } from "@/lib/pacientes/sorologias";
import {
  adicionarMedicacao,
  suspenderMedicacao,
  adicionarAlergia,
  removerAlergia,
} from "@/lib/pacientes/medicacoes";
import type {
  Modalidade,
  Sexo,
  SituacaoPaciente,
  TipoVinculo,
  TipoAcesso,
  TipoSorologia,
  ResultadoSorologia,
} from "@prisma/client";

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

export async function acaoRegistrarAcesso(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const dataConfeccao = data(formData, "dataConfeccao");
  if (!["FISTULA", "CATETER", "PROTESE"].includes(tipo)) return { erro: "Tipo de acesso inválido." };
  if (!dataConfeccao) return { erro: "Informe a data de confecção/implante." };

  const r = await registrarAcesso(
    {
      pacienteId,
      tipo: tipo as TipoAcesso,
      localizacao: String(formData.get("localizacao") ?? ""),
      dataConfeccao,
      observacao: texto(formData, "observacao"),
    },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoPerderAcesso(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  await marcarAcessoPerdido(String(formData.get("acessoId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${String(formData.get("pacienteId") ?? "")}`);
}

export async function acaoRegistrarSorologia(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const resultado = String(formData.get("resultado") ?? "");
  const dataExame = data(formData, "dataExame");
  if (!["HBSAG", "ANTI_HCV", "HIV"].includes(tipo)) return { erro: "Tipo de sorologia inválido." };
  if (!["POSITIVO", "NEGATIVO", "INDETERMINADO"].includes(resultado)) return { erro: "Resultado inválido." };
  if (!dataExame) return { erro: "Informe a data do exame." };

  const r = await registrarSorologia(
    { pacienteId, tipo: tipo as TipoSorologia, resultado: resultado as ResultadoSorologia, dataExame },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoAdicionarMedicacao(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const r = await adicionarMedicacao(
    {
      pacienteId,
      nome: String(formData.get("nome") ?? ""),
      dose: texto(formData, "dose"),
      posologia: texto(formData, "posologia"),
    },
    autor.id,
  );
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoSuspenderMedicacao(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  await suspenderMedicacao(String(formData.get("medicacaoId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${String(formData.get("pacienteId") ?? "")}`);
}

export async function acaoAdicionarAlergia(_anterior: EstadoPaciente, formData: FormData): Promise<EstadoPaciente> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const r = await adicionarAlergia({ pacienteId, descricao: String(formData.get("descricao") ?? "") }, autor.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath(`/pacientes/${pacienteId}`);
  return undefined;
}

export async function acaoRemoverAlergia(formData: FormData): Promise<void> {
  const autor = await exigirPerfil(...PERFIS_CLINICO_PACIENTE);
  await removerAlergia(String(formData.get("alergiaId") ?? ""), autor.id);
  revalidatePath(`/pacientes/${String(formData.get("pacienteId") ?? "")}`);
}
