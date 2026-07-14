import { exigirPerfil } from "@/lib/auth/contexto";
import { FormularioNovoUsuario } from "./formulario";

export default async function PaginaNovoUsuario() {
  await exigirPerfil("ADMINISTRADOR");
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Novo usuário</h1>
      <FormularioNovoUsuario />
    </div>
  );
}
