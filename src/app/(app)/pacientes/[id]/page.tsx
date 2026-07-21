import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CLINICO_PACIENTE, PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { perfilPermitido } from "@/lib/perfis";
import { db } from "@/lib/db";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { registrarEvento } from "@/lib/auditoria";
import { FormularioNefrologicos } from "./formulario-nefrologicos";
import { FormularioSituacao } from "./formulario-situacao";
import { listarAcessos } from "@/lib/pacientes/acessos";
import { sorologiasAtuais } from "@/lib/pacientes/sorologias";
import { medicacoesAtivas, listarAlergias } from "@/lib/pacientes/medicacoes";
import { SecaoAcessos } from "./secao-acessos";
import { SecaoSorologias } from "./secao-sorologias";
import { SecaoMedicacoesAlergias } from "./secao-medicacoes-alergias";
import { CabecalhoPaciente } from "./cabecalho";
import { Secao } from "@/lib/ui";
import type { Modalidade, SituacaoPaciente, TipoSorologia } from "@prisma/client";

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
const ROTULO_SOROLOGIA: Record<TipoSorologia, string> = { HBSAG: "HBsAg", ANTI_HCV: "Anti-HCV", HIV: "HIV" };

function formatarData(data: Date | null): string {
  return data ? data.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—";
}
function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
function idade(nascimento: Date): number {
  const hoje = new Date();
  let a = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  const m = hoje.getUTCMonth() - nascimento.getUTCMonth();
  if (m < 0 || (m === 0 && hoje.getUTCDate() < nascimento.getUTCDate())) a--;
  return a;
}
const SEXO = { FEMININO: "Feminino", MASCULINO: "Masculino", OUTRO: "Outro" } as const;

function Kv({ pares }: { pares: [string, string][] }) {
  return (
    <dl className="flex flex-col gap-[10px] text-sm">
      {pares.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-[18px]">
          <dt className="font-semibold text-muted">{k}</dt>
          <dd className="text-right font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function PaginaPaciente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;

  const paciente = await db.paciente.findUnique({
    where: { id },
    include: { mudancasSituacao: { orderBy: { registradoEm: "desc" } } },
  });
  if (!paciente) notFound();

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.visualizar",
    entidade: "Paciente",
    entidadeId: paciente.id,
  });

  const podeEditarClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_PACIENTE);
  const podeVerClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_LEITURA);

  const [acessos, sorologias, medicacoes, alergias] = podeVerClinico
    ? await Promise.all([
        listarAcessos(paciente.id),
        sorologiasAtuais(paciente.id),
        medicacoesAtivas(paciente.id),
        listarAlergias(paciente.id),
      ])
    : [[], {}, [], []];

  const reagentes = (["HBSAG", "ANTI_HCV", "HIV"] as TipoSorologia[]).filter(
    (t) => sorologias[t]?.resultado === "POSITIVO",
  );

  const badges = podeVerClinico ? (
    <>
      {alergias.length > 0 && (
        <span className="inline-flex items-center gap-[6px] rounded-md bg-danger-tint px-[9px] py-[3px] text-xs font-bold text-danger">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
          </svg>
          {alergias.length} {alergias.length === 1 ? "alergia" : "alergias"}
        </span>
      )}
      {reagentes.map((t) => (
        <span key={t} className="rounded-md bg-amber-tint px-[9px] py-[3px] text-xs font-bold text-amber">
          {ROTULO_SOROLOGIA[t]} reagente
        </span>
      ))}
    </>
  ) : null;

  const meta = (
    <>
      <span className="font-mono">CPF {formatarCpf(paciente.cpf)}</span>
      {paciente.cns && <span className="font-mono">CNS {paciente.cns}</span>}
      <span>{idade(paciente.dataNascimento)} anos · {SEXO[paciente.sexo]}</span>
      {paciente.modalidade && <span>{ROTULO_MODALIDADE[paciente.modalidade]}</span>}
      <span>{paciente.tipoVinculo === "SUS" ? "SUS" : paciente.convenioNome ?? "Convênio"}</span>
    </>
  );

  return (
    <div>
      <CabecalhoPaciente
        id={paciente.id}
        nome={paciente.nome}
        situacao={ROTULO_SITUACAO[paciente.situacao]}
        situacaoClasse={CLASSE_SITUACAO[paciente.situacao]}
        meta={meta}
        badges={badges}
        temClinico={podeVerClinico}
      />

      {podeVerClinico && (alergias.length > 0 || reagentes.length > 0) && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-danger-line bg-danger-tint p-[13px_18px]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b1271e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
          </svg>
          {alergias.length > 0 && (
            <>
              <span className="font-extrabold text-danger">Alergias:</span>
              <span className="font-bold text-danger">{alergias.map((a) => a.descricao).join(" · ")}</span>
            </>
          )}
          {reagentes.map((t) => (
            <span key={t} className="whitespace-nowrap rounded-md bg-amber-tint px-[9px] py-[2px] font-bold text-amber">
              {ROTULO_SOROLOGIA[t]} reagente
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">
        <Secao titulo="Identificação e vínculo">
          <Kv
            pares={[
              ["CNS", paciente.cns ?? "—"],
              ["Telefone", paciente.telefone ?? "—"],
              ["E-mail", paciente.emailContato ?? "—"],
              [
                "Endereço",
                [paciente.logradouro, paciente.numero, paciente.bairro, paciente.cidade, paciente.uf]
                  .filter(Boolean)
                  .join(", ") || "—",
              ],
              [
                "Contato de emergência",
                paciente.contatoEmergenciaNome
                  ? `${paciente.contatoEmergenciaNome} — ${paciente.contatoEmergenciaTelefone ?? "sem telefone"}`
                  : "—",
              ],
              [
                "Vínculo",
                paciente.tipoVinculo === "SUS"
                  ? "SUS"
                  : `${paciente.convenioNome ?? "Convênio"} — matrícula ${paciente.convenioMatricula ?? "—"}`,
              ],
            ]}
          />
        </Secao>

        {podeVerClinico && (
          <Secao titulo="Dados nefrológicos">
            {podeEditarClinico ? (
              <FormularioNefrologicos
                id={paciente.id}
                cidDoencaBase={paciente.cidDoencaBase ?? ""}
                dataInicioDialise={paciente.dataInicioDialise?.toISOString().slice(0, 10) ?? ""}
                modalidade={paciente.modalidade ?? ""}
              />
            ) : (
              <Kv
                pares={[
                  ["Doença de base (CID)", paciente.cidDoencaBase ?? "—"],
                  ["Início da diálise", formatarData(paciente.dataInicioDialise)],
                  ["Modalidade", paciente.modalidade ? ROTULO_MODALIDADE[paciente.modalidade] : "—"],
                ]}
              />
            )}
          </Secao>
        )}

        {podeVerClinico && (
          <Secao titulo="Situação — histórico de mudanças" className="lg:col-span-2">
            {podeEditarClinico && (
              <div className="mb-4">
                <FormularioSituacao id={paciente.id} situacaoAtual={paciente.situacao} />
              </div>
            )}
            {paciente.mudancasSituacao.length > 0 ? (
              <ol className="relative list-none pl-[22px]">
                {paciente.mudancasSituacao.map((m) => (
                  <li key={m.id} className="relative pb-[18px] last:pb-0">
                    <span className="absolute -left-[22px] top-[3px] h-[11px] w-[11px] rounded-full bg-primary shadow-[0_0_0_3px_var(--color-surface),0_0_0_4px_var(--color-line)]" />
                    <span className="absolute -left-[17px] top-[14px] bottom-0 w-[1.5px] bg-line" />
                    <div className="flex flex-wrap justify-between gap-3">
                      <span className="font-bold">
                        {m.de ? `${ROTULO_SITUACAO[m.de]} → ` : ""}
                        {ROTULO_SITUACAO[m.para]}
                      </span>
                      <span className="font-mono text-xs text-muted">{formatarDataHora(m.registradoEm)}</span>
                    </div>
                    {m.motivo && <p className="mt-[2px] text-[13px] text-muted">{m.motivo}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Nenhuma mudança de situação registrada.</p>
            )}
          </Secao>
        )}

        {podeVerClinico && (
          <div className="lg:col-span-2">
            <SecaoAcessos pacienteId={paciente.id} acessos={acessos} podeEditar={podeEditarClinico} />
          </div>
        )}
        {podeVerClinico && <SecaoSorologias pacienteId={paciente.id} atuais={sorologias} podeEditar={podeEditarClinico} />}
        {podeVerClinico && (
          <SecaoMedicacoesAlergias
            pacienteId={paciente.id}
            medicacoes={medicacoes}
            alergias={alergias}
            podeEditar={podeEditarClinico}
          />
        )}
      </div>
    </div>
  );
}
