"use client";

import { useActionState } from "react";
import { acaoAdendo } from "./acoes";
import { CARD } from "@/lib/ui";
import type { Adendo, Evolucao, TipoEvolucao } from "@prisma/client";

const ROTULO_TIPO: Record<TipoEvolucao, string> = {
  MEDICA: "Médica",
  ENFERMAGEM: "Enfermagem",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço social",
};
const COR_TIPO: Record<TipoEvolucao, string> = {
  MEDICA: "bg-primary",
  ENFERMAGEM: "bg-info",
  NUTRICAO: "bg-amber",
  PSICOLOGIA: "bg-[#7a3ea0]",
  SERVICO_SOCIAL: "bg-good",
};

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function FormAdendo({ pacienteId, evolucaoId }: { pacienteId: string; evolucaoId: string }) {
  const [estado, acao, pendente] = useActionState(acaoAdendo, undefined);
  return (
    <form action={acao} className="mt-3 border-t border-line-2 pt-3">
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <input type="hidden" name="evolucaoId" value={evolucaoId} />
      <textarea
        name="texto"
        rows={2}
        placeholder="Adicionar adendo..."
        className="w-full rounded-[9px] border border-line bg-surface-2 p-2 text-sm focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary"
      />
      {estado && "erro" in estado && <p className="text-sm font-medium text-danger">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="mt-1 rounded-[8px] bg-primary px-3 py-[6px] text-xs font-bold text-white hover:bg-primary-600 disabled:opacity-50"
      >
        {pendente ? "Adicionando..." : "Adicionar adendo"}
      </button>
    </form>
  );
}

export function LinhaDoTempo({
  pacienteId,
  evolucoes,
  nomePorAutor,
  podeEvoluir,
}: {
  pacienteId: string;
  evolucoes: (Evolucao & { adendos: Adendo[] })[];
  nomePorAutor: Record<string, string>;
  podeEvoluir: boolean;
}) {
  if (evolucoes.length === 0) {
    return <p className="text-sm text-muted">Nenhuma evolução assinada ainda.</p>;
  }
  return (
    <div className="space-y-4">
      {evolucoes.map((ev) => (
        <article key={ev.id} className={`${CARD} p-5`}>
          <header className="mb-2 flex flex-wrap items-center gap-[9px] text-sm">
            <span className={`h-2 w-2 rounded-full ${COR_TIPO[ev.tipo]}`} />
            <span className="font-bold">
              {ROTULO_TIPO[ev.tipo]} — {nomePorAutor[ev.autorId] ?? "Autor"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-good-tint px-[9px] py-[3px] text-[10.5px] font-bold text-good">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Assinada
            </span>
            <span className="ml-auto font-mono text-xs text-muted">
              {ev.assinadaEm ? formatarDataHora(ev.assinadaEm) : ""}
            </span>
          </header>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">{ev.texto}</pre>
          {ev.adendos.length > 0 && (
            <div className="mt-3 space-y-2 border-l-[2.5px] border-amber-line pl-3">
              {ev.adendos.map((a) => (
                <div key={a.id} className="text-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-amber">
                    Adendo · {nomePorAutor[a.autorId] ?? "Autor"} · {formatarDataHora(a.criadoEm)}
                  </div>
                  <pre className="mt-[2px] whitespace-pre-wrap font-sans text-muted">{a.texto}</pre>
                </div>
              ))}
            </div>
          )}
          {podeEvoluir && <FormAdendo pacienteId={pacienteId} evolucaoId={ev.id} />}
        </article>
      ))}
    </div>
  );
}
