"use client";

import { useActionState } from "react";
import {
  acaoAdicionarMedicacao,
  acaoSuspenderMedicacao,
  acaoAdicionarAlergia,
  acaoRemoverAlergia,
} from "../acoes";
import type { Medicacao, Alergia } from "@prisma/client";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function SecaoMedicacoesAlergias({
  pacienteId,
  medicacoes,
  alergias,
  podeEditar,
}: {
  pacienteId: string;
  medicacoes: Medicacao[];
  alergias: Alergia[];
  podeEditar: boolean;
}) {
  const [estMed, acaoMed, pendMed] = useActionState(acaoAdicionarMedicacao, undefined);
  const [estAlg, acaoAlg, pendAlg] = useActionState(acaoAdicionarAlergia, undefined);
  return (
    <section className="grid gap-6 sm:grid-cols-2">
      <div className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Medicações em uso</h2>
        {medicacoes.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm">
            {medicacoes.map((m) => (
              <li key={m.id} className="flex items-center justify-between border-b py-1">
                <span>
                  {m.nome}
                  {m.dose ? ` ${m.dose}` : ""}
                  {m.posologia ? ` — ${m.posologia}` : ""}
                </span>
                {podeEditar && (
                  <form action={acaoSuspenderMedicacao}>
                    <input type="hidden" name="medicacaoId" value={m.id} />
                    <input type="hidden" name="pacienteId" value={pacienteId} />
                    <button className="text-xs text-red-600 hover:underline">Suspender</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Nenhuma medicação ativa.</p>
        )}
        {podeEditar && (
          <form action={acaoMed} className="space-y-2">
            <div>
              <label htmlFor="nome" className={ROTULO}>Medicação</label>
              <input id="nome" name="nome" required className={CAMPO} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input name="dose" placeholder="Dose (ex.: 50mg)" className={CAMPO} />
              <input name="posologia" placeholder="Posologia (ex.: 1x/dia)" className={CAMPO} />
            </div>
            <input type="hidden" name="pacienteId" value={pacienteId} />
            {estMed?.erro && <p className="text-sm text-red-600">{estMed.erro}</p>}
            <button
              type="submit"
              disabled={pendMed}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendMed ? "Salvando..." : "Adicionar medicação"}
            </button>
          </form>
        )}
      </div>

      <div className="rounded bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Alergias</h2>
        {alergias.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm">
            {alergias.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b py-1">
                <span>{a.descricao}</span>
                {podeEditar && (
                  <form action={acaoRemoverAlergia}>
                    <input type="hidden" name="alergiaId" value={a.id} />
                    <input type="hidden" name="pacienteId" value={pacienteId} />
                    <button className="text-xs text-red-600 hover:underline">Remover</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">Nenhuma alergia registrada.</p>
        )}
        {podeEditar && (
          <form action={acaoAlg} className="space-y-2">
            <div>
              <label htmlFor="descricao" className={ROTULO}>Alergia</label>
              <input id="descricao" name="descricao" required className={CAMPO} />
            </div>
            <input type="hidden" name="pacienteId" value={pacienteId} />
            {estAlg?.erro && <p className="text-sm text-red-600">{estAlg.erro}</p>}
            <button
              type="submit"
              disabled={pendAlg}
              className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {pendAlg ? "Salvando..." : "Adicionar alergia"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
