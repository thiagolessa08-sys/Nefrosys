import { FormularioLogin } from "./formulario";

export default function PaginaLogin() {
  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0a6b64] via-[#084b47] to-[#063936] p-[56px_60px] text-[#eaf4f2] md:flex">
        <div className="absolute -right-20 -top-10 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.10),transparent_70%)]" />
        <div className="relative flex items-center gap-[13px]">
          <span className="grid h-[46px] w-[46px] place-items-center rounded-xl bg-gradient-to-br from-[#18857e] to-[#0b5c57] shadow-[inset_0_0_0_1px_rgba(255,255,255,.16)]">
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#dff3f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3C5 3 4 6 4 9c0 4 2 8 4 10 1-2 1-4 1-6" />
              <path d="M16 3c3 0 4 3 4 6 0 4-2 8-4 10-1-2-1-4-1-6" />
              <path d="M12 8v9" />
            </svg>
          </span>
          <span className="text-2xl font-extrabold tracking-tight">Nefrosys</span>
        </div>
        <div className="relative">
          <h1 className="max-w-[15ch] font-serif text-[38px] font-medium leading-[1.15] tracking-tight">
            Gestão de clínica de nefrologia
          </h1>
          <p className="mt-4 max-w-[38ch] text-[15.5px] leading-[1.55] text-[#a7cdc8]">
            Prontuário eletrônico, evoluções multiprofissionais e trilha de auditoria em um só lugar.
          </p>
        </div>
        <p className="relative text-[12.5px] text-[#7fb3ad]">© 2026 Nefrosys · Ambiente seguro · LGPD</p>
      </div>

      <div className="flex items-center justify-center bg-canvas p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#18857e] to-[#0b5c57]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dff3f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3C5 3 4 6 4 9c0 4 2 8 4 10 1-2 1-4 1-6" />
                <path d="M16 3c3 0 4 3 4 6 0 4-2 8-4 10-1-2-1-4-1-6" />
                <path d="M12 8v9" />
              </svg>
            </span>
            <span className="text-xl font-extrabold tracking-tight text-ink">Nefrosys</span>
          </div>
          <h2 className="text-[22px] font-extrabold tracking-tight text-ink">Entrar</h2>
          <p className="mb-[26px] mt-1 text-sm text-muted">Acesse com suas credenciais institucionais.</p>
          <FormularioLogin />
          <p className="mt-5 text-center text-xs text-faint">Acesso restrito a profissionais autorizados.</p>
        </div>
      </div>
    </div>
  );
}
