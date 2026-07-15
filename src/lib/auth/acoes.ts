"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { autenticar } from "./autenticar";
import { criarSessao, invalidarSessao } from "./sessao";
import { COOKIE_SESSAO, opcoesCookieSessao } from "./cookie";

export type EstadoLogin = { erro: string } | undefined;

export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  if (!email.trim() || !senha) return { erro: "Informe e-mail e senha." };

  const usuario = await autenticar(email, senha);
  if (!usuario) return { erro: "E-mail ou senha inválidos." };

  const token = await criarSessao(usuario.id);
  (await cookies()).set(COOKIE_SESSAO, token, opcoesCookieSessao);
  redirect("/");
}

export async function sair(): Promise<void> {
  const armazem = await cookies();
  const token = armazem.get(COOKIE_SESSAO)?.value;
  if (token) await invalidarSessao(token);
  armazem.delete(COOKIE_SESSAO);
  redirect("/login");
}
