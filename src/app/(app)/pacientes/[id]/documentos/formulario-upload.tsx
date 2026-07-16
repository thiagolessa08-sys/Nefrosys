"use client";

import { useActionState } from "react";
import { acaoAnexar } from "./acoes";

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
    <form action={acao} className="flex flex-wrap items-end gap-3 rounded bg-white p-4 shadow-sm">
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <div>
        <label htmlFor="categoria" className="block text-sm font-medium text-slate-700">Categoria</label>
        <select id="categoria" name="categoria" className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm">
          {CATEGORIAS.map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="arquivo" className="block text-sm font-medium text-slate-700">
          Arquivo (PDF ou imagem, até 10 MB)
        </label>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept="application/pdf,image/*"
          required
          className="mt-1 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pendente ? "Enviando..." : "Anexar"}
      </button>
      {estado?.erro && <p className="w-full text-sm text-red-600">{estado.erro}</p>}
    </form>
  );
}
