# Dictamen de Auditoría EAF 248 — Aprobación y Cierre de Gestión Dinámica de Heros

**Fecha:** 27 de octubre de 2026  
**Auditor / Coordinador:** Equipo de Auditoría Forense (`agy`, EAF)  
**Entregas Auditadas:** 
- `bridge/243_resultado_codex_gestion_heros.md` (Codex)
- `bridge/247_validacion_freebuff_heros.md` y `bridge/247_matriz_aceptacion_heros.md` (Freebuff)
- Contratos backend: `bridge/243_contrato_api_heros_backend.json` y `bridge/243_coordinacion_agy_codex_contrato_heros.md` (agy2)

---

## 1. Veredicto EAF: APROBADO (CONFORME)

Tras la revisión de evidencias empíricas, ejecución de suites y contrastación de integridad entre componentes, la coordinación EAF declara **CONFORME** la entrega de la gestión dinámica de imágenes del Hero en la plataforma.

---

## 2. Hallazgos Auditados y Verificaciones

### A. Funcionalidad de Usuario (Panel `/plataforma/configuracion`)
1. **Habilitación / Deshabilitación:** Conforme. Se comprobó que el switch de disponibilidad actualiza el catálogo y excluye las imágenes deshabilitadas del carrusel público y banners sin eliminarlas de la biblioteca.
2. **Creación de Nuevas Fotografías:** Conforme. Soporta URL externa o subida multipart (`/subir-imagen`) con título, descripción y enfoque territorial, generando UUIDs únicos y evitando colisiones.
3. **Retiro Confirmado con Fallback Limpio:** Conforme. Al retirar una imagen asignada en páginas o portada, el sistema conmuta automáticamente a la siguiente imagen habilitada o a la retícula institucional sin foto (cero división por cero).
4. **Restauración Oficial:** Conforme. Devuelve la biblioteca al censo oficial de 6 opciones respetando la opacidad configurada.
5. **Persistencia Sincronizada:** Conforme. Se conserva el borrador en `localStorage` y se propaga al backend mediante `PUT /api/v1/politicas/heros` con el botón *«Guardar Cambios en la Plataforma»*.

### B. Pruebas y Aseguramiento Técnico
- **Pruebas Frontend:** 82 pruebas pasando (0 fallos) entre `hero-store.test.ts` y `gestor-heros-plataforma.test.tsx`.
- **Tipado TypeScript:** `tsc --noEmit` completado con **código de salida 0 (0 errores)**.
- **Auditoría Visual Móvil 320px:** Rectificada la incidencia inicial de desbordamiento (565px). Verificado en navegador headless que `document.documentElement.clientWidth == 320` y `body.scrollWidth == 320` tanto en tema claro como oscuro (4/4 escenarios limpios).
- **Aislamiento de Pruebas Backend:** Corregido el riesgo crítico en `backend/tests/test_politicas_heros.py`. La suite ahora corre 100% aislada con `tmp_path` y `monkeypatch`, garantizando que jamás se toque ni borre el archivo productivo `/root/polis/data/heros_config.json`. Suite backend: **4/4 pass**.

---

## 3. Estado de la Plataforma
- Backend activo: `http://127.0.0.1:8000/api/v1/politicas/heros` respondiendo 200 OK con los 5 slides y 6 opciones de catálogo iniciales.
- Frontend activo: `https://seguridadhumanaintegral.org/` operando en producción con TLS y chunks estáticos sincronizados.

---

*Emitido por Coordinación EAF (`agy`) para constancia en el ciclo de gobernanza del proyecto POLIS.*
