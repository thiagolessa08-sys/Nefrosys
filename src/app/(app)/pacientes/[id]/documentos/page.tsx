import { notFound } from "next/navigation";
import Link from "next/link";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { perfilPermitido } from "@/lib/perfis";
import { listarDocumentos } from "@/lib/pacientes/documentos-servico";
import { db } from "@/lib/db";
import { FormularioUpload } from "./formulario-upload";
import { acaoRemover } from "./acoes";
import type { CategoriaDocumento } from "@prisma/client";

const ROTULO_CATEGORIA: Record<CategoriaDocumento, string> = {
  LAUDO: "Laudo",
  EXAME: "Exame",
  TERMO: "Termo",
  IDENTIDADE: "Identidade",
  FOTO: "Foto",
  OUTRO: "Outro",
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function PaginaDocumentos({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;
  const paciente = await db.paciente.findUnique({ where: { id }, select: { id: true, nome: true } });
  if (!paciente) notFound();

  const documentos = await listarDocumentos(id);
  const podeAnexar = perfilPermitido(usuario.perfil, PERFIS_CADASTRO_PACIENTE);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/pacientes/${id}`} className="text-sm text-blue-700 hover:underline">← Ficha</Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-800">Documentos — {paciente.nome}</h1>
      </div>

      {podeAnexar && <FormularioUpload pacienteId={id} />}

      {documentos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum documento anexado.</p>
      ) : (
        <table className="w-full rounded bg-white text-sm shadow-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Categoria</th>
              <th className="px-4 py-2">Tamanho</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {documentos.map((doc) => (
              <tr key={doc.id} className="border-b">
                <td className="px-4 py-2">
                  <a href={`/api/documentos/${doc.id}`} target="_blank" className="text-blue-700 hover:underline">
                    {doc.nomeOriginal}
                  </a>
                </td>
                <td className="px-4 py-2">{ROTULO_CATEGORIA[doc.categoria]}</td>
                <td className="px-4 py-2">{formatarTamanho(doc.tamanhoBytes)}</td>
                <td className="px-4 py-2 text-right">
                  {podeAnexar && (
                    <form action={acaoRemover}>
                      <input type="hidden" name="pacienteId" value={id} />
                      <input type="hidden" name="documentoId" value={doc.id} />
                      <button className="text-red-600 hover:underline">Remover</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
