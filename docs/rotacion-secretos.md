# Protocolo de Rotación de Secretos y Consolidación de Historial (AUD-11)

**Plataforma POLIS — Política Pública de Seguridad y Convivencia Ciudadana de Cartagena de Indias**  
**Fecha de emisión**: Octubre 2026  
**Clasificación**: Guía Operativa de Seguridad y Despliegue  

---

## 1. Contexto y Justificación Forense

Durante las fases iniciales de desarrollo local, se utilizaron credenciales de prueba predeterminadas (tales como la contraseña de base de datos `polis_cartagena_2026` y secretos JWT provisionales). Dichos literales quedaron registrados en commits históricos del árbol git local.

Dado que el repositorio **nunca ha sido sincronizado a un remoto (`git push`)**, existe una ventana de oportunidad crítica para sanear completamente el entorno:
1. Erradicar de manera permanente cualquier credencial en el código fuente actual y scripts operativos.
2. Rotar todas las credenciales de base de datos y llaves criptográficas antes del aprovisionamiento o conexión a cualquier remoto público o privado.
3. Consolidar el historial de git mediante una estrategia de *squash* por fases, asegurando que la historia publicada no contenga secretos obsoletos ni rastros de archivos excluidos.

---

## 2. Procedimiento de Rotación de Secretos

### 2.0. Método Automatizado Recomendado (`scripts/rotar_secretos_produccion.py`)

Para evitar errores manuales, el sistema dispone de un script administrativo de rotación criptográfica:

```bash
# 1. Simulación previa (dry-run): inspecciona cambios sin alterar archivos
python3 scripts/rotar_secretos_produccion.py --dry-run --con-bd

# 2. Ejecutar rotación de llaves JWT y Salt de IP (con respaldo atómico .env 0600):
python3 scripts/rotar_secretos_produccion.py

# 3. O bien, rotación integral incluyendo credenciales de PostgreSQL:
python3 scripts/rotar_secretos_produccion.py --con-bd

# 4. Reiniciar backend para invalidar sesiones previas y recargar llaves
sudo systemctl restart polis-backend
```

### 2.1. Rotación Manual de Credenciales de Base de Datos (PostgreSQL)

Para actualizar la contraseña del usuario `polis` en el cluster de PostgreSQL:

```bash
# 1. Generar una nueva contraseña criptográficamente segura (mínimo 32 caracteres)
NUEVA_PASS_BD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9_-' | head -c 32)
echo "Nueva contraseña generada para postgres: [GUARDAR_EN_GESTOR_DE_SECRETOS]"

# 2. Aplicar el cambio de contraseña en PostgreSQL vía socket administrativo
sudo -u postgres psql -c "ALTER ROLE polis WITH PASSWORD '${NUEVA_PASS_BD}';"

# 3. Actualizar la variable POLIS_DATABASE_URL en backend/.env (archivo local no versionado)
sed -i "s|POLIS_DATABASE_URL=postgresql+asyncpg://polis:[^@]*@|POLIS_DATABASE_URL=postgresql+asyncpg://polis:${NUEVA_PASS_BD}@|" /root/polis/backend/.env

# 4. Reiniciar los servicios del sistema para recargar las credenciales
sudo systemctl restart polis-backend
sudo systemctl status polis-backend --no-pager
```

### 2.2. Rotación de Llaves Criptográficas (JWT e IP Salt)

La autenticación de usuarios y el anonimizado de direcciones IP para auditoría de Habeas Data dependen de dos secretos maestros de 256 bits:

```bash
# 1. Generar nuevos secretos de 64 caracteres hexadecimales (256 bits)
NUEVO_JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
NUEVO_IP_SALT=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# 2. Configurar en backend/.env
sed -i "s|^POLIS_JWT_SECRET_KEY=.*|POLIS_JWT_SECRET_KEY=${NUEVO_JWT_SECRET}|" /root/polis/backend/.env
sed -i "s|^POLIS_IP_SALT=.*|POLIS_IP_SALT=${NUEVO_IP_SALT}|" /root/polis/backend/.env

# 3. Reiniciar backend para invalidar sesiones previas
sudo systemctl restart polis-backend
```

> **Efecto operativo**: La rotación de `POLIS_JWT_SECRET_KEY` invalida inmediatamente todos los tokens de sesión emitidos previamente, forzando un inicio de sesión limpio para todos los operadores y administradores.

---

## 3. Higiene de Entornos y Aislamiento de Pruebas

Para garantizar que los scripts de prueba y automatización no comprometan las bases productivas:

1. **Scripts Demo (`scripts/sembrar_*_demo.py`)**:
   - Apuntan por defecto a `polis_demo`.
   - Cuentan con guardia activa de base de datos (`validar_bd_destino`): se niegan a ejecutarse si la base de datos no inicia por `polis_test` o `polis_demo`, requiriendo explícitamente `--confirmar-bd-destino` para anular la protección.

2. **Entorno Aislado E2E (`scripts/e2e-smoke-flujos-criticos.mjs`)**:
   - Backend temporal en puerto `8100`.
   - Frontend temporal en puerto `3100` con proxy en `3105`.
   - Base de datos clonada exclusivamente a `polis_test_e2e`.
   - Limpieza defensiva de procesos zombies (`limpiarPuertos`): restringida exclusivamente a los puertos de prueba `8100`, `3100` y `3105` vía `fuser -k`, protegiendo en todo momento los puertos productivos `8000` y `3000`.

3. **Archivos Excluidos del Rastreo Git**:
   - `.env`, `.env.*`, `backend/.env` excluidos en `.gitignore`.
   - `*.db`, `bridge/*.db`, `db/*.db` excluidos en `.gitignore`.
   - Ningún archivo `.env` o `.db` permanece en el índice (`git ls-files`).

---

## 4. Plan de Consolidación de Historial Git (Squash por Fases)

Para la publicación definitiva del repositorio a un origen remoto (ej. GitHub, GitLab institucional), se debe evitar arrastrar el historial granular de depuración y correcciones intermedias que contuvo secretos en commits pasados.

### 4.1. Estructura de Fases Propuesta

Se propone consolidar los commits en tres grandes hitos convencionales:

1. **Fase 1: Arquitectura Base y Diagnóstico Territorial**
   - Estructura de módulos FastAPI y Next.js.
   - Esquemas de base de datos PostgreSQL/PostGIS iniciales.
   - Módulos de Geovisor, Mesas de Trabajo y Diagnóstico Territorial.
   - Mensaje sugerido: `feat(fase-1): arquitectura base, geodatos y diagnostico territorial`

2. **Fase 2: Motor de Políticas, Alternativas y Gating de Fases**
   - Motor de validación de políticas públicas.
   - Alternativas estratégicas y dimensiones del Plan Integral.
   - Matriz de gobernanza y control de fases (Fase 1, Fase 2, Fase 3) con gating estricto.
   - Mensaje sugerido: `feat(fase-2): motor de politicas, alternativas y gating de transicion`

3. **Fase 3: Seguimiento, Hardening de Seguridad e Integridad Forense**
   - Sistema de rendición de cuentas, compromisos PAS e indicadores DNP/SINERGIA.
   - Erradicación de datos fabricados y fijación de procedencia trazable.
   - Aislamiento de suites de prueba, accesibilidad WCAG AA y robustez E2E.
   - Higiene de repositorio, eliminación de credenciales en código y guardas de seguridad.
   - Mensaje sugerido: `feat(fase-3): seguimiento integral, hardening de seguridad e higiene de repositorio`

### 4.2. Procedimiento de Ejecución del Squash

Antes de ejecutar la consolidación, se debe asegurar que la rama de trabajo actual se encuentre commiteada y limpia:

```bash
# 1. Crear una rama de respaldo del árbol de desarrollo completo
git branch backup-desarrollo-auditorias

# 2. Crear una rama limpia sin ancestros (orphan) para la publicación pública
git checkout --orphan public-release

# 3. Agregar los archivos saneados asegurando exclusión de artefactos locales
git add .
# Verificar que ningún .env ni .db esté incluido:
git status

# 4. Alternativamente, si se preserva el árbol lineal estructurado, utilizar rebase interactivo:
# git rebase -i --root
# (marcando 'pick' en el commit inicial de cada fase y 'squash' en los intermedios correspondientes)

# 5. Verificación final pre-push:
git ls-files | grep -E "(\.env|\.db)$" # Debe retornar vacío
git grep -n "polis_cartagena_2026" src/ backend/ scripts/ # Debe retornar vacío
```

---

## 5. Matriz de Cumplimiento de Recomendaciones (OBS-13 / OBS-14)

| Requisito / Observación | Estado | Mecanismo de Implementación |
| :--- | :---: | :--- |
| **OBS-13: Credenciales de BD en código** | RESUELTO | Eliminadas de `conftest.py`, `respaldo_bd.sh`, `restaurar_bd.sh`, `sembrar_*_demo.py`. Se resuelven desde variables de entorno o `.env` local. |
| **OBS-13: Guardas en scripts demo** | RESUELTO | `validar_bd_destino` prohíbe ejecución contra `bd_csh`; destino predeterminado `polis_demo`. Requiere `--confirmar-bd-destino` explícito. |
| **OBS-13: JWT default en config.py** | RESUELTO | `jwt_secret_key` definido como `Field(..., min_length=32)` obligatorio; sin valores inseguros por defecto. |
| **OBS-14: Credenciales en scripts E2E** | RESUELTO | `scripts/e2e-smoke-flujos-criticos.mjs` y `scripts/preparar_entorno_e2e.py` resuelven contraseña dinámicamente sin credenciales hardcodeadas. |
| **OBS-14: Manejo defensivo de puertos** | RESUELTO | `fuser -k` acotado exclusivamente a puertos de prueba aislados (`8100`, `3100`, `3105`), documentado técnicamente en el script. |
| **AUD-11: Higiene de índice git** | RESUELTO | `.env` y bases `.db` eliminadas del índice (`git rm --cached`). `.gitignore` reforzado. Cero push a remoto. |
