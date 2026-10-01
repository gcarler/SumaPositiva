# Dictamen de Auditoría — Agenda de Mesas POLIS
Fecha: 2026-10-01
Módulo: Agenda de Mesas de Trabajo (oct 15 – dic 11 de 2026)

## 1. Auditoría de Política Pública
### 1.1 Grupos diferenciales
Las 8 mesas poblacionales cubren los grupos diferenciales mencionados: Adulto Mayor (mp-001), Niñez (mp-002), LGBTIQ+ (mp-003), Discapacidad (mp-004), Juventud (mp-005), Mujeres (mp-006), Víctimas (mp-007) y Comunidades Étnicas (mp-008). **Conforme**.

### 1.2 Comunidades étnicas
Se incluyen mesas para La Boquilla, Pasacaballos, Tierrabomba, Bocachica e Islas del Rosario. Sin embargo, **falta la comunidad de Barú** dentro de las mesas rurales/insulares programadas.

### 1.3 Dimensiones ONU
Las mesas sectoriales cubren las 7 dimensiones ONU de Seguridad Humana (Económica, Alimentaria, Salud, Ambiental, Personal, Comunitaria, Política). **Conforme**.

### 1.4 Marco legal
Existe una mesa sectorial de Construcción de Paz y Reconciliación (ms-011) conforme a la Ley 2272/2022. Sin embargo, en la plenaria de cierre (pc-001) **no se menciona explícitamente la "devolución ciudadana motivada"** exigida jurisprudencialmente (Sentencia C-150/15).

### 1.5 Fechas y festivos
Las fechas programadas son días hábiles (martes a sábado para algunas) y no caen en domingos ni festivos nacionales. **Conforme**.

## 2. Auditoría Técnica Frontend
### 2.1 Zero-Modals
Se cumple la regla. Toda la edición y creación se realiza utilizando el componente `PanelShell` (`mesa-editor-panel.tsx`) que forma parte de la pila de paneles y no con dialogs centrados. **Conforme**.

### 2.2 Tokens CSS
Se utilizan tokens semánticos correctamente (ej: `bg-surface-1`, `text-ember`, `border-border`, etc.). **Conforme**.

### 2.3 TypeScript
No se evidencia uso de `any` en los archivos analizados. En el panel de edición se usa `unknown` temporalmente de forma segura. **Conforme**.

### 2.4 Accesibilidad
**No conforme**. El botón de "Editar" en la vista de tarjetas (`mesas-view.tsx`) carece de un `aria-label` descriptivo. Para los usuarios de lectores de pantalla, tener múltiples botones que sólo digan "Editar" no brinda contexto sobre qué mesa se está editando.

### 2.5 Rendimiento
Se utiliza `useMemo` correctamente para `conteo` y `mesasFiltradas`, con los arreglos de dependencias completos. El store de Zustand es consumido de forma reactiva correcta mediante selectores. **Conforme**.

## 3. Auditoría del Store
La función de derivación inicial `MESAS_AGENDA_INICIAL` en `mesas-store.ts` mapea `realizada` a `cerrada`, `en_curso` a `en_curso` y cualquier otro estado cae por defecto en `programada`. Esto implica que si una mesa tiene estado original `cancelada` o `reprogramada`, será cargada en el store como `programada`, lo que es un bug lógico. Por otro lado, `actualizarMesa` está implementada de manera inmutable correcta y permite editar los campos.

## 4. Observaciones y Correcciones Requeridas

1. **Archivo:** `/root/polis/src/features/mesas/data/agenda.data.ts` (Añadir Barú)
   - **Corrección:** Se debe agregar una mesa rural para el corregimiento de Barú en el bloque de mesas rurales e insulares, para cubrir esta comunidad étnica faltante.

2. **Archivo:** `/root/polis/src/features/mesas/data/agenda.data.ts` (Plenaria de cierre)
   - **Línea:** ~477
   - **Corrección:** En `observaciones` de la mesa `pc-001`, agregar explícitamente el texto "Incluye espacio de devolución ciudadana motivada (Sentencia C-150/15)".

3. **Archivo:** `/root/polis/src/features/mesas/state/mesas-store.ts` (Mapeo de estado)
   - **Línea:** ~185-189
   - **Corrección:** Modificar el operador ternario para que `cancelada` o `reprogramada` también puedan ser representadas, o se descarten si el tipo de estado destino no los soporta. Actualmente fuerzan que parezca "programada".

4. **Archivo:** `/root/polis/src/features/plataforma/views/mesas-view.tsx` (Accesibilidad botón editar)
   - **Línea:** ~510
   - **Corrección:** Agregar el atributo `aria-label` al botón de Editar:
     `<Button variant="ghost" size="sm" aria-label={\`Editar \${m.nombre}\`} onClick={() => openPanel("mesa-editor", { mesaId: m.id })} ...>`

## 5. Dictamen Final
**CONFORME CON OBSERVACIONES**
Justificación: La implementación base es robusta, con muy buen uso de las directivas arquitectónicas como zero-modals y tokens semánticos, además de cobertura casi total de los requerimientos de la política pública. Se requieren ajustes menores de accesibilidad (`aria-label`), precisión en la cobertura territorial (faltó Barú), detalle jurisprudencial en el cierre y un pequeño arreglo en el mapeo inicial de estados en el store. Una vez corregidos, estará 100% conforme.
