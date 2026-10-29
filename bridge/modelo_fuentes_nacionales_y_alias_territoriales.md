# Fuentes nacionales y roles territoriales con alias

24 de octubre de 2026. Representación conceptual solicitada por el usuario; no equivale a implementación del resolutor en los motores.

## Cambio visible

El tablero incluye tres vistas nuevas con fuentes en nodos sobre el lienzo:

- **Fuentes nacionales:** 24 nodos de entidades o sistemas; identidad nacional conservada.
- **Directorio nacional:** 18 nodos complementarios de actores y referencias de la guía. Incluye asociaciones: no todos son entidades públicas ni datasets descargados.
- **Roles territoriales + alias:** 12 roles conceptuales, con Cartagena como ejemplo contextual. Los alias pendientes se muestran sin inventar dependencias.

Son mapas de inventario: no se les dibujaron conexiones de ejecución inexistentes. La ruta de capturas y controles permanece en Cartagena · capturas y Datos y motores. El catálogo lateral conserva las 241 fichas heterogéneas de la entrega anterior.

## Modelo propuesto

La selección de política y territorio debe resolver:

`país → jurisdicción → nivel de gobierno → rol → entidad identificada → alias → competencia y vigencia → producto/versiones → cobertura → validación → corte → motor pertinente`.

La entidad nacional mantiene su identidad al cambiar de municipio. No se consumen obligatoriamente todos sus productos: pertinencia sectorial, vigencia institucional, acceso, años y cobertura se verifican por política. El catálogo nacional puede ampliarse con entidades y productos sectoriales adicionales; no queda limitado a seguridad humana.

En el nivel territorial, un rol es un concepto estable y un alias es un nombre contextual, no la identidad jurídica ni una prueba de competencia. El vínculo debe permitir cero, una o varias entidades, identificar su nivel y vigencia, y marcar ausencia, no aplicabilidad o verificación pendiente. Una entidad departamental, una CAR, una dependencia municipal y una regional de una entidad nacional no se homologan automáticamente.

Ejemplos contextuales: Autoridad de salud territorial → DADIS; Autoridad ambiental urbana → EPA. CARDIQUE se representa como autoridad regional con competencia por comprobar por producto. El caso específico Cartagena se conserva, sin transferir estos nombres a Santa Catalina (Bolívar), Sahagún (Córdoba) o Bogotá D.C. No se acreditaron los organigramas de esos otros territorios.

## Evidencia y límites

Se reutilizaron inventarios 48/49, entrega 59 y el requerimiento conceptual del usuario. Una copia documental aislada fija esas referencias y el modelo propuesto; sus commits solo pertenecen al repositorio de evidencia dentro de `.archify/fuentes-nacionales-territoriales-20261024-143315/evidencia/`, no al repositorio de aplicación.

Las tres vistas nuevas pasaron validate, deliver, check y browser-check con Archify 3.2.0. La portada se comprobó en Chromium para siete vistas, catálogo de 241 fichas y móvil sin desbordamiento horizontal. Se inspeccionaron capturas reales de nacionales y territoriales; se reservó espacio superior para los controles del visor.

No se modificó backend, frontend de aplicación, banco o permisos; no se integró el resolutor ni se declaró universalidad multipolítica. La publicación actualiza únicamente el HTML documental ya servido.
