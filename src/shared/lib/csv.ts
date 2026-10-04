/**
 * Utilidades centralizadas y robustas para generación, sanitización y exportación de archivos CSV (AUD-12).
 * Protege contra inyección de fórmulas CSV (OWASP CSV / Spreadsheet Formula Injection).
 */

export type ValorCsv = unknown;

/**
 * Sanitiza una celda CSV escapando comillas dobles y neutralizando prefijos de inyección de fórmulas.
 * 
 * Regla de seguridad (OWASP):
 * Si el contenido comienza por '=', '+', '-', '@', '\t' o '\r' (incluso precedido por espacios en blanco),
 * se le antepone una comilla simple (') para forzar a los procesadores de hojas de cálculo
 * (Excel, LibreOffice, Google Sheets) a interpretarlo estrictamente como texto y no como fórmula ejecutable.
 */
export function sanitizarCsv(valor: unknown): string {
  if (valor === undefined || valor === null) {
    return '""';
  }

  let str = String(valor).replace(/"/g, '""');

  // Prevenir inyección de fórmulas CSV (prefijos peligrosos incluso tras espacios)
  if (/^[\s]*[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  return `"${str}"`;
}

/** Alias para compatibilidad e interoperabilidad */
export const escaparCsv = sanitizarCsv;

/**
 * Convierte un arreglo de celdas en una línea CSV válida.
 */
export function formatearFilaCsv(celdas: ValorCsv[], separador: string = ";"): string {
  return celdas.map((c) => sanitizarCsv(c)).join(separador);
}

/**
 * Genera el contenido completo de un CSV a partir de encabezados y matriz de filas.
 * Incluye opcionalmente la marca de orden de bytes BOM UTF-8 (\uFEFF) para compatibilidad con Excel.
 */
export function generarCsv(
  encabezados: string[],
  filas: ValorCsv[][],
  opciones?: {
    separador?: string;
    incluirBom?: boolean;
  }
): string {
  const separador = opciones?.separador ?? ";";
  const incluirBom = opciones?.incluirBom ?? true;

  const lineaEncabezados = encabezados.map((h) => sanitizarCsv(h)).join(separador);
  const lineasDatos = filas.map((fila) => formatearFilaCsv(fila, separador));

  const cuerpo = [lineaEncabezados, ...lineasDatos].join("\r\n");
  return incluirBom ? `\uFEFF${cuerpo}` : cuerpo;
}

/**
 * Desencadena la descarga de un archivo CSV en el navegador del cliente.
 */
export function descargarCsv(
  contenido: string,
  nombreArchivo: string = "exportacion.csv"
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.setAttribute("href", url);
  enlace.setAttribute("download", nombreArchivo);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
