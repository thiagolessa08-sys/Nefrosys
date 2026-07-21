import Link from "next/link";
import { exigirUsuario } from "@/lib/auth/contexto";
import { perfilPermitido, PERFIS_GESTAO } from "@/lib/perfis";
import { PERFIS_LEITURA_PACIENTE, PERFIS_CADASTRO_PACIENTE } from "@/lib/pacientes/permissoes";
import { podeEvoluir } from "@/lib/pacientes/evolucoes-perfis";
import { db } from "@/lib/db";
import { CARD } from "@/lib/ui";

function saudacao(): string {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function dataPorExtenso(): string {
  const s = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CARTAO =
  "text-left flex gap-[14px] items-start p-5 " +
  CARD +
  " hover:border-primary hover:shadow-[0_4px_14px_rgba(11,92,87,.12)] transition-shadow";

export default async function PaginaInicial() {
  const usuario = await exigirUsuario();
  const podeVerPacientes = perfilPermitido(usuario.perfil, PERFIS_LEITURA_PACIENTE);
  const ehGestao = perfilPermitido(usuario.perfil, PERFIS_GESTAO);
  const podeCadastrar = perfilPermitido(usuario.perfil, PERFIS_CADASTRO_PACIENTE);
  const podeAssinar = podeEvoluir(usuario.perfil);
  const primeiroNome = usuario.nome.split(" ")[0];

  const [totalPacientes, ativos, rascunhos, usuariosAtivos] = await Promise.all([
    podeVerPacientes ? db.paciente.count() : Promise.resolve(0),
    podeVerPacientes ? db.paciente.count({ where: { situacao: "ATIVO" } }) : Promise.resolve(0),
    podeAssinar
      ? db.evolucao.count({ where: { autorId: usuario.id, assinadaEm: null } })
      : Promise.resolve(0),
    ehGestao ? db.usuario.count({ where: { ativo: true } }) : Promise.resolve(0),
  ]);

  const indicadores: { rotulo: string; valor: number; nota: string; cor?: string }[] = [];
  if (podeVerPacientes) {
    indicadores.push({ rotulo: "Pacientes ativos", valor: ativos, nota: `${totalPacientes} no total` });
  }
  if (podeAssinar) {
    indicadores.push({
      rotulo: "Rascunhos a assinar",
      valor: rascunhos,
      nota: rascunhos > 0 ? "Aguardando assinatura" : "Nenhum pendente",
      cor: rascunhos > 0 ? "text-amber" : "text-good",
    });
  }
  if (ehGestao) {
    indicadores.push({ rotulo: "Usuários ativos", valor: usuariosAtivos, nota: "Com acesso ao sistema" });
  }

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[25px] font-extrabold tracking-tight">
          {saudacao()}, {primeiroNome}
        </h1>
        <p className="mt-[3px] text-sm text-muted">{dataPorExtenso()} · Nefrosys</p>
      </div>

      {indicadores.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {indicadores.map((ind) => (
            <div key={ind.rotulo} className={`${CARD} p-[18px_20px]`}>
              <div className="text-[13px] font-semibold text-muted">{ind.rotulo}</div>
              <div className="mt-[6px] text-[30px] font-extrabold tracking-tight">{ind.valor}</div>
              <div className={`mt-[2px] text-xs font-bold ${ind.cor ?? "text-muted"}`}>{ind.nota}</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[.04em] text-muted">Atalhos</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {podeVerPacientes && (
          <Link href="/pacientes" className={CARTAO}>
            <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[11px] bg-primary-tint text-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span>
              <span className="block text-[15.5px] font-bold text-ink">Pacientes</span>
              <span className="mt-[3px] block text-[13px] text-muted">Buscar, filtrar e abrir prontuários</span>
            </span>
          </Link>
        )}
        {podeCadastrar && (
          <Link href="/pacientes/novo" className={CARTAO}>
            <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[11px] bg-good-tint text-good">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
            </span>
            <span>
              <span className="block text-[15.5px] font-bold text-ink">Novo paciente</span>
              <span className="mt-[3px] block text-[13px] text-muted">Cadastrar um novo paciente</span>
            </span>
          </Link>
        )}
        {ehGestao && (
          <Link href="/auditoria" className={CARTAO}>
            <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[11px] bg-info-tint text-info">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 15h6M9 11h2" />
              </svg>
            </span>
            <span>
              <span className="block text-[15.5px] font-bold text-ink">Auditoria</span>
              <span className="mt-[3px] block text-[13px] text-muted">Trilha de eventos do sistema</span>
            </span>
          </Link>
        )}
        {ehGestao && (
          <Link href="/usuarios" className={CARTAO}>
            <span className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[11px] bg-primary-tint text-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span>
              <span className="block text-[15.5px] font-bold text-ink">Usuários</span>
              <span className="mt-[3px] block text-[13px] text-muted">Gerenciar contas e perfis</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
