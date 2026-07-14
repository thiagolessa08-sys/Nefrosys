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
npm run dev                   # http://localhost:3000
```

No primeiro acesso, entre como `admin@clinica.local` / `TroqueEstaSenha!123` e **troque a senha**
(a troca de senha pelo próprio usuário chega na próxima entrega; por ora, redefina via um outro
administrador ou pelo seed).

## Banco de dados

- **Desenvolvimento:** database `railway` (padrão do Railway), configurado em `.env` (`DATABASE_URL`).
- **Testes:** database `nefrosys_teste` na mesma instância, configurado em `.env.test`. Os testes
  apagam e recriam dados — **nunca** apontam para o banco de desenvolvimento.
- Nenhum arquivo `.env*` (exceto `.env.exemplo`) é versionado. A connection string contém senha.

## Testes

```bash
npm test                      # aplica as migrações no banco de teste e executa o Vitest
```

Os testes rodam contra o PostgreSQL remoto (Railway), então dependem de rede e levam ~2 min.
Falhas esporádicas por conexão (`P1001`/`P1011`) costumam passar ao rodar de novo.

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
