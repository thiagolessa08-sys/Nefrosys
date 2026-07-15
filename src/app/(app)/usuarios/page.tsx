import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { db } from "@/lib/db";
import { rotuloPerfil } from "@/lib/perfis";
import { acaoAlternarAtivo } from "./acoes";

export default async function PaginaUsuarios() {
  const usuarioAtual = await exigirPerfil("ADMINISTRADOR");
  const usuarios = await db.usuario.findMany({ orderBy: { nome: "asc" } });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Usuários</h1>
        <Link href="/usuarios/novo" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
          Novo usuário
        </Link>
      </div>
      <table className="w-full rounded bg-white shadow-sm">
        <thead>
          <tr className="border-b text-left text-sm text-slate-500">
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">E-mail</th>
            <th className="px-4 py-2">Perfil</th>
            <th className="px-4 py-2">Situação</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="border-b text-sm">
              <td className="px-4 py-2">{usuario.nome}</td>
              <td className="px-4 py-2">{usuario.email}</td>
              <td className="px-4 py-2">{rotuloPerfil[usuario.perfil]}</td>
              <td className="px-4 py-2">{usuario.ativo ? "Ativo" : "Desativado"}</td>
              <td className="px-4 py-2 text-right">
                {usuario.id !== usuarioAtual.id && (
                  <form action={acaoAlternarAtivo}>
                    <input type="hidden" name="id" value={usuario.id} />
                    <input type="hidden" name="ativo" value={String(!usuario.ativo)} />
                    <button className={usuario.ativo ? "text-red-600 hover:underline" : "text-green-700 hover:underline"}>
                      {usuario.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
