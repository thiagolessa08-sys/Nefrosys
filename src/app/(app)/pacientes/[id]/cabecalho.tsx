"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Barra de contexto do paciente com abas, reutilizada nas telas do paciente.
export function CabecalhoPaciente({
  id,
  nome,
  situacao,
  situacaoClasse,
  meta,
  badges,
  temClinico,
}: {
  id: string;
  nome: string;
  situacao: string;
  situacaoClasse: string;
  meta: ReactNode;
  badges?: ReactNode;
  temClinico: boolean;
}) {
  const pathname = usePathname();
  const base = `/pacientes/${id}`;
  const abas = [
    { label: "Ficha", href: base, clinico: false },
    { label: "Resumo", href: `${base}/resumo`, clinico: true },
    { label: "Evoluções", href: `${base}/evolucoes`, clinico: true },
    { label: "Documentos", href: `${base}/documentos`, clinico: false },
    { label: "Prontuário", href: `${base}/prontuario`, clinico: true },
  ].filter((a) => a.clinico === false || temClinico);

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/pacientes" className="mt-[6px] flex items-center gap-[6px] text-[13px] font-semibold text-muted hover:text-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Pacientes
        </Link>
        <div className="mt-[2px] h-[34px] w-px bg-line" />
        <div className="min-w-[260px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-[23px] font-semibold tracking-tight">{nome}</h1>
            <span className={`rounded-md px-[9px] py-[3px] text-xs font-bold ${situacaoClasse}`}>{situacao}</span>
            {badges}
          </div>
          <div className="mt-[5px] flex flex-wrap gap-4 text-[13px] text-muted">{meta}</div>
        </div>
      </div>
      <nav className="mt-3 flex gap-1 border-b border-line" aria-label="Seções do paciente">
        {abas.map((a) => {
          const ativo = a.href === base ? pathname === base : pathname.startsWith(a.href);
          return (
            <Link
              key={a.href}
              href={a.href}
              aria-current={ativo ? "page" : undefined}
              className={`-mb-px border-b-[2.5px] px-[15px] pb-3 pt-[10px] text-sm font-semibold ${
                ativo ? "border-primary text-primary" : "border-transparent text-muted hover:text-primary"
              }`}
            >
              {a.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
