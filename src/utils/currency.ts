import Decimal from "decimal.js";

// Configuración de precisión monetaria para Venezuela
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/**
 * Convierte un monto en USD a Bolívares usando la tasa BCV proporcionada.
 */
export function convertirUsdaVes(montoUsd: string | number, tasaBcv: string | number): string {
  try {
    const usd = new Decimal(montoUsd || 0);
    const tasa = new Decimal(tasaBcv || 0);
    if (usd.isZero() || tasa.isZero()) return "0.00";
    return usd.times(tasa).toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Formatea un monto en dólares para presentación visual ($ 12.50)
 */
export function formatoUSD(monto: string | number): string {
  try {
    const val = new Decimal(monto || 0);
    return `$${val.toFixed(2)}`;
  } catch {
    return "$0.00";
  }
}

/**
 * Formatea un monto en Bolívares con separadores locales (Bs. 1.250,50)
 */
export function formatoVES(monto: string | number): string {
  try {
    const num = Number(monto || 0);
    return `Bs. ${num.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return "Bs. 0,00";
  }
}

/**
 * Sanitiza cualquier valor numérico (reemplaza coma por punto y parsea con parseFloat).
 */
export function sanitizarNumero(
  valor: string | number | null | undefined,
  defaultValue: number = 0
): number {
  if (valor === null || valor === undefined || valor === "") {
    return defaultValue;
  }
  const str = valor.toString().trim().replace(/,/g, ".");
  const num = parseFloat(str);
  return isNaN(num) ? defaultValue : num;
}
