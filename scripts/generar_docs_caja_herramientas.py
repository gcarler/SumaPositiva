#!/usr/bin/env python3
"""
Genera los documentos complementarios de la Caja de Herramientas de Seguridad Humana
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from generar_toolbox_completa_pdf import (
    generar_doc_presentacion,
    generar_doc_matriz,
    generar_doc_facilitadores,
)

if __name__ == "__main__":
    generar_doc_presentacion()
    generar_doc_matriz()
    generar_doc_facilitadores()
