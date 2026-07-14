import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@clinica.local";
  const senha = process.env.SEED_ADMIN_SENHA ?? "TroqueEstaSenha!123";
  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Administrador já existe: ${email}`);
    return;
  }
  await db.usuario.create({
    data: {
      nome: "Administrador",
      email,
      senhaHash: await bcrypt.hash(senha, 12),
      perfil: "ADMINISTRADOR",
    },
  });
  console.log(`Administrador criado: ${email} (troque a senha no primeiro acesso)`);
}

main().finally(() => db.$disconnect());
