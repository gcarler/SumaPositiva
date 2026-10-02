import { apiFetch } from "@/core/http/api-client";
import type { MesaDeTrabajo, SubMesa, EstadoMesa } from "@/features/mesas/models/mesas";
import { useMesasStore } from "@/features/mesas/state/mesas-store";

function normalizarEstado(estado?: string): EstadoMesa {
  const e = (estado || "").toLowerCase();
  if (e === "finalizada" || e === "cerrada" || e === "acta_concertada") return "cerrada";
  if (e === "en_deliberacion" || e === "en_curso") return "en_curso";
  return "programada";
}

function normalizarSubMesa(s: any): SubMesa {
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

export function normalizarMesaBackend(b: any): MesaDeTrabajo {
  const submesas = Array.isArray(b.submesas) ? b.submesas.map(normalizarSubMesa) : [];
  return {
    id: b.id,
    nombre: b.nombre,
    fecha: b.fecha ? (typeof b.fecha === "string" ? b.fecha.slice(0, 10) : new Date(b.fecha).toISOString().slice(0, 10)) : "2026-10-01",
    lugar: b.lugar_nombre || b.lugar || b.metadatos?.lugar || "Lugar por definir",
    entidad: b.metadatos?.entidad || b.entidad || (b.tipo_mesa ? `Mesa ${b.tipo_mesa}` : "Distrito de Cartagena"),
    facilitador: b.metadatos?.facilitador || b.facilitador || "Facilitador Institucional",
    totalAsistentes: b.total_asistentes ?? b.totalAsistentes ?? b.aforo_maximo ?? 0,
    plenaria: b.plenaria || { acuerdos: b.metadatos?.acuerdos || "" },
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
    const raw = await apiFetch<any[]>("/mesas");
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
    const raw = await apiFetch<any>(`/mesas/${mesaId}`);
    let submesas: SubMesa[] = [];
    try {
      const subsRaw = await apiFetch<any[]>(`/mesas/${mesaId}/submesas`);
      if (Array.isArray(subsRaw)) {
        submesas = subsRaw.map(normalizarSubMesa);
      }
    } catch {}
    let acuerdos = "";
    try {
      const acta = await apiFetch<any>(`/mesas/${mesaId}/acta`);
      acuerdos = (acta.acuerdos || []).map((a: any) => a.detalle).join("\n") || acta.resumen_deliberacion || "";
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
  const resp = await apiFetch<any>("/mesas", {
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
    const resp = await apiFetch<any>(`/mesas/${mesaId}/acta`, {
      method: "POST",
      body: {
        numero_acta: `ACTA-${mesaId.slice(0, 8)}`,
        resumen_deliberacion: "Acuerdos plenaria registrados vía panel web",
        acuerdos: [{ detalle: acuerdos }],
      },
    });
    return normalizarMesaBackend(resp);
  } catch {
    const storeMesa = useMesasStore.getState().mesas.find((x) => x.id === mesaId);
    if (storeMesa) {
      return storeMesa;
    }
    const m = MESAS_MOCK.find((x) => x.id === mesaId);
    if (m) {
      m.plenaria.acuerdos = acuerdos;
      return m;
    }
    throw new Error("Mesa no encontrada");
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
    const resp = await apiFetch<any>(`/mesas/${mesaId}`, {
      method: "PATCH",
      body: { metadatos: { informe } },
    });
    return normalizarMesaBackend(resp);
  } catch {
    const storeMesa = useMesasStore.getState().mesas.find((x) => x.id === mesaId);
    if (storeMesa) {
      return storeMesa;
    }
    const m = MESAS_MOCK.find((x) => x.id === mesaId);
    if (m) {
      m.informe = informe;
      return m;
    }
    throw new Error("Mesa no encontrada");
  }
}

/**
 * Crea una nueva submesa asociada a una mesa existente.
 */
export async function crearSubMesa(
  mesaId: string,
  datos: { nombre: string; tema: string; participantes?: number | null }
): Promise<SubMesa> {
  const subLocal = useMesasStore.getState().crearSubMesa(mesaId, {
    nombre: datos.nombre,
    tema: datos.tema,
    participantes: datos.participantes ?? null,
  });

  try {
    const remota = await apiFetch<SubMesa>(`/mesas/${mesaId}/submesas`, {
      method: "POST",
      body: {
        slug: datos.nombre.toLowerCase().replace(/\s+/g, "-"),
        nombre: datos.nombre,
        tipo_mesa: "TEMATICA",
        codigo_oficial: `SUB-${mesaId.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
        shortcode_ciudadano: `SM-${Date.now().toString().slice(-3)}`,
        metadatos: { tema: datos.tema },
      },
    });
    return remota;
  } catch {
    if (subLocal) return subLocal;
    return {
      id: `submesa-${Date.now()}`,
      nombre: datos.nombre,
      tema: datos.tema,
      participantes: 0,
      arbolProblemas: {
        problemaCentral: "",
        causas: [],
        efectos: [],
      },
      arbolSoluciones: {
        objetivoCentral: "",
        medios: [],
        fines: [],
      },
    };
  }
}

/**
 * Obtiene las submesas de una mesa de trabajo.
 */
export async function listarSubmesas(mesaId: string): Promise<SubMesa[]> {
  try {
    return await apiFetch<SubMesa[]>(`/mesas/${mesaId}/submesas`);
  } catch {
    const m = MESAS_MOCK.find((x) => x.id === mesaId);
    return m ? m.submesas : [];
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
  } catch (err: any) {
    if (err.status === 409 || err.status === 412) {
      throw err;
    }
    return subMesa;
  }
}

/**
 * Endpoints de instrumentos (papelografo)
 */
export async function listarInstrumentos(mesaId: string) {
  return apiFetch<any[]>(`/instrumentos?mesa_id=${mesaId}`);
}

export async function actualizarArbol(instrumentoId: string, arbol: any) {
  return apiFetch<any>(`/instrumentos/${instrumentoId}/arbol`, {
    method: "PUT",
    body: arbol,
  });
}

export async function actualizarNodos(instrumentoId: string, nodos: any) {
  const headers: Record<string, string> = {};
  if (nodos.etag) {
    headers["If-Match"] = nodos.etag;
  }

  try {
    return await apiFetch<any>(`/instrumentos/${instrumentoId}/nodos`, {
      method: "PUT",
      body: nodos,
      headers,
    });
  } catch (err: any) {
    if (err.status === 409 || err.status === 412) {
      throw err;
    }
    return nodos;
  }
}

export async function convertirAObjetivos(instrumentoId: string) {
  return apiFetch<any>(`/instrumentos/${instrumentoId}/convertir-a-objetivos`, {
    method: "POST",
  });
}

// Simulador fallback en memoria si FastAPI no está disponible
import { MESAS_MOCK } from "@/features/mesas/data/mesas.mock";

export async function fallbackListarMesas(): Promise<MesaDeTrabajo[]> {
  const storeMesas = useMesasStore.getState().mesas;
  if (storeMesas && storeMesas.length > 0) return storeMesas;
  return MESAS_MOCK;
}

export async function fallbackObtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  const storeMesas = useMesasStore.getState().mesas;
  const fromStore = storeMesas.find((x) => x.id === mesaId);
  if (fromStore) return fromStore;
  const m = MESAS_MOCK.find((x) => x.id === mesaId);
  if (!m) throw new Error("Mesa no encontrada en mock");
  return m;
}
