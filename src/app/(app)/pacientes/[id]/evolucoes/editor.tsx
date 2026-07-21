"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { acaoSalvarRascunho, acaoAssinar } from "./acoes";

type Estado = "salvo" | "salvando" | "erro" | "editando";

export function EditorRascunho({
  pacienteId,
  evolucaoId,
  textoInicial,
}: {
  pacienteId: string;
  evolucaoId: string;
  textoInicial: string;
}) {
  const [texto, setTexto] = useState(textoInicial);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [erro, setErro] = useState<string | null>(null);
  const [assinando, iniciarAssinatura] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function editar(novo: string) {
    setTexto(novo);
    setEstado("editando");
  }

  // Salvamento automático: 2s após parar de digitar. Não perde texto por queda de conexão.
  // O estado "editando" é marcado em editar() (no onChange), não aqui, para não chamar setState
  // de forma síncrona dentro do efeito.
  useEffect(() => {
    if (texto === textoInicial) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setEstado("salvando");
      const r = await acaoSalvarRascunho(evolucaoId, texto);
      if (r && "erro" in r) {
        setEstado("erro");
        setErro(r.erro);
      } else {
        setEstado("salvo");
        setErro(null);
      }
    }, 2000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [texto, textoInicial, evolucaoId]);

  const rotuloEstado =
    estado === "salvando"
      ? "Salvando..."
      : estado === "editando"
        ? "Editando..."
        : estado === "erro"
          ? "Falha ao salvar"
          : "Rascunho salvo";

  function assinar() {
    setErro(null);
    iniciarAssinatura(async () => {
      // salva o texto atual antes de assinar, para não assinar versão desatualizada
      await acaoSalvarRascunho(evolucaoId, texto);
      const r = await acaoAssinar(pacienteId, evolucaoId);
      if (r && "erro" in r) setErro(r.erro);
    });
  }

  const salvo = estado === "salvo";
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_3px_rgba(19,37,35,.05)]">
      <div className="flex items-center justify-between border-b border-line-2 p-[14px_20px]">
        <div className="flex items-center gap-[10px]">
          <span className="h-[9px] w-[9px] rounded-full bg-primary" />
          <h2 className="text-base font-bold">Rascunho da evolução</h2>
        </div>
        <span
          className={`flex items-center gap-[7px] text-[12.5px] font-semibold ${
            estado === "erro" ? "text-danger" : salvo ? "text-good" : "text-muted"
          }`}
        >
          {salvo && <span className="h-2 w-2 rounded-full bg-good" />}
          {rotuloEstado}
        </span>
      </div>
      <div className="p-[18px_20px]">
        <textarea
          value={texto}
          onChange={(e) => editar(e.target.value)}
          rows={16}
          className="w-full rounded-[11px] border border-line bg-surface-2 p-[14px] font-mono text-[14px] leading-relaxed focus:border-primary focus:bg-surface focus:outline-2 focus:outline-primary"
        />
        {erro && <p className="mt-2 text-sm font-medium text-danger">{erro}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="max-w-[400px] text-[12.5px] text-muted">
            Ao assinar, a evolução torna-se <strong>imutável</strong>. Correções posteriores são feitas por adendo.
          </p>
          <button
            onClick={assinar}
            disabled={assinando || !texto.trim()}
            className="ml-auto flex items-center gap-2 rounded-[9px] bg-primary px-5 py-[10px] text-sm font-bold text-white shadow-[0_1px_2px_rgba(11,92,87,.4)] hover:bg-primary-600 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {assinando ? "Assinando..." : "Assinar evolução"}
          </button>
        </div>
      </div>
    </div>
  );
}
