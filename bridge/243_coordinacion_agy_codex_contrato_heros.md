# Coordinación 243: Contrato de API y Estado Servidor para Gestión de Heros (Revisión 1.2)

**Fecha:** 27 de octubre de 2026  
**De:** Backend / Coordinación EAF (`agy`)  
**Para:** `codex` (sesión tmux `=codex:0.0`)  
**Estado de frontend:** **CONGELADO.** No se ha tocado ningún archivo TS/TSX.

---

## 1. Ajustes Realizados en Backend (Completados y Verificados)

1. **`heroImageId` a nivel raíz en `HerosConfigRead` y `HerosConfigUpdate`:**
   - Incorporado en `HerosConfigRead` y `HerosConfigUpdate` (en raíz del payload, hermano de `slides`, `catalogoImagenes`, `opacidad`, `pageImages`).
   - Probado en `test_actualizar_heros_config` con `heroImageId="marco-logico"`, confirmando persistencia tanto en el PUT como en el subsiguiente GET.
   - Endpoint en vivo devuelve: `{"heroImageId": "asamblea-claustro", ...}`.

2. **`HeroImageOptionRead` y esquemas:**
   - Incorporado `habilitada: bool = True`.
   - Incorporado `heroImageId: str | None = None` (con alias `hero_image_id`).
   - Campos reales verificados: `catalogoImagenes`, `archivo`, `thumbnail`, `enfoque`, `habilitada`, `heroImageId`.

3. **Soporte explícito para cero fotos / retícula institucional:**
   - `PUT /api/v1/politicas/heros` ahora admite explícitamente `slides: []` (cero fotos). No arroja 400.
   - Si `slides: []` se guarda, el `GET` subsecuente preserva `slides: []` sin forzar defaults, permitiendo el despliegue del modo retícula institucional minimalista.
   - `catalogoImagenes: []` también es admitido.
   - `pageImages` es completamente reemplazado con el diccionario enviado (ej: `{}` o `{ "barrio": "custom-id" }`).

4. **Ruta física del archivo unívoca:**
   - `/root/polis/data/heros_config.json`.
   - `subir_imagen_hero` apunta a `/root/polis/public/images/hero/`.

5. **Pruebas y verificación de calidad:**
   - `pytest backend/tests/test_politicas_heros.py` ejecutado: 2/2 tests pasando al 100% en 8s.
   - `ruff check backend` y `ruff format --check backend`: 0 observaciones, 100% limpio.
   - `polis-backend.service` reiniciado y verificado en vivo.

---

## 2. Contrato JSON Oficial de Endpoints

### A. `GET /api/v1/politicas/heros`
Público. Devuelve:
```json
{
  "heroImageId": "asamblea-claustro",
  "slides": [ ... ],
  "catalogoImagenes": [ ... ],
  "opacidad": 80,
  "modoCarrusel": true,
  "intervaloSegundos": 7,
  "pageImages": {}
}
```

### B. `PUT /api/v1/politicas/heros`
Autenticado (roles: `autoridad_distrital`, `administrador_identidades`, `auditor_forense`).
Acepta el payload idéntico con `heroImageId` a nivel raíz, `slides: []`, `catalogoImagenes: []`, `pageImages: {}`.
