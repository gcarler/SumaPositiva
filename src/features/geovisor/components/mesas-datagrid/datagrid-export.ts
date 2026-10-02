import type { MesaGeovisor } from "../../services/mesas-geovisor-api";

function escaparCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '""';
  const texto = String(valor).replace(/"/g, '""');
  return `"${texto}"`;
}

/**
 * Genera y descarga un archivo CSV con la lista de mesas visible/filtrada en el DataGrid.
 * Incluye BOM UTF-8 para garantizar apertura correcta de tildes y caracteres especiales en Excel.
 */
export function exportarMesasCsv(mesas: MesaGeovisor[], nombreArchivo = "mesas_geovisor_cartagena.csv"): void {
  const encabezados = [
    "ID",
    "Nombre de la Mesa",
    "Estado",
    "Realizada",
    "Fecha",
    "Horario",
    "Territorio",
    "Código Territorio",
    "Asistentes Registrados",
    "Latitud Referencia",
    "Longitud Referencia",
    "Fotos Aprobadas",
  ];

  const filas = mesas.map((m) => [
    escaparCsv(m.id),
    escaparCsv(m.nombre),
    escaparCsv(m.estado),
    escaparCsv(m.realizada ? "Sí" : "No"),
    escaparCsv(m.fecha ?? "Sin fecha"),
    escaparCsv(m.horario ?? "Sin horario"),
    escaparCsv(m.territorio_nombre ?? "Sin territorio"),
    escaparCsv(m.territorio_codigo ?? "N/A"),
    escaparCsv(m.total_asistentes),
    escaparCsv(m.latitud_referencia ?? ""),
    escaparCsv(m.longitud_referencia ?? ""),
    escaparCsv(m.fotos.length),
  ]);

  const contenido = [
    encabezados.map((h) => `"${h}"`).join(";"),
    ...filas.map((f) => f.join(";")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.setAttribute("href", url);
  enlace.setAttribute("download", nombreArchivo);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/**
 * Copia el contenido tabular al portapapeles en formato TSV (compatible con pegar directamente en Google Sheets o Excel).
 */
export async function copiarMesasPortapapeles(mesas: MesaGeovisor[]): Promise<boolean> {
  try {
    const encabezados = ["ID", "Nombre", "Estado", "Fecha", "Territorio", "Asistentes"];
    const filas = mesas.map((m) => [
      m.id,
      m.nombre,
      m.realizada ? "Realizada" : "No realizada",
      m.fecha ?? "",
      m.territorio_nombre ?? "",
      m.total_asistentes,
    ]);

    const tsv = [
      encabezados.join("\t"),
      ...filas.map((f) => f.join("\t")),
    ].join("\n");

    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}
