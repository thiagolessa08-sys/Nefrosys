import { exigirUsuario } from "@/lib/auth/contexto";
import { rotuloPerfil } from "@/lib/perfis";
import { FormularioSenha } from "./formulario";

export default async function PaginaConta() {
  const usuario = await exigirUsuario();
  return (
    <div className="max-w-md">
      <h1 className="mb-1 font-serif text-[26px] font-semibold text-ink">Minha conta</h1>
      <p className="mb-5 text-sm text-muted">
        {usuario.nome} · {usuario.email} · {rotuloPerfil[usuario.perfil]}
      </p>
      <FormularioSenha />
    </div>
  );
}
