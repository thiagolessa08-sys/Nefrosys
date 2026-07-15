"use client";

import { useActionState, useState } from "react";
import { acaoCriarPaciente } from "../acoes";

const CAMPO = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
const ROTULO = "block text-sm font-medium text-slate-700";

export function FormularioNovoPaciente() {
  const [estado, acao, pendente] = useActionState(acaoCriarPaciente, undefined);
  const [vinculo, setVinculo] = useState("SUS");

  return (
    <form action={acao} className="space-y-6">
      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Identificação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nome" className={ROTULO}>Nome completo</label>
            <input id="nome" name="nome" required className={CAMPO} />
          </div>
          <div>
            <label htmlFor="cpf" className={ROTULO}>CPF</label>
            <input id="cpf" name="cpf" required placeholder="000.000.000-00" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="cns" className={ROTULO}>CNS (Cartão SUS)</label>
            <input id="cns" name="cns" placeholder="15 dígitos" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="dataNascimento" className={ROTULO}>Data de nascimento</label>
            <input id="dataNascimento" name="dataNascimento" type="date" required className={CAMPO} />
          </div>
          <div>
            <label htmlFor="sexo" className={ROTULO}>Sexo</label>
            <select id="sexo" name="sexo" required className={CAMPO}>
              <option value="FEMININO">Feminino</option>
              <option value="MASCULINO">Masculino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </div>
          <div>
            <label htmlFor="telefone" className={ROTULO}>Telefone</label>
            <input id="telefone" name="telefone" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="emailContato" className={ROTULO}>E-mail</label>
            <input id="emailContato" name="emailContato" type="email" className={CAMPO} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Endereço</legend>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="logradouro" className={ROTULO}>Logradouro</label>
            <input id="logradouro" name="logradouro" className={CAMPO} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="numero" className={ROTULO}>Número</label>
            <input id="numero" name="numero" className={CAMPO} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="complemento" className={ROTULO}>Complemento</label>
            <input id="complemento" name="complemento" className={CAMPO} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="bairro" className={ROTULO}>Bairro</label>
            <input id="bairro" name="bairro" className={CAMPO} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="cidade" className={ROTULO}>Cidade</label>
            <input id="cidade" name="cidade" className={CAMPO} />
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="uf" className={ROTULO}>UF</label>
            <input id="uf" name="uf" maxLength={2} className={CAMPO} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cep" className={ROTULO}>CEP</label>
            <input id="cep" name="cep" className={CAMPO} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Contato de emergência</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contatoEmergenciaNome" className={ROTULO}>Nome</label>
            <input id="contatoEmergenciaNome" name="contatoEmergenciaNome" className={CAMPO} />
          </div>
          <div>
            <label htmlFor="contatoEmergenciaTelefone" className={ROTULO}>Telefone</label>
            <input id="contatoEmergenciaTelefone" name="contatoEmergenciaTelefone" className={CAMPO} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-semibold text-slate-700">Vínculo assistencial</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tipoVinculo" className={ROTULO}>Tipo</label>
            <select
              id="tipoVinculo"
              name="tipoVinculo"
              required
              className={CAMPO}
              value={vinculo}
              onChange={(e) => setVinculo(e.target.value)}
            >
              <option value="SUS">SUS</option>
              <option value="CONVENIO">Convênio</option>
            </select>
          </div>
          {vinculo === "CONVENIO" && (
            <>
              <div>
                <label htmlFor="convenioNome" className={ROTULO}>Convênio</label>
                <input id="convenioNome" name="convenioNome" className={CAMPO} />
              </div>
              <div>
                <label htmlFor="convenioMatricula" className={ROTULO}>Matrícula</label>
                <input id="convenioMatricula" name="convenioMatricula" className={CAMPO} />
              </div>
              <div>
                <label htmlFor="convenioValidade" className={ROTULO}>Validade</label>
                <input id="convenioValidade" name="convenioValidade" type="date" className={CAMPO} />
              </div>
            </>
          )}
        </div>
      </fieldset>

      {estado?.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Cadastrar paciente"}
      </button>
    </form>
  );
}
