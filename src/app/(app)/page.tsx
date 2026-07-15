import { exigirUsuario } from "@/lib/auth/contexto";

export default async function PaginaInicial() {
  const usuario = await exigirUsuario();
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-800">Bem-vindo(a), {usuario.nome}</h1>
      <p className="mt-2 text-slate-600">Os módulos de pacientes e prontuário chegam nas próximas entregas.</p>
    </div>
  );
}
