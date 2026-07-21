"use client";

import { useActionState } from "react";
import { entrar } from "@/lib/auth/acoes";

const CAMPO =
  "w-full rounded-[10px] border border-line bg-surface-2 px-[14px] py-3 focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary";
const ROTULO = "text-[13px] font-semibold text-muted";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form action={acao}>
      <label className="mb-4 flex flex-col gap-[7px]">
        <span className={ROTULO}>E-mail</span>
        <input name="email" type="email" autoComplete="username" required placeholder="nome@clinica.local" className={CAMPO} />
      </label>
      <label className="mb-[10px] flex flex-col gap-[7px]">
        <span className={ROTULO}>Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required placeholder="••••••••" className={CAMPO} />
      </label>
      {estado?.erro && <p className="mb-3 text-sm font-medium text-danger">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="mt-3 w-full rounded-[10px] bg-primary py-[13px] text-[15px] font-bold text-white shadow-[0_1px_2px_rgba(11,92,87,.4)] hover:bg-primary-600 disabled:opacity-50"
      >
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
