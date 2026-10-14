import math
import re
import unicodedata
import uuid
from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException, status

from app.modules.geodatos.models import CapaGeovisor, Territorio
from app.modules.geodatos.repository import GeodatosRepository
from app.modules.geodatos.schemas import (
    CoordenadasAproximadas,
    DireccionEstandarizadaResponse,
    ExploradorHurtosResponse,
    HurtosFeatureCollection,
    IsocronaFeature,
    IsocronaProperties,
    IsocronasFeatureCollection,
    NodoCercanoRead,
    ResumenHurtosResponse,
)

BARRIOS_COORD_MAP: dict[str, dict] = {
    "pie de la popa": {"lat": 10.4167, "lon": -75.5333, "loc": "LOC-1", "nombre": "Pie de la Popa"},
    "popa": {"lat": 10.4167, "lon": -75.5333, "loc": "LOC-1", "nombre": "Pie de la Popa"},
    "bocagrande": {"lat": 10.4000, "lon": -75.5550, "loc": "LOC-1", "nombre": "Bocagrande"},
    "castillogrande": {"lat": 10.3920, "lon": -75.5530, "loc": "LOC-1", "nombre": "Castillogrande"},
    "el laguito": {"lat": 10.3950, "lon": -75.5600, "loc": "LOC-1", "nombre": "El Laguito"},
    "manga": {"lat": 10.4110, "lon": -75.5350, "loc": "LOC-1", "nombre": "Manga"},
    "san diego": {"lat": 10.4260, "lon": -75.5480, "loc": "LOC-1", "nombre": "San Diego"},
    "centro": {"lat": 10.4239, "lon": -75.5510, "codigo": "BARRIO-CENTRO", "nombre": "Centro"},
    "centro historico": {"lat": 10.4239, "lon": -75.5510, "codigo": "BARRIO-CENTRO", "nombre": "Centro Histórico"},
    "getsemani": {"lat": 10.4210, "lon": -75.5459, "codigo": "BARRIO-GETSEMANI", "nombre": "Getsemaní"},
    "san francisco": {"lat": 10.4350, "lon": -75.5180, "loc": "LOC-1", "nombre": "San Francisco"},
    "crespo": {"lat": 10.4480, "lon": -75.5180, "loc": "LOC-1", "nombre": "Crespo"},
    "marbella": {"lat": 10.4370, "lon": -75.5300, "loc": "LOC-1", "nombre": "Marbella"},
    "torices": {"lat": 10.4320, "lon": -75.5260, "loc": "LOC-1", "nombre": "Torices"},
    "fredonia": {"lat": 10.4020, "lon": -75.4780, "loc": "LOC-2", "nombre": "Fredonia"},
    "boston": {"lat": 10.4210, "lon": -75.5100, "loc": "LOC-2", "nombre": "Boston"},
    "la esperanza": {"lat": 10.4260, "lon": -75.5080, "loc": "LOC-2", "nombre": "La Esperanza"},
    "la candelaria": {"lat": 10.4240, "lon": -75.5020, "loc": "LOC-2", "nombre": "La Candelaria"},
    "la maria": {"lat": 10.4310, "lon": -75.5040, "loc": "LOC-2", "nombre": "La María"},
    "olaya herrera": {"lat": 10.4141, "lon": -75.4922, "codigo": "BARRIO-OLAYA", "nombre": "Olaya Herrera"},
    "olaya": {"lat": 10.4141, "lon": -75.4922, "codigo": "BARRIO-OLAYA", "nombre": "Olaya Herrera"},
    "el pozon": {"lat": 10.4118, "lon": -75.4595, "codigo": "BARRIO-POZON", "nombre": "El Pozón"},
    "pozon": {"lat": 10.4118, "lon": -75.4595, "codigo": "BARRIO-POZON", "nombre": "El Pozón"},
    "nelson mandela": {"lat": 10.3648, "lon": -75.4789, "codigo": "BARRIO-MANDELA", "nombre": "Nelson Mandela"},
    "mandela": {"lat": 10.3648, "lon": -75.4789, "codigo": "BARRIO-MANDELA", "nombre": "Nelson Mandela"},
    "san jose de los campanos": {"lat": 10.3680, "lon": -75.4650, "loc": "LOC-3", "nombre": "San José de los Campanos"},
    "la boquilla": {"lat": 10.4778, "lon": -75.4690, "codigo": "CORR-BOQUILLA", "nombre": "La Boquilla"},
    "pasacaballos": {"lat": 10.2750, "lon": -75.4944, "codigo": "CORR-PASACABALLOS", "nombre": "Pasacaballos"},
    "bayunca": {"lat": 10.5066, "lon": -75.4160, "codigo": "CORR-BAYUNCA", "nombre": "Bayunca"},
    "baru": {"lat": 10.1815, "lon": -75.6400, "codigo": "INS-BARU", "nombre": "Isla de Barú"},
    "isla de baru": {"lat": 10.1815, "lon": -75.6400, "codigo": "INS-BARU", "nombre": "Isla de Barú"},
    "tierra bomba": {"lat": 10.3634, "lon": -75.5640, "codigo": "INS-TIERRABOMBA", "nombre": "Isla de Tierra Bomba"},
    "islas del rosario": {"lat": 10.1738, "lon": -75.7543, "codigo": "INS-ROSARIO", "nombre": "Archipiélago de Nuestra Señora del Rosario"},
}

NODOS_SEGURIDAD_HUMANA: list[dict[str, Any]] = [
    # CAIs y Estaciones de Policía (Seguridad)
    {
        "nombre": "CAI Olaya Herrera",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.4135,
        "longitud": -75.4940,
        "direccion": "Avenida Pedro Romero, Sector Central",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "CAI El Pozón",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.4120,
        "longitud": -75.4610,
        "direccion": "Carrera 88 # Calle 58, El Pozón",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "CAI Nelson Mandela",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.3860,
        "longitud": -75.4790,
        "direccion": "Sector Las Colinas, Nelson Mandela",
        "localidad": "Localidad 3: Industrial y de la Bahía",
    },
    {
        "nombre": "CAI Bocagrande",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.3980,
        "longitud": -75.5560,
        "direccion": "Carrera 2 con Calle 10, Bocagrande",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    {
        "nombre": "CAI Manga",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.4125,
        "longitud": -75.5345,
        "direccion": "Calle Real # Avenida Miramar, Manga",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    {
        "nombre": "CAI San Francisco",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.4350,
        "longitud": -75.5080,
        "direccion": "Sector La María, San Francisco",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    {
        "nombre": "CAI Los Ejecutivos",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.4030,
        "longitud": -75.5090,
        "direccion": "Avenida Pedro de Heredia, Los Ejecutivos",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "CAI Fredonia",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.4020,
        "longitud": -75.4850,
        "direccion": "Sector Fredonia con Isla de León",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "CAI La Boquilla",
        "tipo": "seguridad",
        "subtipo": "cai",
        "latitud": 10.4720,
        "longitud": -75.4980,
        "direccion": "Entrada Principal, La Boquilla",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    {
        "nombre": "Estación de Policía Caribe Norte",
        "tipo": "seguridad",
        "subtipo": "estacion_policia",
        "latitud": 10.4225,
        "longitud": -75.5510,
        "direccion": "Centro Histórico, Calle Cuartel",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    {
        "nombre": "Estación de Policía Virgen y Turística",
        "tipo": "seguridad",
        "subtipo": "estacion_policia",
        "latitud": 10.4070,
        "longitud": -75.5020,
        "direccion": "Chiquinquirá con Avenida Pedro Romero",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "Estación de Policía Pasacaballos",
        "tipo": "seguridad",
        "subtipo": "estacion_policia",
        "latitud": 10.2980,
        "longitud": -75.5120,
        "direccion": "Sector Vía Mamonal, Pasacaballos",
        "localidad": "Localidad 3: Industrial y de la Bahía",
    },
    # Salud y Emergencias
    {
        "nombre": "Hospital Universitario del Caribe",
        "tipo": "salud",
        "subtipo": "hospital",
        "latitud": 10.3980,
        "longitud": -75.5120,
        "direccion": "Zarzagocilla, Calle 29",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "CAP Olaya Herrera",
        "tipo": "salud",
        "subtipo": "centro_atencion_prioritaria",
        "latitud": 10.4150,
        "longitud": -75.4920,
        "direccion": "Sector Ricaurte, Olaya Herrera",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "CAP El Pozón",
        "tipo": "salud",
        "subtipo": "centro_atencion_prioritaria",
        "latitud": 10.4105,
        "longitud": -75.4600,
        "direccion": "Sector Central, El Pozón",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "CAP Nelson Mandela",
        "tipo": "salud",
        "subtipo": "centro_atencion_prioritaria",
        "latitud": 10.3880,
        "longitud": -75.4760,
        "direccion": "Sector El Trébol, Nelson Mandela",
        "localidad": "Localidad 3: Industrial y de la Bahía",
    },
    {
        "nombre": "Hospital Infantil Napoleón Franco Pareja",
        "tipo": "salud",
        "subtipo": "hospital",
        "latitud": 10.4140,
        "longitud": -75.5280,
        "direccion": "Pie de la Popa, Calle Real",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    {
        "nombre": "CAP Canapote",
        "tipo": "salud",
        "subtipo": "centro_atencion_prioritaria",
        "latitud": 10.4380,
        "longitud": -75.5190,
        "direccion": "Calle 60, Canapote",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    # Justicia y Convivencia
    {
        "nombre": "Casa de Justicia Chiquinquirá",
        "tipo": "justicia",
        "subtipo": "casa_justicia",
        "latitud": 10.4060,
        "longitud": -75.5040,
        "direccion": "Avenida Pedro de Heredia, Chiquinquirá",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
    {
        "nombre": "Casa de Justicia Canapote",
        "tipo": "justicia",
        "subtipo": "casa_justicia",
        "latitud": 10.4390,
        "longitud": -75.5170,
        "direccion": "Calle 62 con Carrera 15, Canapote",
        "localidad": "Localidad 1: Histórica y del Caribe Norte",
    },
    {
        "nombre": "Comisaría de Familia Olaya Herrera",
        "tipo": "justicia",
        "subtipo": "comisaria_familia",
        "latitud": 10.4145,
        "longitud": -75.4910,
        "direccion": "Sector Central, Olaya Herrera",
        "localidad": "Localidad 2: De la Virgen y Turística",
    },
]


def calcular_distancia_geodesica_metros(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calcula la distancia geodésica en metros entre dos puntos WGS84 usando fórmula de Haversine."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return round(r * c, 1)


def generar_circulo_geodesico(
    lon: float, lat: float, radio_metros: float, num_puntos: int = 32
) -> dict[str, Any]:
    """Genera un polígono de aproximación circular geodésica en formato GeoJSON."""
    coords = []
    lat_rad = math.radians(lat)
    r_lat = radio_metros / 111320.0
    r_lon = radio_metros / (111320.0 * max(0.001, math.cos(lat_rad)))
    for i in range(num_puntos):
        theta = 2.0 * math.pi * i / num_puntos
        p_lat = round(lat + r_lat * math.sin(theta), 6)
        p_lon = round(lon + r_lon * math.cos(theta), 6)
        coords.append([p_lon, p_lat])
    coords.append(coords[0])
    return {
        "type": "Polygon",
        "coordinates": [coords],
    }


def _strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def _format_title_spanish(s: str) -> str:
    s = s.strip()
    if not s:
        return ""
    minors = {"de", "del", "la", "las", "el", "los", "y", "en", "o", "a"}
    words = s.split()
    res = [words[0].capitalize()]
    for w in words[1:]:
        if w.lower() in minors:
            res.append(w.lower())
        else:
            res.append(w.capitalize())
    return " ".join(res)


class GeodatosService:
    def __init__(self, repository: GeodatosRepository) -> None:
        self.repository = repository

    async def listar_territorios(
        self, tipo_territorio: str | None = None, es_zona_etnica: bool | None = None
    ) -> Sequence[Territorio]:
        return await self.repository.listar_territorios(tipo_territorio, es_zona_etnica)

    async def obtener_territorio(self, id: uuid.UUID) -> Territorio | None:
        return await self.repository.obtener_territorio(id)

    async def obtener_territorios_geojson(self) -> dict:
        return await self.repository.obtener_territorios_geojson()

    async def buscar_por_coordenada(self, lon: float, lat: float) -> Sequence[Territorio]:
        return await self.repository.buscar_por_coordenada(lon, lat)

    async def listar_capas(self) -> Sequence[CapaGeovisor]:
        return await self.repository.listar_capas()

    async def estandarizar_direccion(self, direccion_raw: str) -> DireccionEstandarizadaResponse:
        """Estandariza direcciones formales y populares de Cartagena con PostGIS address_standardizer."""
        # 1. Ejecutar análisis con PostGIS address_standardizer
        await self.repository.parse_with_address_standardizer(direccion_raw)

        # 2. Limpieza inicial
        raw_clean = re.sub(r"\s+", " ", direccion_raw.strip(" \t\n\r;,'\""))

        # 3. Detección de nomenclatura vial formal colombiana
        street_pattern = re.compile(
            r"^(calle|cll|cl|c\.|carrera|cra|cr|kra|kr|k\.|diagonal|diag|dg|transversal|trans|tv|trv|avenida|av\.|av)\s*"
            r"(\d+[a-zA-Z]?(?:\s*(?:bis|sur|este|norte))?)\s*"
            r"(?:#|no\.?|n°|\s)?\s*"
            r"(\d+[a-zA-Z]?(?:\s*-\s*\d+)?)\s*"
            r"(?:,\s*|\s+)?(.*)$",
            re.IGNORECASE,
        )
        m_street = street_pattern.match(raw_clean)

        if m_street:
            via_raw, num_p, num_s, rest = m_street.groups()
            via_lower = via_raw.lower().replace(".", "")
            if via_lower in ["calle", "cll", "cl", "c"]:
                tipo = "Calle"
                abbr = "CL"
            elif via_lower in ["carrera", "cra", "cr", "kra", "kr", "k"]:
                tipo = "Carrera"
                abbr = "CR"
            elif via_lower in ["diagonal", "diag", "dg"]:
                tipo = "Diagonal"
                abbr = "DG"
            elif via_lower in ["transversal", "trans", "tv", "trv"]:
                tipo = "Transversal"
                abbr = "TV"
            elif via_lower in ["avenida", "av"]:
                tipo = "Avenida"
                abbr = "AV"
            else:
                tipo = via_raw.capitalize()
                abbr = tipo[:2].upper()

            num_s_clean = re.sub(r"\s*-\s*", "-", num_s.strip())
            barrio_raw = rest.strip(" ,.-")
            sector_o_barrio = _format_title_spanish(barrio_raw) if barrio_raw else None

            norm = f"{abbr} {num_p.strip()} # {num_s_clean}"
            if sector_o_barrio:
                norm += f", {sector_o_barrio}"

            # Mapeo territorial y coordenadas
            territorio_id = None
            coords = None
            confianza = 0.95 if sector_o_barrio else 0.85

            if sector_o_barrio:
                lookup_key = _strip_accents(sector_o_barrio.lower())
                if lookup_key in BARRIOS_COORD_MAP:
                    entry = BARRIOS_COORD_MAP[lookup_key]
                    coords = CoordenadasAproximadas(latitud=entry["lat"], longitud=entry["lon"])
                    codigo = entry.get("codigo") or entry.get("loc")
                    if codigo:
                        t_info = await self.repository.obtener_territorio_por_codigo(codigo)
                        if t_info:
                            territorio_id = t_info[0].id
                else:
                    matches = await self.repository.buscar_territorios_por_nombre(sector_o_barrio)
                    if matches:
                        t, lat, lon = matches[0]
                        territorio_id = t.id
                        if lat is not None and lon is not None:
                            coords = CoordenadasAproximadas(latitud=round(lat, 4), longitud=round(lon, 4))

            return DireccionEstandarizadaResponse(
                direccion_original=direccion_raw,
                direccion_normalizada=norm,
                tipo_via=tipo,
                numero_principal=num_p.strip(),
                numero_secundario=num_s_clean,
                sector_o_barrio=sector_o_barrio,
                territorio_id=territorio_id,
                coordenadas_aproximadas=coords,
                confianza=confianza,
            )

        # 4. Detección de sectores populares cartageneros (Sector, Manzana, Lote)
        raw_no_accents = _strip_accents(raw_clean.lower())
        matched_barrio_key = None
        for b_key in sorted(BARRIOS_COORD_MAP.keys(), key=len, reverse=True):
            if re.search(r"\b" + re.escape(b_key) + r"\b", raw_no_accents):
                matched_barrio_key = b_key
                break

        m_sec = re.search(
            r"(?:sector|sec\.?)\s+([a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ]+?)(?=\s+(?:mz|manzana|lt|lote|etapa|callej[oó]n|casa|\d+|$)|$)",
            raw_clean,
            re.IGNORECASE,
        )
        sector = _format_title_spanish(m_sec.group(1).strip()) if m_sec else None

        m_mz = re.search(r"(?:mz|manzana)\s*([a-zA-Z0-9]+)", raw_clean, re.IGNORECASE)
        mz = m_mz.group(1).strip() if m_mz else None

        m_lt = re.search(r"(?:lt|lote)\s*([a-zA-Z0-9]+)", raw_clean, re.IGNORECASE)
        lt = m_lt.group(1).strip() if m_lt else None

        if matched_barrio_key or sector:
            entry = BARRIOS_COORD_MAP.get(matched_barrio_key) if matched_barrio_key else None
            barrio_nombre = entry["nombre"] if entry else "Cartagena"

            norm_parts = [barrio_nombre]
            if sector:
                norm_parts.append(f"Sector {sector}")
            if mz:
                norm_parts.append(f"Mz {mz.upper()}")
            if lt:
                norm_parts.append(f"Lt {lt.upper()}")

            norm = ", ".join(norm_parts)

            territorio_id = None
            coords = None
            if entry:
                coords = CoordenadasAproximadas(latitud=entry["lat"], longitud=entry["lon"])
                codigo = entry.get("codigo") or entry.get("loc")
                if codigo:
                    t_info = await self.repository.obtener_territorio_por_codigo(codigo)
                    if t_info:
                        territorio_id = t_info[0].id

            return DireccionEstandarizadaResponse(
                direccion_original=direccion_raw,
                direccion_normalizada=norm,
                tipo_via="Sector" if sector else None,
                numero_principal=mz,
                numero_secundario=lt,
                sector_o_barrio=f"{barrio_nombre}, Sector {sector}" if sector else barrio_nombre,
                territorio_id=territorio_id,
                coordenadas_aproximadas=coords,
                confianza=0.95 if (matched_barrio_key and (sector or mz)) else 0.80,
            )

        # 5. Fallback para direcciones no estructuradas
        norm_title = _format_title_spanish(raw_clean)
        return DireccionEstandarizadaResponse(
            direccion_original=direccion_raw,
            direccion_normalizada=norm_title,
            tipo_via=None,
            numero_principal=None,
            numero_secundario=None,
            sector_o_barrio=None,
            territorio_id=None,
            coordenadas_aproximadas=None,
            confianza=0.50,
        )

    async def calcular_isocronas(
        self,
        lon: float,
        lat: float,
        modo: str = "pie",
        minutos_str: str = "5,10,15",
    ) -> IsocronasFeatureCollection:
        """Calcula polígonos de isócronas (cobertura temporal a pie/vehículo) y localiza el centro de seguridad más cercano."""
        # 1. Validación de rango territorial distrital de Cartagena
        if not (9.8 <= lat <= 11.2 and -76.2 <= lon <= -74.8):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Coordenadas fuera del rango territorial del Distrito de Cartagena de Indias "
                    f"(latitud recibida: {lat}, longitud: {lon}). "
                    f"Rango válido distrital WGS84: lat [9.8, 11.2], lon [-76.2, -74.8]."
                ),
            )

        # 2. Parseo seguro de intervalos temporales
        intervalos: list[int] = []
        if minutos_str:
            for part in minutos_str.split(","):
                part_clean = part.strip()
                if part_clean.isdigit():
                    val = int(part_clean)
                    if 1 <= val <= 180:
                        intervalos.append(val)
        if not intervalos:
            intervalos = [5, 10, 15]

        # 3. Normalización del modo de desplazamiento y cálculo de velocidad
        modo_clean = modo.strip().lower()
        if modo_clean in ["vehiculo", "vehículo", "carro", "moto", "patrulla", "ambulancia"]:
            modo_final = "vehiculo"
            velocidad_m_min = 25000.0 / 60.0  # 416.6667 m/min (~25 km/h urbano)
        else:
            modo_final = "pie"
            velocidad_m_min = 4500.0 / 60.0  # 75.0 m/min (~4.5 km/h a pie)

        # 4. Localización del nodo de seguridad humana más cercano
        nodos_con_distancia = []
        for nodo in NODOS_SEGURIDAD_HUMANA:
            dist = calcular_distancia_geodesica_metros(
                lat, lon, nodo["latitud"], nodo["longitud"]
            )
            nodos_con_distancia.append({**nodo, "distancia_metros": dist})

        nodos_con_distancia.sort(key=lambda n: n["distancia_metros"])
        nodo_mas_cercano = nodos_con_distancia[0] if nodos_con_distancia else None

        # 5. Generación de polígonos de isócronas para cada intervalo
        features: list[IsocronaFeature] = []
        for m in sorted(set(intervalos)):
            radio_m = round(m * velocidad_m_min, 1)

            # Intentar generar geometría precisa mediante PostGIS ST_Buffer
            geom = await self.repository.generar_isocrona_postgis(lon, lat, radio_m)
            if not geom:
                # Fallback geodésico resiliente en memoria
                geom = generar_circulo_geodesico(lon, lat, radio_m)

            nodo_cercano_read = None
            if nodo_mas_cercano:
                nodo_cercano_read = NodoCercanoRead(
                    nombre=nodo_mas_cercano["nombre"],
                    tipo=nodo_mas_cercano["tipo"],
                    distancia_metros=nodo_mas_cercano["distancia_metros"],
                )

            propiedades = IsocronaProperties(
                minutos=m,
                modo=modo_final,
                radio_metros=radio_m,
                nodo_cercano=nodo_cercano_read,
            )

            features.append(
                IsocronaFeature(
                    type="Feature",
                    geometry=geom,
                    properties=propiedades,
                )
            )

        return IsocronasFeatureCollection(
            type="FeatureCollection",
            features=features,
        )

    @staticmethod
    def normalizar_delito(delito: str | None) -> str | None:
        """Normaliza el identificador de delito para permitir slugs o nombres formales."""
        if not delito:
            return None
        d = delito.strip().upper().replace("_", " ").replace("-", " ")
        if "MOTO" in d:
            return "HURTO MOTOCICLETA"
        if "RESIDENCIA" in d:
            return "HURTO RESIDENCIAS"
        if "COMERCIO" in d or "COMERCIANTE" in d:
            return "HURTO COMERCIO"
        return d

    async def obtener_resumen_hurtos(
        self,
        delito: str | None = None,
        anio: int | None = None,
        zona: str | None = None,
    ) -> ResumenHurtosResponse:
        """Obtiene el resumen analítico de hurtos con filtros opcionales."""
        delito_norm = self.normalizar_delito(delito)
        raw = await self.repository.obtener_resumen_hurtos(
            delito=delito_norm, anio=anio, zona=zona
        )
        return ResumenHurtosResponse.model_validate(raw)

    async def obtener_poligonos_hurtos_geojson(
        self,
        delito: str | None = None,
        anio: int | None = None,
        zona: str | None = None,
    ) -> HurtosFeatureCollection:
        """Obtiene FeatureCollection GeoJSON con polígonos analíticos y estadísticas asociadas."""
        delito_norm = self.normalizar_delito(delito)
        raw = await self.repository.obtener_poligonos_hurtos_geojson(
            delito=delito_norm, anio=anio, zona=zona
        )
        return HurtosFeatureCollection.model_validate(raw)

    async def explorar_registros_hurtos(
        self,
        delito: str | None = None,
        anio: int | None = None,
        mes: str | None = None,
        zona: str | None = None,
        armas_medios: str | None = None,
        clase_sitio: str | None = None,
        dia_semana: str | None = None,
        busqueda: str | None = None,
        agrupar_por: str = "armas_medios",
        limit: int = 50,
        offset: int = 0,
    ) -> ExploradorHurtosResponse:
        """Explora registros tabulares, ejecuta filtros multicriterio y pivot dinámico de hurtos."""
        delito_norm = self.normalizar_delito(delito)
        raw = await self.repository.explorar_registros_hurtos(
            delito=delito_norm,
            anio=anio,
            mes=mes,
            zona=zona,
            armas_medios=armas_medios,
            clase_sitio=clase_sitio,
            dia_semana=dia_semana,
            busqueda=busqueda,
            agrupar_por=agrupar_por,
            limit=limit,
            offset=offset,
        )
        return ExploradorHurtosResponse.model_validate(raw)

