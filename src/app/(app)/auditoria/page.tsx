import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_GESTAO } from "@/lib/perfis";
import { db } from "@/lib/db";

export default async function PaginaAuditoria() {
  await exigirPerfil(...PERFIS_GESTAO);
  const eventos = await db.eventoAuditoria.findMany({
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { usuario: { select: { nome: true, email: true } } },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-800">Trilha de auditoria</h1>
      <p className="mb-4 text-sm text-slate-500">Últimos 200 eventos. Registros de auditoria não podem ser editados nem excluídos.</p>
      <table className="w-full rounded bg-white text-sm shadow-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-2">Data/hora</th>
            <th className="px-4 py-2">Usuário</th>
            <th className="px-4 py-2">Ação</th>
            <th className="px-4 py-2">Entidade</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="border-b align-top">
              <td className="whitespace-nowrap px-4 py-2">
                {evento.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </td>
              <td className="px-4 py-2">{evento.usuario ? evento.usuario.nome : "—"}</td>
              <td className="px-4 py-2 font-mono">{evento.acao}</td>
              <td className="px-4 py-2">{evento.entidade ? `${evento.entidade} ${evento.entidadeId ?? ""}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
