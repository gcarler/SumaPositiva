import { apiFetch } from "@/core/http/api-client";
import type { MesaDeTrabajo, SubMesa, EstadoMesa } from "@/features/mesas/models/mesas";
import { useMesasStore } from "@/features/mesas/state/mesas-store";

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
    facilitador: b.metadatos?.facilitador || b.facilitador || "Facilitador Institucional",
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
  try {
    const raw = await apiFetch<MesaBackendResponse[]>("/mesas");
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(normalizarMesaBackend);
    }
  } catch {
    // Si la API falla o no responde, fallback
  }
  return fallbackListarMesas();
}

/**
 * Obtiene los detalles completos de una mesa de trabajo por ID.
 */
export async function obtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  try {
    const raw = await apiFetch<MesaBackendResponse>(`/mesas/${mesaId}`);
    let submesas: SubMesa[] = [];
    try {
      const subsRaw = await apiFetch<SubMesaBackendResponse[]>(`/mesas/${mesaId}/submesas`);
      if (Array.isArray(subsRaw)) {
        submesas = subsRaw.map(normalizarSubMesa);
      }
    } catch {}
    let acuerdos = "";
    try {
      const acta = await apiFetch<ActaBackendResponse>(`/mesas/${mesaId}/acta`);
      acuerdos = (acta.acuerdos || []).map((a: { detalle: string }) => a.detalle).join("\n") || acta.resumen_deliberacion || "";
    } catch {}
    return normalizarMesaBackend({
      ...raw,
      submesas: submesas.length > 0 ? submesas : raw.submesas,
      metadatos: { ...raw.metadatos, acuerdos: acuerdos || raw.metadatos?.acuerdos },
    });
  } catch {
    return fallbackObtenerMesa(mesaId);
  }
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
  const shortId = Date.now().toString().slice(-4);
  const tipo = datos.tipoMesa || "TERRITORIAL";
  const body = {
    tipo_mesa: tipo,
    codigo_oficial: `MT-${Date.now().toString(36).toUpperCase()}`,
    shortcode_ciudadano: `M${shortId}`,
    nombre: datos.nombre,
    lugar_nombre: datos.lugar,
    fecha: datos.fecha,
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
  // 1. Crear en el store local inmediatamente
  const sub = useMesasStore.getState().crearSubMesa(mesaId, {
    nombre: datos.nombre,
    tema: datos.tema,
    participantes: datos.participantes ?? null,
  });
  if (!sub) return null;

  // 2. Intentar sincronizar con backend (fire and forget)
  try {
    await apiFetch(`/api/v1/mesas/${mesaId}/submesas`, {
      method: "POST",
      body: JSON.stringify({
        nombre: datos.nombre,
        tema: datos.tema,
        participantes: datos.participantes ?? null,
      }),
    });
  } catch {
    /* silencioso — el store local ya tiene los datos */
  }

  return sub;
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
 * Actualiza la submesa con el árbol.
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
  
  try {
    return await apiFetch<SubMesa>(`/mesas/${mesaId}/submesas/${subMesaId}`, {
      method: "PUT",
      body: subMesa,
      headers,
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      ((err as { status: number }).status === 409 || (err as { status: number }).status === 412)
    ) {
      throw err;
    }
    return subMesa;
  }
}

/**
 * Endpoints de instrumentos (papelografo)
 */
export async function listarInstrumentos(mesaId: string): Promise<InstrumentoBackendResponse[]> {
  return apiFetch<InstrumentoBackendResponse[]>(`/instrumentos?mesa_id=${mesaId}`);
}

export async function actualizarArbol(
  instrumentoId: string,
  arbol: Record<string, unknown>
): Promise<InstrumentoBackendResponse> {
  return apiFetch<InstrumentoBackendResponse>(`/instrumentos/${instrumentoId}/arbol`, {
    method: "PUT",
    body: arbol,
  });
}

export async function actualizarNodos(
  instrumentoId: string,
  nodos: { etag?: string; [key: string]: unknown }
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (nodos.etag) {
    headers["If-Match"] = nodos.etag;
  }

  try {
    return await apiFetch<unknown>(`/instrumentos/${instrumentoId}/nodos`, {
      method: "PUT",
      body: nodos,
      headers,
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      ((err as { status: number }).status === 409 || (err as { status: number }).status === 412)
    ) {
      throw err;
    }
    return nodos;
  }
}

export async function convertirAObjetivos(instrumentoId: string): Promise<InstrumentoBackendResponse> {
  return apiFetch<InstrumentoBackendResponse>(`/instrumentos/${instrumentoId}/convertir-a-objetivos`, {
    method: "POST",
  });
}

export async function fallbackListarMesas(): Promise<MesaDeTrabajo[]> {
  const storeMesas = useMesasStore.getState().mesas;
  return storeMesas || [];
}

export async function fallbackObtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  const mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
  if (!mesa) throw new Error(`Mesa ${mesaId} no encontrada`);
  return mesa;
}
