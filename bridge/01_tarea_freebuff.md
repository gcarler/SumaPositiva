# PROTOCOLO DE CORRECCIÓN Y HARDENING DE SEGURIDAD PARA FREEBUFF

**Fecha**: 2026-10-01  
**Rol Asignado**: Ingeniero de Seguridad y Hardening Forense (EAF / EDD)  
**Entorno**: Sesión tmux `freebuff` (Modelo: GPT-6 Luna)  
**Base de Datos de Auditoría**: `/root/polis/bridge/auditorias.db` (SQLite)  
**Carpeta de Informes**: `/root/polis/bridge/reauditorias/`  

---

## 1. Misión: Implementación de Correcciones y Hardening de Seguridad

Por instrucción directa del Director del Proyecto, se te autoriza expresamente a **MODIFICAR Y CORREGIR** los archivos de código y configuración para subsanar los hallazgos críticos de seguridad identificados en tus informes de re-auditoría:

---

### Tarea A: Hardening de Artefactos de Despliegue (`deploy/`)
1. **`deploy/systemd/polis-backend.service`**:
   - Cambiar `User=root` y `Group=root` por `User=polis` y `Group=polis` (o usuario de servicio no privilegiado).
   - Añadir directivas de aislamiento: `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=full`.
   - Añadir límites de recursos: `LimitNOFILE=65536`.
2. **`deploy/systemd/polis-frontend.service`**:
   - Cambiar `User=root` y `Group=root` por `User=polis` y `Group=polis`.
   - Añadir directivas de aislamiento: `NoNewPrivileges=true`, `PrivateTmp=true`.
3. **`deploy/nginx/polis.conf`**:
   - Incorporar cabeceras de seguridad HTTP:
     * `add_header X-Content-Type-Options "nosniff" always;`
     * `add_header X-Frame-Options "SAMEORIGIN" always;`
     * `add_header X-XSS-Protection "1; mode=block" always;`
     * `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`
   - Reenviar cabeceras de proxy de manera explícita y confiable:
     * `proxy_set_header Host $host;`
     * `proxy_set_header X-Real-IP $remote_addr;`
     * `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
     * `proxy_set_header X-Forwarded-Proto $scheme;`

---

### Tarea B: Remediación de Seguridad en Backend (Blueprint H-01, H-02, H-03)
1. **H-01: Prohibir Escalamiento de Privilegios en Registro Público**:
   - En `backend/app/modules/identidad/schemas.py`: Retirar `codigo_rol` de `UsuarioCreacion` para que el cliente no pueda suministrarlo, o fijarlo con `extra="forbid"`.
   - En `backend/app/modules/identidad/service.py`: En `registrar_usuario()`, asignar exclusivamente el rol de servidor `"ciudadano"`. Cualquier intento de registrar otro rol por este endpoint debe ser rechazado.
2. **H-02: Eliminar Interpolación SQL en Filtros `ltree`**:
   - En `backend/app/modules/mesas/repository.py`: En las funciones `listar()` y `buscar_descendientes()`, reemplazar la interpolación de strings `f"ruta_jerarquica <@ '{ancestro_ruta}'"` por sentencias SQL parametrizadas usando `.bindparams()` o sintaxis `:ancestro` de SQLAlchemy `text()`, eliminando cualquier riesgo de SQLi.
3. **H-03: Canonización e Integridad Pericial del Acta Comunitaria (C-150/15)**:
   - En `backend/app/modules/mesas/service.py`: En `_calcular_hash_pericial()`, asegurar que el hash SHA-256 cubra el `resumen_deliberacion`, los acuerdos, disensos, compromisos y metadatos de cierre, de modo que cualquier alteración al resumen cambie el digest criptográfico.

---

### Tarea C: Verificación y Reporte de Correcciones
1. Ejecuta la suite de pruebas del backend para verificar que ninguna funcionalidad se rompa:
   ```bash
   POLIS_TEST_DATABASE_URL="postgresql+asyncpg://polis:polis_cartagena_2026@127.0.0.1:5432/polis_test_transactions_native_20261001" /root/polis/venv/bin/pytest backend/tests/ -q
   ```
2. Redacta el informe de remediación en:
   `/root/polis/bridge/reauditorias/informe_remediacion_seguridad_ejecutada.md`
3. Registra en `bridge/auditorias.db` el nuevo estado de las correcciones implementadas.

---

## 2. Instrucción de Ejecución
Por favor procede de inmediato con la implementación de estas correcciones de código y configuración. Al terminar, notifica en la consola con un resumen de los parches aplicados.
