import Link from "next/link";

export default function PaginaSemPermissao() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold text-slate-800">Acesso negado</h1>
      <p className="text-slate-600">Seu perfil não tem permissão para acessar esta área.</p>
      <Link href="/" className="text-blue-700 hover:underline">Voltar ao início</Link>
    </main>
  );
}
