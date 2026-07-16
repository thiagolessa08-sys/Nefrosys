"use client";

import { useActionState } from "react";
import { acaoRegistrarAcesso, acaoPerderAcesso } from "../acoes";
import type { AcessoVascular, TipoAcesso, SituacaoAcesso } from "@prisma/client";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

const ROTULO_TIPO: Record<TipoAcesso, string> = {
  FISTULA: "Fístula",
  CATETER: "Cateter",
  PROTESE: "Prótese",
};
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
    <section className="rounded bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Acessos vasculares</h2>
      {acessos.length > 0 ? (
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Tipo</th>
              <th className="py-2">Localização</th>
              <th className="py-2">Confecção</th>
              <th className="py-2">Situação</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {acessos.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-2">{ROTULO_TIPO[a.tipo]}</td>
                <td className="py-2">{a.localizacao}</td>
                <td className="py-2">{formatarData(a.dataConfeccao)}</td>
                <td className="py-2">
                  {a.situacao === "EM_USO" ? (
                    <span className="font-medium text-green-700">{ROTULO_SIT[a.situacao]}</span>
                  ) : (
                    <span className="text-slate-500">{ROTULO_SIT[a.situacao]}</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {podeEditar && a.situacao === "EM_USO" && (
                    <form action={acaoPerderAcesso}>
                      <input type="hidden" name="acessoId" value={a.id} />
                      <input type="hidden" name="pacienteId" value={pacienteId} />
                      <button className="text-red-600 hover:underline">Marcar perdido</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mb-4 text-sm text-slate-500">Nenhum acesso registrado.</p>
      )}

      {podeEditar && (
        <form action={acao} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="tipo" className={ROTULO}>Tipo</label>
            <select id="tipo" name="tipo" className={CAMPO}>
              <option value="FISTULA">Fístula</option>
              <option value="CATETER">Cateter</option>
              <option value="PROTESE">Prótese</option>
            </select>
          </div>
          <div>
            <label htmlFor="localizacao" className={ROTULO}>Localização</label>
            <input id="localizacao" name="localizacao" required className={CAMPO} />
          </div>
          <div>
            <label htmlFor="dataConfeccao" className={ROTULO}>Confecção/implante</label>
            <input id="dataConfeccao" name="dataConfeccao" type="date" required className={CAMPO} />
          </div>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={pendente}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendente ? "Salvando..." : "Adicionar"}
            </button>
          </div>
          {estado?.erro && <p className="text-sm text-red-600 sm:col-span-4">{estado.erro}</p>}
        </form>
      )}
    </section>
  );
}
