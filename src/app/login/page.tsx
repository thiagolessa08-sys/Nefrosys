import { FormularioLogin } from "./formulario";

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-1 text-center text-2xl font-semibold text-slate-800">Nefrosys</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Gestão de clínica de nefrologia</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
