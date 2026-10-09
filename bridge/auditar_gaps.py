import re
import os
import sys

# Add backend to path
sys.path.insert(0, '/root/polis/backend')
from app.main import app

openapi = app.openapi()
backend_paths = set(openapi.get('paths', {}).keys())

normalized_backend = {}
for p, methods_dict in openapi.get('paths', {}).items():
    norm = p[7:] if p.startswith('/api/v1') else p
    normalized_backend[norm] = list(methods_dict.keys())

print(f"Total Backend routes: {len(normalized_backend)}")

pattern = re.compile(r'apiFetch(?:<[^>]+>)?\s*\(\s*([`\'"][^`\'"]+[`\'"])')
src_dir = '/root/polis/src'

frontend_calls = []
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8') as fh:
                content = fh.read()
                matches = pattern.findall(content)
                for m in matches:
                    raw = m.strip('\'"`')
                    frontend_calls.append((filepath.replace('/root/polis/', ''), raw))

print(f"Total apiFetch occurrences: {len(frontend_calls)}")

unique_calls = sorted(set(frontend_calls))
missing = []
found = []

for file_rel, path in unique_calls:
    clean_p = path[7:] if path.startswith('/api/v1') else path
    clean_template = re.sub(r'\$\{([^}]+)\}', r'{\1}', clean_p)
    clean_template = clean_template.split('?')[0] # remove query params
    
    matched = False
    matched_bp = None
    for bp in normalized_backend:
        bp_regex = '^' + re.sub(r'\{[^}]+\}', r'[^/]+', bp) + '$'
        if re.match(bp_regex, clean_template):
            matched = True
            matched_bp = bp
            break
        clean_regex = '^' + re.sub(r'\{[^}]+\}', r'[^/]+', clean_template) + '$'
        if re.match(clean_regex, bp):
            matched = True
            matched_bp = bp
            break

    if matched:
        found.append((path, matched_bp, file_rel))
    else:
        missing.append((path, clean_template, file_rel))

print(f"\n--- MATCHED ENDPOINTS: {len(found)} ---")
print(f"--- POTENTIAL GAPS / MISSING IN BACKEND: {len(missing)} ---")
for raw, clean, f in missing:
    print(f"[MISSING] {raw:50} (template: {clean}) in {f}")
