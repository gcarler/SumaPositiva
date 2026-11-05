"""Comprueba rc=22 en ambos canales usando curl real y HTTP solo en loopback."""

import hashlib
import json
from pathlib import Path

import pytest
from test_monitor_reinspeccion import SOURCE, Monitor, webhook_local

E = Path(__file__).resolve().parent


@pytest.mark.parametrize("channel", ["webhook", "telegram"])
@pytest.mark.parametrize("status", [400, 503])
def test_error_http_real_no_sella_y_reintenta_ambos_canales(tmp_path, channel, status):
    monitor = Monitor(tmp_path)
    curl_stub = tmp_path / "bin/curl"
    original = curl_stub.read_text()
    old = """            if kind!='webhook' or args[-1]!=expected or not expected.startswith('http://127.0.0.1:'):
                raise SystemExit('Destino externo prohibido')
            raise SystemExit(subprocess.run(['/usr/bin/curl',*args]).returncode)
"""
    new = """            if not expected.startswith('http://127.0.0.1:'):
                raise SystemExit('Destino externo prohibido')
            urls=[a for a in args if a.startswith(('http://','https://'))]
            allowed = expected if kind=='webhook' else 'https://api.telegram.org/botfixture-bot-no-real/sendMessage'
            if urls != [allowed]:
                raise SystemExit('URL de entrada inesperada')
            local_args=[expected if a==allowed else a for a in args]
            result=subprocess.run(['/usr/bin/curl',*local_args])
            with open(os.environ['EAF_HTTP_RC'],'a') as f:
                f.write(json.dumps({'kind':kind,'returncode':result.returncode,'args':local_args})+'\\n')
            raise SystemExit(result.returncode)
"""
    assert original.count(old) == 1
    curl_stub.write_text(original.replace(old, new))
    results = tmp_path / "http_rc.jsonl"
    with webhook_local([status, 200]) as (url, received):
        env = {
            "EAF_LOCAL_WEBHOOK": url,
            "EAF_HTTP_RC": str(results),
            "POLIS_ALERT_WEBHOOK_URL": url if channel == "webhook" else "",
            "POLIS_TELEGRAM_BOT_TOKEN": "fixture-bot-no-real"
            if channel == "telegram"
            else "",
            "POLIS_TELEGRAM_CHAT_ID": "fixture-chat-no-real"
            if channel == "telegram"
            else "",
        }
        first = monitor.run(**env)
        retry = monitor.run(seconds=60, **env)
        cooldown = monitor.run(seconds=120, **env)
    http_calls = [json.loads(line) for line in results.read_text().splitlines()]
    record = {
        "channel": channel,
        "statuses": [status, 200],
        "http_calls": http_calls,
        "monitor_calls": monitor.calls,
        "real_loopback_posts": len(received),
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "source_rutas_temporales_sha256": hashlib.sha256(
            monitor.executable.read_bytes()
        ).hexdigest(),
        "url_telegram": "sustituida por servidor loopback antes de ejecutar curl real",
    }
    with (E / "http_canales_casos.jsonl").open("a") as output:
        output.write(json.dumps(record, ensure_ascii=False) + "\n")
    assert [call["returncode"] for call in http_calls] == [22, 0]
    assert all(call["kind"] == channel and "-f" in call["args"] for call in http_calls)
    assert first["returncode"] == retry["returncode"] == cooldown["returncode"] == 1
    assert first["stamp_after"] is None and first["dispatches"] == 1
    assert retry["stamp_after"] and retry["dispatches"] == 1
    assert cooldown["stamp_after"] == retry["stamp_after"]
    assert cooldown["dispatches"] == 0 and len(received) == 2
