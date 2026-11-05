#!/usr/bin/env python3
"""
Generador institucional del documento oficial:
ABC de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (2026-2036)
Genera: public/docs/ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from generar_toolbox_completa_pdf import generar_doc_abc

if __name__ == "__main__":
    generar_doc_abc()
