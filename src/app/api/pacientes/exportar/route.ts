import ExcelJS from "exceljs";
import { exigirPerfil } from "@/lib/auth/contexto";
import { PERFIS_LEITURA_PACIENTE } from "@/lib/pacientes/permissoes";
import { buscarPacientes } from "@/lib/pacientes/busca";
import { linhasParaExcel, CABECALHO_EXCEL } from "@/lib/pacientes/exportacao";
import { registrarEvento } from "@/lib/auditoria";
import type { Modalidade, SituacaoPaciente, TipoVinculo } from "@prisma/client";

export async function GET(req: Request) {
  const usuario = await exigirPerfil(...PERFIS_LEITURA_PACIENTE);
  const url = new URL(req.url);

  const pacientes = await buscarPacientes({
    texto: url.searchParams.get("texto") ?? undefined,
    situacao: (url.searchParams.get("situacao") || undefined) as SituacaoPaciente | undefined,
    modalidade: (url.searchParams.get("modalidade") || undefined) as Modalidade | undefined,
    tipoVinculo: (url.searchParams.get("vinculo") || undefined) as TipoVinculo | undefined,
  });

  await registrarEvento({
    usuarioId: usuario.id,
    acao: "paciente.exportar_excel",
    detalhes: { resultados: pacientes.length },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Pacientes");
  ws.addRow(CABECALHO_EXCEL);
  ws.getRow(1).font = { bold: true };
  for (const linha of linhasParaExcel(pacientes)) ws.addRow(linha);
  ws.columns.forEach((c) => {
    c.width = 22;
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pacientes.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
