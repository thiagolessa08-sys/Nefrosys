import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO } from "@/lib/auth/cookie";

const ROTAS_PUBLICAS = ["/login"];

export function middleware(pedido: NextRequest) {
  const publica = ROTAS_PUBLICAS.some((rota) => pedido.nextUrl.pathname.startsWith(rota));
  if (!publica && !pedido.cookies.has(COOKIE_SESSAO)) {
    return NextResponse.redirect(new URL("/login", pedido.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon\\.ico).*)"],
};
