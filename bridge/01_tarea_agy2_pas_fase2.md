# Tarea agy2 — Fase 3: Plan de Acción y Seguimiento
## Hito PAS-2: Tablero SINERGIA DNP y Cadena de Valor (Insumo → Producto → Resultado)

**Fecha**: 2026-10-03
**Asignado por**: Antigravity (Orquestador Central / Auditoría Forense EAF)
**Ejecutor**: agy2 (Equipo de Desarrollo EDD)
**Estado**: ASIGNADA — EN EJECUCIÓN INMEDIATA
**Ruta**: `/plataforma/seguimiento` (Pestaña "Cadena de Valor SINERGIA")
**Marco Normativo**: Metodología SINERGIA del Departamento Nacional de Planeación (DNP), CONPES, Decreto Distrital 037/2026 (Seguridad Humana Cartagena).

---

### 1. Contexto Metodológico
En la Política Pública de Seguridad Humana Integral de Cartagena de Indias 2026–2036, el seguimiento no se limita a un inventario de tareas, sino que se articula bajo la **Cadena de Valor DNP/SINERGIA**, estableciendo causalidad técnica verificable:
1. **Insumos (`insumo`)**: Recursos financieros y operativos asignados (FONSET, presupuesto tecnológico Secotic, dotaciones).
2. **Productos (`producto`)**: Bienes y servicios tangibles entregados (frentes de seguridad conformados, luminarias LED instaladas, jóvenes capacitados laboralmente).
3. **Resultados (`resultado`)**: Transformaciones en el bienestar y seguridad ciudadana (reducción de tasa de homicidios, disminución de hurtos, reducción de percepción de inseguridad ciudadana).

El backend FastAPI en `127.0.0.1:8000` ya cuenta con los endpoints operativos:
- `GET /api/v1/indicadores/cadena-valor`: Retorna `{ insumo: [...], producto: [...], resultado: [...] }` con los indicadores oficiales sembrados de Cartagena.
- `GET /api/v1/indicadores/fichas/{id}`: Retorna la ficha técnica DNP detallada del indicador.
- `POST /api/v1/indicadores/fichas/{id}/mediciones`: Registra avances y evidencias documentales.

---

### 2. Objetivos y Requerimientos de Implementación

#### A. Arquitectura de Navegación por Pestañas (`/plataforma/seguimiento`)
En `src/features/seguimiento/views/seguimiento-view.tsx`:
1. Integrar navegación por pestañas (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` de `@/shared/ui/tabs`):
   - **Tab 1: "Matriz de Compromisos PAS"**: Vista actual con los 10 compromisos, KPIs y tabla interactiva.
   - **Tab 2: "Cadena de Valor SINERGIA (DNP)"**: Nueva vista integral del flujo Insumos $\rightarrow$ Productos $\rightarrow$ Resultados.

#### B. Servicio Frontend de Integración (`cadena-valor-api.ts`)
Crear `src/features/seguimiento/services/cadena-valor-api.ts`:
- Consumir `GET /api/v1/indicadores/cadena-valor` mediante `apiFetch` de `@/core/http/api-client`.
- Incluir fallback canónico tipado idéntico a la base de datos de Cartagena (con los 8 indicadores: `IND-INS-01`, `IND-INS-02`, `IND-PROD-01`, `IND-PROD-02`, `IND-PROD-03`, `IND-RES-01`, `IND-RES-02`, `IND-RES-03`) para garantizar robustez absoluta ante eventual desconexión de red o entornos aislados de prueba.
- Función para registrar mediciones: `registrarMedicionIndicador(indicadorId: string, medicion: MedicionIndicadorInput)` que llame a `POST /api/v1/indicadores/fichas/{id}/mediciones` (o persista en estado en memoria si offline).

#### C. Modelos y Tipado (`indicador-dnp.ts`)
Crear o complementar `src/features/seguimiento/models/indicador-dnp.ts`:
- Interfaces: `FichaIndicadorDnp`, `CadenaValorData`, `MedicionIndicadorInput`, `TipoIndicador` (`"insumo" | "producto" | "resultado"`), `SentidoEsperado` (`"ascendente" | "descendente"`).
- Normalizador y cálculo de avance porcentual:
  - Para `ascendente`: `((valorActual - lineaBase) / (meta - lineaBase)) * 100` (con control de división por cero).
  - Para `descendente`: `((lineaBase - valorActual) / (lineaBase - meta)) * 100` (disminuir homicidios es progreso positivo).
  - Lógica semafórica pericial: verde ($\ge 80\%$), ámbar ($50\% - 79\%$), rojo ($< 50\%$).

#### D. Componente Visual Cadena de Valor (`cadena-valor-tab.tsx`)
Crear `src/features/seguimiento/components/cadena-valor-tab.tsx`:
- Cabecera explicativa con insignias metodológicas DNP / SINERGIA / MIPG.
- Diagrama o grid de 3 columnas articuladas:
  1. **Insumos** (Fondo tenue temático, icono representativo de recursos/inversión).
  2. **Productos** (Icono de entrega/cobertura).
  3. **Resultados de Impacto** (Icono de transformación ciudadana).
- Flechas o conectores visuales que expresan la relación causal: `Insumos ➔ Productos ➔ Resultados`.
- Cada tarjeta de indicador debe mostrar:
  - Código DNP (ej. `IND-RES-01`) y Tipo.
  - Nombre del indicador.
  - Entidad responsable de reporte (Secretaría del Interior, Distriseguridad, Observatorio del Delito, etc.).
  - Sentido esperado con badge (Ascendente ↗ / Descendente ↘).
  - Línea Base vs Meta Cuatrienio vs Valor Actual con su unidad de medida.
  - Barra de progreso con color semántico según el cumplimiento.
  - Botón: *"Ver Ficha Técnica DNP"* que abre el panel lateral Zero-Modals.

#### E. Panel Lateral Zero-Modals: Ficha Técnica DNP (`indicador-detalle-panel.tsx`)
Crear `src/features/seguimiento/panels/indicador-detalle-panel.tsx`:
- ID: `"indicador-detalle"`.
- Montado estrictamente sobre `PanelShell` de `@/shared/ui/panel-shell`.
- Registrar en `panel-store.ts` (`PanelType` y `PanelPropsMap`) cumpliendo la Regla UI004.
- Registrar en `panel-registry.tsx` con carga dinámica y ancho fluido `min(clamp(720px, 50vw, 1000px), 100vw)`.
- Contenido del panel:
  - Código DNP, nombre, tipo de eslabón (Insumo/Producto/Resultado).
  - Definición metodológica oficial y método de cálculo matemático.
  - Periodicidad y Fuente de datos oficial de Cartagena.
  - Metas anualizadas y meta cuatrienal 2026–2029.
  - Formulario de Registro de Medición: período, fecha de corte, valor medido, observaciones, URL de evidencia documental.
  - **Modo solo lectura inmutable**: Si el usuario autenticado tiene el rol `auditor_forense`, el formulario se inhabilita mostrando el badge pericial de trazabilidad.

#### F. Store Reactivo y Pruebas Unitarias (`cadena-valor-store.ts`, `cadena-valor-store.test.ts`)
- Store Zustand para gestionar la carga de indicadores, selección de indicador activo, registro de mediciones locales y recálculo automático de porcentajes de cumplimiento.
- Suite de pruebas unitarias cubriendo:
  - Carga y normalización de la cadena de valor.
  - Cálculo correcto de avance para indicadores de sentido ascendente vs descendente.
  - Registro de nueva medición y actualización de valor actual.
  - Verificación de permisos y control de acceso.

#### G. Control de Acceso (`acceso.ts`, `acceso.test.ts`)
- En `src/features/plataforma/models/acceso.ts`:
  - Permitir el panel `"indicador-detalle"` en `panelPermitido` para los roles: `autoridad_distrital`, `auditor_forense`, `administrador_identidades`.
- En `src/features/plataforma/models/acceso.test.ts`:
  - Validar que el panel `"indicador-detalle"` esté habilitado para los roles correspondientes.

---

### 3. Checklist de Validación Estricta de Quality Gates
1. `node scripts/ui-policy.mjs`: **0 violaciones**. Cero diálogos flotantes, solo componentes `@/shared/ui/*`, 100% variables y tokens semánticos CSS.
2. `bun run typecheck`: **0 errores de TypeScript**.
3. `bun run lint`: **0 errores de ESLint**.
4. `bun run check`: **Aprobado con código de salida 0**.
5. `bun test`: **100% de suites y aserciones pasando**.
6. `bun run build`: Compilación de producción con Turbopack exitosa.
7. `systemctl restart polis-frontend.service` y verificar:
   `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/seguimiento` -> **HTTP 200 OK**.
8. Commits de Git con mensajes convencionales claros.
9. Actualizar `/root/polis/bridge/02_entrega_agy2.md`.
10. **NOTIFICACIÓN OBLIGATORIA A ANTIGRAVITY**:
    Ejecutar al terminar:
    `tmux send-keys -t agy "He terminado la entrega del Hito PAS-2 (Cadena de Valor SINERGIA DNP). Documentado en 02_entrega_agy2.md y listo para auditar." Enter`
