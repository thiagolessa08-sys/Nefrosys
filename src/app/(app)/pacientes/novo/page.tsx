import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { FormularioNovoPaciente } from "./formulario";

export default async function PaginaNovoPaciente() {
  await exigirPerfil(...PERFIS_CADASTRO_PACIENTE);
  return (
    <div className="mx-auto max-w-[940px]">
      <Link href="/pacientes" className="mb-3 flex items-center gap-[6px] text-[13px] font-semibold text-muted hover:text-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Voltar para Pacientes
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight">Novo paciente</h1>
      <p className="mb-[22px] mt-1 text-sm text-muted">
        Campos marcados com <span className="font-bold text-danger">*</span> são obrigatórios. Os dados nefrológicos são
        preenchidos pela equipe clínica na ficha, depois do cadastro.
      </p>
      <FormularioNovoPaciente />
    </div>
  );
}
