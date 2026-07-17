// Cria (ou atualiza para DIRETOR) a conta de superusuário do dono da clínica.
// Idempotente. Rode: npx tsx scripts/criar-diretor.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.DIRETOR_EMAIL ?? "diretor@clinica.local";
  const senha = process.env.DIRETOR_SENHA ?? "Diretor#Trocar2026";
  const senhaHash = await bcrypt.hash(senha, 12);

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    await db.usuario.update({ where: { email }, data: { perfil: "DIRETOR", ativo: true } });
    console.log(`Conta ${email} atualizada para DIRETOR.`);
    return;
  }
  await db.usuario.create({
    data: { nome: "Diretor", email, senhaHash, perfil: "DIRETOR" },
  });
  console.log(`Diretor criado: ${email} (senha temporária: ${senha} — troque no primeiro acesso).`);
}

main().finally(() => db.$disconnect());
