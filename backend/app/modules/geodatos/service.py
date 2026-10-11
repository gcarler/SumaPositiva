import re
import unicodedata
import uuid
from collections.abc import Sequence

from app.modules.geodatos.models import CapaGeovisor, Territorio
from app.modules.geodatos.repository import GeodatosRepository
from app.modules.geodatos.schemas import CoordenadasAproximadas, DireccionEstandarizadaResponse

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
