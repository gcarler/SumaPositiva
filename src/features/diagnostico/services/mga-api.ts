/**
 * POLIS — Servicio de Integración para Instrumentos MGA y Agente IA DNP
 * Conecta con /api/v1/instrumentos y /api/v1/ia/diagnostico.
 * Incluye motor de contingencia determinista DNP para pruebas y modo offline.
 */

import { apiFetch } from "@/core/http/api-client";
import { useSesionStore } from "@/features/sesion/state/session-store";
import type {
  InstrumentoMGA,
  ArbolMGARespuesta,
  NodoArbolMGA,
  NodoInstrumentoCrear,
  NodoInstrumentoActualizar,
  EntradaDiagnostico,
  ResultadoDiagnostico,
  ValidacionSintaxisNodo,
  TipoNodoMGA,
} from "../models/mga";
import {
  INSTRUMENTOS_MGA_CANONICOS,
  ARBOLES_CANONICOS,
} from "../data/mga-canonical.data";

// Vocabularios canónicos DNP
const PREFIJOS_SOLUCION_DISFRAZADA = [
  /^falta (de )?(un |una |unos |unas |el |la )?(cai|app|software|plataforma|camara|cámara|vehiculo|vehículo|patrulla|puente|hospital|colegio|sede)/i,
  /^necesidad (de )?(un |una |unos |unas |el |la )?(cai|app|software|camara|cámara|patrulla)/i,
  /^construir (un |una )/i,
  /^comprar (un |una |mas |más )/i,
  /^implementar (un |una )?(sistema|software|app)/i,
  /^crear (un |una )?(cai|app|software|plataforma)/i,
];

const SUSTANTIVOS_NEGATIVOS = [
  "elevado",
  "elevada",
  "alto",
  "alta",
  "deficiencia",
  "deficiente",
  "insuficiencia",
  "insuficiente",
  "carencia",
  "deterioro",
  "precario",
  "precaria",
  "precariedad",
  "incremento",
  "aumento",
  "baja",
  "bajo",
  "limitado",
  "limitada",
  "fragilidad",
  "vulnerabilidad",
  "inseguridad",
  "inadecuado",
  "inadecuada",
  "inexistencia",
  "desarticulacion",
  "desarticulación",
  "demoras",
  "siniestralidad",
  "desercion",
  "deserción",
  "desempleo",
  "pobreza",
  "hacinamiento",
  "persistencia",
  "vulneracion",
  "vulneración",
  "fractura",
  "conflicto",
  "conflictividad",
];

const VERBOS_INFINITIVO = [
  "reducir",
  "disminuir",
  "mitigar",
  "incrementar",
  "aumentar",
  "fortalecer",
  "mejorar",
  "optimizar",
  "garantizar",
  "promover",
  "consolidar",
  "articular",
  "ampliar",
  "expandir",
  "fomentar",
  "prevenir",
  "recuperar",
  "adecuar",
  "erradicar",
];

export function normalizarNodo(raw: Record<string, unknown>): NodoArbolMGA {
  const hijosRaw = Array.isArray(raw.hijos) ? raw.hijos : [];
  return {
    id: String(raw.id ?? ""),
    tipo_nodo: (raw.tipo_nodo as TipoNodoMGA) ?? "PROBLEMA_CENTRAL",
    tipo_relacion: String(raw.tipo_relacion ?? "CENTRAL"),
    nivel: Number(raw.nivel ?? 0),
    orden: Number(raw.orden ?? 0),
    contenido: String(raw.contenido ?? ""),
    nodo_padre_id: raw.nodo_padre_id ? String(raw.nodo_padre_id) : null,
    nodo_origen_id: raw.nodo_origen_id ? String(raw.nodo_origen_id) : null,
    metadatos: (raw.metadatos as Record<string, unknown>) ?? {},
    hijos: hijosRaw.map((h) => normalizarNodo(h as Record<string, unknown>)),
    version_seq: Number(raw.version_seq ?? 1),
    etag: raw.etag ? String(raw.etag) : null,
  };
}

export function normalizarInstrumento(raw: Record<string, unknown>): InstrumentoMGA {
  return {
    id: String(raw.id ?? ""),
    tipo_instrumento:
      (raw.tipo_instrumento as InstrumentoMGA["tipo_instrumento"]) ??
      "ARBOL_PROBLEMAS",
    nombre: String(raw.nombre ?? ""),
    descripcion: raw.descripcion ? String(raw.descripcion) : null,
    mesa_id: raw.mesa_id ? String(raw.mesa_id) : null,
    linea_id: raw.linea_id ? String(raw.linea_id) : null,
    estado:
      (raw.estado as InstrumentoMGA["estado"]) ?? "EN_CONSTRUCCION",
    metadatos: (raw.metadatos as Record<string, unknown>) ?? {},
    creado_en: raw.creado_en ? String(raw.creado_en) : undefined,
    actualizado_en: raw.actualizado_en ? String(raw.actualizado_en) : undefined,
    version_seq: Number(raw.version_seq ?? 1),
  };
}

export function normalizarArbol(raw: Record<string, unknown>): ArbolMGARespuesta {
  const instrumentoRaw = (raw.instrumento as Record<string, unknown>) ?? {};
  const centralRaw = raw.nodo_central as Record<string, unknown> | null;
  const causasRaw = Array.isArray(raw.causas_o_medios)
    ? raw.causas_o_medios
    : [];
  const efectosRaw = Array.isArray(raw.efectos_o_fines)
    ? raw.efectos_o_fines
    : [];

  return {
    instrumento: normalizarInstrumento(instrumentoRaw),
    nodo_central: centralRaw ? normalizarNodo(centralRaw) : null,
    causas_o_medios: causasRaw.map((c) =>
      normalizarNodo(c as Record<string, unknown>)
    ),
    efectos_o_fines: efectosRaw.map((e) =>
      normalizarNodo(e as Record<string, unknown>)
    ),
    total_nodos: Number(raw.total_nodos ?? 0),
  };
}

export async function obtenerInstrumentos(): Promise<InstrumentoMGA[]> {
  try {
    const raw = await apiFetch<Record<string, unknown>[]>("/instrumentos");
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(normalizarInstrumento);
    }
    return INSTRUMENTOS_MGA_CANONICOS;
  } catch (error) {
    console.warn(
      "Fallo al consultar /api/v1/instrumentos, utilizando catálogo MGA oficial:",
      error
    );
    return INSTRUMENTOS_MGA_CANONICOS;
  }
}

export async function obtenerArbol(
  instrumentoId: string
): Promise<ArbolMGARespuesta> {
  try {
    const raw = await apiFetch<Record<string, unknown>>(
      `/instrumentos/${instrumentoId}/arbol`
    );
    if (raw && raw.instrumento) {
      return normalizarArbol(raw);
    }
  } catch (error) {
    console.warn(
      `Fallo al consultar árbol para instrumento ${instrumentoId}:`,
      error
    );
  }

  if (ARBOLES_CANONICOS[instrumentoId]) {
    return ARBOLES_CANONICOS[instrumentoId];
  }

  // Fallback por defecto: ESCNNA Centro Histórico
  return ARBOLES_CANONICOS["01a0f682-524a-748c-ac6c-470d890927ea"];
}

/**
 * Validador sintáctico local determinista para contingencia y offline.
 */
export function validarSintaxisLocal(
  texto: string,
  tipo: TipoNodoMGA | string
): ValidacionSintaxisNodo {
  const t = texto.trim();
  const lower = t.toLowerCase();

  const esProblema =
    tipo.startsWith("PROBLEMA") ||
    tipo.startsWith("CAUSA") ||
    tipo.startsWith("EFECTO");

  if (esProblema) {
    const esSolucionDisfrazada = PREFIJOS_SOLUCION_DISFRAZADA.some((re) =>
      re.test(t)
    );

    if (esSolucionDisfrazada) {
      return {
        texto_original: t,
        cumple_sintaxis: false,
        tipo_nodo: tipo,
        sintaxis_esperada:
          "Sustantivo negativo describiendo una situación real insatisfactoria",
        texto_corregido_sugerido: t.replace(
          /^(falta de|necesidad de|construir|comprar|implementar|crear)\s*/i,
          "Déficit o insuficiencia en "
        ),
        observacion_metodologica:
          "ALERTA DNP: Se identificó una solución disfrazada ('falta de/construir'). Debe enunciarse el problema o carencia que afecta a la población.",
      };
    }

    const tieneSustantivoNegativo = SUSTANTIVOS_NEGATIVOS.some((palabra) =>
      lower.includes(palabra)
    );

    return {
      texto_original: t,
      cumple_sintaxis: tieneSustantivoNegativo,
      tipo_nodo: tipo,
      sintaxis_esperada:
        "Sustantivo negativo (ej: Deterioro, Insuficiencia, Alta prevalencia)",
      texto_corregido_sugerido: tieneSustantivoNegativo
        ? t
        : `Deficiencia o incremento en ${t.toLowerCase()}`,
      observacion_metodologica: tieneSustantivoNegativo
        ? "Cumple el estándar DNP de formulación de problema/causa en estado negativo."
        : "Recomendación DNP: Prefijar con un sustantivo negativo para delimitar el estado insatisfactorio.",
    };
  }

  // Objetivos / Medios / Fines
  const primeraPalabra = lower.split(/\s+/)[0] || "";
  const esInfinitivo =
    primeraPalabra.endsWith("ar") ||
    primeraPalabra.endsWith("er") ||
    primeraPalabra.endsWith("ir") ||
    VERBOS_INFINITIVO.includes(primeraPalabra);

  return {
    texto_original: t,
    cumple_sintaxis: esInfinitivo,
    tipo_nodo: tipo,
    sintaxis_esperada:
      "Verbo en infinitivo medible (ej: Reducir, Garantizar, Fortalecer)",
    texto_corregido_sugerido: esInfinitivo
      ? t
      : `Fortalecer o garantizar ${t.toLowerCase()}`,
    observacion_metodologica: esInfinitivo
      ? "Cumple directriz DNP: formulado con verbo en infinitivo propositivo."
      : "Ajuste DNP: Formular iniciando con verbo en infinitivo que indique la transformación.",
  };
}

/**
 * Generador determinista de diagnóstico de contingencia conforme a directrices DNP.
 */
export function generarDiagnosticoDeterminista(
  entrada: EntradaDiagnostico
): ResultadoDiagnostico {
  const analisis_sintaxis: ValidacionSintaxisNodo[] = [];

  // Analizar problema central
  analisis_sintaxis.push(
    validarSintaxisLocal(entrada.problema_central, "PROBLEMA_CENTRAL")
  );

  // Analizar causas directas
  entrada.causas_directas.forEach((c) => {
    analisis_sintaxis.push(validarSintaxisLocal(c, "CAUSA_DIRECTA"));
  });

  // Analizar causas indirectas
  entrada.causas_indirectas.forEach((c) => {
    analisis_sintaxis.push(validarSintaxisLocal(c, "CAUSA_INDIRECTA"));
  });

  // Analizar efectos directos
  entrada.efectos_directos.forEach((e) => {
    analisis_sintaxis.push(validarSintaxisLocal(e, "EFECTO_DIRECTO"));
  });

  // Analizar efectos indirectos
  entrada.efectos_indirectos.forEach((e) => {
    analisis_sintaxis.push(validarSintaxisLocal(e, "EFECTO_INDIRECTO"));
  });

  const totalNodos = analisis_sintaxis.length;
  const nodosValidos = analisis_sintaxis.filter((a) => a.cumple_sintaxis).length;
  const ratioSintaxis = totalNodos > 0 ? (nodosValidos / totalNodos) * 100 : 80;

  // Penalización si faltan causas o efectos
  let penalizacion = 0;
  if (entrada.causas_directas.length === 0) penalizacion += 20;
  if (entrada.efectos_directos.length === 0) penalizacion += 20;
  if (entrada.problema_central.trim().length < 15) penalizacion += 15;

  const puntaje_coherencia = Math.max(
    10,
    Math.min(100, Math.round(ratioSintaxis - penalizacion))
  );
  const es_valido = puntaje_coherencia >= 65;

  // Optimización de problema central
  const problemaVal = analisis_sintaxis[0];
  const problema_central_optimizado = problemaVal.cumple_sintaxis
    ? entrada.problema_central
    : problemaVal.texto_corregido_sugerido;

  // Derivación de objetivo central
  let objetivo_central_derivado = "Garantizar la transformación territorial";
  if (problema_central_optimizado) {
    const limpio = problema_central_optimizado
      .replace(
        /^(persistencia de|elevada|elevado|alto|alta|deficiencia de|insuficiencia de|precariedad de|deterioro de|vulneración de|incremento de|aumento de)\s*/i,
        ""
      )
      .trim();
    objetivo_central_derivado = `Reducir y mitigar la ${limpio}`;
  }

  const recomendaciones_dnp: string[] = [
    "Asegurar articulación directa entre causas indirectas y competencias de secretarías distritales según Ley 1617 de 2013.",
    "Verificar que ningún nodo formule compras de equipos o infraestructura física como causa raíz (evitar soluciones disfrazadas).",
    "Comprobar correspondencia biunívoca entre efectos directos e indicadores de resultado de la línea base DNP.",
    "Articular el objetivo central a la matriz plurianual de inversión y fuentes FONSET / SGP / ICLD.",
  ];

  return {
    evaluacion_id: `eval-${Date.now()}`,
    politica_id: entrada.politica_id ?? "pol-cartagena-2026",
    es_valido,
    puntaje_coherencia,
    analisis_sintaxis,
    problema_central_optimizado,
    objetivo_central_derivado,
    arbol_problemas_estructurado: {
      problema_central: problema_central_optimizado,
      causas_directas: entrada.causas_directas,
      causas_indirectas: entrada.causas_indirectas,
      efectos_directos: entrada.efectos_directos,
      efectos_indirectos: entrada.efectos_indirectos,
    },
    arbol_objetivos_derivado: {
      objetivo_central: objetivo_central_derivado,
      medios_directos: entrada.causas_directas.map((c) =>
        validarSintaxisLocal(c, "MEDIO_DIRECTO").texto_corregido_sugerido
      ),
      fines_directos: entrada.efectos_directos.map((e) =>
        validarSintaxisLocal(e, "FIN_DIRECTO").texto_corregido_sugerido
      ),
    },
    recomendaciones_dnp,
    resumen_ejecutivo: `Concepto Pericial DNP: La iniciativa '${entrada.titulo}' presenta un nivel de coherencia metodológica del ${puntaje_coherencia}%. ${
      es_valido
        ? "La estructura causal cumple con los lineamientos del Manual MGA / Marco Lógico del DNP para formulación de política pública distrital."
        : "Se detectaron inconsistencias sintácticas o vacíos en la cadena causal que requieren reformulación antes de la fase de diseño y viabilidad fiscal."
    }`,
  };
}

export async function evaluarDiagnosticoIA(
  entrada: EntradaDiagnostico
): Promise<ResultadoDiagnostico> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await apiFetch<ResultadoDiagnostico>("/ia/diagnostico", {
      method: "POST",
      body: entrada,
      headers,
    });
    if (res && typeof res.puntaje_coherencia === "number") {
      return res;
    }
  } catch (error) {
    console.warn(
      "Servicio /api/v1/ia/diagnostico no disponible o no autenticado, ejecutando motor causal determinista DNP:",
      error
    );
  }

  // Fallback determinista DNP
  return generarDiagnosticoDeterminista(entrada);
}

/**
 * Convierte un árbol de problemas a árbol de objetivos bajo metodología MGA DNP.
 * Despacha POST /api/v1/instrumentos/{instrumento_id}/convertir-a-objetivos.
 */
export async function convertirAObjetivos(
  instrumentoId: string,
  nombreObjetivos?: string
): Promise<ArbolMGARespuesta> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const body = nombreObjetivos ? { nombre_objetivos: nombreObjetivos } : {};
  const raw = await apiFetch<Record<string, unknown>>(
    `/instrumentos/${instrumentoId}/convertir-a-objetivos`,
    {
      method: "POST",
      body,
      headers,
    }
  );
  return normalizarArbol(raw);
}

/**
 * Agrega un nuevo nodo causal o medio/fin al árbol MGA.
 * Despacha POST /api/v1/instrumentos/{instrumento_id}/nodos.
 */
export async function agregarNodoArbol(
  instrumentoId: string,
  datos: NodoInstrumentoCrear
): Promise<NodoArbolMGA> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const raw = await apiFetch<Record<string, unknown>>(
    `/instrumentos/${instrumentoId}/nodos`,
    {
      method: "POST",
      body: datos,
      headers,
    }
  );
  return normalizarNodo(raw);
}

/**
 * Actualiza el contenido, tipo u orden de un nodo en el árbol MGA.
 * Despacha PUT /api/v1/instrumentos/{instrumento_id}/nodos/{nodo_id}.
 */
export async function actualizarNodoArbol(
  instrumentoId: string,
  nodoId: string,
  datos: NodoInstrumentoActualizar,
  ifMatch?: string
): Promise<NodoArbolMGA> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (ifMatch) {
    headers["If-Match"] = ifMatch;
  }

  const raw = await apiFetch<Record<string, unknown>>(
    `/instrumentos/${instrumentoId}/nodos/${nodoId}`,
    {
      method: "PUT",
      body: datos,
      headers,
    }
  );
  return normalizarNodo(raw);
}

/**
 * Elimina un nodo y sus dependientes del árbol MGA.
 * Despacha DELETE /api/v1/instrumentos/{instrumento_id}/nodos/{nodo_id}.
 */
export async function eliminarNodoArbol(
  instrumentoId: string,
  nodoId: string
): Promise<void> {
  const sesion = useSesionStore.getState().sesion;
  const token = sesion?.token;

  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  await apiFetch<void>(
    `/instrumentos/${instrumentoId}/nodos/${nodoId}`,
    {
      method: "DELETE",
      headers,
    }
  );
}
