import { describe, it, expect } from "vitest";
import { apenasDigitos, cpfValido, cnsValido, formatarCpf } from "@/lib/pacientes/documentos";

describe("apenasDigitos", () => {
  it("remove pontuação", () => {
    expect(apenasDigitos("529.982.247-25")).toBe("52998224725");
  });
});

describe("cpfValido", () => {
  it("aceita CPF válido com e sem pontuação", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(cpfValido("52998224724")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(cpfValido("11111111111")).toBe(false);
    expect(cpfValido("00000000000")).toBe(false);
  });

  it("rejeita tamanho diferente de 11", () => {
    expect(cpfValido("5299822472")).toBe(false);
    expect(cpfValido("")).toBe(false);
  });
});

describe("cnsValido", () => {
  it("aceita CNS válido (soma ponderada múltipla de 11)", () => {
    expect(cnsValido("144082627300006")).toBe(true);
  });

  it("rejeita CNS com checksum errado", () => {
    expect(cnsValido("144082627300005")).toBe(false);
  });

  it("rejeita tamanho diferente de 15", () => {
    expect(cnsValido("14408262730000")).toBe(false);
  });

  it("rejeita primeiro dígito inválido", () => {
    expect(cnsValido("344082627300004")).toBe(false);
  });
});

describe("formatarCpf", () => {
  it("formata com pontuação", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});
