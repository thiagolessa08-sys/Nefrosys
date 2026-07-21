import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { podeEvoluir, tiposPermitidos } from "@/lib/pacientes/evolucoes-perfis";
import { abrirRascunho, listarEvolucoes } from "@/lib/pacientes/evolucoes";
import { sorologiasAtuais } from "@/lib/pacientes/sorologias";
import { listarAlergias } from "@/lib/pacientes/medicacoes";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { EditorRascunho } from "./editor";
import { LinhaDoTempo } from "./linha-do-tempo";
import { CabecalhoPaciente } from "../cabecalho";
import { TITULO_SECAO } from "@/lib/ui";
import type { Modalidade, SituacaoPaciente, TipoEvolucao, TipoSorologia } from "@prisma/client";

const ROTULO_TIPO: Record<TipoEvolucao, string> = {
  MEDICA: "Médica",
  ENFERMAGEM: "Enfermagem",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço social",
};
const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo", TRANSPLANTADO: "Transplantado", OBITO: "Óbito", TRANSFERIDO: "Transferido", EM_TRANSITO: "Em trânsito",
};
const CLASSE_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "bg-good-tint text-good", TRANSPLANTADO: "bg-info-tint text-info", OBITO: "bg-danger-tint text-danger",
  TRANSFERIDO: "bg-line-2 text-muted", EM_TRANSITO: "bg-amber-tint text-amber",
};
const ROTULO_MODALIDADE: Record<Modalidade, string> = { HEMODIALISE: "Hemodiálise", DIALISE_PERITONEAL: "Diálise peritoneal" };

function idade(n: Date): number {
  const h = new Date();
  let a = h.getUTCFullYear() - n.getUTCFullYear();
  const m = h.getUTCMonth() - n.getUTCMonth();
  if (m < 0 || (m === 0 && h.getUTCDate() < n.getUTCDate())) a--;
  return a;
}
const SEXO = { FEMININO: "Feminino", MASCULINO: "Masculino", OUTRO: "Outro" } as const;

export default async function PaginaEvolucoes({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const usuario = await exigirPerfil(...PERFIS_CLINICO_LEITURA);
  const { id } = await params;
  const { tipo: tipoParam } = await searchParams;

  const paciente = await db.paciente.findUnique({ where: { id } });
  if (!paciente) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.evolucoes.visualizar",
    entidade: "Paciente",
    entidadeId: id,
  });

  const meusTipos = tiposPermitidos(usuario.perfil);
  const autorPodeEvoluir = podeEvoluir(usuario.perfil);

  let rascunho: { id: string; texto: string } | null = null;
  const tipoEscolhido = meusTipos.includes(tipoParam as TipoEvolucao) ? (tipoParam as TipoEvolucao) : null;
  if (tipoEscolhido) {
    const r = await abrirRascunho(id, tipoEscolhido, usuario.id);
    if (r.ok) {
      const ev = await db.evolucao.findUnique({ where: { id: r.id }, select: { id: true, texto: true } });
      if (ev) rascunho = ev;
    }
  }

  const [evolucoes, alergias, sorologias] = await Promise.all([
    listarEvolucoes(id),
    listarAlergias(id),
    sorologiasAtuais(id),
  ]);
  const autorIds = [
    ...new Set([...evolucoes.map((e) => e.autorId), ...evolucoes.flatMap((e) => e.adendos.map((a) => a.autorId))]),
  ];
  const autores = await db.usuario.findMany({ where: { id: { in: autorIds } }, select: { id: true, nome: true } });
  const nomePorAutor = Object.fromEntries(autores.map((a) => [a.id, a.nome]));
  const reagentes = (["HBSAG", "ANTI_HCV", "HIV"] as TipoSorologia[]).filter((t) => sorologias[t]?.resultado === "POSITIVO");

  const meta = (
    <>
      <span className="font-mono">CPF {formatarCpf(paciente.cpf)}</span>
      <span>{idade(paciente.dataNascimento)} anos · {SEXO[paciente.sexo]}</span>
      {paciente.modalidade && <span>{ROTULO_MODALIDADE[paciente.modalidade]}</span>}
    </>
  );
  const badges = (
    <>
      {alergias.length > 0 && (
        <span className="rounded-md bg-danger-tint px-[9px] py-[3px] text-xs font-bold text-danger">
          {alergias.length} {alergias.length === 1 ? "alergia" : "alergias"}
        </span>
      )}
      {reagentes.map((t) => (
        <span key={t} className="rounded-md bg-amber-tint px-[9px] py-[3px] text-xs font-bold text-amber">
          {t === "ANTI_HCV" ? "Anti-HCV" : t === "HBSAG" ? "HBsAg" : "HIV"} reagente
        </span>
      ))}
    </>
  );

  return (
    <div>
      <CabecalhoPaciente
        id={id}
        nome={paciente.nome}
        situacao={ROTULO_SITUACAO[paciente.situacao]}
        situacaoClasse={CLASSE_SITUACAO[paciente.situacao]}
        meta={meta}
        badges={badges}
        temClinico
      />

      {autorPodeEvoluir && (
        <div className="mb-5 flex flex-wrap gap-2">
          {meusTipos.map((t) => (
            <Link
              key={t}
              href={`/pacientes/${id}/evolucoes?tipo=${t}`}
              className={
                t === tipoEscolhido
                  ? "flex items-center gap-2 rounded-[9px] bg-primary px-[15px] py-2 text-sm font-bold text-white"
                  : "flex items-center gap-2 rounded-[9px] border border-line bg-surface px-[15px] py-2 text-sm font-semibold text-primary hover:border-primary"
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nova evolução {ROTULO_TIPO[t].toLowerCase()}
            </Link>
          ))}
        </div>
      )}

      {rascunho && (
        <div className="mb-6">
          <EditorRascunho pacienteId={id} evolucaoId={rascunho.id} textoInicial={rascunho.texto} />
        </div>
      )}

      <h2 className={`mb-3 ${TITULO_SECAO}`}>Linha do tempo</h2>
      <LinhaDoTempo pacienteId={id} evolucoes={evolucoes} nomePorAutor={nomePorAutor} podeEvoluir={autorPodeEvoluir} />
    </div>
  );
}
