/**
 * Utilidades para detección y validación de coordenadas de mesas de trabajo.
 * Soporta Google Maps (múltiples formatos), OpenStreetMap, Waze y coordenadas planas.
 */

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface ResultadoValidacionCartagena {
  dentroDeCartagena: boolean;
  advertencia?: string;
}

// Perímetro aproximado del Distrito de Cartagena de Indias e Islas (Barú, Tierrabomba, Islas del Rosario)
export const CARTAGENA_BOUNDS = {
  minLat: 10.1,
  maxLat: 10.6,
  minLng: -75.8,
  maxLng: -75.3,
};

export const CENTRO_CARTAGENA: [number, number] = [-75.4794, 10.391]; // [lng, lat] para OpenLayers / EPSG:4326

/**
 * Detecta si una URL es un enlace corto conocido de mapas (Google Maps shortlinks, etc.).
 * Por seguridad (SSRF) no se permite resolución en servidor; la interfaz debe guiar al usuario.
 */
export function esEnlaceCorto(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim().toLowerCase();
  return (
    u.includes("maps.app.goo.gl") ||
    u.includes("goo.gl/maps") ||
    u.includes("bit.ly/") ||
    u.includes("tinyurl.com/") ||
    u.includes("t.co/")
  );
}

/**
 * Valida si la latitud y longitud están en rangos geográficos estándar WGS84.
 */
export function validarRangoWgs84(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Verifica si las coordenadas caen dentro de la caja de Cartagena.
 * Es una advertencia no bloqueante según requerimiento [MESA-UBIC-01].
 */
export function validarLimitesCartagena(lat: number, lng: number): ResultadoValidacionCartagena {
  if (!validarRangoWgs84(lat, lng)) {
    return {
      dentroDeCartagena: false,
      advertencia: "Coordenadas fuera del rango válido de latitud (-90..90) o longitud (-180..180).",
    };
  }

  const enCartagena =
    lat >= CARTAGENA_BOUNDS.minLat &&
    lat <= CARTAGENA_BOUNDS.maxLat &&
    lng >= CARTAGENA_BOUNDS.minLng &&
    lng <= CARTAGENA_BOUNDS.maxLng;

  if (!enCartagena) {
    return {
      dentroDeCartagena: false,
      advertencia: "Coordenadas fuera del Distrito de Cartagena (rango sugerido: lat 10.1–10.6, lng -75.8–-75.3).",
    };
  }

  return { dentroDeCartagena: true };
}

/**
 * Parsea coordenadas desde una URL de mapas:
 * - Google Maps: @lat,lng, !3dLAT!4dLNG, ?q=lat,lng, ll=lat,lng, query=lat,lng, destination=lat,lng
 * - OpenStreetMap: #map=zoom/lat/lon, mlat=LAT&mlon=LON
 * - Waze: ll=lat,lng
 */
export function parsearCoordenadasUrl(url: string): Coordenadas | null {
  if (!url || typeof url !== "string") return null;
  const limpia = url.trim();

  // Si es enlace corto, no contiene coordenadas en texto plano
  if (esEnlaceCorto(limpia)) return null;

  // 1. Google Maps data parameters: !3d10.39972!4d-75.51444
  const match3d4d = limpia.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
  if (match3d4d) {
    const lat = parseFloat(match3d4d[1]);
    const lng = parseFloat(match3d4d[2]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 2. Google Maps @lat,lng
  const matchArroba = limpia.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (matchArroba) {
    const lat = parseFloat(matchArroba[1]);
    const lng = parseFloat(matchArroba[2]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 3. Parámetro q=lat,lng o destination=lat,lng
  const matchQ = limpia.match(/[?&](?:q|destination|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (matchQ) {
    const lat = parseFloat(matchQ[1]);
    const lng = parseFloat(matchQ[2]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 4. Parámetro ll=lat,lng (Google Maps / Waze)
  const matchLl = limpia.match(/[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (matchLl) {
    const lat = parseFloat(matchLl[1]);
    const lng = parseFloat(matchLl[2]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 5. OpenStreetMap #map=zoom/lat/lon
  const matchOsmHash = limpia.match(/#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  if (matchOsmHash) {
    const lat = parseFloat(matchOsmHash[1]);
    const lng = parseFloat(matchOsmHash[2]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // 6. OpenStreetMap mlat & mlon
  const matchMlat = limpia.match(/[?&]mlat=(-?\d+(?:\.\d+)?)/);
  const matchMlon = limpia.match(/[?&]mlon=(-?\d+(?:\.\d+)?)/);
  if (matchMlat && matchMlon) {
    const lat = parseFloat(matchMlat[1]);
    const lng = parseFloat(matchMlon[2]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  return null;
}

/**
 * Parsea coordenadas desde texto plano:
 * Ejemplos aceptados:
 * - "10.39972, -75.51444"
 * - "10.39972; -75.51444"
 * - "10.39972 -75.51444"
 * - "lat: 10.39972, lng: -75.51444"
 */
export function parsearTextoCoordenadas(texto: string): Coordenadas | null {
  if (!texto || typeof texto !== "string") return null;
  const limpia = texto.trim();
  if (!limpia) return null;

  // Extraer patrones nombrados si existen (ej. lat: 10.39, lng: -75.5)
  const matchNombrado = limpia.match(/lat(?:itud)?[:\s=]+(-?\d+(?:\.\d+)?)[,\s;]+(?:lon|lng|longitud)?[:\s=]+(-?\d+(?:\.\d+)?)/i);
  if (matchNombrado) {
    const lat = parseFloat(matchNombrado[1]);
    const lng = parseFloat(matchNombrado[2]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // Separar por coma, punto y coma, o espacios consecutivos
  const partes = limpia
    .replace(/[;,\s]+/g, " ")
    .trim()
    .split(" ");

  if (partes.length === 2) {
    const lat = parseFloat(partes[0]);
    const lng = parseFloat(partes[1]);
    if (validarRangoWgs84(lat, lng)) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  return null;
}

/**
 * Genera la URL universal de navegación "Cómo llegar" para Google Maps.
 */
export function generarUrlComoLlegar(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
