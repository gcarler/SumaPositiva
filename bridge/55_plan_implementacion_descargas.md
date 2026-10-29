# Implementación de mecanismos de descarga revisados

Fecha: 2026-10-23. Autorización del usuario: implementar y delegar a Ollamacodex.
Base: revisión53 y matriz54. Alcance: adquisición explícita para Cartagena en
staging, independiente de clasificación7D. No es activación automática del alta
de políticas ni aprobación de observaciones para informes.

| Tarea | Responsable | Entregable / aceptación | Estado |
| --- | --- | --- | --- |
| D-01 | Codex | Registro de22 productos Socrata y consultas específicas, con campos/filtros/agrupación | Implementado;22 capturados en ejecución final |
| D-02 | Codex | Transporte HTTPS acotado, reintentos, límites, registro de respuestas y salidas nuevas | Implementado |
| D-03 | Ollamacodex | Validador puro XLSX/ZIP con límites, CRC y estructura OOXML | R1 revisada e integrada con ajustes finales de Codex; dos anexos capturados |
| D-04 | Codex | Adaptadores ArcGIS/RNI, capas/cortes descubiertos y comprobación territorial | Implementado; tres servicios capturados |
| D-05 | Codex | CLI con selección explícita y consumidor de acciones del planificador | Implementado; fichas pendientes no habilitan red por plan |
| D-06 | Codex | Capturas reales nuevas, hashes y comparación del banco antes/después | Completado:28 productos;163 archivos verificados; cuatro controles del banco sin cambios |
| D-07 | Codex | Integrar entrega de Ollamacodex y revisar evidencia/limitaciones | Completado para la entrega; no suite de aceptación ni EAF |
| D-08 | Codex | Documentar resultados, fallos, cambios de código y condiciones de operación | Informe59 y evidencia58 listos |

Reglas: sin SQL, SQLite, promoción del banco, modificación de inventarios/cortes,
credenciales, frontend, cron, endpoints, commit, push o deploy. Toda captura
permanece no publicable y pendiente de validación semántica/licencia.

No se agregan ni ejecutan pruebas de aplicación por no haber sido solicitadas.
Ruff y operaciones reales de adquisición aportan evidencia técnica; no sustituyen
una suite de aceptación ni un dictamen independiente. La captura inicial parcial
se conserva, y cualquier corrección produce una nueva ejecución.

Fiscalía V2 exige autenticación en los recursos probados; no se promete extracción
anónima. El tablero público y fuentes institucionales pendientes se registran con
su modo supervisado/por gestionar; no se inventan adaptadores por tener una URL.
