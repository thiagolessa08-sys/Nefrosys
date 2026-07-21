"use client";

import { useActionState } from "react";
import { acaoCriarUsuario } from "../acoes";
import { CAMPO, ROTULO, BTN_PRIMARIO, CARD } from "@/lib/ui";

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
    <form action={acao} className={`space-y-4 p-6 ${CARD}`}>
      <label className="block">
        <span className={ROTULO}>Nome completo</span>
        <input name="nome" required className={CAMPO} />
      </label>
      <label className="block">
        <span className={ROTULO}>E-mail</span>
        <input name="email" type="email" required className={CAMPO} />
      </label>
      <label className="block">
        <span className={ROTULO}>Senha inicial (mín. 10 caracteres)</span>
        <input name="senha" type="password" minLength={10} required className={CAMPO} />
      </label>
      <label className="block">
        <span className={ROTULO}>Perfil</span>
        <select name="perfil" required className={CAMPO}>
          {OPCOES_PERFIL.map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
      </label>
      {estado?.erro && <p className="text-sm font-medium text-danger">{estado.erro}</p>}
      <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
        {pendente ? "Salvando..." : "Criar usuário"}
      </button>
    </form>
  );
}
