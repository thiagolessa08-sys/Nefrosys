import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_GESTAO } from "@/lib/perfis";
import { db } from "@/lib/db";
import { CARD } from "@/lib/ui";

export default async function PaginaAuditoria() {
  await exigirPerfil(...PERFIS_GESTAO);
  const eventos = await db.eventoAuditoria.findMany({
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { usuario: { select: { nome: true, email: true } } },
  });

  return (
    <div>
      <h1 className="font-serif text-[26px] font-semibold text-ink">Trilha de auditoria</h1>
      <p className="mb-5 mt-1 text-sm text-muted">
        Últimos 200 eventos. Registros de auditoria não podem ser editados nem excluídos.
      </p>
      <div className={`${CARD} overflow-hidden`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-2 text-left text-[11.5px] uppercase tracking-[.05em] text-muted">
              <th className="px-5 py-3 font-bold">Data/hora</th>
              <th className="px-5 py-3 font-bold">Usuário</th>
              <th className="px-5 py-3 font-bold">Ação</th>
              <th className="px-5 py-3 font-bold">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id} className="border-b border-line-2 align-top last:border-0">
                <td className="whitespace-nowrap px-5 py-[10px] font-mono text-[12.5px] text-muted">
                  {evento.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </td>
                <td className="px-5 py-[10px] font-semibold text-ink">{evento.usuario ? evento.usuario.nome : "—"}</td>
                <td className="px-5 py-[10px] font-mono text-[12.5px] text-primary">{evento.acao}</td>
                <td className="px-5 py-[10px] text-muted">
                  {evento.entidade ? `${evento.entidade} ${evento.entidadeId ?? ""}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
