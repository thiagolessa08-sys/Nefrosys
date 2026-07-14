# Design — Fase 1: Fundação + Pacientes/Prontuário

**Data:** 2026-07-14
**Status:** Aprovado em brainstorming, aguardando revisão final do spec
**Projeto:** Sistema de gestão para clínica de nefrologia/diálise (substituto do Nefrosys)

## 1. Contexto e objetivo

Clínica de nefrologia/diálise de grande porte (mais de 150 pacientes) que hoje opera com o
Nefrosys e quer substituí-lo por sistema próprio. Motivações: custo de licença, funcionalidades
faltantes, usabilidade/lentidão e independência de fornecedor.

O sistema completo cobrirá quatro domínios — pacientes/prontuário, sessões de hemodiálise,
exames laboratoriais e faturamento SUS/convênios — construídos em fases, cada fase com seu
próprio ciclo de design → plano → implementação:

| Fase | Escopo | Situação |
|------|--------|----------|
| 1 | Fundação + Pacientes/Prontuário | **este documento** |
| 2 | Sessões de hemodiálise (agenda de turnos/máquinas, prescrição, registro de sessão) | futura |
| 3 | Exames laboratoriais (resultados mensais, gráficos de evolução) | futura |
| 4 | Faturamento SUS (APAC/BPA) e convênios | futura |

Não há prazo rígido: o Nefrosys continua rodando em paralelo e cada módulo só vira oficial
quando a equipe confiar nele.

### Dores do Nefrosys que a Fase 1 precisa resolver

1. **Evoluções lentas/engessadas** — registrar evolução é demorado e o fluxo não se adapta à equipe.
2. **Falta de visão geral do paciente** — não existe um resumo único com acesso vascular, sorologias, medicações e últimas intercorrências.
3. **Busca e relatórios fracos** — difícil buscar por critérios clínicos ou extrair listas personalizadas.
4. **Anexos/documentos mal resolvidos** — guardar e encontrar documentos digitalizados é complicado.

## 2. Arquitetura geral

- **Aplicação web única (monolito modular)** em **Next.js (App Router) + TypeScript**.
  Frontend e backend no mesmo projeto; acesso via navegador, nada instalado nas máquinas da clínica.
- **PostgreSQL** como banco, com **Prisma** como ORM — esquema versionado em código, migrações
  automáticas e reversíveis.
- **Organização por módulos**: `pacientes/`, `prontuario/` agora; `sessoes/`, `exames/`,
  `faturamento/` nas fases futuras. Cada módulo com telas, regras e tabelas bem delimitadas.
- **Hospedagem em nuvem** com backup automático diário do banco (Railway, Render ou VPS —
  definido no plano de implementação; o código não fica amarrado a provedor).
- **Autenticação própria** com e-mail/senha e perfis de acesso (seção 4).

Justificativa: mantenedor solo (usuário + Claude), stack mainstream no Brasil para facilitar
contratação de manutenção futura, um único deploy e um único backup.

## 3. Modelo de dados

### 3.1 Cadastro do paciente (em blocos)

- **Identificação**: nome, CPF, CNS (Cartão SUS), data de nascimento, sexo, foto, contatos,
  endereço, contato de emergência.
- **Vínculo assistencial**: SUS ou convênio (qual, matrícula, validade) — estruturado já
  pensando no faturamento da Fase 4.
- **Dados nefrológicos**: doença de base (CID), data de início da diálise, modalidade
  (hemodiálise, diálise peritoneal), situação (ativo, transplantado, óbito, transferido,
  em trânsito) **com histórico de mudanças de situação** (data + motivo).

### 3.2 Dados clínicos vivos (com histórico, nunca campo único)

- **Acessos**: fístulas e cateteres — tipo, data de confecção/implante, localização, situação
  (em uso, perdido). O acesso atual aparece destacado no resumo do paciente.
- **Sorologias**: HBsAg, Anti-HCV, HIV — resultado + data de cada exame. Crítico em diálise
  porque define sala/máquina do paciente.
- **Medicações em uso** e **alergias**.

### 3.3 Evoluções

- Linha do tempo única por paciente com evoluções de médico, enfermagem, nutrição e
  psicologia/serviço social — cada uma etiquetada por tipo e autor.
- **Templates por tipo de evolução**, editáveis pelo profissional ao preencher — combate direto
  à dor nº 1.
- **Evolução assinada é imutável**: não pode ser editada nem apagada, apenas complementada com
  adendo (exigência de prontuário legal).
- **Rascunho com salvamento automático**: queda de conexão ou erro nunca perde texto digitado.

### 3.4 Documentos

- Upload de PDFs e imagens por paciente, organizados por categoria (laudos, termos de
  consentimento, exames externos, identidade), com busca por nome e categoria.

### 3.5 Resumo do paciente

Tela única — a primeira ao abrir qualquer paciente — com: identificação, situação, acesso
atual, sorologias, alergias, medicações e últimas evoluções. Resolve a dor nº 2.

### 3.6 Busca e listas

- Busca por nome, CPF ou CNS.
- Filtros clínicos combináveis: situação, modalidade, sorologia positiva, tipo de acesso,
  convênio.
- Exportação da lista filtrada para Excel. Resolve a dor nº 3.

## 4. Perfis de acesso, segurança e LGPD

### 4.1 Perfis (papéis iniciais, ajustáveis)

| Perfil | Acesso |
|--------|--------|
| Administrador | Usuários e configurações; **sem** conteúdo clínico por padrão |
| Médico | Prontuário completo; único que assina evolução médica |
| Enfermagem | Prontuário completo; assina evoluções de enfermagem |
| Técnico | Leitura do resumo do paciente; sem edição de prontuário (mais funções na Fase 2) |
| Recepção/Administrativo | Cadastro e dados demográficos/convênio; **sem** conteúdo clínico |
| Multiprofissional (nutrição, psicologia, serviço social) | Resumo do paciente + suas próprias evoluções |

Login individual obrigatório (e-mail/senha) — sem contas compartilhadas.

### 4.2 Auditoria

Toda visualização e alteração de dado clínico registra **quem, quando e o quê** (trilha de
auditoria imutável). Atende LGPD e normas do CFM.

### 4.3 Segurança técnica

- HTTPS obrigatório; hash de senha forte (bcrypt ou argon2); expiração de sessão por inatividade.
- Backup automático **diário e criptografado** do banco, retenção de 30 dias, com procedimento
  de restauração testado e documentado.
- Banco de dados nunca exposto à internet — apenas a aplicação acessa.

### 4.4 LGPD

- Dados de saúde são sensíveis (art. 11, LGPD); base legal: tutela da saúde.
- **Exportação do prontuário completo em PDF** por paciente — atende direito de acesso do
  titular, transferências e auditorias de convênio.
- Ambiente de desenvolvimento/teste usa exclusivamente dados fictícios.

## 5. Entregas incrementais da Fase 1

Cada entrega é utilizável e validável isoladamente:

1. **Fundação** — projeto configurado, login, gestão de usuários e perfis, trilha de auditoria.
2. **Cadastro de pacientes** — blocos de identificação, vínculo e dados nefrológicos + busca com filtros.
3. **Dados clínicos vivos** — acessos, sorologias, medicações, alergias + tela de resumo do paciente.
4. **Evoluções** — linha do tempo, templates por tipo, assinatura com imutabilidade e adendos.
5. **Documentos e exportações** — anexos por categoria, PDF do prontuário, exportação para Excel.

## 6. Testes e qualidade

- **TDD** para regras de negócio: permissões por perfil, imutabilidade de evolução assinada,
  histórico de situações, trilha de auditoria.
- Antes de cada entrega entrar em uso: validação com dados fictícios pelo responsável e por ao
  menos um usuário de cada perfil relevante (médico, enfermagem, recepção).

## 7. Tratamento de erros

- Mensagens de erro claras, em português, voltadas ao usuário final.
- Nenhum erro técnico descarta dado digitado (rascunhos com salvamento automático).
- Log estruturado de erros no servidor para diagnóstico.

## 8. Transição do Nefrosys

1. O sistema novo entra **em paralelo**, como "prontuário eletrônico melhorado"; sessões e
   faturamento seguem no Nefrosys.
2. Pacientes ativos são cadastrados no sistema novo — manualmente (pior caso) ou por importação,
   conforme o que for descoberto sobre exportação de dados com o fornecedor do Nefrosys.
   **Ação pendente do usuário:** verificar com o fornecedor quais exportações existem.
3. O módulo vira oficial apenas quando a equipe confiar nele; o Nefrosys permanece como consulta
   de histórico até as Fases 2–4 completarem a substituição.

## 9. Fora do escopo da Fase 1

Sessões de hemodiálise, exames laboratoriais, faturamento, agendamento de consultas, portal do
paciente, aplicativo móvel, modo offline/contingência local.
