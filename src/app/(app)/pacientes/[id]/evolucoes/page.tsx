import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { podeEvoluir, tiposPermitidos } from "@/lib/pacientes/evolucoes-perfis";
import { abrirRascunho, listarEvolucoes } from "@/lib/pacientes/evolucoes";
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/auditoria";
import { EditorRascunho } from "./editor";
import { LinhaDoTempo } from "./linha-do-tempo";
import type { TipoEvolucao } from "@prisma/client";

const ROTULO_TIPO: Record<TipoEvolucao, string> = {
  MEDICA: "Médica",
  ENFERMAGEM: "Enfermagem",
  NUTRICAO: "Nutrição",
  PSICOLOGIA: "Psicologia",
  SERVICO_SOCIAL: "Serviço social",
};

export default async function PaginaEvolucoes({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const usuario = await exigirPerfil(...PERFIS_CLINICO_LEITURA);
  const { id } = await params;
  const { tipo: tipoParam } = await searchParams;

  const paciente = await db.paciente.findUnique({ where: { id }, select: { id: true, nome: true } });
  if (!paciente) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.evolucoes.visualizar",
    entidade: "Paciente",
    entidadeId: id,
  });

  const meusTipos = tiposPermitidos(usuario.perfil);
  const autorPodeEvoluir = podeEvoluir(usuario.perfil);

  // Se o autor escolheu um tipo válido, abre/reusa o rascunho dele daquele tipo.
  let rascunho: { id: string; texto: string } | null = null;
  const tipoEscolhido = meusTipos.includes(tipoParam as TipoEvolucao) ? (tipoParam as TipoEvolucao) : null;
  if (tipoEscolhido) {
    const r = await abrirRascunho(id, tipoEscolhido, usuario.id);
    if (r.ok) {
      const ev = await db.evolucao.findUnique({ where: { id: r.id }, select: { id: true, texto: true } });
      if (ev) rascunho = ev;
    }
  }

  const evolucoes = await listarEvolucoes(id);
  const autorIds = [
    ...new Set([
      ...evolucoes.map((e) => e.autorId),
      ...evolucoes.flatMap((e) => e.adendos.map((a) => a.autorId)),
    ]),
  ];
  const autores = await db.usuario.findMany({ where: { id: { in: autorIds } }, select: { id: true, nome: true } });
  const nomePorAutor = Object.fromEntries(autores.map((a) => [a.id, a.nome]));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/pacientes/${id}`} className="text-sm text-blue-700 hover:underline">← Ficha</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">Evoluções — {paciente.nome}</h1>
      </div>

      {autorPodeEvoluir && (
        <div className="flex flex-wrap gap-2">
          {meusTipos.map((t) => (
            <Link
              key={t}
              href={`/pacientes/${id}/evolucoes?tipo=${t}`}
              className={
                t === tipoEscolhido
                  ? "rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded bg-white px-3 py-1.5 text-sm text-blue-700 shadow-sm hover:underline"
              }
            >
              Nova evolução {ROTULO_TIPO[t].toLowerCase()}
            </Link>
          ))}
        </div>
      )}

      {rascunho && (
        <EditorRascunho pacienteId={id} evolucaoId={rascunho.id} textoInicial={rascunho.texto} />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Linha do tempo</h2>
        <LinhaDoTempo
          pacienteId={id}
          evolucoes={evolucoes}
          nomePorAutor={nomePorAutor}
          podeEvoluir={autorPodeEvoluir}
        />
      </section>
    </div>
  );
}
