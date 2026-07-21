"use client";

import { useActionState } from "react";
import { acaoAnexar } from "./acoes";
import { CAMPO, ROTULO, BTN_PRIMARIO, CARD } from "@/lib/ui";

const CATEGORIAS = [
  ["LAUDO", "Laudo"],
  ["EXAME", "Exame"],
  ["TERMO", "Termo"],
  ["IDENTIDADE", "Identidade"],
  ["FOTO", "Foto"],
  ["OUTRO", "Outro"],
] as const;

export function FormularioUpload({ pacienteId }: { pacienteId: string }) {
  const [estado, acao, pendente] = useActionState(acaoAnexar, undefined);
  return (
    <form action={acao} className={`flex flex-wrap items-end gap-3 p-4 ${CARD}`}>
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <label>
        <span className={ROTULO}>Categoria</span>
        <select name="categoria" className={CAMPO}>
          {CATEGORIAS.map(([v, r]) => (
            <option key={v} value={v}>{r}</option>
          ))}
        </select>
      </label>
      <label className="flex-1">
        <span className={ROTULO}>Arquivo (PDF ou imagem, até 10 MB)</span>
        <input
          name="arquivo"
          type="file"
          accept="application/pdf,image/*"
          required
          className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-[8px] file:border-0 file:bg-primary-tint file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-[#d5e8e5]"
        />
      </label>
      <button type="submit" disabled={pendente} className={BTN_PRIMARIO}>
        {pendente ? "Enviando..." : "Anexar"}
      </button>
      {estado?.erro && <p className="w-full text-sm font-medium text-danger">{estado.erro}</p>}
    </form>
  );
}
