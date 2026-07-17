import { exigirUsuario } from "@/lib/auth/contexto";
import { sair } from "@/lib/auth/acoes";
import { rotuloPerfil, perfilPermitido, PERFIS_GESTAO } from "@/lib/perfis";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";
import Link from "next/link";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const ehGestao = perfilPermitido(usuario.perfil, PERFIS_GESTAO);
  const podeVerPacientes = perfilPermitido(usuario.perfil, PERFIS_LEITURA_PACIENTE);
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-slate-800">Nefrosys</Link>
          {podeVerPacientes && <Link href="/pacientes" className="text-sm text-slate-600 hover:underline">Pacientes</Link>}
          {ehGestao && <Link href="/usuarios" className="text-sm text-slate-600 hover:underline">Usuários</Link>}
          {ehGestao && <Link href="/auditoria" className="text-sm text-slate-600 hover:underline">Auditoria</Link>}
        </nav>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/conta" className="hover:underline">{usuario.nome} — {rotuloPerfil[usuario.perfil]}</Link>
          <form action={sair}>
            <button className="text-red-600 hover:underline">Sair</button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
