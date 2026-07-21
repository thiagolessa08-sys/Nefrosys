"use client";

import { useActionState, useState } from "react";
import { acaoCriarPaciente } from "../acoes";
import { CAMPO, ROTULO, BTN_PRIMARIO, SecaoNumerada } from "@/lib/ui";

export function FormularioNovoPaciente() {
  const [estado, acao, pendente] = useActionState(acaoCriarPaciente, undefined);
  const [vinculo, setVinculo] = useState("SUS");

  return (
    <form action={acao}>
      <SecaoNumerada n={1} titulo="Identificação">
        <div className="grid grid-cols-12 gap-4">
          <label className="col-span-12 sm:col-span-8">
            <span className={ROTULO}>Nome completo <span className="text-danger">*</span></span>
            <input name="nome" required placeholder="Nome do paciente" className={CAMPO} />
          </label>
          <label className="col-span-6 sm:col-span-4">
            <span className={ROTULO}>Data de nascimento <span className="text-danger">*</span></span>
            <input name="dataNascimento" type="date" required className={CAMPO} />
          </label>
          <label className="col-span-6 sm:col-span-4">
            <span className={ROTULO}>CPF <span className="text-danger">*</span></span>
            <input name="cpf" required placeholder="000.000.000-00" className={CAMPO} />
          </label>
          <label className="col-span-6 sm:col-span-5">
            <span className={ROTULO}>CNS (Cartão SUS)</span>
            <input name="cns" placeholder="15 dígitos" className={CAMPO} />
          </label>
          <label className="col-span-6 sm:col-span-3">
            <span className={ROTULO}>Sexo <span className="text-danger">*</span></span>
            <select name="sexo" required className={CAMPO}>
              <option value="FEMININO">Feminino</option>
              <option value="MASCULINO">Masculino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </label>
          <label className="col-span-6 sm:col-span-6">
            <span className={ROTULO}>Telefone</span>
            <input name="telefone" placeholder="(00) 00000-0000" className={CAMPO} />
          </label>
          <label className="col-span-6 sm:col-span-6">
            <span className={ROTULO}>E-mail</span>
            <input name="emailContato" type="email" placeholder="email@exemplo.com" className={CAMPO} />
          </label>
        </div>
      </SecaoNumerada>

      <SecaoNumerada n={2} titulo="Endereço">
        <div className="grid grid-cols-12 gap-4">
          <label className="col-span-3"><span className={ROTULO}>CEP</span><input name="cep" placeholder="00000-000" className={CAMPO} /></label>
          <label className="col-span-6"><span className={ROTULO}>Logradouro</span><input name="logradouro" placeholder="Rua / avenida" className={CAMPO} /></label>
          <label className="col-span-3"><span className={ROTULO}>Número</span><input name="numero" placeholder="nº" className={CAMPO} /></label>
          <label className="col-span-6 sm:col-span-4"><span className={ROTULO}>Complemento</span><input name="complemento" className={CAMPO} /></label>
          <label className="col-span-6 sm:col-span-4"><span className={ROTULO}>Bairro</span><input name="bairro" className={CAMPO} /></label>
          <label className="col-span-8 sm:col-span-3"><span className={ROTULO}>Cidade</span><input name="cidade" className={CAMPO} /></label>
          <label className="col-span-4 sm:col-span-1"><span className={ROTULO}>UF</span><input name="uf" maxLength={2} className={CAMPO} /></label>
        </div>
      </SecaoNumerada>

      <SecaoNumerada n={3} titulo="Contato de emergência">
        <div className="grid grid-cols-12 gap-4">
          <label className="col-span-12 sm:col-span-6"><span className={ROTULO}>Nome do contato</span><input name="contatoEmergenciaNome" placeholder="Nome" className={CAMPO} /></label>
          <label className="col-span-12 sm:col-span-6"><span className={ROTULO}>Telefone</span><input name="contatoEmergenciaTelefone" placeholder="(00) 00000-0000" className={CAMPO} /></label>
        </div>
      </SecaoNumerada>

      <SecaoNumerada n={4} titulo="Vínculo assistencial">
        <div className="grid grid-cols-12 gap-4">
          <label className="col-span-12 sm:col-span-4">
            <span className={ROTULO}>Tipo <span className="text-danger">*</span></span>
            <select name="tipoVinculo" required className={CAMPO} value={vinculo} onChange={(e) => setVinculo(e.target.value)}>
              <option value="SUS">SUS</option>
              <option value="CONVENIO">Convênio</option>
            </select>
          </label>
          {vinculo === "CONVENIO" && (
            <>
              <label className="col-span-12 sm:col-span-4"><span className={ROTULO}>Convênio</span><input name="convenioNome" className={CAMPO} /></label>
              <label className="col-span-6 sm:col-span-4"><span className={ROTULO}>Matrícula</span><input name="convenioMatricula" className={CAMPO} /></label>
              <label className="col-span-6 sm:col-span-4"><span className={ROTULO}>Validade</span><input name="convenioValidade" type="date" className={CAMPO} /></label>
            </>
          )}
        </div>
      </SecaoNumerada>

      {estado?.erro && <p className="mb-3 text-sm font-medium text-danger">{estado.erro}</p>}
      <div className="sticky bottom-0 flex justify-end gap-3 bg-gradient-to-t from-canvas from-30% to-transparent py-4">
        <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
          {pendente ? "Salvando..." : "Cadastrar paciente"}
        </button>
      </div>
    </form>
  );
}
