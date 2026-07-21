"use client";

import { useActionState } from "react";
import { acaoAlterarSenha } from "./acoes";
import { CAMPO, ROTULO, BTN_PRIMARIO, CARD, TITULO_SECAO } from "@/lib/ui";

export function FormularioSenha() {
  const [estado, acao, pendente] = useActionState(acaoAlterarSenha, undefined);
  return (
    <form action={acao} className={`space-y-4 p-6 ${CARD}`}>
      <h2 className={TITULO_SECAO}>Trocar senha</h2>
      <label className="block">
        <span className={ROTULO}>Senha atual</span>
        <input name="senhaAtual" type="password" autoComplete="current-password" required className={CAMPO} />
      </label>
      <label className="block">
        <span className={ROTULO}>Nova senha (mín. 10 caracteres)</span>
        <input name="novaSenha" type="password" autoComplete="new-password" minLength={10} required className={CAMPO} />
      </label>
      {estado && "erro" in estado && <p className="text-sm font-medium text-danger">{estado.erro}</p>}
      {estado && "sucesso" in estado && <p className="text-sm font-medium text-good">{estado.sucesso}</p>}
      <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
        {pendente ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
