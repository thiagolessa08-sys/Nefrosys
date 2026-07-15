import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { FormularioNovoPaciente } from "./formulario";

export default async function PaginaNovoPaciente() {
  await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Novo paciente</h1>
      <p className="mb-4 text-sm text-slate-500">
        Os dados nefrológicos (doença de base, início da diálise, modalidade) são preenchidos pela
        equipe clínica na ficha do paciente, depois do cadastro.
      </p>
      <FormularioNovoPaciente />
    </div>
  );
}
