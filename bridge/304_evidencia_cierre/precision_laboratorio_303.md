# Precisión sobre la constancia de laboratorio 303

El archivo histórico `bridge/303_evidencia_cierre/laboratorio_finalizado.json`
declaró detenido el PostgreSQL de pruebas en 15433. Esa constancia no incluye
PID ni una comprobación reproducible de parada. La comprobación de ausencia de
`/var/tmp/polis303_pg18/postmaster.pid` es insuficiente: el directorio de datos
observado en 304 es `/var/tmp/polis303_pg18/data`.

No se puede acreditar retrospectivamente la parada con esa observación, ni
deducir que el proceso nunca se detuvo. Se conserva intacto el archivo histórico
y se acota aquí esa afirmación; sus resultados de pruebas son otra evidencia.

En 304 el clúster 15433 está compartido con otros trabajos y se mantiene activo.
Los procesos HTTP E2E de 18313–18315 se detuvieron al terminar los recorridos.
La base temporal de restauración se eliminó tras comprobar sus datos. Los
corpus de prueba permanecen disponibles para la revisión independiente.
