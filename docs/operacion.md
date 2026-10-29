# Operación y versiones de POLIS

Runbook por entorno. Complementa las reglas del repositorio; rutas, hardware y
objetivos de operación no se convierten en instrucciones universales de EDD/EAF.
No contiene secretos ni sustituye la configuración de cada entorno.

## Contrato reproducible del repositorio

| Componente | Fuente | Baseline |
| --- | --- | --- |
| Backend | `backend/pyproject.toml`, `backend/uv.lock`, workflow `check.yml` | Python 3.12; instalación con `uv sync --project backend --python 3.12 --locked`. |
| Base de datos | `compose.yaml`, `.github/workflows/check.yml` | PostgreSQL 16 / PostGIS 3.5; extensiones y esquema mediante Alembic. |
| Frontend | `package.json`, `bun.lock`, workflow | Dependencias fijadas por `bun install --frozen-lockfile`; CI usa Bun 1.3.4. Framer Motion resuelto a 12.26.2 en la revisión documental de 2026-10-01. |
| Configuración | `backend/app/core/config.py`, ejemplos de entorno | DSN, directorio de uploads y secretos por entorno; conservar `.env` existentes. |

La combinación de base de datos mantenida y comprobada en CI es 16/3.5. El entorno
nativo documentado históricamente como PostgreSQL 18/PostGIS 3.6 es otro perfil:
no se extiende a él la evidencia de CI ni se garantiza una matriz completa de
compatibilidad. Para incorporarlo como combinación soportada, ejecutar migraciones,
pruebas y checks en ese perfil y registrar versiones exactas y resultados.
Las versiones de librerías se leen del lockfile; no se fijan copias en los perfiles.

## Arranque y comprobación

Ejecutar desde la raíz real del checkout; no asumir `/root/polis` ni un `venv`
externo. Seguir [README](../README.md) para arranque y variables. Usar `uv run --project backend ...` para las herramientas del entorno gestionado por uv.

Antes de aplicar una nueva revisión en un entorno operativo, comprobar cabeza de
Alembic, respaldos/restauración correspondientes al cambio y configuración. Ejecutar
`bun run backend:migrate` con el DSN de ese entorno solo cuando esté autorizado.
Las pruebas de integración requieren `POLIS_TEST_DATABASE_URL` explícita en una
base `polis_test*`; las destructivas de downgrade/reconstrucción llevan marcador
`migration` y usan `POLIS_TEST_MIGRATIONS_DATABASE_URL`, otra base `polis_test*`
con nombre distinto. La fixture selecciona ese destino también para el contexto
y la provisión del caso. Sin variable explícita las pruebas correspondientes se
omiten con causa; no se obtiene un DSN de trabajo como respaldo.

La revisión `0019_permisos_gestion` agrega permisos a los roles institucionales y
conserva los demás permisos. Desde `0021_identidad_completa`, cada petición consulta
los permisos actuales en servidor. Los tokens de usuario anteriores al nuevo
contrato de sesión se invalidan; las cuentas deben iniciar sesión de nuevo.

## Asignación controlada de roles institucionales

El registro público crea únicamente ciudadanos. La asignación de `facilitador_mesa`,
`autoridad_distrital` o `auditor_forense` es una operación administrativa fuera de
ese endpoint. La API y el panel administrativo requieren `usuarios:gestionar`;
la verificación de nombramiento/atribuciones institucionales sigue siendo externa.

Un administrador autorizado debe verificar identidad y atribuciones fuera de la
API, identificar la cuenta y el rol canónico, efectuar el cambio desde administración
web/API con motivo y conservar la evidencia de atribuciones en el registro
operativo autorizado. El servicio registra actor, objetivo, fecha y cambio. No publicar
credenciales ni habilitar autorregistro privilegiado para facilitar el bootstrap.
La asignación de rol no acredita por sí misma un nivel de identidad verificado.
Las cuentas institucionales existentes requieren revisión de procedencia: esta
corrección no elimina ni reclasifica cuentas o tokens históricos en producción.

## Colas de aportes y recepción WhatsApp

Contrato de 0084, revisado el 26-oct-2026. Crear o editar un aporte confirma el
cambio y su intención de correo en la misma transacción. La entrega posterior
usa la outbox existente de notificaciones. El webhook confirma la recepción
durable de todo el lote en inbox; HTTP200 no acredita radicación de cada mensaje.
Un consumidor procesa cada mensaje por separado, de modo que un rechazo no pierda
los mensajes válidos posteriores.

El comando finito de consumo es `python -m scripts.procesar_colas_aportes` dentro
del entorno backend. Desde la raíz y con el DSN del entorno autorizado ya
establecido, las dos variantes son:

```bash
PYTHONPATH=backend uv run --project backend python -m scripts.procesar_colas_aportes inbox --limite 50
PYTHONPATH=backend uv run --project backend python -m scripts.procesar_colas_aportes outbox --limite 50
```

El límite admite de 1 a 1000 elementos. Cada invocación termina al agotar ese máximo o
no encontrar trabajo reclamable. Los UUID técnicos, estados e intentos del
resultado sirven para correlación; no publicar payload, correo o teléfono. La
programación periódica y la identidad de ejecución se deben configurar y validar
por entorno después de la revisión de despliegue. La existencia del CLI no
significa que haya un scheduler activo. Supervisar pendientes, fallos,
rechazados, antigüedad, intentos y reclamaciones vencidas; conservar las causas
para revisión autorizada.

La outbox reclama una intención confirmada con lease/token y confirma la
reclamación antes del transporte. Reintenta fallos con espera exponencial y
recupera reclamaciones vencidas. El Message-ID es estable para correlación, pero
si el proveedor acepta y el proceso cae antes de confirmar el resultado puede
haber un reenvío: la garantía es al menos una vez, sin deduplicación garantizada
por el proveedor. Sin SMTP configurado el resultado es `simulado`, con
`enviado_en=NULL` y fecha `simulado_en` separada. No equivale a entrega real.

WhatsApp está deshabilitado por defecto. Para habilitar recepción hacen falta
`POLIS_WHATSAPP_HABILITADO`, `POLIS_WHATSAPP_VERIFY_TOKEN` y
`POLIS_WHATSAPP_APP_SECRET`, definidos como secretos del entorno. No incluir sus
valores en logs o documentos. GET verifica el token y POST exige HMAC SHA-256 del
cuerpo original. La clave de repetición combina cuenta receptora e ID externo;
una reentrega idéntica reutiliza la recepción y una colisión distinta aborta el
lote. La simulación está denegada en producción. Las pruebas con transporte
capturado no acreditan configuración ni entrega de Meta/SMTP reales.

### Migración y retorno desde 0084

Antes del upgrade, provisionar las extensiones requeridas y revisar apoyos
legados sin equivalencia única demostrable con una cuenta. La revisión 0084 rechaza esas
equivalencias ausentes/ambiguas y el contacto legado no textual o mayor de 255
caracteres antes de modificar el esquema. No trunca, convierte o inventa una
persona para completar la migración. Conservar respaldo y journal de filas,
contadores y equivalencias demostradas.

El downgrade es condicionado: bloquea antes de mutación si hay inbox durable,
contacto solo privado o apoyos nuevos sin origen compatible. En los casos
compatibles solo reexpande apoyos consolidados que todavía existen, sin
resucitar retirados; el journal privado queda en auditoría institucional, fuera
de la devolución pública. No forzar un downgrade eliminando esos datos ni
suponer que cambiar al binario anterior sea un retorno aprobado. Los ensayos de
reconstrucción se realizan en la segunda base aislada indicada arriba.

La entrega 183 documenta pruebas del implementador. La evaluación independiente
de los criterios de aportes se registra separadamente en 203; estos comandos y
reglas no constituyen aprobación GO-LIVE, activación de proveedores ni despliegue.

## Perfil histórico de hardware y ajuste

La documentación anterior proponía un servidor de 32 GB RAM, 8 vCPU y NVMe con
`shared_buffers=8GB`, `effective_cache_size=24GB`, `work_mem=64MB`,
`maintenance_work_mem=2GB`, `effective_io_concurrency=200`, `random_page_cost=1.1`.
Son valores de referencia de ese perfil, sin validación de carga adjunta. No
aplicarlos automáticamente: medir conexiones, concurrencia, memoria por consulta,
planes, I/O y comportamiento de autovacuum antes de aprobar un ajuste.

Identificar gestor de servicios, proxy, rutas y puertos del entorno operativo;
no asumir systemd o Nginx para un checkout local. En una auditoría de operación,
registrar configuración efectiva, permisos, restauración y métricas del entorno.

## Objetivos de servicio y recuperación

99.99 % de disponibilidad, latencia inferior a 50 ms y «cero pérdida» eran
aspiraciones, no resultados certificados. Cada objetivo debe acordar responsable,
ventana de medición, población de solicitudes, percentil, carga, tamaño de datos,
exclusiones y fuente de métricas. Respaldos requieren RPO, RTO, retención y
restauración probada. Hasta tener esa definición y evidencia, marcar el objetivo
como propuesto o pendiente; no como cumplimiento de EDD/EAF.


## Módulo de identidad

El contrato, SMTP, worker, bootstrap del primer administrador, revocación y
activación de la migración 0021 están en [usuarios y acceso](identidad.md).
Las asignaciones institucionales posteriores se realizan mediante administración
web/API con permiso `usuarios:gestionar`, motivo y registro de evento. No promover
cuentas existentes mediante cambios SQL improvisados. Los permisos de rol se
consultan de nuevo en cada petición; ya no es necesario esperar un nuevo login
para retirar un permiso. La activación invalida tokens de usuario antiguos.

## Checklist de Despliegue Productivo (AUD-06)

Para certificar el paso de la plataforma POLIS a un entorno de producción seguro y conforme a las exigencias de auditoría forense institucional:

| Control | Requisito Productivo | Mecanismo de Implementación | Verificación Forense |
|---|---|---|---|
| **Entorno de Ejecución** | `POLIS_ENVIRONMENT=production` | Variable en `/root/polis/backend/.env` y systemd service. | `curl http://127.0.0.1:8000/api/v1/docs` devuelve `404 Not Found`. |
| **OpenAPI / Docs** | Deshabilitado en producción (`docs_url=None`, `openapi_url=None`). | FastAPI inicializado condicionalmente en `create_app()`. | `/api/v1/docs` y `/api/v1/openapi.json` inaccesibles para usuarios externos. |
| **CORS Restringido** | Prohibido `localhost`, `127.0.0.1` y HTTP no cifrado. Permitido solo dominio institucional HTTPS. | `cors_origins_efectivos` en `backend/app/core/config.py` y `CORSMiddleware`. | `curl -X OPTIONS -H "Origin: http://localhost:3000"` recibe `400 Disallowed CORS origin`. |
| **Cookies Seguras** | Atributos `Secure`, `HttpOnly` y `SameSite=Lax` en toda cookie de sesión o UI. | Inyección en `/identidad/login`, `sidebar.tsx` y `security_headers_and_cookies_middleware`. | Cabecera `Set-Cookie` inspeccionada contiene directivas `Secure; SameSite=Lax`. |
| **Secretos Fuera de Repo** | Cero contraseñas, sales o llaves privadas en git. | `.env` explícitamente ignorado en `.gitignore`; `.env.example` con placeholders. | `git check-ignore backend/.env` confirma exclusión activa. |
| **Rate Limiting Público** | Prevención de abuso en endpoints abiertos (`/sesion/anonima`, `/identidad/*`). | Ventanas deslizantes y `LimiteAcceso` (30 peticiones / 15 min). | Peticiones recurrentes devuelven `429 Too Many Requests` con `Retry-After`. |
| **Rate Limiting de IA** | Salvaguarda de cómputo en `/api/v1/ia/*` (LangGraph / multi-agente). | Dependencia `limitar_tasa_ia` (30 peticiones / min por actor). | Exceso de llamadas devuelve `HTTP 429` protegiendo los agentes DNP. |
| **Higiene de Logs** | Nivel `INFO` o superior (cero `DEBUG` en producción) y sin datos personales. | Clamping de nivel de log en `main.py` y middleware `log_request` sanitizado. | Logs solo registran plantillas de ruta, status HTTP y latencia en ms. |

### Limitaciones operativas del Rate Limiting en memoria y escalamiento horizontal (OBS-10)

Los controles de tasa por IP implementados en memoria de proceso (como `verificar_tasa_ip` en `/sesion/anonima` y la caché de ventana deslizante en `/ia/*`) operan por instancia de proceso worker (Gunicorn / Uvicorn worker):
1. **Entorno monoproceso / desarrollo**: La ventana deslizante en memoria ofrece protección estricta contra ráfagas y denegación de servicio sin latencia de red adicional.
2. **Entorno multiproceso / producción horizontal**: Al desplegar múltiples workers Uvicorn o réplicas en clúster Kubernetes / contenedor:
   - Las ventanas en memoria quedan particionadas entre los workers locales (el tráfico balanceado por round-robin distribuye el contador entre procesos independientes).
   - Para garantizar un tope global sincronizado en despliegues con alta concurrencia o múltiples réplicas, debe activarse la persistencia de control de tasa en base de datos PostgreSQL (`LimiteAcceso` gestionado por SQLAlchemy) o integrarse un almacén compartido de baja latencia como Redis (`redis-py` con algoritmos de token bucket o sliding log).
   - Los encabezados estándar `Retry-After` informan al cliente la ventana de espera requerida ante respuestas `429 Too Many Requests`.
