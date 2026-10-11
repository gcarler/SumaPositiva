/**
 * POLIS — Módulo de Almacenamiento Local Robusto con IndexedDB (polis_offline_db)
 * Permite a facilitadores distritales en zonas rurales e insulares operar sin red.
 */

export type StoreName =
  | "asistencias_pendientes"
  | "propuestas_pendientes"
  | "actas_pendientes";

export interface AsistenciaPendiente {
  id: string;
  mesaId: string;
  datos: {
    nombre_completo: string;
    documento?: string;
    telefono?: string;
    correo?: string;
    organizacion_o_barrio?: string;
    rango_edad?: string;
    identidad_genero?: string;
    grupo_etnico?: string;
    es_victima?: boolean;
    es_discapacidad?: boolean;
    mesa_id?: string;
    [key: string]: unknown;
  };
  creadoEn: string;
  intentos: number;
  estado: "pendiente" | "error" | "sincronizado";
  ultimoError?: string;
}

export interface PropuestaPendiente {
  id: string;
  codigoProvisional: string;
  payload: {
    linea_id: string;
    titulo: string;
    descripcion: string;
    tipo_aporte?: string;
    autor_nombre?: string;
    es_anonimo?: boolean;
    metadatos?: Record<string, unknown>;
    [key: string]: unknown;
  };
  creadoEn: string;
  intentos: number;
  estado: "pendiente" | "error" | "sincronizado";
  ultimoError?: string;
}

export interface ActaPendiente {
  id: string;
  mesaId: string;
  acuerdos: string;
  creadoEn: string;
  intentos: number;
  estado: "pendiente" | "error" | "sincronizado";
  ultimoError?: string;
}

const DB_NAME = "polis_offline_db";
const DB_VERSION = 1;

// Memoria volátil de respaldo para entornos SSR o tests sin IndexedDB global
const memoriaFallback: Record<StoreName, Map<string, unknown>> = {
  asistencias_pendientes: new Map(),
  propuestas_pendientes: new Map(),
  actas_pendientes: new Map(),
};

/**
 * Abre o inicializa la base de datos IndexedDB local polis_offline_db.
 */
export function abrirDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("asistencias_pendientes")) {
        db.createObjectStore("asistencias_pendientes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("propuestas_pendientes")) {
        db.createObjectStore("propuestas_pendientes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("actas_pendientes")) {
        db.createObjectStore("actas_pendientes", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda o actualiza un registro en el object store indicado.
 */
export async function guardarPendiente<T extends { id: string }>(
  storeName: StoreName,
  item: T
): Promise<T> {
  const db = await abrirDB();
  if (!db) {
    memoriaFallback[storeName].set(item.id, item);
    return item;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(item);

    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lista todos los registros pendientes de un object store.
 */
export async function listarPendientes<T>(storeName: StoreName): Promise<T[]> {
  const db = await abrirDB();
  if (!db) {
    return Array.from(memoriaFallback[storeName].values()) as T[];
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();

    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Elimina un registro del store una vez sincronizado exitosamente con FastAPI.
 */
export async function eliminarPendiente(
  storeName: StoreName,
  id: string
): Promise<boolean> {
  const db = await abrirDB();
  if (!db) {
    return memoriaFallback[storeName].delete(id);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Cuenta los registros pendientes en un store específico.
 */
export async function contarPendientes(storeName: StoreName): Promise<number> {
  const db = await abrirDB();
  if (!db) {
    return memoriaFallback[storeName].size;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.count();

    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene el consolidado total de registros pendientes por sincronizar en todos los stores.
 */
export async function contarTotalPendientes(): Promise<number> {
  const [asistencias, propuestas, actas] = await Promise.all([
    contarPendientes("asistencias_pendientes"),
    contarPendientes("propuestas_pendientes"),
    contarPendientes("actas_pendientes"),
  ]);
  return asistencias + propuestas + actas;
}

/**
 * Incrementa el contador de reintentos y almacena el error ante fallo temporal de red.
 */
export async function registrarIntentoFallo(
  storeName: StoreName,
  id: string,
  errorMsg: string
): Promise<void> {
  const db = await abrirDB();
  if (!db) {
    const item = memoriaFallback[storeName].get(id) as
      | AsistenciaPendiente
      | PropuestaPendiente
      | undefined;
    if (item) {
      item.intentos = (item.intentos || 0) + 1;
      item.estado = "error";
      item.ultimoError = errorMsg;
      memoriaFallback[storeName].set(id, item);
    }
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.intentos = (item.intentos || 0) + 1;
        item.estado = "error";
        item.ultimoError = errorMsg;
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Limpia un store completo (usado en tests o tras sincronización total).
 */
export async function limpiarStore(storeName: StoreName): Promise<void> {
  const db = await abrirDB();
  if (!db) {
    memoriaFallback[storeName].clear();
    return;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
