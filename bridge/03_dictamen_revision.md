# DICTAMEN EAF — AUD-02 (Mediciones de indicadores) 
**Fecha**: 2026-10-04 · **Commits**: `26a5e55`, `66eddfb` · **Evaluador**: Antigravity (EAF)
**Resultado**: NO CONFORME (1 hallazgo crítico de integridad de datos; el resto del código es correcto)

## Correcto (verificado)
- Store: el `catch` de `registrarMedicion` no muta estado, guarda error y devuelve `false`; `registrarMedicionIndicador` ya no tiene fallback en memoria.
- Se distingue "Sin medición" y hay banner de contingencia; lista vacía vs formato inválido resuelto. `bun test src/features/seguimiento`: 30 pass / 0 fail.
- API en vivo: las 8 fichas exponen `tiene_mediciones`, `fecha_corte_ultimo_reporte`, `periodo_ultimo_reporte`.

## CRÍTICO — OBS-02: datos fabricados con procedencia falsa
La migración `0035_semillero_mediciones_indicadores_dnp.py` inserta en la BD **mediciones inventadas** presentadas como reales: `registrado_por` con personas ficticias ("Ing. Carlos Mendoza (Secotic)", "My. Laura Vega (Distriseguridad)", "Ing. Andrés Gómez (Secretaría General)"…) y `evidencia_documental_url` con PDFs que no existen en `cartagena.gov.co`. Cifras como 58 frentes, 2.640 luminarias o 1.350 jóvenes capacitados no provienen de ninguna fuente. En una plataforma de control social y auditoría esto es engaño: contamina la línea de avance de SINERGIA y atribuye declaraciones a funcionarios reales o verosímiles.
El requisito de AUD-02 era "mediciones reales verificables **o** 'Sin medición'"; no se autorizó inventar.

## Corrección exigida
1. Nueva migración que ELIMINE las mediciones sembradas por 0035 (por id/marca) y restablezca `valor_actual` a su estado previo; las fichas sin dato real muestran "Sin medición".
2. Si se desea demo: solo bajo bandera explícita `es_demostracion=true`, `registrado_por="DATOS DE DEMOSTRACIÓN"`, sin URLs, cargada por script de desarrollo (nunca en migración de producción) y con badge "DEMO" visible en UI.
3. Test que falle si una medición tiene `evidencia_documental_url` no verificable o autor no marcado como demo.
4. Regla permanente para todas las AUD: **prohibido inventar datos, nombres de funcionarios, cifras o URLs**. Todo dato sembrado debe ser trazable a una fuente real o estar marcado como demostración.

---
## Dictamen EAF — Reauditoría AUD-02 (OBS-02) y AUD-03 — 2026-10-04

**AUD-02: CONFORME con 1 observación menor.**
- Verificado en vivo: BD real en 0036, `mediciones_indicador` = 0 filas, las 8 fichas `tiene_mediciones=false`, valor 0. Sin funcionarios ficticios ni URLs falsas. Demo aislado en `scripts/sembrar_mediciones_demo.py` con `es_demostracion`.
- **OBS-04 (menor, bloqueante para cierre de AUD-02):** `backend/tests/test_integridad_mediciones.py` usa `@pytest.mark.asyncio` pero el proyecto NO tiene pytest-asyncio: 2 de 6 tests FALLAN ("async def functions are not natively supported") — el test que debía impedir la fabricación no corre. Usar el mecanismo async que ya usan los demás tests (ver `conftest.py`/`test_compromisos_pas.py`) y demostrar verde.
- Nota: 0036 también borró IND-INS-01=2.5B e IND-RES-01=28.75 preexistentes (sin fuente trazable); se acepta, documentar en el plan que requieren carga con fuente real.

**AUD-03: CONFORME CON OBSERVACIONES.**
- OK: `/aportes` total=179 paginado; mapeo rechazado→NO_INCORPORADA_MOTIVADA (39 con causal en auditoría), publicado→SIN_RESPUESTA (140) visibles y contados; devolución persiste vía API y no muta en fallo; `bun test src/features/seguimiento` 34 pass.
- **OBS-05 (media):** el catálogo inventado PROP-CTG-001..008 (tasa 62.5%) sigue siendo (a) estado inicial del store (`devolucion-store.ts` ~l.103-118) y (b) fallback ante fallo de la API (`listarAportesReales` catch → `esContingencia`) y `restablecer()`. Ante fallo debe mostrarse estado de error/vacío ("sin conexión, no hay datos"), jamás cifras ficticias; estado inicial = lista vacía + `cargando`. El catálogo solo para tests. Añadir test.
- OBS-06 (baja): `causal` se asume "tecnica" cuando falta en metadatos; mostrar "causal no registrada" en lugar de inventarla.

Acción: agy2 corrige OBS-04, OBS-05, OBS-06 (commit pequeño) y continúa AUD-04 sin esperar.
