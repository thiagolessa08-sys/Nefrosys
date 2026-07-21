"use client";

import { useActionState } from "react";
import { acaoRegistrarAcesso, acaoPerderAcesso } from "../acoes";
import { CAMPO, ROTULO, BTN_PRIMARIO, Secao } from "@/lib/ui";
import type { AcessoVascular, TipoAcesso, SituacaoAcesso } from "@prisma/client";

const ROTULO_TIPO: Record<TipoAcesso, string> = { FISTULA: "Fístula", CATETER: "Cateter", PROTESE: "Prótese" };
const ROTULO_SIT: Record<SituacaoAcesso, string> = { EM_USO: "Em uso", PERDIDO: "Perdido" };

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function SecaoAcessos({
  pacienteId,
  acessos,
  podeEditar,
}: {
  pacienteId: string;
  acessos: AcessoVascular[];
  podeEditar: boolean;
}) {
  const [estado, acao, pendente] = useActionState(acaoRegistrarAcesso, undefined);
  return (
    <Secao titulo="Acessos vasculares">
      {acessos.length > 0 ? (
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line-2 text-left text-[11.5px] uppercase tracking-[.04em] text-muted">
              <th className="pb-[9px] font-bold">Tipo</th>
              <th className="pb-[9px] font-bold">Local</th>
              <th className="pb-[9px] font-bold">Confecção</th>
              <th className="pb-[9px] font-bold">Situação</th>
              <th className="pb-[9px]" />
            </tr>
          </thead>
          <tbody>
            {acessos.map((a) => (
              <tr key={a.id} className="border-b border-line-2">
                <td className="py-[10px] font-semibold">{ROTULO_TIPO[a.tipo]}</td>
                <td className="py-[10px] text-muted">{a.localizacao}</td>
                <td className="py-[10px] font-mono text-muted">{formatarData(a.dataConfeccao)}</td>
                <td className="py-[10px]">
                  <span
                    className={`rounded-md px-[9px] py-[3px] text-xs font-bold ${
                      a.situacao === "EM_USO" ? "bg-good-tint text-good" : "bg-line-2 text-muted"
                    }`}
                  >
                    {ROTULO_SIT[a.situacao]}
                  </span>
                </td>
                <td className="py-[10px] text-right">
                  {podeEditar && a.situacao === "EM_USO" && (
                    <form action={acaoPerderAcesso}>
                      <input type="hidden" name="acessoId" value={a.id} />
                      <input type="hidden" name="pacienteId" value={pacienteId} />
                      <button className="text-xs font-semibold text-danger hover:underline">Marcar perdido</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mb-4 text-sm text-muted">Nenhum acesso registrado.</p>
      )}

      {podeEditar && (
        <form action={acao} className="grid gap-3 sm:grid-cols-4">
          <label>
            <span className={ROTULO}>Tipo</span>
            <select name="tipo" className={CAMPO}>
              <option value="FISTULA">Fístula</option>
              <option value="CATETER">Cateter</option>
              <option value="PROTESE">Prótese</option>
            </select>
          </label>
          <label>
            <span className={ROTULO}>Localização</span>
            <input name="localizacao" required className={CAMPO} />
          </label>
          <label>
            <span className={ROTULO}>Confecção/implante</span>
            <input name="dataConfeccao" type="date" required className={CAMPO} />
          </label>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <div className="flex items-end">
            <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
              {pendente ? "Salvando..." : "Adicionar"}
            </button>
          </div>
          {estado?.erro && <p className="text-sm font-medium text-danger sm:col-span-4">{estado.erro}</p>}
        </form>
      )}
    </Secao>
  );
}
