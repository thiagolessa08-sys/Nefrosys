import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("infraestrutura", () => {
  it("conecta ao banco de teste", async () => {
    const resultado = await db.$queryRaw`SELECT 1 AS ok`;
    expect(resultado).toEqual([{ ok: 1 }]);
  });
});
