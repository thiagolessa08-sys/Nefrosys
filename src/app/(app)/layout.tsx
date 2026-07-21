import { exigirUsuario } from "@/lib/auth/contexto";
import { sair } from "@/lib/auth/acoes";
import { rotuloPerfil, perfilPermitido, PERFIS_GESTAO } from "@/lib/perfis";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";
import Link from "next/link";
import { NavLink } from "./nav-link";

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const ehGestao = perfilPermitido(usuario.perfil, PERFIS_GESTAO);
  const podeVerPacientes = perfilPermitido(usuario.perfil, PERFIS_LEITURA_PACIENTE);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-40 bg-primary-700 text-[#eaf4f2]">
        <div className="mx-auto flex h-[60px] max-w-[1360px] items-center gap-7 px-6">
          <Link href="/" className="flex items-center gap-[11px]" aria-label="Nefrosys — início">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-gradient-to-br from-[#18857e] to-[#0b5c57] shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dff3f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3C5 3 4 6 4 9c0 4 2 8 4 10 1-2 1-4 1-6" />
                <path d="M16 3c3 0 4 3 4 6 0 4-2 8-4 10-1-2-1-4-1-6" />
                <path d="M12 8v9" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-extrabold tracking-tight">Nefrosys</span>
              <span className="mt-[2px] text-[10.5px] font-medium tracking-wide text-[#9fc7c2]">
                Gestão de clínica de nefrologia
              </span>
            </span>
          </Link>

          <nav className="ml-2 flex gap-[2px]" aria-label="Principal">
            {podeVerPacientes && <NavLink href="/pacientes">Pacientes</NavLink>}
            {ehGestao && <NavLink href="/usuarios">Usuários</NavLink>}
            {ehGestao && <NavLink href="/auditoria">Auditoria</NavLink>}
          </nav>

          <div className="ml-auto flex items-center gap-[14px]">
            <Link
              href="/conta"
              className="flex items-center gap-[10px] rounded-full bg-white/[.08] py-[5px] pl-3 pr-[6px] transition-colors hover:bg-white/[.14]"
            >
              <span className="flex flex-col text-right leading-[1.15]">
                <span className="text-[13.5px] font-semibold">{usuario.nome}</span>
                <span className="text-[11px] text-[#a7cdc8]">{rotuloPerfil[usuario.perfil]}</span>
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#cfe6e2] text-[13px] font-bold text-primary-700">
                {iniciais(usuario.nome)}
              </span>
            </Link>
            <form action={sair}>
              <button
                title="Sair"
                aria-label="Sair"
                className="grid h-9 w-9 place-items-center rounded-[9px] text-[#cfe6e2] transition-colors hover:bg-white/10"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-6 pb-16 pt-[26px]">{children}</main>
    </div>
  );
}
