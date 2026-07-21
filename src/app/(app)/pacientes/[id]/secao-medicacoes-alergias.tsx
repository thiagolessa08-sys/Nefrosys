"use client";

import { useActionState } from "react";
import {
  acaoAdicionarMedicacao,
  acaoSuspenderMedicacao,
  acaoAdicionarAlergia,
  acaoRemoverAlergia,
} from "../acoes";
import { CAMPO, ROTULO, TITULO_SECAO, CARD } from "@/lib/ui";
import type { Medicacao, Alergia } from "@prisma/client";

const BTN_MINI =
  "rounded-[8px] bg-primary px-3 py-[6px] text-[13px] font-bold text-white hover:bg-primary-600 disabled:opacity-50";

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
    <section className={`${CARD} p-[20px_22px]`}>
      <h3 className={`mb-[14px] ${TITULO_SECAO}`}>Medicações em uso</h3>
      {medicacoes.length > 0 ? (
        <ul className="mb-4 flex flex-col gap-[9px] text-sm">
          {medicacoes.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 border-b border-line-2 pb-[9px]">
              <span className="font-semibold">
                {m.nome}
                {m.dose ? ` ${m.dose}` : ""}
                {m.posologia ? ` — ${m.posologia}` : ""}
              </span>
              {podeEditar && (
                <form action={acaoSuspenderMedicacao}>
                  <input type="hidden" name="medicacaoId" value={m.id} />
                  <input type="hidden" name="pacienteId" value={pacienteId} />
                  <button className="text-xs font-semibold text-danger hover:underline">Suspender</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted">Nenhuma medicação ativa.</p>
      )}
      {podeEditar && (
        <form action={acaoMed} className="mb-2 space-y-2">
          <label>
            <span className={ROTULO}>Medicação</span>
            <input name="nome" required className={CAMPO} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input name="dose" placeholder="Dose (ex.: 50mg)" className={CAMPO} />
            <input name="posologia" placeholder="Posologia (ex.: 1x/dia)" className={CAMPO} />
          </div>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          {estMed?.erro && <p className="text-sm font-medium text-danger">{estMed.erro}</p>}
          <button type="submit" disabled={pendMed} className={BTN_MINI}>
            {pendMed ? "Salvando..." : "Adicionar medicação"}
          </button>
        </form>
      )}

      <h3 className={`mb-3 mt-[18px] ${TITULO_SECAO}`}>Alergias</h3>
      {alergias.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {alergias.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-[6px] rounded-[8px] border border-danger-line bg-danger-tint px-[11px] py-[5px] text-[13px] font-bold text-danger"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
              </svg>
              {a.descricao}
              {podeEditar && (
                <form action={acaoRemoverAlergia} className="inline">
                  <input type="hidden" name="alergiaId" value={a.id} />
                  <input type="hidden" name="pacienteId" value={pacienteId} />
                  <button aria-label={`Remover ${a.descricao}`} className="ml-1 text-danger/70 hover:text-danger">×</button>
                </form>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted">Nenhuma alergia registrada.</p>
      )}
      {podeEditar && (
        <form action={acaoAlg} className="flex items-end gap-2">
          <label className="flex-1">
            <span className={ROTULO}>Nova alergia</span>
            <input name="descricao" required className={CAMPO} />
          </label>
          <input type="hidden" name="pacienteId" value={pacienteId} />
          <button type="submit" disabled={pendAlg} className={BTN_MINI}>
            {pendAlg ? "..." : "Adicionar"}
          </button>
        </form>
      )}
      {estAlg?.erro && <p className="mt-1 text-sm font-medium text-danger">{estAlg.erro}</p>}
    </section>
  );
}
