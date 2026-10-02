import type { LineaPersistida } from "./lineas-api";
type Dimension = { id: string; codigo: string; nombre: string };
export function matrizPolitica(
  dimensiones: Dimension[],
  lineas: LineaPersistida[],
) {
  return {
    dimensiones: dimensiones.map((d) => ({
      ...d,
      lineas: lineas.filter((l) => l.dimension_id === d.id),
    })),
    sinDimension: lineas.filter(
      (l) => !dimensiones.some((d) => d.id === l.dimension_id),
    ),
  };
}
export function matrizCsv(dimensiones: Dimension[], lineas: LineaPersistida[]) {
  const encabezados = [
    "Dimensión",
    "Código línea",
    "Línea",
    "Fase ID",
    "Problema",
    "Objetivo",
    "Entidad líder",
    "Fuentes",
    "Costo COP",
    "Activa",
    "Código sublínea",
    "Sublínea",
    "Descripción sublínea",
    "Meta cuatrienal",
    "Indicador",
    "Corresponsable",
  ];
  const filas: unknown[][] = [encabezados];
  for (const d of [
    ...dimensiones,
    { id: "", codigo: "", nombre: "Sin dimensión (histórico)" },
  ]) {
    const ls = lineas.filter((l) =>
      d.id
        ? l.dimension_id === d.id
        : !dimensiones.some((x) => x.id === l.dimension_id),
    );
    if (!ls.length && d.id) filas.push([d.nombre]);
    for (const l of ls)
      for (const sub of l.sublineas.length ? l.sublineas : [null])
        filas.push([
          d.nombre,
          l.codigo,
          l.titulo,
          l.fase_id,
          l.problema_abordado,
          l.objetivo_especifico,
          l.entidad_lider,
          l.fuentes_financiacion.join("; "),
          l.costo_estimado,
          l.activa,
          sub?.codigo,
          sub?.titulo,
          sub?.descripcion,
          sub?.meta_cuatrienal,
          sub?.indicador_nombre,
          sub?.actor_coresponsable,
        ]);
  }
  return filas
    .map((f) =>
      Array.from({ length: encabezados.length }, (_, i) => {
        let s = String(f[i] ?? "");
        if (/^[\s]*[=+\-@]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
      }).join(","),
    )
    .join("\r\n");
}
export function descargarMatriz(texto: string, tipo: "csv" | "json") {
  const url = URL.createObjectURL(
    new Blob([tipo === "csv" ? "\uFEFF" + texto : texto], {
      type: tipo === "csv" ? "text/csv;charset=utf-8" : "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `arquitectura-politica.${tipo}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
