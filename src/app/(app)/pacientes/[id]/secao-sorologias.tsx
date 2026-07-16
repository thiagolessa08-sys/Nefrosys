"use client";

import { useActionState } from "react";
import { acaoRegistrarSorologia } from "../acoes";
import type { Sorologia, TipoSorologia, ResultadoSorologia } from "@prisma/client";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

const ROTULO_TIPO: Record<TipoSorologia, string> = {
  HBSAG: "HBsAg",
  ANTI_HCV: "Anti-HCV",
  HIV: "HIV",
};
const ROTULO_RES: Record<ResultadoSorologia, string> = {
  POSITIVO: "Positivo",
  NEGATIVO: "Negativo",
  INDETERMINADO: "Indeterminado",
};

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function SecaoSorologias({
  pacienteId,
  atuais,
  podeEditar,
}: {
  pacienteId: string;
  atuais: Partial<Record<TipoSorologia, Sorologia>>;
  podeEditar: boolean;
}) {
  const [estado, acao, pendente] = useActionState(acaoRegistrarSorologia, undefined);
  const tipos: TipoSorologia[] = ["HBSAG", "ANTI_HCV", "HIV"];
  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Sorologias</h2>
      <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
        {tipos.map((tipo) => {
          const s = atuais[tipo];
          return (
            <div key={tipo}>
              <dt className="text-slate-500">{ROTULO_TIPO[tipo]}</dt>
              <dd>
                {s ? (
                  <span className={s.resultado === "POSITIVO" ? "font-semibold text-red-700" : ""}>
                    {ROTULO_RES[s.resultado]}{" "}
                    <span className="text-slate-400">({formatarData(s.dataExame)})</span>
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {podeEditar && (
        <form action={acao} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="stipo" className={ROTULO}>Tipo</label>
            <select id="stipo" name="tipo" className={CAMPO}>
              <option value="HBSAG">HBsAg</option>
              <option value="ANTI_HCV">Anti-HCV</option>
              <option value="HIV">HIV</option>
            </select>
          </div>
          <div>
            <label htmlFor="resultado" className={ROTULO}>Resultado</label>
            <select id="resultado" name="resultado" className={CAMPO}>
              <option value="NEGATIVO">Negativo</option>
              <option value="POSITIVO">Positivo</option>
              <option value="INDETERMINADO">Indeterminado</option>
            </select>
          </div>
          <div>
            <label htmlFor="dataExame" className={ROTULO}>Data do exame</label>
            <input id="dataExame" name="dataExame" type="date" required className={CAMPO} />
          </div>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={pendente}
              className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendente ? "Salvando..." : "Registrar"}
            </button>
          </div>
          {estado?.erro && <p className="text-sm text-red-600 sm:col-span-4">{estado.erro}</p>}
        </form>
      )}
    </section>
  );
}
