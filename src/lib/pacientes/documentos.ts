export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function digitoVerificadorCpf(digitos: string, pesoInicial: number): number {
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    soma += Number(digitos[i]) * (pesoInicial - i);
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // 111.111.111-11 passa no cálculo, mas não existe
  if (digitoVerificadorCpf(d.slice(0, 9), 10) !== Number(d[9])) return false;
  return digitoVerificadorCpf(d.slice(0, 10), 11) === Number(d[10]);
}

// CNS: soma dos 15 dígitos ponderados de 15 a 1 deve ser múltipla de 11.
// Primeiro dígito 1 ou 2 = CNS definitivo; 7, 8 ou 9 = provisório.
export function cnsValido(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length !== 15) return false;
  if (!/^[12789]/.test(d)) return false;
  let soma = 0;
  for (let i = 0; i < 15; i++) soma += Number(d[i]) * (15 - i);
  return soma % 11 === 0;
}

export function formatarCpf(valor: string): string {
  const d = apenasDigitos(valor);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
