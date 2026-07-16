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

  return (
    <div className="rounded bg-white p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Rascunho</h2>
        <span className={estado === "erro" ? "text-xs text-red-600" : "text-xs text-slate-400"}>
          {rotuloEstado}
        </span>
      </div>
      <textarea
        value={texto}
        onChange={(e) => editar(e.target.value)}
        rows={16}
        className="w-full rounded border border-slate-300 p-3 font-mono text-sm"
      />
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={assinar}
          disabled={assinando || !texto.trim()}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {assinando ? "Assinando..." : "Assinar evolução"}
        </button>
        <span className="text-xs text-slate-400">
          Assinar torna a evolução definitiva — depois, só adendos.
        </span>
      </div>
    </div>
  );
}
