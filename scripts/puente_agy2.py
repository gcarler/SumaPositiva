#!/usr/bin/env python3
"""
Puente Autónomo de Orquestación: Antigravity (Líder / EAF) <--> agy2 (Ejecutor EDD en tmux)
Conectado directamente con el Plan de Trabajo (docs/plan-trabajo.md) y el Banco de Conocimiento (knowledge-base/).
"""

import json
import os
import subprocess
import sys
import time
from pathlib import Path

BASE_DIR = Path("/root/polis")
BRIDGE_DIR = BASE_DIR / "bridge"
CATALOGO_FILE = BRIDGE_DIR / "catalogo_tareas.json"
TAREA_FILE = BRIDGE_DIR / "01_tarea_activa.md"
ENTREGA_FILE = BRIDGE_DIR / "02_entrega_agy2.md"
DICTAMEN_FILE = BRIDGE_DIR / "03_dictamen_revision.md"
REGISTRO_FILE = BRIDGE_DIR / "registro_entregas.log"
TMUX_SESSION = "agy2"


def verificar_sesion_tmux() -> bool:
    res = subprocess.run(["tmux", "has-session", "-t", TMUX_SESSION], capture_output=True)
    return res.returncode == 0


def capturar_pane_tmux(lineas: int = 50) -> str:
    res = subprocess.run(
        ["tmux", "capture-pane", "-pt", TMUX_SESSION, "-S", f"-{lineas}"],
        capture_output=True,
        text=True,
    )
    return res.stdout


def agy2_esta_ocupado() -> bool:
    pane = capturar_pane_tmux(15)
    lineas = [l.strip() for l in pane.splitlines() if l.strip()]
    if not lineas:
        return False
    ultima = lineas[-1]
    if ultima.startswith(">") or ultima == ">" or "for shortcuts" in ultima:
        return False
    return True


def enviar_texto_a_agy2(texto: str) -> None:
    temp_file = BRIDGE_DIR / ".temp_buffer.txt"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(texto)
    subprocess.run(["tmux", "load-buffer", str(temp_file)], check=True)
    subprocess.run(["tmux", "paste-buffer", "-t", TMUX_SESSION], check=True)
    time.sleep(0.5)
    subprocess.run(["tmux", "send-keys", "-t", TMUX_SESSION, "Enter"], check=True)
    if temp_file.exists():
        temp_file.unlink()


def cargar_catalogo():
    with open(CATALOGO_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def buscar_tarea(id_tarea: str):
    catalogo = cargar_catalogo()
    for entrega in catalogo.get("entregas", []):
        for tarea in entrega.get("tareas", []):
            if tarea["id_tarea"].upper() == id_tarea.upper():
                return entrega, tarea
    return None, None


def asignar_tarea_catalogo(id_tarea: str) -> None:
    entrega, tarea = buscar_tarea(id_tarea)
    if not tarea:
        print(f"❌ Error: La tarea [{id_tarea}] no se encuentra en el catálogo ({CATALOGO_FILE}).")
        sys.exit(1)

    BRIDGE_DIR.mkdir(parents=True, exist_ok=True)

    modulos_md = "\n".join([f"- [ ] `{m}`" for m in tarea["modulos_conocimiento"]])
    criterios_md = "\n".join([f"- [ ] {c}" for c in tarea["criterios_aceptacion"]])
    auditores_str = ", ".join([f"`{a}`" for a in tarea["auditores_eaf"]])

    contenido = f"""# TAREA ASIGNADA: [{tarea['id_tarea']}] {tarea['titulo']}
**Fecha/Hora**: {time.strftime('%Y-%m-%d %H:%M:%S')}
**Entrega Vinculada**: {entrega['id_entrega']} — {entrega['titulo']} (`docs/plan-trabajo.md`)
**Punto en el Plan**: {tarea['modulo_plan']}
**Rol Responsable en EDD**: `{tarea['rol_edd']}`
**Auditores Asignados del EAF**: {auditores_str}

---

## 📖 Módulos Obligatorios del Banco de Conocimiento:
Debes consultar y respetar los estándares definidos en los siguientes módulos antes y durante el desarrollo:
{modulos_md}

---

## 🎯 Descripción Técnica:
{tarea['descripcion']}

---

## 🔒 Reglas Arquitectónicas Inalterables:
1. **Base de Datos Activa**: PostgreSQL 18.6 nativa en `127.0.0.1:5432/bd_csh` (usuario `polis`, configurada en `/root/polis/backend/.env`).
2. **Esquema Spanish-First**: Tablas, columnas, enums, triggers y modelos Pydantic 100% en español estricto.
3. **Claves Primarias**: Uso exclusivo de UUIDv7 mediante `public.generar_uuid_v7()`.
4. **Regla Zero-Modals**: Cero popups modales centrados en frontend. Toda vista/formulario ocurre en Drawers laterales Framer Motion.
5. **Tokens Semánticos**: Uso estricto de variables CSS en Tailwind (`--surface-1`, `--text-primary`, `--ember`, `--border`).

---

## ✅ Criterios de Aceptación (Definición de Terminado):
{criterios_md}

---

## 📋 Protocolo de Entrega para agy2:
1. Implementa los cambios correspondientes.
2. Ejecuta las validaciones técnicas locales (`bun run check`, `bun run build`, o pruebas de backend con `/root/polis/venv/bin/pytest`).
3. Documenta detalladamente los archivos creados o editados en `/root/polis/bridge/02_entrega_agy2.md`.
4. Al concluir, emite en tu consola el mensaje: `ENTREGA LISTA: [{tarea['id_tarea']}]`.
"""

    with open(TAREA_FILE, "w", encoding="utf-8") as f:
        f.write(contenido)

    prompt_agy2 = f"""Hola agy2. El Orquestador Central te ha asignado la tarea [{tarea['id_tarea']}]: {tarea['titulo']}.
Esta tarea corresponde a la {entrega['id_entrega']} ({tarea['modulo_plan']}) del Plan de Trabajo.

REQUERIMIENTO OBLIGATORIO: Debes ejecutar esta tarea convocando y coordinando al Equipo de Desarrollo (EDD), específicamente a los roles especialistas: `{tarea['rol_edd']}` (ver docs/equipo_agentes_desarrollo.md).

Consulta la especificación completa, los módulos del Banco de Conocimiento obligatorios y los criterios de aceptación en:
`/root/polis/bridge/01_tarea_activa.md`

Por favor procede con la implementación junto al EDD. Al finalizar, registra tu informe en `/root/polis/bridge/02_entrega_agy2.md` para la auditoría del EAF."""

    enviar_texto_a_agy2(prompt_agy2)
    print(f"✅ Tarea [{tarea['id_tarea']}] asignada al EDD ({tarea['rol_edd']}) y enviada exitosamente a '{TMUX_SESSION}'.")



def dictaminar(id_tarea: str, conforme: bool, comentarios: str, errores: list[str] = None) -> None:
    estado = "CONFORME" if conforme else "NO CONFORME"
    contenido = f"""# DICTAMEN DE REVISIÓN FORENSE: [{id_tarea}]
**Fecha/Hora**: {time.strftime('%Y-%m-%d %H:%M:%S')}
**Evaluador**: Antigravity (Orquestador Central / EAF)
**Resultado**: {estado}

## Observaciones del Evaluador:
{comentarios}
"""
    if not conforme and errores:
        contenido += "\n## Errores y Hallazgos que Requieren Corrección Inmediata:\n"
        for idx, e in enumerate(errores, 1):
            contenido += f"{idx}. {e}\n"

    with open(DICTAMEN_FILE, "w", encoding="utf-8") as f:
        f.write(contenido)

    with open(REGISTRO_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Tarea {id_tarea}: {estado}\n")

    if conforme:
        print(f"🎉 Tarea [{id_tarea}] dictaminada como CONFORME. Registrada en {REGISTRO_FILE}.")
    else:
        prompt_correccion = f"""Atención agy2: Tu entrega para la tarea [{id_tarea}] fue evaluada como NO CONFORME por el Equipo de Auditoría Forense (EAF).
Revisa los hallazgos y correcciones requeridas en `/root/polis/bridge/03_dictamen_revision.md`.

Por favor subsana los errores y actualiza `/root/polis/bridge/02_entrega_agy2.md` para una nueva inspección."""
        enviar_texto_a_agy2(prompt_correccion)
        print(f"⚠️ Tarea [{id_tarea}] dictaminada como NO CONFORME. Feedback enviado a '{TMUX_SESSION}' para corrección.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso:")
        print("  puente_agy2.py estado")
        print("  puente_agy2.py captura [lineas]")
        print("  puente_agy2.py asignar <ID_TAREA> (ej: T2.1)")
        print("  puente_agy2.py dictamen <ID_TAREA> <conforme|no_conforme> <comentario>")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "estado":
        print("Sesión tmux existe:", verificar_sesion_tmux())
        print("agy2 ocupado:", agy2_esta_ocupado())
    elif cmd == "captura":
        lineas = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        print(capturar_pane_tmux(lineas))
    elif cmd == "asignar":
        if len(sys.argv) < 3:
            print("Error: Especifica el ID de la tarea (ej: T2.1)")
            sys.exit(1)
        asignar_tarea_catalogo(sys.argv[2])
    elif cmd == "dictamen":
        if len(sys.argv) < 5:
            print("Error: puente_agy2.py dictamen <ID_TAREA> <conforme|no_conforme> <comentario>")
            sys.exit(1)
        tarea_id = sys.argv[2]
        es_conforme = sys.argv[3].lower() == "conforme"
        comentario = sys.argv[4]
        dictaminar(tarea_id, es_conforme, comentario)
