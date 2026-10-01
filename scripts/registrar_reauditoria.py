#!/usr/bin/env python3
"""Script para registrar reauditorías de calidad en SQLite (/root/polis/bridge/auditorias.db)."""

import argparse
import datetime
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path("/root/polis/bridge/auditorias.db")


def registrar(tarea_id: str, titulo: str, entrega: str, dictamen: str, puntuacion: int, resumen: str, recomendaciones: str, ruta_md: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    fecha = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur.execute(
        """
        INSERT INTO reauditorias_calidad 
        (tarea_id, titulo_tarea, entrega_vinculada, fecha_auditoria, dictamen, puntuacion_calidad, resumen_hallazgos, recomendaciones, ruta_informe_md)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (tarea_id, titulo, entrega, fecha, dictamen, puntuacion, resumen, recomendaciones, ruta_md)
    )
    conn.commit()
    conn.close()
    print(f"✅ Re-auditoría [{tarea_id}] registrada exitosamente en SQLite ({DB_PATH}).")


def main():
    parser = argparse.ArgumentParser(description="Registrar re-auditoría en SQLite")
    parser.add_argument("--tarea-id", required=True, help="ID de la tarea (ej. T2.1, T3.3, T4.5, T5.1)")
    parser.add_argument("--titulo", required=True, help="Título de la tarea")
    parser.add_argument("--entrega", required=True, help="Entrega vinculada (ej. E1, E2, E3, E4, E5)")
    parser.add_argument("--dictamen", required=True, choices=["CONFORME", "CON_OBSERVACIONES", "NO_CONFORME"])
    parser.add_argument("--puntuacion", type=int, default=95, help="Puntuación de 1 a 100")
    parser.add_argument("--resumen", required=True, help="Resumen de hallazgos")
    parser.add_argument("--recomendaciones", default="", help="Recomendaciones")
    parser.add_argument("--ruta-md", required=True, help="Ruta al archivo .md generado")

    args = parser.parse_args()
    registrar(args.tarea_id, args.titulo, args.entrega, args.dictamen, args.puntuacion, args.resumen, args.recomendaciones, args.ruta_md)


if __name__ == "__main__":
    main()
