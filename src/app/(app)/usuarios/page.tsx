import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { db } from "@/lib/db";
import { rotuloPerfil, PERFIS_GESTAO } from "@/lib/perfis";
import { acaoAlternarAtivo } from "./acoes";
import { CARD, BTN_PRIMARIO } from "@/lib/ui";

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export default async function PaginaUsuarios() {
  const usuarioAtual = await exigirPerfil(...PERFIS_GESTAO);
  const usuarios = await db.usuario.findMany({ orderBy: { nome: "asc" } });
  const ativos = usuarios.filter((u) => u.ativo).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] font-semibold text-ink">Usuários</h1>
          <p className="mt-1 text-sm text-muted">
            {usuarios.length} {usuarios.length === 1 ? "conta" : "contas"} · {ativos} {ativos === 1 ? "ativa" : "ativas"}
          </p>
        </div>
        <Link href="/usuarios/novo" className={BTN_PRIMARIO}>
          Novo usuário
        </Link>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-2 text-left text-[11.5px] uppercase tracking-[.05em] text-muted">
              <th className="px-5 py-3 font-bold">Nome</th>
              <th className="px-5 py-3 font-bold">E-mail</th>
              <th className="px-5 py-3 font-bold">Perfil</th>
              <th className="px-5 py-3 font-bold">Situação</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b border-line-2 last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-tint text-xs font-bold text-primary">
                      {iniciais(usuario.nome)}
                    </span>
                    <span className="font-semibold text-ink">{usuario.nome}</span>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-[13px] text-muted">{usuario.email}</td>
                <td className="px-5 py-3">
                  <span className="rounded-md bg-surface-2 px-[9px] py-[3px] text-xs font-semibold text-muted">
                    {rotuloPerfil[usuario.perfil]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {usuario.ativo ? (
                    <span className="rounded-md bg-good-tint px-[9px] py-[3px] text-xs font-bold text-good">Ativo</span>
                  ) : (
                    <span className="rounded-md bg-line-2 px-[9px] py-[3px] text-xs font-bold text-muted">Desativado</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {usuario.id !== usuarioAtual.id && (
                    <form action={acaoAlternarAtivo}>
                      <input type="hidden" name="id" value={usuario.id} />
                      <input type="hidden" name="ativo" value={String(!usuario.ativo)} />
                      <button className={`text-xs font-semibold hover:underline ${usuario.ativo ? "text-danger" : "text-good"}`}>
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
    </div>
  );
}
