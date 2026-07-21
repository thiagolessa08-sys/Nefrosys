import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE, PERFIS_CLINICO_LEITURA } from "@/lib/pacientes/permissoes";
import { perfilPermitido } from "@/lib/perfis";
import { listarDocumentos } from "@/lib/pacientes/documentos-servico";
import { formatarCpf } from "@/lib/pacientes/documentos";
import { db } from "@/lib/db";
import { FormularioUpload } from "./formulario-upload";
import { acaoRemover } from "./acoes";
import { CabecalhoPaciente } from "../cabecalho";
import { CARD } from "@/lib/ui";
import type { CategoriaDocumento, Modalidade, SituacaoPaciente } from "@prisma/client";

const ROTULO_CATEGORIA: Record<CategoriaDocumento, string> = {
  LAUDO: "Laudo", EXAME: "Exame", TERMO: "Termo", IDENTIDADE: "Identidade", FOTO: "Foto", OUTRO: "Outro",
};
const ROTULO_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "Ativo", TRANSPLANTADO: "Transplantado", OBITO: "Óbito", TRANSFERIDO: "Transferido", EM_TRANSITO: "Em trânsito",
};
const CLASSE_SITUACAO: Record<SituacaoPaciente, string> = {
  ATIVO: "bg-good-tint text-good", TRANSPLANTADO: "bg-info-tint text-info", OBITO: "bg-danger-tint text-danger",
  TRANSFERIDO: "bg-line-2 text-muted", EM_TRANSITO: "bg-amber-tint text-amber",
};
const ROTULO_MODALIDADE: Record<Modalidade, string> = { HEMODIALISE: "Hemodiálise", DIALISE_PERITONEAL: "Diálise peritoneal" };

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function idade(n: Date): number {
  const h = new Date();
  let a = h.getUTCFullYear() - n.getUTCFullYear();
  const m = h.getUTCMonth() - n.getUTCMonth();
  if (m < 0 || (m === 0 && h.getUTCDate() < n.getUTCDate())) a--;
  return a;
}
const SEXO = { FEMININO: "Feminino", MASCULINO: "Masculino", OUTRO: "Outro" } as const;

export default async function PaginaDocumentos({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;
  const paciente = await db.paciente.findUnique({ where: { id } });
  if (!paciente) notFound();

  const documentos = await listarDocumentos(id);
  const podeAnexar = perfilPermitido(usuario.perfil, PERFIS_CADASTRO_PACIENTE);
  const temClinico = perfilPermitido(usuario.perfil, PERFIS_CLINICO_LEITURA);

  const meta = (
    <>
      <span className="font-mono">CPF {formatarCpf(paciente.cpf)}</span>
      <span>{idade(paciente.dataNascimento)} anos · {SEXO[paciente.sexo]}</span>
      {paciente.modalidade && <span>{ROTULO_MODALIDADE[paciente.modalidade]}</span>}
    </>
  );

  return (
    <div>
      <CabecalhoPaciente
        id={id}
        nome={paciente.nome}
        situacao={ROTULO_SITUACAO[paciente.situacao]}
        situacaoClasse={CLASSE_SITUACAO[paciente.situacao]}
        meta={meta}
        temClinico={temClinico}
      />

      <div className="max-w-3xl space-y-5">
        {podeAnexar && <FormularioUpload pacienteId={id} />}

        {documentos.length === 0 ? (
          <p className="text-sm text-muted">Nenhum documento anexado.</p>
        ) : (
          <div className={`${CARD} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-2 text-left text-[11.5px] uppercase tracking-[.05em] text-muted">
                  <th className="px-4 py-[11px] font-bold">Nome</th>
                  <th className="px-4 py-[11px] font-bold">Categoria</th>
                  <th className="px-4 py-[11px] font-bold">Tamanho</th>
                  <th className="px-4 py-[11px]" />
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.id} className="border-b border-line-2 last:border-0">
                    <td className="px-4 py-3">
                      <a href={`/api/documentos/${doc.id}`} target="_blank" className="font-semibold text-primary hover:underline">
                        {doc.nomeOriginal}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-surface-2 px-[9px] py-[3px] text-xs font-semibold text-muted">
                        {ROTULO_CATEGORIA[doc.categoria]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{formatarTamanho(doc.tamanhoBytes)}</td>
                    <td className="px-4 py-3 text-right">
                      {podeAnexar && (
                        <form action={acaoRemover}>
                          <input type="hidden" name="pacienteId" value={id} />
                          <input type="hidden" name="documentoId" value={doc.id} />
                          <button className="text-xs font-semibold text-danger hover:underline">Remover</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
