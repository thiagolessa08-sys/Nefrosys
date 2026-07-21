import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { perfilPermitido } from "@/lib/perfis";
import { db } from "@/lib/db";
import type { Modalidade, SituacaoPaciente, TipoVinculo } from "@prisma/client";

const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo",
  TRANSPLANTADO: "Transplantado",
  OBITO: "Óbito",
  TRANSFERIDO: "Transferido",
  EM_TRANSITO: "Em trânsito",
};
const CLASSE_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "bg-good-tint text-good",
  TRANSPLANTADO: "bg-info-tint text-info",
  OBITO: "bg-danger-tint text-danger",
  TRANSFERIDO: "bg-line-2 text-muted",
  EM_TRANSITO: "bg-amber-tint text-amber",
};
const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  HEMODIALISE: "Hemodiálise",
  DIALISE_PERITONEAL: "Diálise peritoneal",
};

const TONS_AVATAR = [
  "bg-[#d3e8e5] text-primary",
  "bg-[#ece2cf] text-amber",
  "bg-[#dbe8f2] text-info",
  "bg-[#f0dcd9] text-[#9a4038]",
];

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function idade(nascimento: Date): number {
  const hoje = new Date();
  let anos = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  const m = hoje.getUTCMonth() - nascimento.getUTCMonth();
  if (m < 0 || (m === 0 && hoje.getUTCDate() < nascimento.getUTCDate())) anos--;
  return anos;
}

const SEXO_CURTO = { FEMININO: "F", MASCULINO: "M", OUTRO: "—" } as const;

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

  // Alertas (alergias e sorologias reagentes atuais) dos pacientes listados, em duas consultas.
  const ids = pacientes.map((p) => p.id);
  const [alergias, sorologias] = await Promise.all([
    db.alergia.findMany({ where: { pacienteId: { in: ids } }, select: { pacienteId: true } }),
    db.sorologia.findMany({
      where: { pacienteId: { in: ids } },
      orderBy: { dataExame: "desc" },
      select: { pacienteId: true, tipo: true, resultado: true },
    }),
  ]);
  const temAlergia = new Set(alergias.map((a) => a.pacienteId));
  const positivasPorPaciente = new Map<string, Set<string>>();
  const vistas = new Set<string>();
  for (const s of sorologias) {
    const chave = `${s.pacienteId}:${s.tipo}`;
    if (vistas.has(chave)) continue; // a primeira de cada tipo é a mais recente
    vistas.add(chave);
    if (s.resultado === "POSITIVO") {
      const set = positivasPorPaciente.get(s.pacienteId) ?? new Set<string>();
      set.add(s.tipo);
      positivasPorPaciente.set(s.pacienteId, set);
    }
  }
  const CHIP_SOROLOGIA: Record<string, { rotulo: string; classe: string }> = {
    ANTI_HCV: { rotulo: "HCV+", classe: "bg-amber-tint text-amber" },
    HBSAG: { rotulo: "HBV+", classe: "bg-amber-tint text-amber" },
    HIV: { rotulo: "HIV+", classe: "bg-danger-tint text-danger" },
  };

  const ativos = pacientes.filter((p) => p.situacao === "ATIVO").length;
  const podeCadastrar = perfilPermitido(usuario.perfil, PERFIS_CADASTRO_PACIENTE);
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pacientes</h1>
          <p className="mt-[2px] text-sm text-muted">
            {pacientes.length} paciente(s) encontrado(s) · <strong className="font-bold text-good">{ativos} ativos</strong>
          </p>
        </div>
        <div className="flex gap-[10px]">
          <a
            href={`/api/pacientes/exportar?${qs}`}
            className="flex items-center gap-2 rounded-[9px] border border-line bg-surface px-[15px] py-[10px] text-sm font-semibold hover:border-primary hover:text-primary"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1c6b41" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18M3 9h18" />
            </svg>
            Exportar Excel
          </a>
          {podeCadastrar && (
            <Link
              href="/pacientes/novo"
              className="flex items-center gap-2 rounded-[9px] bg-primary px-[17px] py-[10px] text-sm font-bold text-white shadow-[0_1px_2px_rgba(11,92,87,.4)] hover:bg-primary-600"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Novo paciente
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_3px_rgba(19,37,35,.05)]">
        <form className="flex flex-wrap items-center gap-3 border-b border-line-2 p-[16px_18px]">
          <div className="relative min-w-[280px] flex-1">
            <svg className="absolute left-[13px] top-1/2 -translate-y-1/2" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#879794" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              name="texto"
              defaultValue={params.texto ?? ""}
              placeholder="Buscar por nome, CPF ou CNS…"
              aria-label="Buscar paciente"
              className="w-full rounded-[9px] border border-line bg-surface-2 py-[10px] pl-[38px] pr-[14px] focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary"
            />
          </div>
          <select name="situacao" defaultValue={params.situacao ?? ""} aria-label="Situação" className="rounded-[9px] border border-line bg-surface-2 px-3 py-[9px] text-[13.5px] font-semibold">
            <option value="">Todas as situações</option>
            {Object.entries(ROTULO_SITUACAO).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
          <select name="modalidade" defaultValue={params.modalidade ?? ""} aria-label="Modalidade" className="rounded-[9px] border border-line bg-surface-2 px-3 py-[9px] text-[13.5px] font-semibold">
            <option value="">Todas as modalidades</option>
            {Object.entries(ROTULO_MODALIDADE).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
          <select name="vinculo" defaultValue={params.vinculo ?? ""} aria-label="Vínculo" className="rounded-[9px] border border-line bg-surface-2 px-3 py-[9px] text-[13.5px] font-semibold">
            <option value="">SUS e convênio</option>
            <option value="SUS">SUS</option>
            <option value="CONVENIO">Convênio</option>
          </select>
          <button className="rounded-[9px] bg-primary px-4 py-[9px] text-[13.5px] font-semibold text-white hover:bg-primary-600">Buscar</button>
        </form>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-[.05em] text-muted">
              <th className="px-[18px] py-[11px] font-bold">Paciente</th>
              <th className="px-3 py-[11px] font-bold">Idade / Sexo</th>
              <th className="px-3 py-[11px] font-bold">Modalidade</th>
              <th className="px-3 py-[11px] font-bold">Vínculo</th>
              <th className="px-3 py-[11px] font-bold">Situação</th>
              <th className="px-3 py-[11px] font-bold">Alertas</th>
              <th className="px-[18px] py-[11px]" />
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p, i) => {
              const positivas = positivasPorPaciente.get(p.id);
              return (
                <tr key={p.id} className="border-t border-line-2 hover:bg-surface-2">
                  <td className="px-[18px] py-3">
                    <Link href={`/pacientes/${p.id}`} className="flex items-center gap-[11px] no-underline hover:no-underline">
                      <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[9px] text-[13px] font-bold ${TONS_AVATAR[i % TONS_AVATAR.length]}`}>
                        {iniciais(p.nome)}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-serif text-[15.5px] font-semibold text-ink">{p.nome}</span>
                        <span className="font-mono text-[11.5px] text-muted">CPF {formatarCpf(p.cpf)}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-muted">{idade(p.dataNascimento)} · {SEXO_CURTO[p.sexo]}</td>
                  <td className="px-3 py-3">{p.modalidade ? ROTULO_MODALIDADE[p.modalidade] : "—"}</td>
                  <td className="px-3 py-3 text-muted">{p.tipoVinculo === "SUS" ? "SUS" : p.convenioNome ?? "Convênio"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-md px-[9px] py-[3px] text-xs font-bold ${CLASSE_SITUACAO[p.situacao]}`}>
                      {ROTULO_SITUACAO[p.situacao]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-[6px]">
                      {temAlergia.has(p.id) && (
                        <span className="rounded-md bg-danger-tint px-[7px] py-[3px] text-[11px] font-bold text-danger">Alergia</span>
                      )}
                      {positivas &&
                        [...positivas].map((tipo) => (
                          <span key={tipo} className={`rounded-md px-[7px] py-[3px] text-[11px] font-bold ${CHIP_SOROLOGIA[tipo].classe}`}>
                            {CHIP_SOROLOGIA[tipo].rotulo}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-[18px] py-3 text-right">
                    <Link href={`/pacientes/${p.id}`} aria-label={`Abrir ${p.nome}`}>
                      <svg className="inline" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a3b0ad" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-line-2 p-[13px_18px] text-[13px] text-muted">
          <span>{pacientes.length} paciente(s)</span>
        </div>
      </div>
    </div>
  );
}
