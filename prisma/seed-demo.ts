// Carga de pacientes FICTÍCIOS para desenvolvimento e demonstração.
// Os CPFs e CNS foram gerados pelo algoritmo de dígito verificador: são válidos para o
// sistema e não correspondem a nenhuma pessoa real.
// Nunca rode isto contra um banco com dados reais de pacientes.
import { PrismaClient, type Prisma } from "@prisma/client";

const db = new PrismaClient();

// Tipo explícito: sem ele o TS infere uma união (uns têm CNS, outros não) e o Prisma reclama.
const PACIENTES: Prisma.PacienteCreateInput[] = [
  {
    nome: "Maria Aparecida Ribeiro", cpf: "52998224725", cns: "144082627300006",
    dataNascimento: new Date("1958-03-12"), sexo: "FEMININO",
    telefone: "(11) 98812-4400", bairro: "Santana", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "José Ribeiro", contatoEmergenciaTelefone: "(11) 98812-4401",
    tipoVinculo: "SUS",
    cidDoencaBase: "N18.5", dataInicioDialise: new Date("2019-06-03"),
    modalidade: "HEMODIALISE", situacao: "ATIVO",
  },
  {
    nome: "João Batista Nogueira", cpf: "16899535009", cns: "125869587950008",
    dataNascimento: new Date("1965-11-28"), sexo: "MASCULINO",
    telefone: "(11) 99630-2210", bairro: "Tatuapé", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "Cláudia Nogueira", contatoEmergenciaTelefone: "(11) 99630-2211",
    tipoVinculo: "CONVENIO", convenioNome: "Unimed", convenioMatricula: "0099887766",
    convenioValidade: new Date("2027-12-31"),
    cidDoencaBase: "E11.2", dataInicioDialise: new Date("2021-02-15"),
    modalidade: "HEMODIALISE", situacao: "ATIVO",
  },
  {
    nome: "Antônia Ferreira Lima", cpf: "23844285865",
    dataNascimento: new Date("1972-07-04"), sexo: "FEMININO",
    telefone: "(11) 97744-1180", bairro: "Ipiranga", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS",
    cidDoencaBase: "I12.0", dataInicioDialise: new Date("2022-09-20"),
    modalidade: "DIALISE_PERITONEAL", situacao: "ATIVO",
  },
  {
    nome: "Carlos Eduardo Prado", cpf: "35524040073",
    dataNascimento: new Date("1949-01-19"), sexo: "MASCULINO",
    telefone: "(11) 96521-7734", bairro: "Mooca", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "Beatriz Prado", contatoEmergenciaTelefone: "(11) 96521-7735",
    tipoVinculo: "SUS",
    cidDoencaBase: "N03.9", dataInicioDialise: new Date("2018-04-11"),
    modalidade: "HEMODIALISE", situacao: "ATIVO",
  },
  {
    nome: "Rosa Helena Martins", cpf: "88764842053",
    dataNascimento: new Date("1980-09-30"), sexo: "FEMININO",
    telefone: "(11) 95410-8890", bairro: "Pinheiros", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "CONVENIO", convenioNome: "Bradesco Saúde", convenioMatricula: "1122334455",
    convenioValidade: new Date("2026-11-30"),
    cidDoencaBase: "N18.4", dataInicioDialise: new Date("2023-01-09"),
    modalidade: "HEMODIALISE", situacao: "ATIVO",
  },
  {
    nome: "Sebastião Alves da Costa", cpf: "63017285057",
    dataNascimento: new Date("1954-12-05"), sexo: "MASCULINO",
    telefone: "(11) 94330-5567", bairro: "Penha", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS",
    cidDoencaBase: "N18.5", dataInicioDialise: new Date("2017-08-22"),
    modalidade: "HEMODIALISE", situacao: "TRANSPLANTADO",
  },
  {
    nome: "Luzia Gomes de Andrade", cpf: "40442820135",
    dataNascimento: new Date("1968-06-17"), sexo: "FEMININO",
    telefone: "(11) 93222-9901", bairro: "Butantã", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS",
    cidDoencaBase: "E11.2", dataInicioDialise: new Date("2020-10-30"),
    modalidade: "DIALISE_PERITONEAL", situacao: "ATIVO",
  },
  {
    nome: "Paulo Roberto Siqueira", cpf: "70830792856",
    dataNascimento: new Date("1961-04-23"), sexo: "MASCULINO",
    telefone: "(11) 92110-4432", bairro: "Lapa", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "CONVENIO", convenioNome: "SulAmérica", convenioMatricula: "5566778899",
    convenioValidade: new Date("2027-06-30"),
    cidDoencaBase: "I12.0", dataInicioDialise: new Date("2021-11-05"),
    modalidade: "HEMODIALISE", situacao: "TRANSFERIDO",
  },
  {
    nome: "Terezinha de Jesus Barros", cpf: "24985721042",
    dataNascimento: new Date("1945-08-08"), sexo: "FEMININO",
    telefone: "(11) 91887-3320", bairro: "Vila Mariana", cidade: "São Paulo", uf: "SP",
    contatoEmergenciaNome: "Marcos Barros", contatoEmergenciaTelefone: "(11) 91887-3321",
    tipoVinculo: "SUS",
    cidDoencaBase: "N18.5", dataInicioDialise: new Date("2016-02-14"),
    modalidade: "HEMODIALISE", situacao: "OBITO",
  },
  {
    nome: "Fernando Augusto Teixeira", cpf: "45317828791",
    dataNascimento: new Date("1988-02-11"), sexo: "MASCULINO",
    telefone: "(11) 90554-6678", bairro: "Santo Amaro", cidade: "São Paulo", uf: "SP",
    tipoVinculo: "SUS",
    cidDoencaBase: "N03.9", dataInicioDialise: new Date("2024-05-27"),
    modalidade: "HEMODIALISE", situacao: "EM_TRANSITO",
  },
];

async function main() {
  let criados = 0;
  const idPorCpf = new Map<string, string>();
  for (const p of PACIENTES) {
    const existente = await db.paciente.findUnique({ where: { cpf: p.cpf } });
    if (existente) {
      idPorCpf.set(p.cpf, existente.id);
      continue;
    }
    const novo = await db.paciente.create({ data: p });
    idPorCpf.set(p.cpf, novo.id);
    criados++;
  }

  // Dados clínicos só para pacientes recém-criados (idempotente: só quando criou tudo do zero).
  if (criados > 0) {
    const maria = idPorCpf.get("52998224725")!;
    const joao = idPorCpf.get("16899535009")!;
    const antonia = idPorCpf.get("23844285865")!;

    await db.acessoVascular.create({
      data: { pacienteId: maria, tipo: "FISTULA", localizacao: "MSE radiocefálica", dataConfeccao: new Date("2019-06-01") },
    });
    await db.acessoVascular.create({
      data: { pacienteId: joao, tipo: "CATETER", localizacao: "Jugular direita", dataConfeccao: new Date("2021-02-10") },
    });

    await db.sorologia.createMany({
      data: [
        { pacienteId: maria, tipo: "HBSAG", resultado: "NEGATIVO", dataExame: new Date("2024-01-10") },
        { pacienteId: maria, tipo: "ANTI_HCV", resultado: "NEGATIVO", dataExame: new Date("2024-01-10") },
        { pacienteId: maria, tipo: "HIV", resultado: "NEGATIVO", dataExame: new Date("2024-01-10") },
        { pacienteId: joao, tipo: "ANTI_HCV", resultado: "POSITIVO", dataExame: new Date("2023-08-01") },
      ],
    });

    await db.medicacao.createMany({
      data: [
        { pacienteId: maria, nome: "Losartana", dose: "50mg", posologia: "1x/dia" },
        { pacienteId: maria, nome: "Sevelamer", dose: "800mg", posologia: "3x/dia às refeições" },
        { pacienteId: joao, nome: "Eritropoetina", dose: "4000UI", posologia: "3x/semana" },
      ],
    });

    await db.alergia.create({ data: { pacienteId: antonia, descricao: "Penicilina" } });
  }

  const total = await db.paciente.count();
  console.log(`Demo: ${criados} paciente(s) criado(s). Total no banco: ${total}.`);
}

main().finally(() => db.$disconnect());
