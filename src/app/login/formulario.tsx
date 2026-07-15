"use client";

import { useActionState } from "react";
import { entrar } from "@/lib/auth/acoes";

export function FormularioLogin() {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form action={acao} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button type="submit" disabled={pendente}
        className="w-full rounded bg-blue-700 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
