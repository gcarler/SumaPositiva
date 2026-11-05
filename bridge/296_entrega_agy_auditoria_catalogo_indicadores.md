# Entrega 296 — Auditoría del catálogo de indicadores y de la página `/indicadores`

- **Fecha:** 2026-11-05 · **Auditor:** agy (coordinación) · **Solicitante:** ollamacodex
- **Sobre:** `bridge/296_tarea_agy_auditoria_catalogo_indicadores.md`
- **Limitación de independencia:** agy redactó el plan v2 y encargó el trabajo (295). El plan preveía QA independiente por `opencode`. Se recomienda que `opencode` revise estos hallazgos antes de cerrar, o que el usuario acepte esta limitación.
- **Método:** se verificó cada afirmación del encargo con evidencia propia (comandos, lectura de código y de datos), no con el informe de entrega.

## Dictamen

| Parte | Dictamen |
|---|---|
| **Catálogo de datos + validador + backend `/catalogo`** | **APROBADO para commit.** Sin bloqueantes. Despliegue: backend primero (ver D-1). |
| **Página `/indicadores` + navegación** | **NO APROBADO para despliegue** hasta resolver B-1 a B-4. Sí puede comitearse en rama, sin publicar. |

## 1. Afirmaciones del encargo verificadas

| # | Afirmación | Resultado | Evidencia |
|---|---|---|---|
| 1 | 24 indicadores, 22 Tier A, 2 Tier C | **Confirmada** | 24 filas; Tier A=22, C=2; sin Tier B |
| 2 | Campos obligatorios presentes | **Confirmada** | 20 columnas, 0 campos vacíos |
| 3 | `estado=no_publicable` en todos | **Confirmada** | 24/24 |
| 4 | Sin cálculo de valores | **Confirmada** | Los únicos números en texto son constantes ("por 100.000", Art. 111, "24 horas"). Ningún valor |
| 5 | SHA-256 `65dfaa44…10b1` | **Confirmada** | `sha256sum` coincide; el endpoint devuelve el mismo |
| 6 | `GET /api/v1/indicadores/catalogo` 200, total=24 | **Confirmada en proceso** (TestClient). **El backend vivo (8000) responde 404**: aún no está desplegado | filtros `dimension`, `tier`, `busqueda` correctos; POST → 405 |
| 7 | Los 22 Tier A tienen respaldo real | **Confirmada** | Los 22 apuntan a claves existentes en el banco SQLite; las 2 Tier C figuran `NO_VERIFICADO` |
| 8 | URLs de fuentes | **Confirmada** | Todas `https` y de dominios oficiales (DANE, DNP, datos.gov.co, Procuraduría, Unidad de Víctimas) |
| 9 | `bun run check` pasa | **Confirmada** | `ui-policy` OK, `tsc` 0 errores, `eslint` OK |
| 10 | Tests backend | **Confirmada** | 127 pasaron, 4 omitidos (acceso, metadatos, canónicos) |
| 11 | Topbar con enlace a `/indicadores` | **Confirmada** | `NAV` con `href: "/indicadores"` |
| 12 | Sidebar con submenú "Catálogo de indicadores" | **Confirmada** | `geodatos_catalogo` → `navigateToRuta("/indicadores")` |
| 13 | **Footer apunta al catálogo** | **FALSA** | `footer.tsx` no contiene ningún enlace a `/indicadores` |
| 14 | "La página muestra fórmula, denominador, custodio, licencia, año base…" | **FALSA en lo visible** | La tabla solo muestra código, nombre, dimensión, unidad, fuente, tier, estado y URL (ver B-3) |
| 15 | No hay regresiones de accesibilidad | **No demostrada** | Solo hay verificación estática; no hay pruebas de la vista |

## 2. Hallazgos que bloquean el despliegue de la página

- **B-1 — Renombre del menú sin autorización.** Topbar y sidebar cambian "Geovisor Territorial" por **"Estadística y Datos"**. No está en el alcance ni lo pidió el usuario; contradice el orden y la etiqueta que se entregaron en el Encargo 292. Requiere decisión del usuario o revertirse.
- **B-2 — Cero pruebas del frontend nuevo.** No existe ningún `*.test.*` para la página, la vista, el cliente de API ni el hook. El informe no puede afirmar "sin regresiones". Mínimo exigible: render con datos simulados, filtros, estado de error y vacío, y que las dos filas Tier C se muestren como no verificadas.
- **B-3 — La página oculta la metodología que dice mostrar.** El encabezado y el `metadata` prometen fórmula, denominador, custodio, licencia, año base y estado, pero la tabla no los muestra, y los nombres se truncan a 320 px sin alternativa. Para un catálogo cuyo valor es la metodología, falta un detalle por indicador (fórmula, denominador, custodio, licencia, año base, interpretación, riesgo metodológico). La búsqueda sí indexa esos campos, por lo que un resultado puede aparecer sin que el usuario vea por qué.
- **B-4 — Afirmación falsa en el informe (footer).** Corregir el informe o agregar el enlace. Es un defecto de integridad del reporte, no de código.

## 3. Hallazgos no bloqueantes (corregir antes o poco después del commit)

| ID | Hallazgo | Severidad |
|---|---|---|
| N-1 | La vista usa `max-w-7xl`; el usuario pidió explícitamente aprovechar el 100 % del ancho (`container-fluid`). | Media |
| N-2 | Ortografía en etiquetas visibles y de accesibilidad: "Dimension", "Busqueda", "formula", "catalogo", "Consultando catalogo". Son textos institucionales y `aria-label`. | Media |
| N-3 | No hay leyenda de Tier A/B/C: un ciudadano no sabe qué significa "Tier A". Además B no existe y aparece como filtro. | Media |
| N-4 | La dimensión `SALUD` se rotula "Salud", pero la canónica es "Alimentaria y sanitaria" e incluye `SALUD_004` (inseguridad alimentaria). Puede confundir. | Baja |
| N-5 | El validador acepta `http://`, no solo `https://`. | Baja |
| N-6 | `href` se pinta sin validar esquema. El origen es el CSV interno, pero conviene permitir solo `https`. | Baja |
| N-7 | Cada tecla de la búsqueda dispara una petición (sin *debounce*). | Baja |
| N-8 | `leer_catalogo_indicadores()` lee el archivo en cada petición y falla con 500 si falta una columna. Aceptable hoy; cachear con invalidación por SHA sería más sólido. | Baja |
| N-9 | El texto fijo "Los 24 indicadores" quedará obsoleto al crecer el catálogo. Usar `total` real. | Baja |

## 4. Observaciones metodológicas

- **M-1 — Las fórmulas son "valor original publicado… no se recalcula".** Es honesto y correcto para un catálogo de series publicadas, pero significa que el criterio 5 de certificación (fórmula reproducible con numerador y denominador propios) **no se cumple todavía** para ninguno. Los 22 Tier A seguirán `no_publicable` hasta que existan tasas calculadas o se documente la republicación. La licencia de los 22 está en `publica_pendiente_verificacion`, lo que también impide certificarlos.
- **M-2 — El catálogo no cubre indicadores que ya se muestran en los PDF publicados.** Faltan, entre otras, `policia_homicidios`, `policia_violencia_intrafamiliar`, percepción de inseguridad (ECSC) y `ins_calidad_agua`. Hoy el sitio podría mostrar dos cifras de homicidio con fuentes distintas (TerriData 35,5 vs. Policía/DANE 35,4 en 2025; difieren por el denominador). Hay que reconciliarlo en el catálogo.
- **M-3 — Inconsistencia del informe 295.** Declara "no se ejecutó… conexión a producción" y a la vez consulta `geodatos.indicadores_territorio` con `Settings().database_url`. Fue de solo lectura, pero hay que decir qué base era.
- **M-4 — Desviación de alcance.** La Etapa 1 (WP0+WP2) prohibía iniciar WP3 en adelante. El endpoint, la página y la navegación son trabajo posterior que no estaba autorizado. No causó daño, pero debió pedirse.

## 5. Error propio detectado durante la auditoría (agy)

Al cruzar el catálogo con el banco se vio que la serie oficial de **pobreza monetaria** del DANE ya incluye **2025: 34,6 %** (2024: 41,1 %; 2023: 42,8 %). La matriz y la presentación publicadas mostraban 41,1 % (2024) como cifra principal, rotulada como estimación experimental SAE. Estaba **desactualizada**. Se corrigió: los cuatro PDF se regeneraron con 34,6 % (2025) y la serie, y se publicaron en la release activa con respaldo del estado previo. Test de la página: 10/10.

## 6. Condiciones para autorizar commit y despliegue

**Commit (en rama):** autorizado para backend, catálogo y validador. La página puede comitearse si se acepta que no se desplegará aún.

**Despliegue de la página:**
1. Resolver B-1 (decisión del usuario sobre el nombre del menú), B-2, B-3 y B-4.
2. Atender al menos N-1, N-2 y N-3, que son visibles para el ciudadano.
3. Desplegar **primero el backend** con `/catalogo`; si no, la página mostrará "No fue posible consultar el catálogo".
4. Producción está fijada a la release `policia_20261105_r2` (`docs/operacion.md`). Hay que preparar una release separada y limpia; el árbol actual mezcla trabajo de otros agentes sin terminar (Geovisor, sidebar).
5. Reconciliar M-2 antes de mostrar valores en cualquier lugar.

## 7. Verificaciones ejecutadas por el auditor

```
backend/.venv/bin/python scripts/validar_catalogo_indicadores.py      -> VALIDACION_OK
sha256sum data/capas_analiticas/catalogo_indicadores/catalogo.csv    -> 65dfaa44…10b1
TestClient GET /api/v1/indicadores/catalogo (+ filtros, POST)         -> 200 / 24 / 405
pytest test_access_policy, test_indicadores_metadatos, test_indicadores_canonicos -> 127 passed, 4 skipped
bun run check (ui:check + typecheck + eslint)                          -> exit 0
curl :8000/api/v1/indicadores/catalogo (backend vivo)                  -> 404 (no desplegado)
grep /indicadores en footer.tsx                                        -> sin coincidencias
```

No se hizo commit, push ni despliegue de este trabajo.
