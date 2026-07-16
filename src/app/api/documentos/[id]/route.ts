import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";
import { lerArquivo } from "@/lib/arquivos/armazenamento";
import { registrarEvento } from "@/lib/auditoria";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const { id } = await params;

  const doc = await db.documento.findUnique({ where: { id } });
  if (!doc) return new Response("Documento não encontrado.", { status: 404 });

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.documento.baixar",
    entidade: "Documento",
    entidadeId: doc.id,
    detalhes: { pacienteId: doc.pacienteId },
  });

  const conteudo = await lerArquivo(doc.chaveArmazenamento);
  return new Response(new Uint8Array(conteudo), {
    headers: {
      "Content-Type": doc.tipoMime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.nomeOriginal)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
