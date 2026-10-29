# OL-DESC-01: validador de anexos oficiales DANE/TerriData

Usuario autorizó implementación y delegación el2026-10-23. Lee AGENTS.md,
README.md, docs/arquitectura.md, docs/plan-trabajo.md y revisión53.

Responsabilidad exclusiva: crear
`backend/app/modules/compromisos/descarga_anexos_oficiales_polis.py` y
`bridge/57_entrega_ollamacodex_anexos.md` (JSON de evidencia57 opcional).
No tocar otros Python, frontend, banco activo, inventarios/cortes, SQL,
credenciales, scheduler, endpoints ni dependencias. Sin red, pytest ni nuevos
tests: el usuario autorizó implementación, no pidió ejecutar/agregar pruebas.
Ruff check/format sobre tu archivo permitido. Sin commit/push/deploy.

El coordinador implementará transporte HTTP, configuración y CLI; tu módulo es
una función pura realmente consumida por ese adaptador:

```python
def validar_anexo_oficial(
    contenido: bytes, *, formato: str, nombre_xlsx_esperado: str | None = None
) -> dict:
    ...
```

Formatos admitidos `xlsx` y `zip_xlsx`; los demás fallan con ValueError. No usar
httpx ni red ni escribir/extractall. Validación estructural, no aprobación de
cobertura o licencia. Resultado serializable con claves `formato`,
`sha256_contenido`, `bytes`, `estado="estructura_valida"` y `miembros_xlsx`
(lista de nombres o `[]` cuando es XLSX directo).

XLSX directo: exigir ZIP legible y contenedor OOXML de hoja de cálculo
(`[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml` y al menos una hoja).
No aceptar HTML servido como Excel o ZIP genérico.

ZIP de XLSX: rechazar rutas absolutas, `..`, backslash, nombres duplicados y
miembros cifrados; no extraer al filesystem. Exigir al menos un XLSX, validar
su contenedor de igual forma. Si `nombre_xlsx_esperado` se indica, exigir nombre
exacto seguro (por ejemplo `TerriData13001.xlsx`) y rechazar desajuste. No ejecutar
macros ni abrir vínculos externos. No basta ver extensión.

Límites explícitos antes de leer/descomprimir miembros: máximo2000 entradas,
máximo64MiB total sin comprimir por contenedor y tamaño de entrada acotado64MiB.
CRC/truncamiento deben fallar; convertir errores ZIP/de lectura esperados a
ValueError sin ocultar errores de programación. Usar stdlib; no instalar paquetes.

Puedes ejecutar la función para inspección operacional de los dos archivos
existentes de evidencia53 (no es pytest ni certificar suite):
`bridge/53_evidencias_descarga/dane_ecsc_anexo.xlsx` y
`bridge/53_evidencias_descarga/dnp_terridata_zip.zip`. No modificar esos archivos.
Registra honestamente lo comprobado y lo pendiente; no EAF ni aprobación de datos.

Al iniciar confirma por tmux a `=codex:0.0` que tomaste OL-DESC-01. Al terminar
notifica informe57 y congela tu módulo hasta revisión. Usa send-keys -l y Enter;
confirma envío real. No esperes una segunda autorización para comenzar.
