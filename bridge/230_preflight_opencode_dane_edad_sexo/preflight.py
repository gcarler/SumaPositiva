#!/usr/bin/env python3
import hashlib, json, os, ssl
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse
import http.client

ROOT = Path('/root/polis')
OUT = ROOT / 'bridge' / '230_preflight_opencode_dane_edad_sexo'
OUT.mkdir(parents=True, exist_ok=True)

ALLOWED_HOSTS = {'www.dane.gov.co', 'dane.gov.co'}
MAX_REDIRECTS = 3
TIMEOUT = 20
MAX_TOTAL = 512 * 1024

TARGET = 'https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaSexoEdadMun-2018-2042_VP.xlsx'

def check(p):
    if p.scheme != 'https': raise ValueError('scheme')
    if p.netloc not in ALLOWED_HOSTS: raise ValueError('host')
    if p.port not in (None, 443): raise ValueError('port')
    return True

def request(method, url, headers_extra=None, max_body=MAX_TOTAL):
    p = urlparse(url)
    check(p)
    conn = http.client.HTTPSConnection(p.netloc, timeout=TIMEOUT, context=ssl.create_default_context())
    try:
        path = p.path
        if p.query: path += '?' + p.query
        h = {'User-Agent': 'OP-DANE-PREFLIGHT-02/1.0'}
        if headers_extra: h.update(headers_extra)
        conn.request(method, path, headers=h)
        resp = conn.getresponse()
        loc = resp.getheader('Location')
        if resp.status in (301,302,303,307,308):
            if not loc: raise ValueError('redirect no location')
            full = urljoin(url, loc)
            p2 = urlparse(full)
            check(p2)
            return {'redirect': full, 'status': resp.status, 'headers': dict(resp.getheaders())}
        data = resp.read(max_body + 1)
        if len(data) > max_body: data = data[:max_body]
        return {'status': resp.status, 'headers': dict(resp.getheaders()), 'body_len': len(data), 'body_sha256': hashlib.sha256(data).hexdigest() if data else None}
    finally:
        conn.close()

def main():
    results = []
    try:
        r = request('HEAD', TARGET)
        results.append({'step': 'HEAD', 'url': TARGET, **r})
    except Exception as e:
        results.append({'step': 'HEAD', 'url': TARGET, 'error': str(e)})
    try:
        r = request('GET', TARGET, {'Range': 'bytes=0-0'}, max_body=65536)
        results.append({'step': 'RANGE', 'url': TARGET, **r})
    except Exception as e:
        results.append({'step': 'RANGE', 'url': TARGET, 'error': str(e)})
    out = {'tarea': 'OP-DANE-PREFLIGHT-02', 'fecha_consulta_utc': datetime.now(timezone.utc).isoformat(), 'target': TARGET, 'limits': {'max_redirects': MAX_REDIRECTS, 'timeout_s': TIMEOUT, 'max_total_bytes': MAX_TOTAL}, 'results': results}
    p = OUT / 'preflight.json'
    with open(p,'w') as f: json.dump(out,f,indent=2)
    print(json.dumps(out,indent=2))

if __name__ == '__main__':
    main()
