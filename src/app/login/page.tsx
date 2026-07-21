import { FormularioLogin } from "./formulario";

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#18857e] to-[#0b5c57] shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#dff3f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3C5 3 4 6 4 9c0 4 2 8 4 10 1-2 1-4 1-6" />
              <path d="M16 3c3 0 4 3 4 6 0 4-2 8-4 10-1-2-1-4-1-6" />
              <path d="M12 8v9" />
            </svg>
          </span>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Nefrosys</h1>
            <p className="text-sm text-muted">Gestão de clínica de nefrologia</p>
          </div>
        </div>
        <div className="rounded-[14px] border border-line bg-surface p-8 shadow-[0_1px_3px_rgba(19,37,35,.05)]">
          <FormularioLogin />
        </div>
      </div>
    </main>
  );
}
