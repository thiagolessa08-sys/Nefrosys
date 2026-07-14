export const COOKIE_SESSAO = "nefrosys_sessao";

export const opcoesCookieSessao = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 12 * 60 * 60, // acompanha a duração da sessão no banco
} as const;
