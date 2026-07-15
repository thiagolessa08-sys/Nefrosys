"use client";

import { useActionState } from "react";
import { acaoAtualizarNefrologicos } from "../acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioNefrologicos({
  id,
  cidDoencaBase,
  dataInicioDialise,
  modalidade,
}: {
  id: string;
  cidDoencaBase: string;
  dataInicioDialise: string;
  modalidade: string;
}) {
  const [estado, acao, pendente] = useActionState(acaoAtualizarNefrologicos, undefined);
  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="cidDoencaBase" className={ROTULO}>Doença de base (CID)</label>
        <input
          id="cidDoencaBase"
          name="cidDoencaBase"
          defaultValue={cidDoencaBase}
          placeholder="N18.5"
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor="dataInicioDialise" className={ROTULO}>Início da diálise</label>
        <input
          id="dataInicioDialise"
          name="dataInicioDialise"
          type="date"
          defaultValue={dataInicioDialise}
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor="modalidade" className={ROTULO}>Modalidade</label>
        <select id="modalidade" name="modalidade" defaultValue={modalidade} className={CAMPO}>
          <option value="">Não informada</option>
          <option value="HEMODIALISE">Hemodiálise</option>
          <option value="DIALISE_PERITONEAL">Diálise peritoneal</option>
        </select>
      </div>
      {estado?.erro && <p className="text-sm text-red-600 sm:col-span-3">{estado.erro}</p>}
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {pendente ? "Salvando..." : "Salvar dados nefrológicos"}
        </button>
      </div>
    </form>
  );
}
