"use client";

import { useActionState } from "react";
import { acaoAdendo } from "./acoes";
import type { Adendo, Evolucao, TipoEvolucao } from "@prisma/client";

const ROTULO_TIPO: Record<TipoEvolucao, string> = {
  MEDICA: "Médica",
  ENFERMAGEM: "Enfermagem",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço social",
};

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function FormAdendo({ pacienteId, evolucaoId }: { pacienteId: string; evolucaoId: string }) {
  const [estado, acao, pendente] = useActionState(acaoAdendo, undefined);
  return (
    <form action={acao} className="mt-3 border-t pt-3">
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <input type="hidden" name="evolucaoId" value={evolucaoId} />
      <textarea
        name="texto"
        rows={2}
        placeholder="Adicionar adendo..."
        className="w-full rounded border border-slate-300 p-2 text-sm"
      />
      {estado && "erro" in estado && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="mt-1 rounded bg-slate-700 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
    return <p className="text-sm text-slate-500">Nenhuma evolução assinada ainda.</p>;
  }
  return (
    <div className="space-y-4">
      {evolucoes.map((ev) => (
        <article key={ev.id} className="rounded bg-white p-5 shadow-sm">
          <header className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">
              {ROTULO_TIPO[ev.tipo]} — {nomePorAutor[ev.autorId] ?? "Autor"}
            </span>
            <span className="text-slate-400">{ev.assinadaEm ? formatarDataHora(ev.assinadaEm) : ""}</span>
          </header>
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{ev.texto}</pre>
          {ev.adendos.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
              {ev.adendos.map((a) => (
                <div key={a.id} className="text-sm">
                  <div className="text-xs text-slate-400">
                    Adendo · {nomePorAutor[a.autorId] ?? "Autor"} · {formatarDataHora(a.criadoEm)}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-slate-700">{a.texto}</pre>
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
