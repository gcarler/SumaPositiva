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
