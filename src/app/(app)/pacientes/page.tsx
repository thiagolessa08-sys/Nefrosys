import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { perfilPermitido } from "@/lib/perfis";
import type { Modalidade, SituacaoPaciente, TipoVinculo } from "@prisma/client";

const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo",
  TRANSPLANTADO: "Transplantado",
  OBITO: "Óbito",
  TRANSFERIDO: "Transferido",
  EM_TRANSITO: "Em trânsito",
};

const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  HEMODIALISE: "Hemodiálise",
  DIALISE_PERITONEAL: "Diálise peritoneal",
};

export default async function PaginaPacientes({
  searchParams,
}: {
  searchParams: Promise<{ texto?: string; situacao?: string; modalidade?: string; vinculo?: string }>;
}) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const params = await searchParams;

  const pacientes = await buscarPacientes({
    texto: params.texto,
    situacao: (params.situacao || undefined) as SituacaoPaciente | undefined,
    modalidade: (params.modalidade || undefined) as Modalidade | undefined,
    tipoVinculo: (params.vinculo || undefined) as TipoVinculo | undefined,
  });

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.listar",
    detalhes: { filtros: params, resultados: pacientes.length },
  });

  const podeCadastrar = perfilPermitido(usuario.perfil, PERFIS_CADASTRO_PACIENTE);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Pacientes</h1>
        <div className="flex gap-2">
          <a
            href={`/api/pacientes/exportar?${new URLSearchParams(
              Object.entries(params).filter(([, v]) => v) as [string, string][],
            ).toString()}`}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exportar Excel
          </a>
          {podeCadastrar && (
            <Link href="/pacientes/novo" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
              Novo paciente
            </Link>
          )}
        </div>
      </div>

      <form className="mb-4 flex flex-wrap gap-2 rounded bg-white p-4 shadow-sm">
        <input
          name="texto" defaultValue={params.texto ?? ""} placeholder="Nome, CPF ou CNS"
          className="min-w-60 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select name="situacao" defaultValue={params.situacao ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as situações</option>
          {Object.entries(ROTULO_SITUACAO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
        <select name="modalidade" defaultValue={params.modalidade ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as modalidades</option>
          {Object.entries(ROTULO_MODALIDADE).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>{rotulo}</option>
          ))}
        </select>
        <select name="vinculo" defaultValue={params.vinculo ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">SUS e convênio</option>
          <option value="SUS">SUS</option>
          <option value="CONVENIO">Convênio</option>
        </select>
        <button className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Buscar
        </button>
      </form>

      <p className="mb-2 text-sm text-slate-500">{pacientes.length} paciente(s) encontrado(s).</p>

      <table className="w-full rounded bg-white text-sm shadow-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-2">Nome</th>
            <th className="px-4 py-2">CPF</th>
            <th className="px-4 py-2">Modalidade</th>
            <th className="px-4 py-2">Vínculo</th>
            <th className="px-4 py-2">Situação</th>
          </tr>
        </thead>
        <tbody>
          {pacientes.map((paciente) => (
            <tr key={paciente.id} className="border-b">
              <td className="px-4 py-2">
                <Link href={`/pacientes/${paciente.id}`} className="text-blue-700 hover:underline">
                  {paciente.nome}
                </Link>
              </td>
              <td className="px-4 py-2">{formatarCpf(paciente.cpf)}</td>
              <td className="px-4 py-2">{paciente.modalidade ? ROTULO_MODALIDADE[paciente.modalidade] : "—"}</td>
              <td className="px-4 py-2">{paciente.tipoVinculo === "SUS" ? "SUS" : paciente.convenioNome ?? "Convênio"}</td>
              <td className="px-4 py-2">{ROTULO_SITUACAO[paciente.situacao]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
