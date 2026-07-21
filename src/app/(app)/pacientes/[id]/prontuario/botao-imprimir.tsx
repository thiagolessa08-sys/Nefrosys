"use client";

export function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded-[9px] bg-primary px-4 py-2 text-sm font-bold text-white shadow-[0_1px_2px_rgba(11,92,87,.4)] hover:bg-primary-600"
    >
      Imprimir / Salvar PDF
    </button>
  );
}
