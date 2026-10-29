# Resultado 244 — Sincronización documental de la cabeza Alembic y consolidación de la propuesta 238

Fecha: 2026-10-27 · Emisor: Freebuff (EDD/documentación/frontend) · Encargo: `bridge/244_encargo_freebuff_sincronizacion_docs_cabeza_alembic.md`

## 1. Censo real verificado (medición propia, no citas)

```bash
cd backend && .venv/bin/alembic -c alembic.ini heads
# → 0084_aportes_colas_y_apoyos (head)
```

Inventario completo `0063–0084` en `backend/alembic/versions/` (23 migraciones
correlativas, ninguna cabeza paralela): ingesta masiva triada (0063), corpus
Drive de seguridad humana (0064), catálogo de planes de desarrollo (0065),
quince mesas de corregimientos (0066), evidencia paginada PDD (0067), tablas del
evaluador AI (0068), índice de indicadores territoriales (0069), seguimiento de
corridas y de grafo del pipeline con integridad, checkpoint duradero e
idempotencia thread-safe (0070–0074), catálogo de fuentes, lotes idempotentes y paquetes de artefactos
con evidencia Drive (0075–0078), correspondencias meta↔PA 1:n con guardas de
revisión y protección (0079–0081), tablas DEA DMU nivel 3 (0082), conciliador
gold set (0083) y colas y apoyos de aportes (0084).

## 2. Entregable A — saneamiento de las 5 citas obsoletas a `0062`

| Documento | Cambio |
|---|---|
| `docs/arquitectura.md` | La cita principal ahora declara **cabeza única `0084_aportes_colas_y_apoyos`** verificada 2026-10-27 con el comando real, y resume la evolución 0063–0084 agrupada por etapa (ingesta/Drive/catálogo, corridas de pipeline, fuentes y artefactos, correspondencias 1:n, DEA/gold set/aportes). |
| `docs/plan-trabajo.md` | La nota datada del 2026-10-14 se mantiene como registro histórico pero se etiqueta con ese alcance, y recibe la nota **[244-DOCS-01] 2026-10-27** que fija la cabeza vigente `0084` con el comando de verificación y remite a `arquitectura.md` para la evolución. |
| `docs/matriz-trazabilidad-modulos.md` | La cabecera separa la cabeza "censada" (`0062`, snapshot del 2026-10-14, comando original citado) de la cabeza **vigente `0084`** verificada por encargo 244. |
| `docs/plan-consolidacion-arquitectura.md` | Ambas citas (estado inicial observado y tarea 6 del checklist de línea base) ahora distinguen el snapshot histórico del 2026-10-14 de la cabeza vigente `0084`, sin borrar el registro histórico. |

Ninguna cita se borró silenciosamente: los registros históricos conservan su
fecha y la nota de vigencia evita reescribir el pasado documental.

## 3. Entregable B — recomendación formal consolidada (propuesta 238)

`bridge/238_propuesta_exclusion_lint_snapshots.md` incorpora la sección 5
"Consolidación en recomendación formal": objetivo (semáforo continuo `bun run check` sin degradar
ninguna regla de tipado/estilo, cobertura intacta sobre `src/**` incluidas las
guardas de capas de `shared/core`, y sobre `scripts/ui-policy*`), la
recomendación exacta (bloque `ignores` de §2 con las 4 rutas congeladas del censo
del §1), el checklist del §3 como condición de aplicación, el motivo documental
de la excepción pública y el límite explícito: **no se toca `eslint.config.mjs`
sin la firma de producto + dictamen independiente de EAF**; el implementador no
otorga veredicto ni GO/NO-GO de CI sobre sí mismo.

## 4. Verificaciones y límites

- Cabeza verificada con `alembic heads` desde el venv del proyecto (comando y
  salida arriba); el censo de la evolución proviene del listado real de
  `versions/`, no de memoria.
- Cambios limitados a los 4 documentos del encargo + el apéndice §5 de la
  propuesta 238; sin cambios de código, migraciones ni configuración de lint.
- Los registros históricos se conservaron (falsificación documental
  evitada); la vigencia queda declarada en cada punto de lectura.
- Límite: no re-corrida de suites (no aplica a cambios de documentación);
  `bun run check` completo sigue rojo por los snapshots de evidencia hasta que la
  firma de producto/EAF habilite la exclusión recomendada.

## 5. Notificación a coordinación

Enviada por tmux a `agy` (coordinación EAF) al cierre de esta remisión; pendiente
su acuse y la decisión sobre las preguntas abiertas del §4 de la propuesta 238.
