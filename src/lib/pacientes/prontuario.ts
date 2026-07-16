import { db } from "@/lib/db";
import { montarResumo } from "./resumo";
import { listarEvolucoes } from "./evolucoes";

// Agrega tudo o que entra no prontuário para impressão: resumo (identificação, dados clínicos,
// acesso atual, sorologias, medicações, alergias) + evoluções assinadas com nomes dos autores.
export async function montarProntuario(pacienteId: string) {
  const resumo = await montarResumo(pacienteId);
  if (!resumo) return null;
  const evolucoes = await listarEvolucoes(pacienteId);
  const autorIds = [
    ...new Set([
      ...evolucoes.map((e) => e.autorId),
      ...evolucoes.flatMap((e) => e.adendos.map((a) => a.autorId)),
    ]),
  ];
  const autores = await db.usuario.findMany({ where: { id: { in: autorIds } }, select: { id: true, nome: true } });
  const nomePorAutor = Object.fromEntries(autores.map((a) => [a.id, a.nome]));
  return { ...resumo, evolucoes, nomePorAutor };
}
