"use client";

import { useActionState } from "react";
import { acaoMudarSituacao } from "../acoes";
import { CAMPO, ROTULO, BTN_SECUNDARIO } from "@/lib/ui";

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
      {estado?.erro && <p className="text-sm font-medium text-danger sm:col-span-3">{estado.erro}</p>}
      <div className="sm:col-span-3">
        <button type="submit" disabled={pendente} className={BTN_SECUNDARIO}>
          {pendente ? "Registrando..." : "Registrar mudança"}
        </button>
      </div>
    </form>
  );
}
