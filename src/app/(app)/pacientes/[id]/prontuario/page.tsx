import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { montarProntuario } from "@/lib/pacientes/prontuario";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { BotaoImprimir } from "./botao-imprimir";
import type { ResultadoSorologia, TipoSorologia } from "@prisma/client";

const ROTULO_SOROLOGIA: Record<TipoSorologia, string> = { HBSAG: "HBsAg", ANTI_HCV: "Anti-HCV", HIV: "HIV" };
const ROTULO_RESULTADO: Record<ResultadoSorologia, string> = {
  POSITIVO: "Positivo",
  NEGATIVO: "Negativo",
  INDETERMINADO: "Indeterminado",
};

function dataUTC(d: Date | null): string {
  return d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}
function dataHora(d: Date): string {
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function PaginaProntuario({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_CLINICO_LEITURA);
  const { id } = await params;
  const p = await montarProntuario(id);
  if (!p) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.prontuario.exportar",
    entidade: "Paciente",
    entidadeId: id,
  });

  const tipos: TipoSorologia[] = ["HBSAG", "ANTI_HCV", "HIV"];
  const emitidoEm = dataHora(new Date());

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-sm text-slate-800">
      <div className="no-print flex justify-between">
        <Link href={`/pacientes/${id}`} className="text-blue-700 hover:underline">← Ficha</Link>
        <BotaoImprimir />
      </div>

      <header className="border-b pb-3">
        <h1 className="text-lg font-bold">Prontuário — {p.paciente.nome}</h1>
        <p>
          {formatarCpf(p.paciente.cpf)} · Nascimento {dataUTC(p.paciente.dataNascimento)}
        </p>
        <p className="text-xs text-slate-500">Emitido em {emitidoEm} por {usuario.nome}</p>
      </header>

      <section>
        <h2 className="font-semibold">Dados nefrológicos</h2>
        <p>Doença de base (CID): {p.paciente.cidDoencaBase ?? "—"}</p>
        <p>Início da diálise: {dataUTC(p.paciente.dataInicioDialise)}</p>
        <p>Acesso atual: {p.acessoAtual ? `${p.acessoAtual.tipo} — ${p.acessoAtual.localizacao}` : "—"}</p>
      </section>

      <section>
        <h2 className="font-semibold">Sorologias</h2>
        {tipos.map((t) => (
          <p key={t}>
            {ROTULO_SOROLOGIA[t]}: {p.sorologias[t] ? ROTULO_RESULTADO[p.sorologias[t]!.resultado] : "—"}
          </p>
        ))}
      </section>

      <section>
        <h2 className="font-semibold">Medicações em uso</h2>
        {p.medicacoesAtivas.length ? (
          <ul className="list-disc pl-5">
            {p.medicacoesAtivas.map((m) => (
              <li key={m.id}>
                {m.nome}
                {m.dose ? ` ${m.dose}` : ""}
                {m.posologia ? ` — ${m.posologia}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>—</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Alergias</h2>
        <p>{p.alergias.length ? p.alergias.map((a) => a.descricao).join(", ") : "—"}</p>
      </section>

      <section>
        <h2 className="font-semibold">Evoluções</h2>
        {p.evolucoes.length === 0 && <p>—</p>}
        {p.evolucoes.map((ev) => (
          <div key={ev.id} className="mt-3 border-t pt-2">
            <p className="text-xs text-slate-500">
              {ev.tipo} · {p.nomePorAutor[ev.autorId] ?? "Autor"} · {ev.assinadaEm ? dataHora(ev.assinadaEm) : ""}
            </p>
            <pre className="whitespace-pre-wrap font-sans">{ev.texto}</pre>
            {ev.adendos.map((a) => (
              <p key={a.id} className="mt-1 pl-3 text-slate-700">
                <span className="text-xs text-slate-500">Adendo ({dataHora(a.criadoEm)}): </span>
                {a.texto}
              </p>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
