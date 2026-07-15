"use client";

import { useActionState } from "react";
import { acaoMudarSituacao } from "../acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioSituacao({ id, situacaoAtual }: { id: string; situacaoAtual: string }) {
  const [estado, acao, pendente] = useActionState(acaoMudarSituacao, undefined);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="situacao" className={ROTULO}>Nova situação</label>
        <select id="situacao" name="situacao" defaultValue={situacaoAtual} className={CAMPO}>
          <option value="ATIVO">Ativo</option>
          <option value="TRANSPLANTADO">Transplantado</option>
          <option value="OBITO">Óbito</option>
          <option value="TRANSFERIDO">Transferido</option>
          <option value="EM_TRANSITO">Em trânsito</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="motivo" className={ROTULO}>Motivo</label>
        <input id="motivo" name="motivo" placeholder="Ex.: transplante realizado no HC" className={CAMPO} />
      </div>
      {estado?.erro && <p className="text-sm text-red-600 sm:col-span-3">{estado.erro}</p>}
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pendente ? "Registrando..." : "Registrar mudança"}
        </button>
      </div>
    </form>
  );
}
