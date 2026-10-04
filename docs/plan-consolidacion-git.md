# Plan de Consolidación de Historial Git y Checklist Pre-Remoto

**Plataforma POLIS — Política Pública de Seguridad y Convivencia Ciudadana de Cartagena de Indias (2026–2036)**  
**Fecha de emisión**: Octubre 2026  
**Clasificación**: Estrategia de Versionamiento y Seguridad Forense (AUD-17)  
**Estado**: PLAN TÉCNICO FORMAL — **PROHIBIDO EJECUTAR EN AUD-17** (Solo documentación y verificación)

---

## 1. Contexto, Diagnóstico y Justificación Forense

### 1.1. Diagnóstico del Árbol Git Actual
El repositorio de POLIS cuenta a la fecha con un historial lineal de **170 commits** acumulados durante las fases de prototipado, auditoría forense (AUD-01 a AUD-17) y subsanación de observaciones técnicas (OBS-01 a OBS-19).

Un rasgo determinante de seguridad es que **el repositorio es estrictamente local**:
- Nunca se ha ejecutado `git push` hacia un servidor remoto (GitHub, GitLab, servidores distritales).
- No existen remotos configurados (`git remote -v` se encuentra vacío).

### 1.2. Justificación de la Consolidación
Durante los primeros commits de desarrollo se utilizaron valores predeterminados de prueba que incluían:
- La contraseña de PostgreSQL local `polis_cartagena_2026` (introducida en el commit `a1e510b` y presente en varios commits intermedios).
- Claves provisionales de prueba para JWT y sales de IP.
- Archivos `.env` y bases SQLite temporales que fueron rastreados antes de consolidar el `.gitignore`.

Aunque en la tarea **AUD-11 (commit `499affd`)** se erradicó totalmente cualquier credencial del código fuente activo y se retiraron los archivos del índice mediante `git rm --cached`, **los objetos de los commits históricos todavía contienen esas cadenas en sus snapshots internos**.

Si se conectara un origen remoto y se hiciera `git push` sin consolidar, todo el historial con contraseñas obsoletas quedaría expuesto en el servidor remoto. Por ende, la consolidación (squash) es un requisito mandatorio de saneamiento pre-remoto.

---

## 2. Checklist Mandatoria Previa a Crear el Remoto

Antes de ejecutar los comandos `git remote add origin <URL>` y `git push`:

| # | Control de Seguridad | Verificación Técnica Requerida | Estado Actual |
| :---: | :--- | :--- | :---: |
| **1** | **Rotación de Contraseña de Base de Datos** | Modificar la contraseña del usuario `polis` en PostgreSQL (`ALTER ROLE polis WITH PASSWORD '...'`) y actualizar `POLIS_DATABASE_URL` en `backend/.env`. La contraseña antigua `polis_cartagena_2026` debe quedar inhabilitada. | **Pendiente de ejecución al crear remoto** (detallado en `docs/rotacion-secretos.md`) |
| **2** | **Rotación de Secretos JWT e IP Salt** | Generar nuevas cadenas de 256 bits (`secrets.token_hex(32)`) para `POLIS_JWT_SECRET_KEY` y `POLIS_IP_SALT`. Esto invalida tokens previos y renueva la semilla de anonimización. | **Pendiente de ejecución al crear remoto** |
| **3** | **Auditoría de Historial con `git log -S`** | Ejecutar búsqueda de cadenas sensibles en el historial: `git log -S "polis_cartagena_2026" --oneline`. En el árbol consolidado resultante, esta búsqueda **debe arrojar 0 commits**. | **Verificado**: En árbol actual arroja 10 commits históricos; se purgará con el squash. |
| **4** | **Verificación Estricta de `.gitignore`** | Certificar que `.env`, `.env.*`, `backend/.env`, `*.db`, `bridge/*.db` estén explícitamente ignorados. | **Conforme**: `.gitignore` actualizado y probado con `git check-ignore`. |
| **5** | **Higiene del Índice Git (`git ls-files`)** | Ejecutar `git ls-files \| grep -E "(\.env\|\.db)$"`. Debe retornar vacío. | **Conforme**: Cero archivos sensibles en el índice desde AUD-11. |
| **6** | **Cero Mocks y Cero PII en Código** | Certificar que `src/` no contenga datos personales de prueba ni importe mocks en componentes productivos (`no-production-mocks.test.ts`). | **Conforme**: Verificado en AUD-14 y AUD-15. |
| **7** | **Reincorporación de Linter en Codex** | Retirar las excepciones de `noticias` y `testimonios` en `eslint.config.mjs` una vez Codex entregue su código final (OBS-19). | **Pendiente al cierre de Codex** |

---

## 3. Plan de Squash por Fases Propuesto

Para estructurar una historia de cambios profesional, trazable y libre de artefactos de depuración intermedia, los 170 commits se consolidarán en **5 hitos convencionales**:

### Hito 1: Fase 1 — Arquitectura Base, Geodatos y Diagnóstico Territorial
- **Alcance**:
  - Estructura monolítica modular FastAPI (`backend/`) y Next.js 16 (`src/`).
  - Esquema de base de datos base (migraciones Alembic 0001 a 0015).
  - Geovisor territorial con soporte PostGIS (UCG, comunas, corregimientos, polígonos).
  - Módulos de Mesas de Trabajo y Diagnóstico Territorial cuantitativo.
- **Mensaje Convencional Sugerido**:
  ```text
  feat(fase-1): arquitectura base, geodatos y diagnostico territorial distrital
  ```

### Hito 2: Fase 2 — Formulación Estratégica, Motor de Políticas y Alternativas MGA
- **Alcance**:
  - Motor de validación de políticas públicas MGA (árbol de problemas y objetivos).
  - Banco de soluciones y alternativas estratégicas para Cartagena de Indias.
  - Tablero de costeo presupuestal y estimación de fuentes de financiación (migraciones 0016 a 0023).
  - Agente neurosimbólico para viabilidad técnica y normativa.
- **Mensaje Convencional Sugerido**:
  ```text
  feat(fase-2): motor de politicas, banco de alternativas mga y costeo presupuestal
  ```

### Hito 3: Fase 3 — Plan de Acción, Seguimiento PAS, SINERGIA DNP y Rendición C-150
- **Alcance**:
  - Tablero de seguimiento de compromisos PAS y cadena de valor (insumo-producto-resultado).
  - Integración de 8 indicadores DNP SINERGIA con fuentes trazables.
  - Mecanismo constitucional de rendición de cuentas y devolución motivada (Sentencia C-150 de 2015) conectado a los 179 aportes ciudadanos reales.
  - Máquina de estados de control de fases DNP con gating estricto y reversión inmediata (migraciones 0024 a 0036).
- **Mensaje Convencional Sugerido**:
  ```text
  feat(fase-3): matriz de seguimiento pas, indicadores dnp y rendicion motivada c-150
  ```

### Hito 4: Módulos Editoriales y Mapeo de Gobernanza Territorial
- **Alcance**:
  - Módulo de comunicación y noticias institucionales con persistencia editorial (migración 0037 Codex).
  - Módulo de testimonios comunitarios y memoria social territorial.
  - Mapeo y registro de actores estratégicos distritales (migración 0040 AUD-14).
  - Unificación de cabezas Alembic (migración 0038 merge).
- **Mensaje Convencional Sugerido**:
  ```text
  feat(gobernanza): comunicacion comunitaria, noticias y actores estrategicos
  ```

### Hito 5: Hardening de Seguridad Forense, Accesibilidad y Calidad Estricta
- **Alcance**:
  - Restitución y purga de datos fabricados en compromisos e indicadores (AUD-01, AUD-02, AUD-13, AUD-14, migración 0039).
  - Higiene estricta de repositorio: erradicación de contraseñas, guardas en scripts demo y exclusión de `.env` (AUD-11, AUD-11b).
  - Accesibilidad WCAG AA certificada con axe-core (0 violaciones serias/críticas en 8 vistas) (AUD-08).
  - Suite de pruebas E2E aisladas con persistencia verificada (AUD-09).
  - Purga de datasets mock en entornos de producción (AUD-15).
  - Endurecimiento de tipado TypeScript y ESLint (`no-explicit-any`, `no-unused-vars`, `ban-ts-comment` en nivel `error`) (AUD-10, AUD-16).
  - Centralización de utilidades CSV seguras contra inyección de fórmulas (AUD-12).
  - Runbooks operativos y documentación de despliegue (AUD-17).
- **Mensaje Convencional Sugerido**:
  ```text
  chore(seguridad): hardening forense, erradicacion de datos fabricados, a11y y tipado estricto
  ```

---

## 4. Guía Metodológica de Ejecución (Paso a Paso Cuando se Autorice)

> [!WARNING]
> Este procedimiento **NO debe ejecutarse en la tarea AUD-17**. Debe aplicarse únicamente en el momento formal de publicación hacia el servidor de control de versiones institucional.

### Opción Recomendada: Rama Huérfana de Publicación Limpia (*Orphan Branch Release*)
Este método garantiza de forma matemática que ningún blob huérfano con secretos históricos permanezca en el árbol que se enviará al remoto:

```bash
# 1. Crear una rama de respaldo inmutable del historial completo de auditoría:
git branch backup-auditoria-completa-170-commits

# 2. Verificar que el árbol de trabajo actual esté perfectamente limpio y compilado:
bun run check
bun test

# 3. Crear una rama huérfana (sin ancestros):
git checkout --orphan main-public

# 4. Asegurar que .gitignore esté activo y que ningún secreto esté presente:
git status
# Verificar que .env y *.db NO aparezcan en los archivos por añadir

# 5. Agregar los archivos saneados:
git add .
git check-ignore backend/.env # Debe confirmar exclusión

# 6. Realizar el commit consolidado inicial limpio:
git commit -m "feat(polis): plataforma de politica publica de seguridad ciudadana cartagena 2026-2036"

# 7. Auditar que la cadena sensible no exista en el nuevo árbol:
git log -S "polis_cartagena_2026" # Debe retornar VACÍO

# 8. Vincular el remoto seguro y publicar:
# git remote add origin https://repositorio.cartagena.gov.co/polis/plataforma.git
# git push -u origin main-public:main
```

### Opción Alternativa: Rebase Interactivo Estructurado por Fases
Si se requiere mantener los 5 hitos convencionales descritos en la Sección 3:

```bash
# 1. Crear rama de trabajo para la consolidación:
git checkout -b release-squash-5-hitos

# 2. Iniciar rebase interactivo desde la raíz:
git rebase -i --root

# 3. En el editor interactivo de git:
#    - Marcar 'pick' en el commit inicial de la Fase 1 y 'squash' (s) en los commits intermedios de Fase 1.
#    - Marcar 'pick' en el commit inicial de la Fase 2 y 'squash' (s) en los commits de Fase 2.
#    - Y así sucesivamente para los 5 hitos.

# 4. Asignar los mensajes convencionales definidos en la Sección 3.

# 5. Verificar con git log que queden exactamente los 5 commits limpios:
git log --oneline
```

---

## 5. Matriz de Trazabilidad entre Observaciones de Auditoría y Squash

| Observación | Descripción | Hito de Consolidación | Salvaguarda Pre-Remoto |
| :--- | :--- | :---: | :--- |
| **OBS-01 / OBS-02** | Datos fabricados en compromisos e indicadores | Hito 5 | El commit consolidado reflejará el esquema saneado sin datos simulados. |
| **OBS-09** | Clave JWT fija por defecto en `config.py` | Hito 5 | Exigencia obligatoria de `POLIS_JWT_SECRET_KEY` sin valores por defecto. |
| **OBS-11 / OBS-12** | Atribución incorrecta al Decreto 037 en compromisos | Hito 5 | Metadatos corregidos indicando catálogo propuesto pendiente de validación. |
| **OBS-13** | Contraseña `polis_cartagena_2026` en archivos históricos | Hito 5 | Eliminada de código en AUD-11; el squash purga los blobs del árbol histórico. |
| **OBS-14** | Contraseña en scripts E2E y puertos zombies | Hito 5 | `E2E_DATABASE_URL` dinámica y `fuser -k` acotado a puertos aislados. |
| **OBS-16 / OBS-19** | Reglas de lint y exclusión temporal de Codex | Hito 5 | Se reintegrarán noticias y testimonios antes de emitir el commit final. |
| **OBS-17** | Contraseña en historial de git | **Pre-Remoto** | Resuelta formalmente mediante la checklist previa y el squash por fases. |
