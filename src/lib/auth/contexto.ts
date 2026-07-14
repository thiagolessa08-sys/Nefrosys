import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validarSessao } from "./sessao";
import { COOKIE_SESSAO } from "./cookie";
import { perfilPermitido } from "@/lib/perfis";
import type { Perfil, Usuario } from "@prisma/client";

export const obterUsuarioAtual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  return validarSessao(token);
});

export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function exigirPerfil(...perfis: Perfil[]): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (!perfilPermitido(usuario.perfil, perfis)) redirect("/sem-permissao");
  return usuario;
}
