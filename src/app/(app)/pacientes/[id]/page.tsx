import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CLINICO_PACIENTE, PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { perfilPermitido } from "@/lib/perfis";
import { db } from "@/lib/db";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { FormularioNefrologicos } from "./formulario-nefrologicos";
import { FormularioSituacao } from "./formulario-situacao";
import { listarAcessos } from "@/lib/pacientes/acessos";
import { sorologiasAtuais } from "@/lib/pacientes/sorologias";
import { medicacoesAtivas, listarAlergias } from "@/lib/pacientes/medicacoes";
import { SecaoAcessos } from "./secao-acessos";
import { SecaoSorologias } from "./secao-sorologias";
import { SecaoMedicacoesAlergias } from "./secao-medicacoes-alergias";
import type { Modalidade, SituacaoPaciente } from "@prisma/client";

const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo",
  TRANSPLANTADO: "Transplantado",
  OBITO: "Óbito",
  TRANSFERIDO: "Transferido",
  EM_TRANSITO: "Em trânsito",
};

const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  HEMODIALISE: "Hemodiálise",
  DIALISE_PERITONEAL: "Diálise peritoneal",
};

// Datas de calendário (nascimento, início da diálise) são gravadas como meia-noite UTC.
// Converter para o fuso de Brasília jogaria para as 21h do dia anterior — data errada.
function formatarData(data: Date | null): string {
  if (!data) return "—";
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Já um instante (quando o registro foi feito) é exibido no fuso da clínica.
function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function PaginaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;

  const paciente = await db.paciente.findUnique({
    where: { id },
    include: {
      mudancasSituacao: { orderBy: { registradoEm: "desc" } },
    },
  });
  if (!paciente) notFound();

  // LGPD/CFM: toda visualização de dado de paciente é registrada
  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.visualizar",
    entidade: "Paciente",
    entidadeId: paciente.id,
  });

  const podeEditarClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_PACIENTE);
  const podeVerClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_LEITURA);

  const [acessos, sorologias, medicacoes, alergias] = podeVerClinico
    ? await Promise.all([
        listarAcessos(paciente.id),
        sorologiasAtuais(paciente.id),
        medicacoesAtivas(paciente.id),
        listarAlergias(paciente.id),
      ])
    : [[], {}, [], []];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/pacientes" className="text-sm text-blue-700 hover:underline">← Pacientes</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">{paciente.nome}</h1>
        <p className="text-sm text-slate-500">
          {formatarCpf(paciente.cpf)} · {formatarData(paciente.dataNascimento)} ·{" "}
          <span className="font-medium">{ROTULO_SITUACAO[paciente.situacao]}</span>
        </p>
        {podeVerClinico && (
          <div className="mt-1 flex gap-4 text-sm">
            <Link href={`/pacientes/${paciente.id}/resumo`} className="text-blue-700 hover:underline">
              Ver resumo do paciente →
            </Link>
            <Link href={`/pacientes/${paciente.id}/evolucoes`} className="text-blue-700 hover:underline">
              Evoluções →
            </Link>
            <Link href={`/pacientes/${paciente.id}/prontuario`} className="text-blue-700 hover:underline">
              Prontuário (PDF) →
            </Link>
          </div>
        )}
        <Link
          href={`/pacientes/${paciente.id}/documentos`}
          className="mt-1 inline-block text-sm text-blue-700 hover:underline"
        >
          Documentos →
        </Link>
      </div>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Identificação e vínculo</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">CNS</dt><dd>{paciente.cns ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Telefone</dt><dd>{paciente.telefone ?? "—"}</dd></div>
          <div><dt className="text-slate-500">E-mail</dt><dd>{paciente.emailContato ?? "—"}</dd></div>
          <div>
            <dt className="text-slate-500">Endereço</dt>
            <dd>
              {[paciente.logradouro, paciente.numero, paciente.bairro, paciente.cidade, paciente.uf]
                .filter(Boolean)
                .join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Contato de emergência</dt>
            <dd>
              {paciente.contatoEmergenciaNome
                ? `${paciente.contatoEmergenciaNome} — ${paciente.contatoEmergenciaTelefone ?? "sem telefone"}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Vínculo</dt>
            <dd>
              {paciente.tipoVinculo === "SUS"
                ? "SUS"
                : `${paciente.convenioNome ?? "Convênio"} — matrícula ${paciente.convenioMatricula ?? "—"}`}
            </dd>
          </div>
        </dl>
      </section>

      {podeVerClinico && (
      <>
      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Dados nefrológicos</h2>
        {podeEditarClinico ? (
          <FormularioNefrologicos
            id={paciente.id}
            cidDoencaBase={paciente.cidDoencaBase ?? ""}
            dataInicioDialise={paciente.dataInicioDialise?.toISOString().slice(0, 10) ?? ""}
            modalidade={paciente.modalidade ?? ""}
          />
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Doença de base (CID)</dt>
              <dd>{paciente.cidDoencaBase ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Início da diálise</dt>
              <dd>{formatarData(paciente.dataInicioDialise)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Modalidade</dt>
              <dd>{paciente.modalidade ? ROTULO_MODALIDADE[paciente.modalidade] : "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Situação</h2>
        {podeEditarClinico && <FormularioSituacao id={paciente.id} situacaoAtual={paciente.situacao} />}
        {paciente.mudancasSituacao.length > 0 ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Data</th>
                <th className="py-2">De</th>
                <th className="py-2">Para</th>
                <th className="py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {paciente.mudancasSituacao.map((mudanca) => (
                <tr key={mudanca.id} className="border-b">
                  <td className="py-2">{formatarDataHora(mudanca.registradoEm)}</td>
                  <td className="py-2">{mudanca.de ? ROTULO_SITUACAO[mudanca.de] : "—"}</td>
                  <td className="py-2">{ROTULO_SITUACAO[mudanca.para]}</td>
                  <td className="py-2">{mudanca.motivo ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Nenhuma mudança de situação registrada.</p>
        )}
      </section>

      <SecaoAcessos pacienteId={paciente.id} acessos={acessos} podeEditar={podeEditarClinico} />
      <SecaoSorologias pacienteId={paciente.id} atuais={sorologias} podeEditar={podeEditarClinico} />
      <SecaoMedicacoesAlergias
        pacienteId={paciente.id}
        medicacoes={medicacoes}
        alergias={alergias}
        podeEditar={podeEditarClinico}
      />
      </>
      )}

      {podeVerClinico && (
        <p className="text-xs text-slate-400">
          Evoluções chegam na próxima entrega.
        </p>
      )}
    </div>
  );
}
