"use client";

export function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
    >
      Imprimir / Salvar PDF
    </button>
  );
}
