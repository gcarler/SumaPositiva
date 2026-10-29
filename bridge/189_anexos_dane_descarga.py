#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
import http.client
import ssl
from html.parser import HTMLParser

ROOT = Path('/root/polis')
OUT = ROOT / 'bridge' / '189_anexos_dane'
OUT.mkdir(parents=True, exist_ok=True)
GUION_HASH = None

ALLOWED_HOSTS = {'www.dane.gov.co', 'dane.gov.co'}
MAX_PER_FILE = 64 * 1024 * 1024
MAX_TOTAL = 128 * 1024 * 1024

OBJETIVOS = [
    {'key': 'PPED-AreaMun-2018-2042_VP.xlsx', 'href': '/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaMun-2018-2042_VP.xlsx'},
    {'key': 'PPED-AreaSexoEdadMun-2018-2042_VP.xlsx', 'href': '/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaSexoEdadMun-2018-2042_VP.xlsx'},
    {'key': 'NotaTecnica-PPED-jul2025.pdf', 'href': '/files/censo2018/proyecciones-de-poblacion/Nacional/NotaTecnica-PPED-jul2025.pdf'},
    {'key': 'Municipal_area_1985-2020.xls', 'href': '/files/investigaciones/poblacion/proyepobla06_20/Municipal_area_1985-2020.xls'},
]

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            d = dict(attrs)
            if 'href' in d:
                self.links.append(d['href'])

def check_host(url):
    p = urlparse(url)
    if p.scheme != 'https':
        raise ValueError(f'Non-https: {url}')
    if p.netloc not in ALLOWED_HOSTS:
        raise ValueError(f'Host not allowed: {p.netloc}')
    return True

def download(url, out_path):
    p = urlparse(url)
    check_host(url)
    conn = http.client.HTTPSConnection(p.netloc, timeout=30, context=ssl.create_default_context())
    try:
        path = p.path
        if p.query:
            path += '?' + p.query
        headers = {'User-Agent': 'OP-DANE-ADQ-01/1.0'}
        conn.request('GET', path, headers=headers)
        resp = conn.getresponse()
        # Check redirect
        if resp.status in (301, 302, 303, 307, 308):
            loc = resp.getheader('Location')
            if not loc:
                raise ValueError('Redirect without location')
            full = urljoin(url, loc)
            check_host(full)
            conn.close()
            return download(full, out_path)
        
        data = bytearray()
        while True:
            chunk = resp.read(8192)
            if not chunk:
                break
            data.extend(chunk)
            if len(data) > MAX_PER_FILE:
                raise ValueError(f'File exceeds limit {MAX_PER_FILE}')
        data_bytes = bytes(data)
        if len(data_bytes) == 0:
            raise ValueError('Empty response')
        # Check if HTML error
        if data_bytes[:5].lower().startswith(b'<html') or data_bytes[:5].lower().startswith(b'<!doc'):
            raise ValueError('Received HTML instead of expected file')
        
        # Write exclusively
        fd = os.open(str(out_path), os.O_RDWR | os.O_CREAT | os.O_EXCL, 0o644)
        try:
            os.write(fd, data_bytes)
        finally:
            os.close(fd)
        
        sha256 = hashlib.sha256(data_bytes).hexdigest()
        return {
            'status': resp.status,
            'headers': dict(resp.getheaders()),
            'bytes': len(data_bytes),
            'sha256': sha256,
            'content_type': resp.getheader('Content-Type'),
            'etag': resp.getheader('ETag'),
            'last_modified': resp.getheader('Last-Modified'),
            'content_length': resp.getheader('Content-Length')
        }
    finally:
        conn.close()

def main():
    resultados = []
    for obj in OBJETIVOS:
        url = urljoin('https://www.dane.gov.co', obj['href'])
        out_path = OUT / obj['key']
        try:
            info = download(url, out_path)
            resultados.append({
                'key': obj['key'],
                'url_publicada': url,
                'url_solicitada': url,
                'url_final': url,
                'estado': 'descargado',
                **info
            })
            print(f'DOWNLOADED {obj["key"]} {info["sha256"]}')
        except Exception as e:
            resultados.append({
                'key': obj['key'],
                'url_publicada': url,
                'url_solicitada': url,
                'estado': 'error',
                'error': str(e)
            })
            print(f'ERROR {obj["key"]}: {e}')
    
    manifiesto = {
        'tarea': 'OP-DANE-ADQ-01',
        'fecha_captura_utc': datetime.now(timezone.utc).isoformat(),
        'host_permitido': list(ALLOWED_HOSTS),
        'limites': {'max_por_archivo': MAX_PER_FILE, 'max_lote': MAX_TOTAL},
        'objetivos': OBJETIVOS,
        'resultados': resultados
    }
    manifiesto_path = OUT / 'manifiesto_lote.json'
    with open(manifiesto_path, 'w') as f:
        json.dump(manifiesto, f, indent=2)
    print(f'ESCRITO {manifiesto_path}')

if __name__ == '__main__':
    main()
