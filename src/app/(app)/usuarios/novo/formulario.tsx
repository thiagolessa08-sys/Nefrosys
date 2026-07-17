"use client";

import { useActionState } from "react";
import { acaoCriarUsuario } from "../acoes";

const OPCOES_PERFIL = [
  ["DIRETOR", "Diretor (vê tudo)"],
  ["ADMINISTRADOR", "Administrador"],
  ["MEDICO", "Médico"],
  ["ENFERMAGEM", "Enfermagem"],
  ["TECNICO", "Técnico"],
  ["RECEPCAO", "Recepção"],
  ["MULTIPROFISSIONAL", "Multiprofissional"],
] as const;

export function FormularioNovoUsuario() {
  const [estado, acao, pendente] = useActionState(acaoCriarUsuario, undefined);
  return (
    <form action={acao} className="space-y-4 rounded bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome completo</label>
        <input id="nome" name="nome" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input id="email" name="email" type="email" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha inicial (mín. 10 caracteres)</label>
        <input id="senha" name="senha" type="password" minLength={10} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
      </div>
      <div>
        <label htmlFor="perfil" className="block text-sm font-medium text-slate-700">Perfil</label>
        <select id="perfil" name="perfil" required className="mt-1 w-full rounded border border-slate-300 px-3 py-2">
          {OPCOES_PERFIL.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
      </div>
      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button type="submit" disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
        {pendente ? "Salvando..." : "Criar usuário"}
      </button>
    </form>
  );
}
