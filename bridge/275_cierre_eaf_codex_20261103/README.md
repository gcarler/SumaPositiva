# Cierre independiente EAF — Encargo 275

La sección 9 de [275_dictamen_eaf_independiente_codex.md](../275_dictamen_eaf_independiente_codex.md) contiene el dictamen vigente. Esta carpeta conserva la evidencia nueva del cierre de R1.1, R1.2 y R1.3; las dos carpetas anteriores permanecen intactas.

## Verificación reproducible

El archivo `test_monitor_reinspeccion.py` es una copia byte a byte del arnés independiente anterior. El monitor original se congela en `.runtime/snapshot/scripts/monitor_sistema_polis.sh`; `monitor_sistema_polis_auditado.sh` conserva una copia pública idéntica. `verificar_cierre.py` registra la preparación y las dos corridas, con guardas para impedir sobrescribir evidencia o un dictamen modificado. No debe ejecutarse otra vez sobre esta carpeta sellada.

Los JSON `monitor_r1.json`, `monitor_r2.json` y `http_canales_r2.json` contienen las invocaciones finales exactas; `http_canales.json` conserva la primera corrida suplementaria. Para reproducir, copiar los arneses y el monitor a una carpeta nueva con la misma estructura relativa y usar otros directorios temporales y salidas XML. Nunca ejecutar el script original contra infraestructura productiva como parte de estas pruebas.

## Alcance y aislamiento

- 12 casos originales pasan dos veces, con reloj y dependencias simuladas.
- Cuatro casos adicionales usan curl real contra HTTP loopback: ambos canales, respuestas 400 y 503, reintento 200 y cooldown posterior.
- Ningún test conecta SQL, SMTP o proveedores externos; los binarios de psql y systemd son stubs.
- El contraste de 857 archivos prueba que solo el monitor cambió respecto de la inspección anterior. No se repiten pruebas de persistencia ni se crean bases en este cierre.
- Los checks globales anteriores siguen teniendo fallos ajenos; no se presentan como aprobados.

## Custodia

`snapshot.json` identifica el código; `dictamen_rechazado_20261103_preservado.md` conserva exactamente el dictamen previo; `cierre.json` verifica estabilidad, manifiestos históricos y ausencia de secretos conocidos en la evidencia exportada. `manifest_sha256.json` sella los archivos, excluyendo runtime, cachés, el propio manifiesto y el acuse tmux posterior.

No hubo modificaciones de aplicación, producción, commits o pushes por parte del auditor.
