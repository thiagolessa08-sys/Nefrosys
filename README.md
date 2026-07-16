# Nefrosys (novo)

Sistema de gestão para clínica de nefrologia/diálise. Fase 1 em construção —
veja `docs/superpowers/specs/` para o design e `docs/superpowers/plans/` para os planos.

## Requisitos

- Node.js 20+
- Um banco PostgreSQL acessível (usamos o **Railway** na nuvem). Não é necessário Docker.

## Primeira execução

```bash
cp .env.exemplo .env          # preencha DATABASE_URL com a DATABASE_PUBLIC_URL do Railway (database "railway")
npm install
npx prisma migrate deploy     # aplica as migrações no banco de desenvolvimento
npx prisma db seed            # cria admin@clinica.local (senha: TroqueEstaSenha!123)
npm run seed:demo             # (opcional) carrega 10 pacientes FICTÍCIOS para testar
npm run dev                   # http://localhost:3000
```

No primeiro acesso, entre como `admin@clinica.local` / `TroqueEstaSenha!123` e **troque a senha
imediatamente** em "Minha conta" (clique no seu nome no cabeçalho). A senha padrão está neste
README e no `prisma/seed.ts` — ou seja, é pública.

## Banco de dados

- **Desenvolvimento:** database `railway` (padrão do Railway), configurado em `.env` (`DATABASE_URL`).
- **Testes:** database `nefrosys_teste` na mesma instância, configurado em `.env.test`. Os testes
  apagam e recriam dados — **nunca** apontam para o banco de desenvolvimento.
- Nenhum arquivo `.env*` (exceto `.env.exemplo`) é versionado. A connection string contém senha.

O comando `npm run seed:demo` cria 10 pacientes fictícios (CPF/CNS gerados por algoritmo de dígito
verificador, sem correspondência com pessoas reais). É idempotente. **Nunca rode contra um banco com
dados reais.** A demo inclui acessos, sorologias, medicações e alergias em alguns pacientes, para
exercitar a tela de resumo e os filtros clínicos.

## Testes

```bash
npm test                      # aplica as migrações no banco de teste e executa o Vitest
```

Os testes rodam contra o PostgreSQL remoto (Railway), então dependem de rede e levam ~2 min.
Falhas esporádicas por conexão (`P1001`/`P1011`) costumam passar ao rodar de novo.

## Deploy no Railway

O deploy é feito a partir da branch `master` do GitHub. O serviço da aplicação e o PostgreSQL
ficam no mesmo projeto Railway.

**Variável obrigatória no serviço da aplicação:**

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |

Use essa referência ao serviço Postgres (URL **interna**), e não a `DATABASE_PUBLIC_URL` — o tráfego
fica dentro da rede do Railway, sem passar pela internet. Ajuste `Postgres` para o nome real do
serviço, se for diferente.

**O que acontece automaticamente:**

- No build: `postinstall` roda `prisma generate` (gera o client), depois `next build`.
- Na inicialização: `npm start` roda `prisma migrate deploy` (aplica migrações pendentes) e sobe o
  `next start`. A porta vem da variável `PORT` que o Railway define.

**Primeiro deploy:** crie o administrador rodando o seed uma vez contra o banco de produção
(`npx prisma db seed`, com `DATABASE_URL` apontando para ele) e **troque a senha em seguida**.

## Convenções

- Regras de negócio em `src/lib/**` como funções testáveis; páginas e server actions são camada fina.
- Toda ação clínica ou administrativa relevante gera evento em `EventoAuditoria` (somente-acréscimo).
- Identificadores de domínio em português.
- Autenticação própria: senha com bcrypt (custo 12), sessões opacas em banco (só o hash SHA-256 do
  token é armazenado), cookie httpOnly. Perfis de acesso: Administrador, Médico, Enfermagem, Técnico,
  Recepção, Multiprofissional.

## Estrutura

- `src/lib/auth/` — senha, sessão, autenticação, cookie, server actions e contexto do usuário.
- `src/lib/usuarios/` — serviço de gestão de usuários.
- `src/lib/auditoria.ts`, `src/lib/perfis.ts` — trilha de auditoria e perfis.
- `src/app/(app)/` — área autenticada (shell, início, usuários, auditoria).
- `src/app/login/`, `src/app/sem-permissao/` — rotas públicas.
- `prisma/` — esquema, migrações e seed.
