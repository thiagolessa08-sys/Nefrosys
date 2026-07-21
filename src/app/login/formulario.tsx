"use client";

import { useActionState } from "react";
import { entrar } from "@/lib/auth/acoes";

const CAMPO =
  "mt-1 w-full rounded-[9px] border border-line bg-surface-2 px-3 py-2 focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary";
const ROTULO = "block text-[12.5px] font-semibold text-muted";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="email" className={ROTULO}>E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={CAMPO} />
      </div>
      <div>
        <label htmlFor="senha" className={ROTULO}>Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className={CAMPO} />
      </div>
      {estado?.erro && <p className="text-sm font-medium text-danger">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-[9px] bg-primary py-[10px] font-bold text-white shadow-[0_1px_2px_rgba(11,92,87,.4)] hover:bg-primary-600 disabled:opacity-50"
      >
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
