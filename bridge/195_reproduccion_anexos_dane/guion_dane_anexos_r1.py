#!/usr/bin/env python3
import hashlib
import json
import os
import ssl
from pathlib import Path
from urllib.parse import urlparse
import http.client

ROOT = Path('/root/polis')
OUT = ROOT / 'bridge' / '195_reproduccion_anexos_dane'

ALLOWED_HOSTS = {'www.dane.gov.co', 'dane.gov.co'}
MAX_PER_FILE = 64 * 1024 * 1024
MAX_TOTAL = 128 * 1024 * 1024
MAX_REDIRECTS = 3

SAFE_HEADERS = {'Date','Content-Type','Content-Length','Last-Modified','ETag','Accept-Ranges','X-Request-Id'}

OBJETIVOS = [
    {'key': 'PPED-AreaMun-2018-2042_VP.xlsx', 'href': '/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaMun-2018-2042_VP.xlsx'},
    {'key': 'PPED-AreaSexoEdadMun-2018-2042_VP.xlsx', 'href': '/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaSexoEdadMun-2018-2042_VP.xlsx'},
    {'key': 'NotaTecnica-PPED-jul2025.pdf', 'href': '/files/censo2018/proyecciones-de-poblacion/Nacional/NotaTecnica-PPED-jul2025.pdf'},
    {'key': 'Municipal_area_1985-2020.xls', 'href': '/files/investigaciones/poblacion/proyepobla06_20/Municipal_area_1985-2020.xls'},
]

class DownloadError(Exception):
    pass

def check_host(url):
    p = urlparse(url)
    if p.scheme != 'https':
        raise DownloadError(f'Non-https scheme: {p.scheme}')
    if p.netloc not in ALLOWED_HOSTS:
        raise DownloadError(f'Host not allowed: {p.netloc}')
    return p

def main():
    print('R1 guion: no realiza descarga nueva; valida reglas y coteja existentes')
    for k in ['PPED-AreaMun-2018-2042_VP.xlsx', 'NotaTecnica-PPED-jul2025.pdf', 'Municipal_area_1985-2020.xls']:
        p = ROOT / 'bridge' / '189_anexos_dane' / k
        if p.exists():
            print(k, p.stat().st_size, hashlib.sha256(p.read_bytes()).hexdigest())
    try:
        from app.modules.compromisos.descarga_anexos_oficiales_polis import validar_anexo_oficial
        with open(ROOT / 'bridge' / '189_anexos_dane' / 'PPED-AreaMun-2018-2042_VP.xlsx','rb') as f:
            print(validar_anexo_oficial(f.read(), formato='xlsx', nombre_xlsx_esperado='PPED-AreaMun-2018-2042_VP.xlsx'))
    except Exception as e:
        print(e)

if __name__ == '__main__':
    main()
