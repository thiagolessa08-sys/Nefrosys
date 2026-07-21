import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_GESTAO } from "@/lib/perfis";
import { FormularioNovoUsuario } from "./formulario";

export default async function PaginaNovoUsuario() {
  await exigirPerfil(...PERFIS_GESTAO);
  return (
    <div className="max-w-md">
      <h1 className="mb-4 font-serif text-[26px] font-semibold text-ink">Novo usuário</h1>
      <FormularioNovoUsuario />
    </div>
  );
}
