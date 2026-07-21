"use client";

import { useActionState } from "react";
import { acaoRegistrarSorologia } from "../acoes";
import { CAMPO, ROTULO, BTN_PRIMARIO, Secao } from "@/lib/ui";
import type { Sorologia, TipoSorologia, ResultadoSorologia } from "@prisma/client";

const ROTULO_TIPO: Record<TipoSorologia, string> = { HBSAG: "HBsAg", ANTI_HCV: "Anti-HCV", HIV: "HIV" };
const ROTULO_RES: Record<ResultadoSorologia, string> = {
  POSITIVO: "Reagente",
  NEGATIVO: "Não reagente",
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
    <Secao titulo="Sorologias atuais">
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {tipos.map((tipo) => {
          const s = atuais[tipo];
          const positivo = s?.resultado === "POSITIVO";
          return (
            <div
              key={tipo}
              className={`rounded-[9px] border px-3 py-[9px] ${
                positivo ? "border-amber-line bg-amber-tint" : "border-line-2 bg-surface-2"
              }`}
            >
              <div className="text-[11.5px] font-semibold text-muted">{ROTULO_TIPO[tipo]}</div>
              <div className={`text-[13px] font-extrabold ${positivo ? "text-amber" : "text-ink"}`}>
                {s ? ROTULO_RES[s.resultado] : "—"}
              </div>
              {s && <div className="font-mono text-[10.5px] text-faint">{formatarData(s.dataExame)}</div>}
            </div>
          );
        })}
      </div>

      {podeEditar && (
        <form action={acao} className="grid gap-3 sm:grid-cols-4">
          <label>
            <span className={ROTULO}>Tipo</span>
            <select name="tipo" className={CAMPO}>
              <option value="HBSAG">HBsAg</option>
              <option value="ANTI_HCV">Anti-HCV</option>
              <option value="HIV">HIV</option>
            </select>
          </label>
          <label>
            <span className={ROTULO}>Resultado</span>
            <select name="resultado" className={CAMPO}>
              <option value="NEGATIVO">Não reagente</option>
              <option value="POSITIVO">Reagente</option>
              <option value="INDETERMINADO">Indeterminado</option>
            </select>
          </label>
          <label>
            <span className={ROTULO}>Data do exame</span>
            <input name="dataExame" type="date" required className={CAMPO} />
          </label>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <div className="flex items-end">
            <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
              {pendente ? "Salvando..." : "Registrar"}
            </button>
          </div>
          {estado?.erro && <p className="text-sm font-medium text-danger sm:col-span-4">{estado.erro}</p>}
        </form>
      )}
    </Secao>
  );
}
