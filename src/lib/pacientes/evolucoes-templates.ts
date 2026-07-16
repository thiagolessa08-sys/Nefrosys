import type { TipoEvolucao } from "@prisma/client";

// Texto padrão carregado no editor ao abrir um rascunho novo. O profissional edita livremente.
// Um editor administrável de templates fica para uma entrega futura (YAGNI).
export const TEMPLATE_POR_TIPO: Record<TipoEvolucao, string> = {
  MEDICA:
    "Subjetivo:\n\nObjetivo (exame físico, intercorrências na sessão):\n\nAvaliação:\n\nConduta:\n",
  ENFERMAGEM:
    "Acesso (condição, punção):\n\nPeso pré/pós e intercorrências na sessão:\n\nCuidados prestados:\n\nObservações:\n",
  NUTRICAO:
    "Estado nutricional:\n\nIngestão / adesão à dieta:\n\nExames (albumina, fósforo, potássio):\n\nConduta nutricional:\n",
  PSICOLOGIA:
    "Demanda / queixa:\n\nEstado emocional:\n\nIntervenção realizada:\n\nEncaminhamentos:\n",
  SERVICO_SOCIAL:
    "Situação socioeconômica:\n\nRede de apoio / transporte:\n\nBenefícios e documentação:\n\nEncaminhamentos:\n",
};
