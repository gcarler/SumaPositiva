# INFORME DE RE-AUDITORÍA DE CALIDAD: E3 — Identidad, Evidencia Segura y Ciclo de Devolución de Razones

**Fecha**: 2026-10-01  
**Auditor**: freebuff (GPT-6 Luna)  
**Entrega Vinculada**: E3  
**Dictamen**: CON_OBSERVACIONES  
**Puntuación de Calidad**: 35/100  
**Tareas cubiertas**: T3.1–T3.5  
**Modalidad**: Revisión estática de rutas, dependencias, servicios, esquemas, sanitizador y migraciones; no se ejecutaron pruebas ni se accedió a bases.

---

### 1. Resumen Pericial

Se identificaron implementaciones concretas de PBAC/RBAC, hash de contraseñas, JWT, sanitización Pillow, tabla de auditoría con trigger append-only, apoyos con unicidad relacional y campos para consulta previa. La revisión del flujo HTTP y de seguridad revela, no obstante, un hallazgo crítico: el registro público permite al solicitante escoger `codigo_rol`, y el servicio asigna ese rol si existe. Los roles de autoridad y auditoría están sembrados; por tanto, un cliente puede intentar autorregistrarse con privilegios elevados y obtener JWT con sus permisos.

Otros hallazgos relevantes: rutas de evidencia y lectura no verifican autorización/propiedad; el JWT conserva claims de rol/permisos hasta expirar sin consulta de revocación; existen valores criptográficos predeterminados comunes a E2; y la huella se expone en respuestas. El helper transaccional protege devolución y archivo, pero no compensa estas deficiencias de autorización.

### 2. Cumplimiento de Contratos y Estándares

- **T3.1**: `requerir_permiso` y `requerir_rol` comparan claims de identidad/permisos; `IdentidadService` almacena hash bcrypt y emite JWT.
- **T3.2**: `sanitizar_imagen_bytes` vuelve a abrir y re-encodea la imagen con Pillow; el servicio comprueba MIME y tamaño, genera SHA-256 y borra el archivo ante fallo transaccional. La prueba de integración de reversión existe.
- **T3.3**: La devolución cambia estado y escribe registro de auditoría en el mismo `transaction()`. Migración 0007 agrega trigger que rechaza UPDATE/DELETE de registros.
- **T3.4**: Migración 0008 añade `UNIQUE(propuesta_id, sujeto_id)` y trigger contador; el servicio convierte `IntegrityError` en HTTP 409.
- **T3.5**: Se modelan indicadores de territorio étnico/consulta previa y existe heurística territorial en aportes/agente jurídico. La revisión no acredita adecuación jurídica sustantiva ni la procedencia del catálogo territorial.

### 3. Hallazgos y Observaciones No Bloqueantes

1. **CRÍTICA — Escalamiento de privilegios en registro público** (`backend/app/modules/identidad/schemas.py`, `router.py`, `service.py`). `UsuarioCreacion.codigo_rol` es un campo controlado por el cliente; `POST /identidad/registro` no requiere guard y `registrar_usuario` busca y asigna literalmente el rol solicitado. Como la migración siembra `autoridad_distrital` y `auditor_forense`, el registro permite solicitar cualquiera de ellos y el login incluye sus permisos en un token. **Consecuencia**: acceso potencial a funciones reservadas y lectura/decisión privilegiada. **Recomendación**: no aceptar rol privilegiado en registro público; asignar rol ciudadano en servidor y restringir asignaciones administrativas a un flujo autenticado de privilegio mínimo. Probar intento HTTP de autorregistro privilegiado.
2. **ALTA — Lectura/descarga de evidencia sin autenticación ni autorización** (`backend/app/modules/evidencia/router.py`). `GET /{id}` y `GET /{id}/archivo` solo inyectan el servicio; no exigen identidad, permiso ni relación de propiedad. La evidencia puede contener datos comunitarios sensibles aunque se haya retirado EXIF. **Recomendación**: definir política pública/privada explícita, aplicar permisos y vínculo a propuesta/autor; revisar logs y controles de descarga.
3. **ALTA — Claims de JWT no revocables durante su vigencia** (`backend/app/modules/identidad/security.py`, `deps.py`). El decodificador valida firma/expiración y usa rol/permisos embebidos, pero no consulta usuario activo, rol vigente ni versión de credenciales. Desactivar usuario o cambiar rol no invalida tokens ya emitidos (hasta 24 h por configuración). **Recomendación**: mecanismo de revocación/rotación o tokens de vida breve con validación de estado en operaciones sensibles.
4. **ALTA — Valores JWT/HMAC predeterminados y huella personal expuesta** (`backend/app/core/config.py`, `sesion/schemas.py`, `aportes/schemas.py`). JWT secret y salt tienen valores hard-coded conocidos; tanto la emisión de sesión como la lectura de aporte pueden serializar `huella_hash`. Debe tratarse como identificador seudónimo persistente, no como dato inocuo/anónimo. **Recomendación**: bloquear arranque productivo con valores por defecto, mantener la huella en almacenamiento interno y no exponerla en respuestas públicas; documentar finalidad, acceso y retención.
5. **MEDIA — IP de sesión derivada de encabezado no validado** (`backend/app/modules/sesion/router.py`). `X-Forwarded-For` se acepta directamente, con independencia del proxy efectivo; cliente directo puede falsificar la huella. **Recomendación**: confiar solo en proxies configurados y validar el peer remoto.
6. **MEDIA — I/O síncrono en endpoint async de evidencias** (`backend/app/modules/evidencia/service.py`). `open(..., "wb")` escribe hasta el máximo permitido en el event loop. **Recomendación**: usar I/O asíncrono o threadpool y verificar carga concurrente.
7. **MEDIA — No se demuestra protección jurídica completa de grupos étnicos**. Las banderas derivan de etiquetas explícitas o coincidencias de texto/territorio. Una heurística no determina por sí misma afectación directa ni agota el proceso de consulta previa. **Recomendación**: presentar el resultado como alerta de revisión humana, auditar falsos negativos/positivos y no automatizar una conclusión jurídica vinculante.

### 4. Conclusión y Dictamen Oficial

**CON_OBSERVACIONES (35/100).** Aunque se reconocen persistencia, hash de evidencia, constraints y tratamiento transaccional, el registro de rol seleccionable representa un riesgo crítico de escalamiento de privilegios. No se recomienda certificar T3.1 ni exponer el módulo en producción hasta remediar ese hallazgo y probar la matriz de autorizaciones. La protección EXIF no sustituye el control de acceso al archivo.

**Pruebas no ejecutadas**: tests de identidad, evidencia, apoyos, devolución y transacciones; no se usó base `polis_test*` ni `bd_csh`. Revisión constitucional limitada a trazabilidad de implementación y a los criterios citados; no constituye concepto jurídico. Código fuente permanece sin modificaciones.