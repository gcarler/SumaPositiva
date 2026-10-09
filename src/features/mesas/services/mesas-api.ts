import { apiFetch, setBearerToken } from "@/core/http/api-client";
import type { MesaDeTrabajo, SubMesa, EstadoMesa } from "@/features/mesas/models/mesas";
import { useMesasStore, type MesaInput } from "@/features/mesas/state/mesas-store";
import { useSesionStore } from "@/features/sesion/state/session-store";

function normalizarEstado(estado?: string): EstadoMesa {
  const e = (estado || "").toLowerCase();
  if (e === "finalizada" || e === "cerrada" || e === "acta_concertada") return "cerrada";
  if (e === "en_deliberacion" || e === "en_curso") return "en_curso";
  return "programada";
}

export interface SubMesaBackendResponse {
  id: string;
  nombre: string;
  tema?: string;
  participantes?: number | null;
  total_asistentes?: number | null;
  arbolProblemas?: SubMesa["arbolProblemas"];
  arbolSoluciones?: SubMesa["arbolSoluciones"];
  version_seq?: number;
  etag?: string;
  metadatos?: {
    tema?: string;
    [key: string]: unknown;
  };
}

export interface MesaBackendResponse {
  id: string;
  nombre: string;
  fecha?: string;
  lugar_nombre?: string;
  lugar?: string;
  entidad?: string;
  facilitador?: string;
  facilitador_id?: string | null;
  facilitador_nombre?: string | null;
  total_asistentes?: number | null;
  totalAsistentes?: number | null;
  aforo_maximo?: number;
  plenaria?: { acuerdos?: string };
  submesas?: SubMesaBackendResponse[];
  estado?: string;
  codigo_oficial?: string;
  shortcode_ciudadano?: string;
  tipo_mesa?: string;
  horario?: string;
  modalidad?: string;
  sha256_acta?: string;
  metadatos?: {
    lugar?: string;
    entidad?: string;
    facilitador?: string;
    acuerdos?: string;
    informe?: string;
    totalAsistentes?: number;
    [key: string]: unknown;
  };
}

export interface ActaBackendResponse {
  numero_acta?: string;
  resumen_deliberacion?: string;
  acuerdos?: Array<{ detalle: string }>;
  [key: string]: unknown;
}

export interface InstrumentoBackendResponse {
  id: string;
  mesa_id?: string;
  tipo?: string;
  arbol?: Record<string, unknown>;
  nodos?: Record<string, unknown>;
  etag?: string;
  [key: string]: unknown;
}

function normalizarSubMesa(s: SubMesaBackendResponse): SubMesa {
  return {
    id: s.id,
    nombre: s.nombre,
    tema: s.tema || s.metadatos?.tema || "",
    participantes: s.participantes ?? s.total_asistentes ?? null,
    arbolProblemas: s.arbolProblemas || {
      problemaCentral: "",
      causas: [],
      efectos: [],
    },
    arbolSoluciones: s.arbolSoluciones || {
      objetivoCentral: "",
      medios: [],
      fines: [],
    },
    version_seq: s.version_seq,
    etag: s.etag,
  };
}

export function normalizarMesaBackend(b: MesaBackendResponse): MesaDeTrabajo {
  const submesas = Array.isArray(b.submesas) ? b.submesas.map(normalizarSubMesa) : [];
  return {
    id: b.id,
    nombre: b.nombre,
    fecha: b.fecha ? (typeof b.fecha === "string" ? b.fecha.slice(0, 10) : new Date(b.fecha).toISOString().slice(0, 10)) : "2026-10-01",
    lugar: b.lugar_nombre || b.lugar || b.metadatos?.lugar || "Lugar por definir",
    entidad: b.metadatos?.entidad || b.entidad || (b.tipo_mesa ? `Mesa ${b.tipo_mesa}` : "Distrito de Cartagena"),
    facilitador: b.facilitador_nombre || b.metadatos?.facilitador || b.facilitador || "",
    totalAsistentes: b.total_asistentes ?? b.totalAsistentes ?? b.aforo_maximo ?? 0,
    plenaria: { acuerdos: b.plenaria?.acuerdos || (b.metadatos?.acuerdos as string | undefined) || "" },
    submesas,
    estado: normalizarEstado(b.estado),
    codigoOficial: b.codigo_oficial,
    shortcodeCiudadano: b.shortcode_ciudadano,
    tipoMesa: b.tipo_mesa,
    horario: b.horario,
    modalidad: b.modalidad,
    sha256Acta: b.sha256_acta,
  };
}

/**
 * Consulta el catálogo de mesas de trabajo disponibles.
 */
export async function listarMesas(): Promise<MesaDeTrabajo[]> {
  const raw = await apiFetch<MesaBackendResponse[]>("/mesas");
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  return raw.map(normalizarMesaBackend);
}

/**
 * Obtiene los detalles completos de una mesa de trabajo por ID.
 */
export async function obtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  const raw = await apiFetch<MesaBackendResponse>(`/mesas/${mesaId}`);
  let submesas: SubMesa[] = [];
  try {
    const subsRaw = await apiFetch<SubMesaBackendResponse[]>(`/mesas/${mesaId}/submesas`);
    if (Array.isArray(subsRaw)) {
      submesas = subsRaw.map(normalizarSubMesa);
    }
  } catch {
    // Si submesas falla de forma aislada, preservamos las que vengan en raw
  }
  let acuerdos = "";
  try {
    const acta = await apiFetch<ActaBackendResponse>(`/mesas/${mesaId}/acta`);
    acuerdos = (acta.acuerdos || []).map((a: { detalle: string }) => a.detalle).join("\n") || acta.resumen_deliberacion || "";
  } catch {
    // Si acta falla de forma aislada, preservamos los acuerdos en raw
  }
  return normalizarMesaBackend({
    ...raw,
    submesas: submesas.length > 0 ? submesas : raw.submesas,
    metadatos: { ...raw.metadatos, acuerdos: acuerdos || raw.metadatos?.acuerdos },
  });
}

/**
 * Crea una mesa en el backend remoto.
 */
export async function crearMesaRemota(datos: {
  nombre: string;
  entidad: string;
  fecha: string;
  lugar: string;
  facilitador: string;
  totalAsistentes?: number;
  tipoMesa?: string;
  horario?: string;
  modalidad?: string;
}): Promise<MesaDeTrabajo> {
  const sesion = useSesionStore.getState().sesion;
  if (sesion?.token) setBearerToken(sesion.token);

  const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
  const shortId = `${Date.now().toString(36).slice(-4).toUpperCase()}${entropy}`;
  const tipo = datos.tipoMesa || "TERRITORIAL";
  const body = {
    tipo_mesa: tipo,
    codigo_oficial: `MT-${Date.now().toString(36).toUpperCase()}-${entropy}`,
    shortcode_ciudadano: `M${shortId}`,
    nombre: datos.nombre,
    lugar_nombre: datos.lugar,
    fecha: datos.fecha && datos.fecha.trim() ? datos.fecha.trim() : null,
    horario: datos.horario || "8:00 am - 12:00 m",
    aforo_maximo: Number(datos.totalAsistentes) || 50,
    modalidad: datos.modalidad || "PRESENCIAL",
    estado: "PROGRAMADA",
    metadatos: {
      entidad: datos.entidad,
      facilitador: datos.facilitador,
      totalAsistentes: Number(datos.totalAsistentes) || 0,
    },
  };
  const resp = await apiFetch<MesaBackendResponse>("/mesas", {
    method: "POST",
    body,
  });
  return normalizarMesaBackend(resp);
}

/**
 * Actualiza los datos de una mesa en el backend remoto (PATCH /mesas/{mesa_id}).
 */
export async function actualizarMesaRemota(
  mesaId: string,
  datos: Partial<MesaInput>
): Promise<MesaDeTrabajo> {
  const sesion = useSesionStore.getState().sesion;
  if (sesion?.token) setBearerToken(sesion.token);

  const body: Record<string, unknown> = {};

  if (datos.nombre !== undefined) body.nombre = datos.nombre;
  if (datos.lugar !== undefined) {
    body.lugar = datos.lugar;
    body.lugar_nombre = datos.lugar;
  }
  if (datos.fecha !== undefined) body.fecha = datos.fecha;
  if (datos.horario !== undefined) body.horario = datos.horario;
  if (datos.aforo !== undefined) body.aforo_maximo = Number(datos.aforo);
  if (datos.totalAsistentes !== undefined) body.total_asistentes = Number(datos.totalAsistentes);
  if (datos.tipoMesa !== undefined) body.tipo_mesa = datos.tipoMesa;
  if (datos.entidad !== undefined) body.entidad_responsable = datos.entidad;
  if (datos.facilitador !== undefined) body.facilitador_principal = datos.facilitador;

  const metadatos: Record<string, unknown> = {};
  if (datos.entidad !== undefined) metadatos.entidad = datos.entidad;
  if (datos.facilitador !== undefined) metadatos.facilitador = datos.facilitador;
  if (datos.lugar !== undefined) metadatos.lugar = datos.lugar;
  if (datos.entidades !== undefined) metadatos.entidades = datos.entidades;
  if (datos.responsables !== undefined) metadatos.responsables = datos.responsables;
  if (datos.coordenadas !== undefined) metadatos.coordenadas = datos.coordenadas;
  if (datos.urlMapa !== undefined) metadatos.urlMapa = datos.urlMapa;
  if (datos.totalAsistentes !== undefined) metadatos.totalAsistentes = datos.totalAsistentes;
  if (datos.informe !== undefined) metadatos.informe = datos.informe;

  if (Object.keys(metadatos).length > 0) {
    body.metadatos = metadatos;
  }

  const resp = await apiFetch<MesaBackendResponse>(`/mesas/${mesaId}`, {
    method: "PATCH",
    body,
  });
  return normalizarMesaBackend(resp);
}

/**
 * Actualiza los acuerdos de plenaria de una mesa.
 */
export async function actualizarAcuerdosPlenaria(
  mesaId: string,
  acuerdos: string
): Promise<MesaDeTrabajo> {
  // Sincronizar inmediatamente en el store local
  useMesasStore.getState().setAcuerdosPlenaria(mesaId, acuerdos);

  try {
    await apiFetch<ActaBackendResponse>(`/mesas/${mesaId}/acta`, {
      method: "POST",
      body: {
        numero_acta: `ACTA-${mesaId.slice(0, 8)}`,
        resumen_deliberacion: "Acuerdos plenaria registrados vía panel web",
        acuerdos: [{ detalle: acuerdos }],
      },
    });
    return await obtenerMesa(mesaId);
  } catch (error) {
    const storeMesa = useMesasStore.getState().mesas.find((x) => x.id === mesaId);
    if (storeMesa) {
      return storeMesa;
    }
    throw error;
  }
}

/**
 * Actualiza el informe y relatoría final de una mesa.
 */
export async function actualizarInformeMesa(
  mesaId: string,
  informe: string
): Promise<MesaDeTrabajo> {
  // Sincronizar inmediatamente en el store local
  useMesasStore.getState().setInformeMesa(mesaId, informe);

  try {
    const resp = await apiFetch<MesaBackendResponse>(`/mesas/${mesaId}`, {
      method: "PATCH",
      body: { metadatos: { informe } },
    });
    return normalizarMesaBackend(resp);
  } catch (error) {
    const storeMesa = useMesasStore.getState().mesas.find((x) => x.id === mesaId);
    if (storeMesa) {
      return storeMesa;
    }
    throw error;
  }
}

/**
 * Crea una nueva submesa asociada a una mesa existente.
 */
export async function crearSubMesa(
  mesaId: string,
  datos: { nombre: string; tema: string; participantes?: number | null }
): Promise<SubMesa | null> {
  // 1. Persistir primero en backend; si falla, el error se propaga (sin retorno simulado)
  const creada = await apiFetch<{ id: string }>(`/api/v1/mesas/${mesaId}/submesas`, {
    method: "POST",
    body: JSON.stringify({
      nombre: datos.nombre,
      metadatos: { tema: datos.tema, participantes: datos.participantes ?? null },
    }),
  });

  // 2. Reflejar en el store local solo tras confirmación del servidor
  return useMesasStore.getState().crearSubMesa(mesaId, {
    id: creada.id,
    nombre: datos.nombre,
    tema: datos.tema,
    participantes: datos.participantes ?? null,
  });
}

/**
 * Obtiene las submesas de una mesa de trabajo.
 */
export async function listarSubmesas(mesaId: string): Promise<SubMesa[]> {
  try {
    return await apiFetch<SubMesa[]>(`/mesas/${mesaId}/submesas`);
  } catch {
    const storeMesa = useMesasStore.getState().mesas.find((x) => x.id === mesaId);
    return storeMesa ? storeMesa.submesas : [];
  }
}

/**
 * Persiste la submesa (nombre + contenido del papelógrafo en metadatos) en el backend.
 * Los errores (incluido 409/412) se propagan; nunca se devuelve un resultado simulado.
 */
export async function actualizarSubMesa(
  mesaId: string,
  subMesaId: string,
  subMesa: SubMesa
): Promise<SubMesa> {
  const headers: Record<string, string> = {};
  if (subMesa.etag) {
    headers["If-Match"] = subMesa.etag;
  }

  await apiFetch(`/mesas/${mesaId}/submesas/${subMesaId}`, {
    method: "PUT",
    body: {
      nombre: subMesa.nombre,
      metadatos: {
        tema: subMesa.tema,
        participantes: subMesa.participantes,
        arbolProblemas: subMesa.arbolProblemas,
        arbolSoluciones: subMesa.arbolSoluciones,
        matrizArbol: subMesa.matrizArbol ?? null,
      },
    },
    headers,
  });
  return subMesa;
}

/**
 * Endpoints de instrumentos (papelografo)
 */
export async function listarInstrumentos(mesaId: string): Promise<InstrumentoBackendResponse[]> {
  return apiFetch<InstrumentoBackendResponse[]>(`/instrumentos?mesa_id=${mesaId}`);
}

export async function convertirAObjetivos(instrumentoId: string): Promise<InstrumentoBackendResponse> {
  return apiFetch<InstrumentoBackendResponse>(`/instrumentos/${instrumentoId}/convertir-a-objetivos`, {
    method: "POST",
  });
}

/**
 * @deprecated Fallbacks erradicados en EDIT-15. ListarMesas y obtenerMesa propagan errores y usan colecciones canónicas.
 */
export async function fallbackListarMesas(): Promise<MesaDeTrabajo[]> {
  const storeMesas = useMesasStore.getState().mesas;
  return storeMesas || [];
}

/**
 * @deprecated Fallbacks erradicados en EDIT-15. ListarMesas y obtenerMesa propagan errores y usan colecciones canónicas.
 */
export async function fallbackObtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  const mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
  if (!mesa) throw new Error(`Mesa ${mesaId} no encontrada`);
  return mesa;
}
