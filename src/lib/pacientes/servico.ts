import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { apenasDigitos, cpfValido, cnsValido } from "./documentos";
import type { Modalidade, Sexo, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export type ResultadoPaciente = { ok: true; id: string } | { ok: false; erro: string };

export type DadosIdentificacao = {
  nome: string;
  cpf: string;
  cns?: string;
  dataNascimento: Date;
  sexo: Sexo;
  telefone?: string;
  emailContato?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTelefone?: string;
  tipoVinculo: TipoVinculo;
  convenioNome?: string;
  convenioMatricula?: string;
  convenioValidade?: Date;
};

export type DadosNefrologicos = {
  cidDoencaBase?: string;
  dataInicioDialise?: Date;
  modalidade?: Modalidade;
};

function validarIdentificacao(dados: DadosIdentificacao): string | null {
  if (!dados.nome.trim()) return "Informe o nome.";
  if (!cpfValido(dados.cpf)) return "CPF inválido.";
  if (dados.cns && !cnsValido(dados.cns)) return "CNS inválido.";
  if (dados.tipoVinculo === "CONVENIO" && !dados.convenioNome?.trim())
    return "Informe o nome do convênio.";
  return null;
}

function camposIdentificacao(dados: DadosIdentificacao) {
  return {
    nome: dados.nome.trim(),
    cpf: apenasDigitos(dados.cpf),
    cns: dados.cns ? apenasDigitos(dados.cns) : null,
    dataNascimento: dados.dataNascimento,
    sexo: dados.sexo,
    telefone: dados.telefone?.trim() || null,
    emailContato: dados.emailContato?.trim().toLowerCase() || null,
    logradouro: dados.logradouro?.trim() || null,
    numero: dados.numero?.trim() || null,
    complemento: dados.complemento?.trim() || null,
    bairro: dados.bairro?.trim() || null,
    cidade: dados.cidade?.trim() || null,
    uf: dados.uf?.trim().toUpperCase() || null,
    cep: dados.cep ? apenasDigitos(dados.cep) : null,
    contatoEmergenciaNome: dados.contatoEmergenciaNome?.trim() || null,
    contatoEmergenciaTelefone: dados.contatoEmergenciaTelefone?.trim() || null,
    tipoVinculo: dados.tipoVinculo,
    convenioNome: dados.convenioNome?.trim() || null,
    convenioMatricula: dados.convenioMatricula?.trim() || null,
    convenioValidade: dados.convenioValidade ?? null,
  };
}

export async function criarPaciente(dados: DadosIdentificacao, autorId: string): Promise<ResultadoPaciente> {
  const erro = validarIdentificacao(dados);
  if (erro) return { ok: false, erro };

  const cpf = apenasDigitos(dados.cpf);
  if (await db.paciente.findUnique({ where: { cpf } }))
    return { ok: false, erro: "Já existe paciente com este CPF." };

  const cns = dados.cns ? apenasDigitos(dados.cns) : null;
  if (cns && (await db.paciente.findUnique({ where: { cns } })))
    return { ok: false, erro: "Já existe paciente com este CNS." };

  const paciente = await db.paciente.create({ data: camposIdentificacao(dados) });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.criar",
    entidade: "Paciente",
    entidadeId: paciente.id,
  });
  return { ok: true, id: paciente.id };
}

export async function atualizarIdentificacao(
  pacienteId: string,
  dados: DadosIdentificacao,
  autorId: string,
): Promise<ResultadoPaciente> {
  const erro = validarIdentificacao(dados);
  if (erro) return { ok: false, erro };

  const cpf = apenasDigitos(dados.cpf);
  const conflitoCpf = await db.paciente.findUnique({ where: { cpf } });
  if (conflitoCpf && conflitoCpf.id !== pacienteId)
    return { ok: false, erro: "Já existe paciente com este CPF." };

  const cns = dados.cns ? apenasDigitos(dados.cns) : null;
  if (cns) {
    const conflitoCns = await db.paciente.findUnique({ where: { cns } });
    if (conflitoCns && conflitoCns.id !== pacienteId)
      return { ok: false, erro: "Já existe paciente com este CNS." };
  }

  await db.paciente.update({ where: { id: pacienteId }, data: camposIdentificacao(dados) });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.atualizar_identificacao",
    entidade: "Paciente",
    entidadeId: pacienteId,
  });
  return { ok: true, id: pacienteId };
}

export async function atualizarNefrologicos(
  pacienteId: string,
  dados: DadosNefrologicos,
  autorId: string,
): Promise<ResultadoPaciente> {
  await db.paciente.update({
    where: { id: pacienteId },
    data: {
      cidDoencaBase: dados.cidDoencaBase?.trim().toUpperCase() || null,
      dataInicioDialise: dados.dataInicioDialise ?? null,
      modalidade: dados.modalidade ?? null,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.atualizar_nefrologicos",
    entidade: "Paciente",
    entidadeId: pacienteId,
  });
  return { ok: true, id: pacienteId };
}

export async function mudarSituacao(
  pacienteId: string,
  para: SituacaoPaciente,
  motivo: string | undefined,
  autorId: string,
): Promise<ResultadoPaciente> {
  const paciente = await db.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente) return { ok: false, erro: "Paciente não encontrado." };
  if (paciente.situacao === para) return { ok: false, erro: "O paciente já está nesta situação." };

  await db.paciente.update({ where: { id: pacienteId }, data: { situacao: para } });
  await db.mudancaSituacao.create({
    data: {
      pacienteId,
      de: paciente.situacao,
      para,
      motivo: motivo?.trim() || null,
      registradoPorId: autorId,
    },
  });
  await registrarEvento({
    usuarioId: autorId,
    acao: "paciente.mudar_situacao",
    entidade: "Paciente",
    entidadeId: pacienteId,
    detalhes: { de: paciente.situacao, para },
  });
  return { ok: true, id: pacienteId };
}
