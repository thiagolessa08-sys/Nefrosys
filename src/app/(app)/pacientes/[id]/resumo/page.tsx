import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { montarResumo } from "@/lib/pacientes/resumo";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
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
  POSITIVO: "Positivo",
  NEGATIVO: "Negativo",
  INDETERMINADO: "Indeterminado",
};

function dataUTC(data: Date | null): string {
  if (!data) return "—";
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

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
  const tipos: TipoSorologia[] = ["HBSAG", "ANTI_HCV", "HIV"];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/pacientes/${paciente.id}`} className="text-sm text-blue-700 hover:underline">
          ← Ficha completa
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">{paciente.nome}</h1>
        <p className="text-sm text-slate-500">
          {formatarCpf(paciente.cpf)} · {dataUTC(paciente.dataNascimento)} ·{" "}
          <span className="font-medium">{ROTULO_SITUACAO[paciente.situacao]}</span>
          {paciente.modalidade ? ` · ${ROTULO_MODALIDADE[paciente.modalidade]}` : ""}
        </p>
      </div>

      {alergias.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">Alergias</h2>
          <p className="text-sm text-red-700">{alergias.map((a) => a.descricao).join(" · ")}</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Acesso atual</h2>
          {acessoAtual ? (
            <p className="text-sm">
              <span className="font-medium">{ROTULO_ACESSO[acessoAtual.tipo]}</span> — {acessoAtual.localizacao}
              <span className="text-slate-400"> (desde {dataUTC(acessoAtual.dataConfeccao)})</span>
            </p>
          ) : (
            <p className="text-sm text-amber-700">Sem acesso em uso registrado.</p>
          )}
        </section>

        <section className="rounded bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Sorologias</h2>
          <ul className="text-sm">
            {tipos.map((tipo) => {
              const s = sorologias[tipo];
              return (
                <li key={tipo} className="flex justify-between">
                  <span className="text-slate-500">{ROTULO_SOROLOGIA[tipo]}</span>
                  <span className={s?.resultado === "POSITIVO" ? "font-semibold text-red-700" : ""}>
                    {s ? ROTULO_RESULTADO[s.resultado] : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Medicações em uso</h2>
        {medicacoesAtivas.length > 0 ? (
          <ul className="text-sm">
            {medicacoesAtivas.map((m) => (
              <li key={m.id}>
                {m.nome}
                {m.dose ? ` ${m.dose}` : ""}
                {m.posologia ? ` — ${m.posologia}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma medicação ativa.</p>
        )}
      </section>

      <section className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Últimas evoluções</h2>
        <p className="text-sm text-slate-400">As evoluções chegam na próxima entrega.</p>
      </section>
    </div>
  );
}
