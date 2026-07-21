// Classes e componentes visuais compartilhados do design clínico (paleta teal).
import type { ReactNode } from "react";

export const CARD =
  "rounded-[14px] border border-line bg-surface shadow-[0_1px_3px_rgba(19,37,35,.05)]";
export const CAMPO =
  "mt-1 w-full rounded-[9px] border border-line bg-surface-2 px-3 py-[9px] text-sm focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary";
export const ROTULO = "block text-[12.5px] font-semibold text-muted";
export const BTN_PRIMARIO =
  "rounded-[9px] bg-primary px-[18px] py-[10px] text-sm font-bold text-white shadow-[0_1px_2px_rgba(11,92,87,.4)] hover:bg-primary-600 disabled:opacity-50";
export const BTN_SECUNDARIO =
  "rounded-[9px] border border-line bg-surface px-[18px] py-[10px] text-sm font-semibold hover:border-muted";
export const TITULO_SECAO =
  "text-[13px] font-extrabold uppercase tracking-[.045em] text-muted";

// Card de seção com título discreto (usado na ficha, resumo etc.).
export function Secao({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${CARD} p-[20px_22px] ${className}`}>
      <div className="mb-[14px] flex items-center justify-between">
        <h3 className={TITULO_SECAO}>{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

// Card de seção com número (usado no cadastro em blocos).
export function SecaoNumerada({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className={`${CARD} mb-[18px] p-[22px_24px]`}>
      <div className="mb-[18px] flex items-center gap-[10px]">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-tint text-[13px] font-extrabold text-primary">
          {n}
        </span>
        <h2 className="text-base font-bold">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}
