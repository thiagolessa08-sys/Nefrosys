import Link from "next/link";

export default function PaginaSemPermissao() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-tint text-danger">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </span>
      <h1 className="font-serif text-2xl font-semibold text-ink">Acesso negado</h1>
      <p className="text-muted">Seu perfil não tem permissão para acessar esta área.</p>
      <Link href="/" className="font-semibold text-primary hover:underline">Voltar ao início</Link>
    </main>
  );
}
