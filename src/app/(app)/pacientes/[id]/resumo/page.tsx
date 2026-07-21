import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { montarResumo } from "@/lib/pacientes/resumo";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { db } from "@/lib/db";
import { CARD, Secao, TITULO_SECAO } from "@/lib/ui";
import type { Modalidade, ResultadoSorologia, SituacaoPaciente, TipoAcesso, TipoSorologia } from "@prisma/client";

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
const ROTULO_ACESSO: Record<TipoAcesso, string> = { FISTULA: "Fístula", CATETER: "Cateter", PROTESE: "Prótese" };
const ROTULO_SOROLOGIA: Record<TipoSorologia, string> = { HBSAG: "HBsAg", ANTI_HCV: "Anti-HCV", HIV: "HIV" };
const ROTULO_RESULTADO: Record<ResultadoSorologia, string> = {
  POSITIVO: "Reagente",
  NEGATIVO: "Não reagente",
  INDETERMINADO: "Indeterminado",
};
const ROTULO_TIPO_EVOLUCAO: Record<string, string> = {
  MEDICA: "Médica",
  ENFERMAGEM: "Enfermagem",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço social",
};

function dataUTC(data: Date | null): string {
  return data ? data.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}
function dataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
function iniciais(nome: string): string {
  return nome.split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function idade(nascimento: Date): number {
  const hoje = new Date();
  let a = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  const m = hoje.getUTCMonth() - nascimento.getUTCMonth();
  if (m < 0 || (m === 0 && hoje.getUTCDate() < nascimento.getUTCDate())) a--;
  return a;
}
const SEXO = { FEMININO: "Feminino", MASCULINO: "Masculino", OUTRO: "Outro" } as const;

export default async function PaginaResumo({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_CLINICO_LEITURA);
  const { id } = await params;

  const resumo = await montarResumo(id);
  if (!resumo) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.resumo.visualizar",
    entidade: "Paciente",
    entidadeId: id,
  });

  const { paciente, acessoAtual, sorologias, medicacoesAtivas, alergias } = resumo;
  const ultimaEvolucao = await db.evolucao.findFirst({
    where: { pacienteId: id, assinadaEm: { not: null } },
    orderBy: { assinadaEm: "desc" },
  });
  const autorUltima = ultimaEvolucao
    ? await db.usuario.findUnique({ where: { id: ultimaEvolucao.autorId }, select: { nome: true } })
    : null;
  const tipos: TipoSorologia[] = ["HBSAG", "ANTI_HCV", "HIV"];

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[320px_1fr]">
      <aside className="flex flex-col gap-4">
        <div className={`${CARD} p-5 text-center`}>
          {paciente.fotoDocumentoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/documentos/${paciente.fotoDocumentoId}`}
              alt={`Foto de ${paciente.nome}`}
              className="mx-auto mb-[14px] h-[104px] w-[104px] rounded-2xl object-cover"
            />
          ) : (
            <div className="mx-auto mb-[14px] grid h-[104px] w-[104px] place-items-center rounded-2xl bg-gradient-to-br from-[#cfe6e2] to-[#a9d2cc] font-serif text-[34px] font-bold text-primary-700">
              {iniciais(paciente.nome)}
            </div>
          )}
          <h2 className="font-serif text-[20px] font-semibold leading-tight">{paciente.nome}</h2>
          <p className="mt-1 text-[13.5px] text-muted">{idade(paciente.dataNascimento)} anos · {SEXO[paciente.sexo]}</p>
          <div className="mt-3 flex justify-center gap-2">
            <span className="rounded-[7px] bg-good-tint px-[10px] py-1 text-xs font-bold text-good">{ROTULO_SITUACAO[paciente.situacao]}</span>
            {paciente.modalidade && (
              <span className="rounded-[7px] bg-primary-tint px-[10px] py-1 text-xs font-bold text-primary">{ROTULO_MODALIDADE[paciente.modalidade]}</span>
            )}
          </div>
          <p className="mt-3 font-mono text-[11.5px] text-muted">CPF {formatarCpf(paciente.cpf)}{paciente.cns ? ` · CNS ${paciente.cns}` : ""}</p>
          <Link href={`/pacientes/${paciente.id}`} className="mt-3 inline-block text-[13px] font-semibold text-primary hover:underline">Ver ficha completa →</Link>
        </div>

        {alergias.length > 0 && (
          <div className="rounded-[14px] border-[1.5px] border-danger-line bg-danger-tint p-[16px_18px]">
            <div className="mb-3 flex items-center gap-[9px] text-[13px] font-extrabold uppercase tracking-[.04em] text-danger">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
              Alergias
            </div>
            <div className="flex flex-col gap-2">
              {alergias.map((a) => (
                <span key={a.id} className="font-bold text-danger">{a.descricao}</span>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Secao titulo="Acesso vascular atual">
          {acessoAtual ? (
            <div className="flex flex-col gap-[6px]">
              <div className="font-serif text-[19px] font-semibold">{ROTULO_ACESSO[acessoAtual.tipo]} — {acessoAtual.localizacao}</div>
              <span className="mt-[6px] inline-flex self-start rounded-[7px] bg-good-tint px-[10px] py-[3px] text-xs font-bold text-good">
                Em uso · desde {dataUTC(acessoAtual.dataConfeccao)}
              </span>
            </div>
          ) : (
            <p className="text-sm font-medium text-amber">Sem acesso em uso registrado.</p>
          )}
        </Secao>

        <Secao titulo="Sorologias atuais">
          <div className="flex flex-col gap-2">
            {tipos.map((tipo) => {
              const s = sorologias[tipo];
              const positivo = s?.resultado === "POSITIVO";
              return (
                <div
                  key={tipo}
                  className={`flex items-center justify-between rounded-[9px] border px-3 py-[9px] ${
                    positivo ? "border-amber-line bg-amber-tint" : "border-line-2 bg-good-tint/40"
                  }`}
                >
                  <span className="text-[13.5px] font-semibold">{ROTULO_SOROLOGIA[tipo]}</span>
                  <span className={`text-[12.5px] font-extrabold ${positivo ? "text-amber" : "text-good"}`}>
                    {s ? ROTULO_RESULTADO[s.resultado] : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Secao>

        <Secao titulo="Medicações em uso" acao={<span className="text-[11.5px] font-semibold text-faint">{medicacoesAtivas.length} ativas</span>}>
          {medicacoesAtivas.length > 0 ? (
            <ul className="flex flex-col gap-[9px]">
              {medicacoesAtivas.map((m) => (
                <li key={m.id} className="flex justify-between gap-[10px] border-b border-line-2 pb-[9px] text-sm last:border-0">
                  <span className="font-semibold">{m.nome}</span>
                  <span className="text-[13px] text-muted">{[m.dose, m.posologia].filter(Boolean).join(" — ") || "—"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhuma medicação ativa.</p>
          )}
        </Secao>

        <Secao titulo="Última evolução">
          {ultimaEvolucao ? (
            <div>
              <p className="text-[13.5px] leading-[1.5] text-muted">
                {ultimaEvolucao.texto.slice(0, 220)}
                {ultimaEvolucao.texto.length > 220 ? "…" : ""}
              </p>
              <p className="mt-[10px] text-xs font-semibold text-faint">
                {ROTULO_TIPO_EVOLUCAO[ultimaEvolucao.tipo]} · {autorUltima?.nome ?? "Autor"} ·{" "}
                {ultimaEvolucao.assinadaEm ? dataHora(ultimaEvolucao.assinadaEm) : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhuma evolução assinada.</p>
          )}
          <Link href={`/pacientes/${id}/evolucoes`} className="mt-3 inline-block text-[13px] font-semibold text-primary hover:underline">
            Ver todas as evoluções →
          </Link>
        </Secao>

        <div className="sm:col-span-2">
          <div className={`${CARD} flex flex-wrap items-center justify-between gap-3 p-[14px_20px]`}>
            <span className={TITULO_SECAO}>Prontuário e documentos</span>
            <div className="flex gap-3 text-[13px] font-semibold text-primary">
              <Link href={`/pacientes/${id}/prontuario`} className="hover:underline">Prontuário (PDF) →</Link>
              <Link href={`/pacientes/${id}/documentos`} className="hover:underline">Documentos →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
