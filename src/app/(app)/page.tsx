import Link from "next/link";
import { exigirUsuario } from "@/lib/auth/contexto";
import { perfilPermitido } from "@/lib/perfis";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";

export default async function PaginaInicial() {
  const usuario = await exigirUsuario();
  const podeVerPacientes = perfilPermitido(usuario.perfil, PERFIS_LEITURA_PACIENTE);

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Bem-vindo(a), {usuario.nome}</h1>
      {podeVerPacientes ? (
        <p className="mt-2 text-slate-600">
          Comece pelo{" "}
          <Link href="/pacientes" className="text-blue-700 hover:underline">
            cadastro de pacientes
          </Link>
          . Acessos, sorologias, medicações e evoluções chegam nas próximas entregas.
        </p>
      ) : (
        <p className="mt-2 text-slate-600">
          Use o menu para gerenciar usuários e consultar a trilha de auditoria.
        </p>
      )}
    </div>
  );
}
