# Correo propio POLIS

**Estado:** operativo desde 2026-11-09 en `mail.seguridadhumanaintegral.org`
(2.25.244.251, el mismo VPS de POLIS), con antispam, cuotas y respaldo diario.
**Alcance:** buzón institucional `notificaciones@seguridadhumanaintegral.org`,
MX entrante, submission autenticado, IMAP, firma DKIM y filtro antispam. Sin
proveedor de correo.

## 1. Arquitectura

```
Internet ──25──▶ Postfix (MX) ──milter──▶ spamass-milter ──▶ spamd (puntuación)
                     │                            │
                     └──milter──▶ OpenDKIM (firma) └─ añade X-Spam-*
                     │
                     └──LMTP (unix)──▶ Dovecot (Sieve → Junk, cuota) ──▶ Maildir
Clientes ──587 STARTTLS + AUTH──▶ Postfix submission ──▶ destino
Clientes ──993 TLS──▶ Dovecot IMAP
```

| Pieza | Versión | Configuración |
| --- | --- | --- |
| Postfix | 3.10.6 | `/etc/postfix/main.cf`, `/etc/postfix/master.cf` |
| Dovecot | 2.4.2 | `/etc/dovecot/dovecot.conf` (archivo único, sin `conf.d`) |
| OpenDKIM | 2.11.0 | `/etc/opendkim.conf`, clave en `/etc/opendkim/keys/seguridadhumanaintegral.org/` |
| SpamAssassin | 4.0.2 | `spamd` (`/etc/default/spamd`) y `spamass-milter` (`/etc/default/spamass-milter`) |
| Sieve | Pigeonhole | `/etc/dovecot/sieve/antispam.sieve` (compilado `.svbin`) |
| PostgreSQL | 18.6 | base `correo` en `127.0.0.1:5432` |
| TLS | Let's Encrypt | `/etc/postfix/tls/`, `/etc/dovecot/tls/`; hook en `/etc/letsencrypt/renewal-hooks/deploy/polis-correo.sh` |

Postfix valida dominios, buzones y alias contra PostgreSQL mediante
`/etc/postfix/pgsql-virtual-{domains,mailboxes,aliases}.cf` (permisos
`root:postfix 640`). La entrega la hace Dovecot por LMTP; el almacén es Maildir
con UID/GID `vmail` (5000).

## 2. Dominio y DNS

| Registro | Valor |
| --- | --- |
| `A mail` | `2.25.244.251` |
| `MX` | `10 mail.seguridadhumanaintegral.org.` |
| `SPF` | `v=spf1 ip4:2.25.244.251 ~all` |
| `DKIM` | `polis._domainkey` (RSA 2048, publicado) |
| `DMARC` | `v=DMARC1; p=quarantine; rua=mailto:notificaciones@…` |
| `PTR` | **pendiente**: hoy `srv2006133.hstgr.cloud` |

El PTR debe cambiarse en hPanel a `mail.seguridadhumanaintegral.org`; sin él
los receptores pueden degradar o rechazar el correo saliente. El nombre HELO ya
es `mail.seguridadhumanaintegral.org`.

El vhost nginx `/etc/nginx/sites-available/correo-acme` solo sirve el reto ACME
en el puerto 80 para `mail.…`; cualquier otra ruta responde 404.

## 3. Cuentas y almacén

```sql
-- base correo
dominios(dominio, activo)
buzones(correo, password, nombre, activo, cuota_mb, creado_en)
alias(origen, destino, activo)
```

`password` guarda un hash `{SHA512-CRYPT}` generado con `doveadm pw`. La
contraseña en claro del buzón institucional y la del rol de base de datos están
en `/etc/polis/correo.env` (root, 600). No se copian a logs ni a documentos.

**Alta de un buzón nuevo**

```bash
HASH=$(doveadm pw -s SHA512-CRYPT)          # pide la contraseña dos veces
PGPASSWORD="$(grep ^CORREO_DB_PASSWORD= /etc/polis/correo.env | cut -d= -f2-)" \
  psql -h 127.0.0.1 -p 5432 -U correo -d correo \
  -v correo='persona@seguridadhumanaintegral.org' -v hash="$HASH" \
  -c "INSERT INTO buzones (correo, password, nombre)
      VALUES (:'correo', :'hash', 'Nombre')"
```

**Alias**: insertar en `alias` con `origen` y `destino`; ya existen
`postmaster@` y `abuse@` hacia `notificaciones@`.

**Baja**: `UPDATE buzones SET activo = false WHERE correo = …`; Postfix deja de
aceptar el destinatario y Dovecot no autentica.

**Rotación de contraseña**: generar hash nuevo, actualizar `buzones.password` y
sobrescribir `CORREO_BUZON_PASSWORD` en `/etc/polis/correo.env` y
`POLIS_SMTP_CONTRASENA` en `backend/.env`; reiniciar el backend para que tome la
nueva clave. No se requiere reiniciar Postfix ni Dovecot.

## 4. Servicios y puertos

```bash
systemctl status postfix dovecot opendkim
ss -lntp | grep -E ':(25|587|993)\b'
```

| Puerto | Servicio | Exposición |
| --- | --- | --- |
| 25 | Postfix MX | Público (UFW) |
| 587 | Postfix submission | Público, STARTTLS + AUTH obligatorios |
| 993 | Dovecot IMAPS | Público |
| 143/465 | — | Cerrados; no hay listeners |

`mynetworks = 127.0.0.0/8`: solo el propio servidor puede entregar sin
autenticación. Cualquier otro cliente debe autenticarse en 587.

## 5. Verificación ejecutada (2026-11-09)

| Prueba | Resultado |
| --- | --- |
| Envío 25 → LMTP → IMAP | Entregado, HTML y cabeceras intactas |
| DKIM con `dkimpy` y DNS real | 3/3 firmas válidas |
| Submission 587 con TLS verificado y AUTH | OK (incluye hairpin por nombre público) |
| Destinatario inexistente desde IP pública | `550 5.1.1` |
| Relay sin autenticar en 587 desde IP pública | `554 5.7.1 Access denied` |
| `verificar_configuracion_smtp.py --solo-config --probar-red` | `[APROBADO]` |
| `certbot renew --dry-run` para `mail.…` | Simulación correcta |
| Servicios al arranque | `postfix`, `dovecot`, `opendkim`, `spamd`, `spamass-milter` habilitados |
| Antispam: GTUBE por 25 | `550 5.7.1 Blocked by SpamAssassin` |
| Antispam: mensaje normal | Entregado con `X-Spam-Status: No` |
| Archivado Sieve | Mensaje con `X-Spam-Flag: YES` entregado en `Junk` |
| Cuota de 1 MB con mensaje de 1,5 MB | LMTP: `Quota exceeded (mailbox for user is full)` |
| Cuota del buzón institucional | `doveadm` y `GETQUOTA`: 2048 MB |
| Respaldo de correo | Ejecución manual `success`, `SHA256SUMS` y manifiesto creados |
| Firma DKIM tras añadir el milter | Válida (`dkimpy`, DNS real) |
| Salida autenticada por 587 | Sin cabeceras `X-Spam-*` (milter con `-I`) y DKIM válida |
| Actualización de reglas (`sa-update`) | `spamassassin-maintenance.service`: `success` |

Comandos útiles:

```bash
postqueue -p                                  # cola
journalctl -u postfix -u dovecot -u opendkim  # registro
du -sh /var/mail/vhosts                       # almacenamiento
openssl s_client -connect mail.seguridadhumanaintegral.org:993 -servername mail.seguridadhumanaintegral.org
```

## 6. Integración con POLIS

`backend/.env` usa el submission propio:

```bash
POLIS_SMTP_HOST=mail.seguridadhumanaintegral.org
POLIS_SMTP_PORT=587
POLIS_SMTP_USUARIO=notificaciones@seguridadhumanaintegral.org
POLIS_SMTP_CONTRASENA="…"        # = CORREO_BUZON_PASSWORD
POLIS_SMTP_TLS=true
POLIS_SMTP_REMITENTE="Polis Plataforma <notificaciones@seguridadhumanaintegral.org>"
```

El backend se reinició el 2026-11-09 tras el cambio: el proceso en curso usa el
submission 587 con STARTTLS y AUTH (cabecera `ESMTPSA` en el mensaje entregado).
El camino previo por `127.0.0.1:25` sigue disponible porque loopback está en
`mynetworks`; ambos firman con DKIM y alinean SPF y DMARC con el dominio del
remitente.

## 7. Antispam

SpamAssassin puntúa el correo entrante y `spamass-milter` lo conecta a Postfix
como milter. Orden en `smtpd_milters`: primero antispam, después OpenDKIM, para
que la firma cubra las cabeceras añadidas.

| Parámetro | Valor | Efecto |
| --- | --- | --- |
| `required` | 5.0 | umbral de SpamAssassin para marcar (`X-Spam-Flag: YES`) |
| `-r 15` | 15 puntos | rechazo en SMTP: `550 5.7.1 Blocked by SpamAssassin` |
| `-I` | — | no analiza el correo ya autenticado (salida propia por 587) |
| `-m` | — | no reescribe asunto ni cuerpo; solo añade cabeceras `X-Spam-*` |
| `--max-children 2` | — | dos procesos `spamd` para un buzón pequeño |

Los mensajes marcados se archivan en `Junk` mediante un script Sieve global
tipo `before`, así que también alcanza a cualquier buzón nuevo:

```
X-Spam-Flag: YES  →  fileinto :create "Junk"
```

Archivos y comandos:

- `/etc/default/spamd`: opciones del demonio (`systemctl restart spamd`).
- `/etc/default/spamass-milter`: socket y opciones del milter
  (`systemctl restart spamass-milter`).
- `/etc/dovecot/sieve/antispam.sieve` y su `.svbin`: regla de archivado; tras
  editarla, `sievec /etc/dovecot/sieve/antispam.sieve` y reiniciar Dovecot.
- Reglas locales y puntuaciones en `/etc/spamassassin/local.cf`.
- Actualización de reglas: `spamassassin-maintenance.timer` (habilitado) ejecuta
  `sa-update` a diario; se puede forzar con
  `systemctl start spamassassin-maintenance.service`.
- Registro: `journalctl -u spamd -u spamass-milter` y
  `journalctl -u dovecot | grep -i sieve`.

Verificación rápida (GTUBE debe rechazarse y un mensaje normal debe llevar
`X-Spam-Status: No`):

```bash
printf 'Subject: prueba\r\n\r\nXJS*C4JDBQADN1.NSBN3*2IDNEN*GTUBE-STANDARD-ANTI-UBE-TEST-EMAIL*C.34X\r\n' | spamc -R
```

Sin antivirus: el buzón no inspecciona adjuntos maliciosos. Si se necesita, el
siguiente paso es un milter de antivirus (p. ej. ClamAV), no SpamAssassin.

## 8. Cuotas

La cuota se aplica por buzón con el plugin `quota` de Dovecot (driver `count`):

- `buzones.cuota_mb > 0` fija el límite en MB de ese buzón.
- `cuota_mb = 0` hereda el valor global `quota_storage_size = 2G`.
- `quota_storage_grace = 0`: el límite es exacto, sin margen adicional.

El buzón institucional quedó en **2048 MB**.

```bash
doveadm quota get -u notificaciones@seguridadhumanaintegral.org
doveadm quota recalc -u notificaciones@seguridadhumanaintegral.org   # tras cambios manuales
```

Los clientes IMAP ven el límite con `GETQUOTA` (extension QUOTA en 993). Cuando
se supera, LMTP rechaza el almacenamiento (`Quota exceeded (mailbox for user is
full)`): Postfix ya aceptó el mensaje y genera un rebote al remitente; con
remitentes institucionales conviene avisar antes de llenar el buzón.

## 9. Respaldos

Automatizados con systemd: `polis-correo-respaldo.timer` ejecuta
`scripts/respaldo_correo.sh` a las **03:30 UTC** (después del respaldo de la
base de POLIS de las 02:00), con `Persistent=true` y hasta 5 minutos de retardo
aleatorio.

Cada corrida crea `/root/polis/backups/correo/diarios/<AAAAMMDD_HHMMSS>/` con:

| Archivo | Contenido |
| --- | --- |
| `correo.dump` | `pg_dump -Fc` de la base `correo` (dominios, buzones, alias) |
| `maildir.tar.gz` | `/var/mail/vhosts` completo (todos los buzones y Junk) |
| `SHA256SUMS` | sellos de ambos archivos |
| `manifiesto.json` | fecha, número de mensajes y versión de PostgreSQL |

Retención: **7 diarios** y **4 semanales** (copia por enlaces duros los
domingos) en `backups/correo/{diarios,semanales}`; traza en
`backups/correo/respaldos.log`. Todo queda con permisos 600 porque el Maildir
contiene datos personales.

```bash
systemctl list-timers polis-correo-respaldo.timer
systemctl start polis-correo-respaldo.service   # corrida manual
journalctl -u polis-correo-respaldo.service -n 30
tail -20 /root/polis/backups/correo/respaldos.log
```

**Restauración** (ensayar siempre en una base y directorio temporales, nunca
sobre el buzón en caliente):

```bash
R=/root/polis/backups/correo/diarios/<AAAAMMDD_HHMMSS>
cd "$R" && sha256sum -c SHA256SUMS

# 1. Base de cuentas
su postgres -c "createdb correo_restauracion"
su postgres -c "pg_restore --no-owner --no-privileges -d correo_restauracion $R/correo.dump"

# 2. Buzones
tar -xzf "$R/maildir.tar.gz" -C /tmp/restauracion-correo
# comparar y, con Dovecot detenido, reemplazar /var/mail/vhosts preservando vmail:vmail
```

El script verifica `gzip -t` y que el archivo contenga al menos tantos mensajes
como el Maildir vivo; si algo falla, termina con error y no rota los respaldos
anteriores.

### Ensayo automático de restauración

`polis-correo-restauracion.timer` ejecuta
`scripts/verificar_restauracion_correo.sh` los **domingos a las 04:30 UTC**, una
hora después del respaldo diario, con `Persistent=true`. El ensayo no escribe en
la base `correo` ni en `/var/mail/vhosts`: restaura en una base efímera
`correo_verif_*` y extrae el Maildir en `/var/tmp`, y elimina ambos al terminar.

Comprueba, sobre el respaldo diario más reciente (o el que se pase como
argumento):

| Comprobación | Criterio |
| --- | --- |
| Sellos `SHA256SUMS` | ambos archivos coinciden |
| Compresión del Maildir | `gzip -t` y `tar -xzf` completos |
| Mensajes | los del archivo, los del manifiesto y los extraídos son el mismo número |
| Propiedad y contenido | todos los mensajes son de `vmail:vmail` y ninguno está vacío |
| Base de cuentas | `pg_restore` sin errores y las tablas `dominios`, `buzones` y `alias` presentes |
| Integridad relacional | ningún buzón apunta a un dominio ausente |
| Correspondencia cuenta ↔ disco | cada dominio activo tiene carpeta en el archivo (los buzones activos sin carpeta solo avisan) |

Escribe un expediente por corrida en `backups/correo/ensayos/<AAAAMMDD_HHMMSS>.json`
(estado, duración, conteos restaurados, deriva frente a producción y lista de
fallos), con retención de los **12 ensayos** más recientes, y deja traza en
`backups/correo/ensayos.log`. La deriva es informativa: el Maildir vivo suele
superar al respaldo porque sigue recibiendo correo.

```bash
systemctl list-timers polis-correo-restauracion.timer
systemctl start polis-correo-restauracion.service          # ensayo manual
./scripts/verificar_restauracion_correo.sh <ruta_respaldo> # un respaldo concreto
journalctl -u polis-correo-restauracion.service -n 40
cat /root/polis/backups/correo/ensayos/<AAAAMMDD_HHMMSS>.json
```

Un fallo deja la unidad en `failed` (`systemctl --failed`), lo que permite
avisar por monitorización; no toca el respaldo ni la producción.

## 10. Límites y pendientes

- PTR del VPS sin actualizar (hPanel).
- Prueba de correo entrante desde una cuenta externa real: pendiente; el puerto
  25 ya está abierto, pero falta confirmar que el proveedor del VPS no lo filtre.
- Sin antivirus de adjuntos ni cuarentena administrable: el spam puntuado se
  archiva en `Junk`, no se retiene para revisión.
- Sin límites de tasa de envío por remitente ni por IP.
- Sin webmail ni administración web: altas y rotaciones por SQL y `doveadm`.
- Un solo VPS: correo y POLIS comparten destino; no hay redundancia.
- Los reportes DMARC llegan al mismo buzón; conviene un buzón o reenvío aparte.

## 11. Reversa

1. Restaurar `/var/backups/correo-20261109/main.cf` y `master.cf`; retirar el
   bloque `submission` si se vuelve al estado previo.
2. `postconf -e "inet_interfaces = loopback-only"` y reiniciar Postfix.
3. `systemctl disable --now dovecot`; cerrar 25/587/993 en UFW.
4. Retirar el vhost `correo-acme` y su enlace en `sites-enabled`.
5. Conservar `/var/mail/vhosts` y la base `correo` hasta decidir el destino de
   los mensajes; no borrarlos como parte de una reversa.
6. Antispam, respaldos y ensayos: `systemctl disable --now spamass-milter spamd
   polis-correo-respaldo.timer polis-correo-restauracion.timer`; las copias de `/etc/default/spam*`,
   `/etc/dovecot/dovecot.conf` y `/etc/postfix/main.cf` previas están en
   `/root/polis/backups/*.antes_antispam_20261109` y
   `*.antes_cuotas_sieve_20261109`.

Los respaldos previos están en `/var/backups/correo-20261109/` y
`/var/backups/correo-config-previa-20261109.tar.gz`.
