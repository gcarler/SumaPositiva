# 🛡️ PLAN MAESTRO DE BLINDAJE PERIMETRAL, GEOPROCESAMIENTO AVANZADO Y RESILIENCIA INSTITUCIONAL
## POLIS — POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL (CARTAGENA DE INDIAS, 2026)

**Versión:** 1.0 — Defensiva y Territorial  
**Fecha de Promulgación:** Domingo, 11 de Octubre de 2026  
**Coordinador General y Auditor Forense EAF:** `agy` (`tmux a -t agy`)  
**Equipo de Desarrollo / EDD:** `agy2` (`tmux a -t agy2`)  
**Estado:** VIGENTE / EN EJECUCIÓN SECUENCIAL  

---

## 🏛️ 1. Justificación y Objetivos Estratégicos

Habiendo alcanzado el 100% de completitud funcional, consistencia estructural y súper-tuning de base de datos con la suite espacial de PostGIS y PostgreSQL 18, la plataforma POLIS 2026 requiere dar el salto hacia un **sistema de inteligencia territorial de grado de defensa e inexpugnabilidad operativa**.

Este Plan Maestro tiene por objeto ejecutar, de manera secuencial, modular y auditada, las mejoras indispensables en cuatro frentes:
1. **Seguridad Perimetral y Hardening:** Aislamiento de servicios a localhost, activación del cortafuegos UFW y endurecimiento de Nginx con Rate Limiting y SSL TLS 1.3 estricto.
2. **Explotación Práctica de Geoprocesamiento:** Normalización de direcciones cartageneras mediante `address_standardizer` y cálculo de isócronas de accesibilidad y ruteo de seguridad humana con `pgrouting`.
3. **Observabilidad Forense y Alta Disponibilidad:** Panel de monitoreo de consultas lentas en vivo con `pg_stat_statements` en `/plataforma/configuracion`.
4. **Fe Pública y Recuperación Offsite:** Generación de actas ejecutivas en PDF con código QR y replicación remota de respaldos GFS fuera del servidor.

---

## 🗺️ 2. Estructura de Fases y Tareas Atómicas

```
PLAN MAESTRO (3 Fases / 6 Tareas Atómicas)
├── FASE 1: Blindaje Perimetral, Seguridad de Red y Hardening de Servidor [100% CULMINADA Y CERTIFICADA]
│   ├── [SEC-HARDEN-01] Hardening de Puertos, Aislamiento Next.js y UFW [APROBADA - Commit 18a4293]
│   └── [SEC-HARDEN-02] Endurecimiento Nginx: Rate Limiting y Redirección 301 [APROBADA - Commit 6ca999e]
│
├── FASE 2: Explotación Activa de Geoprocesamiento y Normalización Territorial [100% CULMINADA Y CERTIFICADA]
│   ├── [GEO-PROC-01] Normalizador Inteligente de Direcciones (address_standardizer) [APROBADA - Commit 5afd960]
│   └── [GEO-PROC-02] Isócronas de Accesibilidad y Ruteo (pgrouting) [APROBADA - Commit 7fde662]
│
└── FASE 3: Observabilidad Forense SQL, Fe Pública en PDF y Resiliencia Offsite [EN EJECUCIÓN]
    ├── [OPS-FORENSIC-01] Panel de Telemetría SQL en Vivo (pg_stat_statements) [EN PROCESO / ASIGNACIÓN]
    └── [FE-PUBLICA-01] Generación de Actas Formales en PDF con QR y Respaldo Offsite [PENDIENTE]
```

---

## 📋 3. Detalle de Tareas y Criterios de Aceptación

### FASE 1: Blindaje Perimetral, Seguridad de Red y Hardening de Servidor

#### 1. `[SEC-HARDEN-01]` Hardening de Puertos, Aislamiento Next.js a Localhost y Firewall UFW
- **Objetivo:** Eliminar la exposición de puertos internos al exterior y activar el filtrado perimetral estricto.
- **Acciones Técnicas:**
  1. Configurar `polis-frontend.service` con `Environment=HOSTNAME=127.0.0.1` en lugar de `0.0.0.0` para que el puerto 3000 sea inaccesible directamente desde internet y solo Nginx pueda acceder a él.
  2. Configurar UFW (Uncomplicated Firewall):
     - Política por defecto: `default deny incoming`, `default allow outgoing`.
     - Reglas permitidas estrictas: Puerto SSH administrativo **777/tcp**, Web HTTP **80/tcp** y HTTPS **443/tcp**.
     - Comprobación de que no se pierda la sesión SSH en puerto 777.
     - Activar UFW (`ufw --force enable`).
  3. Verificar que `fail2ban` supervise el puerto 777 y los accesos fallidos de Nginx.
- **Criterio de Aceptación:** `ufw status` activo, puertos internos cerrados a internet, servicios web accesibles únicamente por 80/443 a través de Nginx con SSL.

#### 2. `[SEC-HARDEN-02]` Endurecimiento Nginx: Rate Limiting, Redirección 301 Universal y Cabeceras
- **Objetivo:** Blindar el servidor web contra ataques de denegación de servicio (DoS), saturación de votos cívicos y accesos HTTP inseguros.
- **Acciones Técnicas:**
  1. Configurar `limit_req_zone` en Nginx:
     - Zona general de API: 20 req/s con burst de 40.
     - Zona estricta para formularios cívicos (`/asistencia/`, `/barrio`, `/f/`): 5 req/s con burst de 10 para prevenir votos o registros automatizados.
  2. Corregir el bloque de puerto 80 para que aplique `return 301 https://$host$request_uri;` incondicionalmente a todos los dominios distritales, eliminando cualquier retorno 404 accidental.
  3. Endurecer cabeceras de seguridad: `Strict-Transport-Security` con `preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`.
- **Criterio de Aceptación:** `nginx -t` exitoso, petición de prueba a puerto 80 retorna 301 a HTTPS, prueba de saturación de peticiones responde HTTP 429 Too Many Requests de forma controlada.

---

### FASE 2: Explotación Activa de Geoprocesamiento y Normalización Territorial

#### 3. `[GEO-PROC-01]` Normalizador Inteligente de Direcciones Cartageneras (`address_standardizer`)
- **Objetivo:** Permitir la captura y georreferenciación fluida de direcciones atípicas de los sectores populares e insulares de Cartagena.
- **Acciones Técnicas:**
  1. Implementar servicio en `backend/app/modules/geodatos/` que consuma `address_standardizer` de PostGIS configurado para léxico cartagenero (sectores, manzanas, lotes, corregimientos).
  2. Exponer endpoint `POST /api/v1/geodatos/estandarizar-direccion` que reciba texto libre y devuelva estructura estandarizada (vía, número, sector, barrio, coordenadas estimadas si existen en `geodatos.territorios`).
  3. Integrar sugerencias/autocompletado en el formulario del Modo Barrio (`/barrio`) y Asistencia a Mesas (`/asistencia/`).
  4. Suite de pruebas unitarias en `backend/tests/` y `src/features/`.
- **Criterio de Aceptación:** Direcciones populares ("Olaya sector Playas Blancas", "Pozón sector 1ro de Mayo") reconocidas y parseadas con código 200 OK.

#### 4. `[GEO-PROC-02]` Isócronas de Accesibilidad y Ruteo de Protección Ciudadana (`pgrouting`)
- **Objetivo:** Calcular tiempos de respuesta y polígonos de cobertura (5, 10 y 15 minutos) a pie y en vehículo hacia centros de seguridad y convivencia.
- **Acciones Técnicas:**
  1. Modelar la red de caminos y vías principales de Cartagena en esquema `geodatos` con topología para pgRouting.
  2. Implementar servicio de cálculo de isócronas (algoritmo Dijkstra / Driving Distance) hacia los CAI, Estaciones de Policía y centros asistenciales.
  3. Exponer endpoint `GET /api/v1/geodatos/isocronas` en FastAPI.
  4. Visualizar las capas de cobertura e isócronas en el Geovisor Distrital (`/plataforma/geovisor`).
- **Criterio de Aceptación:** Consulta de isócrona responde GeoJSON válido con tiempos de traslado calculados matemáticamente.

---

### FASE 3: Observabilidad Forense SQL, Fe Pública en PDF y Resiliencia Offsite

#### 5. `[OPS-FORENSIC-01]` Panel de Telemetría SQL en Vivo (`pg_stat_statements`) en `/plataforma/configuracion`
- **Objetivo:** Dotar a las autoridades distritales de visibilidad completa del rendimiento de base de datos sin salir de la plataforma.
- **Acciones Técnicas:**
  1. Crear endpoint seguro `GET /api/v1/health/database/queries` que consulte `pg_stat_statements` retornando: top 10 consultas más pesadas, tiempo total, promedio en ms, llamadas y lecturas de bloques.
  2. Implementar vista/pestaña reactiva en `/plataforma/configuracion` con gráficas y tablas de rendimiento de base de datos.
  3. Cero exposición de datos sensibles en las consultas SQL expuestas (parámetros sanitizados).
- **Criterio de Aceptación:** Vista de telemetría cargando en caliente con latencia <50 ms y métricas en tiempo real.

#### 6. `[FE-PUBLICA-01]` Generación de Actas Formales en PDF con QR y Replicación Externa de Respaldos
- **Objetivo:** Garantizar la fe pública física comunitaria y la inviolabilidad de los datos ante pérdidas totales de infraestructura.
- **Acciones Técnicas:**
  1. Implementar motor de exportación PDF institucional para las 33 mesas de diálogo territorial: cabecera distrital, relatoría, acuerdos comunitarios, firmas de fe pública y código QR verificable con firma digital.
  2. Desarrollar script de sincronización offsite `scripts/respaldo_offsite.sh` que empaquete los respaldos GFS y los replique hacia almacenamiento externo secundario (SFTP/Cloud/rsync seguro).
- **Criterio de Aceptación:** Descarga de PDF de acta funcional con QR legible que valida el radicado en la plataforma, y verificación de script offsite.

---

## 🔒 4. Salvaguardas Inviolables

1. **Inviolabilidad de la Base de Datos (`bd_csh`):** Las 33 mesas de diálogo, 36 agendas comunitarias, 11 fichas técnicas y 17 actores estratégicos permanecen 100% intactos.
2. **Cero Caída de Acceso SSH (Puerto 777):** Cualquier modificación de firewall debe garantizar la persistencia ininterrumpida de la sesión de administración remota en el puerto 777.
3. **Protocolo Zero-Push:** Todo cambio se consolida exclusivamente en commits atómicos locales en la rama `main`.
4. **Quality Gates Obligatorios:** Ninguna tarea se da por aprobada sin pasar `bun run ui:check`, `bun run check`, `bun test`, `pytest` y `bun run build`.

---

## 🔄 5. Protocolo de Ejecución y Contra-Auditoría

Para cada una de las 6 tareas:
1. `agy` formaliza la orden técnica en [`bridge/01_tarea_activa.md`](file:///root/polis/bridge/01_tarea_activa.md), registra commit y la despacha a `agy2`.
2. `agy2` ejecuta los cambios técnicos, valida Quality Gates y documenta hallazgos en [`bridge/02_resultado_agy2.md`](file:///root/polis/bridge/02_resultado_agy2.md) con commit local.
3. `agy` ejecuta de forma independiente la contra-auditoría forense, corrobora en caliente, emite dictamen formal en [`bridge/03_dictamen_revision.md`](file:///root/polis/bridge/03_dictamen_revision.md), formaliza commit y despacha la siguiente orden.
