import { apiFetch } from "@/core/http/api-client";
import type { MesaDeTrabajo, SubMesa } from "@/features/mesas/models/mesas";

/**
 * Consulta el catálogo de mesas de trabajo disponibles.
 */
export async function listarMesas(): Promise<MesaDeTrabajo[]> {
  return apiFetch<MesaDeTrabajo[]>("/mesas");
}

/**
 * Obtiene los detalles completos de una mesa de trabajo por ID.
 */
export async function obtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  return apiFetch<MesaDeTrabajo>(`/mesas/${mesaId}`);
}

/**
 * Actualiza los acuerdos de plenaria de una mesa.
 */
export async function actualizarAcuerdosPlenaria(
  mesaId: string,
  acuerdos: string
): Promise<MesaDeTrabajo> {
  try {
    return await apiFetch<MesaDeTrabajo>(`/mesas/${mesaId}/acta`, {
      method: "POST",
      body: {
        numero_acta: `ACTA-${mesaId.slice(0, 8)}`,
        resumen_deliberacion: "Acuerdos plenaria registrados vía panel web",
        acuerdos: [{ detalle: acuerdos }],
      },
    });
  } catch {
    const m = MESAS_MOCK.find((x) => x.id === mesaId);
    if (m) {
      m.plenaria.acuerdos = acuerdos;
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
  datos: { nombre: string; tema: string }
): Promise<SubMesa> {
  try {
    return await apiFetch<SubMesa>(`/mesas/${mesaId}/submesas`, {
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
  } catch {
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
  return MESAS_MOCK;
}

export async function fallbackObtenerMesa(mesaId: string): Promise<MesaDeTrabajo> {
  const m = MESAS_MOCK.find(x => x.id === mesaId);
  if (!m) throw new Error("Mesa no encontrada en mock");
  return m;
}
