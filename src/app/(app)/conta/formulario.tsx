"use client";

import { useActionState } from "react";
import { acaoAlterarSenha } from "./acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioSenha() {
  const [estado, acao, pendente] = useActionState(acaoAlterarSenha, undefined);
  return (
    <form action={acao} className="space-y-4 rounded bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Trocar senha</h2>
      <div>
        <label htmlFor="senhaAtual" className={ROTULO}>Senha atual</label>
        <input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          autoComplete="current-password"
          required
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor="novaSenha" className={ROTULO}>Nova senha (mín. 10 caracteres)</label>
        <input
          id="novaSenha"
          name="novaSenha"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className={CAMPO}
        />
      </div>
      {estado && "erro" in estado && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado && "sucesso" in estado && <p className="text-sm text-green-700">{estado.sucesso}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
