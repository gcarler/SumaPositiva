"""Cotejo final de CLI y catálogo con SQL real en la base principal exacta."""
import asyncio
import json
from pathlib import Path
from uuid import UUID

import test_atomicidad as b
from test_colas import query

async def main():
    results={}
    for log,queue in [('12_cli_inbox.log','inbox'),('14_cli_outbox.log','outbox')]:
        rows=[json.loads(line) for line in (b.EVIDENCE/log).read_text().splitlines() if line.startswith('{')]
        assert rows
        allowed=({'recepcion_id','estado','intentos','codigo_radicado','error_codigo'} if queue=='inbox' else {'notificacion_id','estado','intentos','identificador_mensaje'})
        assert all(set(row)<=allowed for row in rows)
        if queue=='inbox':
            confirmed=await query('SELECT id,estado,propuesta_id FROM participacion_ciudadana.whatsapp_inbox WHERE id=ANY(:ids)',{'ids':[UUID(r['recepcion_id']) for r in rows]})
            assert len(confirmed)==len(rows) and all(r['estado']=='procesado' and r['propuesta_id'] for r in confirmed)
        else:
            confirmed=await query('SELECT id,estado_envio,enviado_en,simulado_en FROM participacion_ciudadana.notificaciones_transaccionales WHERE id=ANY(:ids)',{'ids':[UUID(r['notificacion_id']) for r in rows]})
            assert len(confirmed)==len(rows) and all(r['estado_envio']=='simulado' and r['enviado_en'] is None and r['simulado_en'] for r in confirmed)
        results[queue]={'command_log':log,'results':len(rows),'closed_technical_output':True,'durable_rows':len(confirmed),'only_simulated_transport':True}
    inventory=json.loads((b.EVIDENCE/'inventario_bd.json').read_text())
    assert all(not row['missing_indexes'] for row in inventory['metadata_index_comparison'].values())
    model=inventory['metadata']['participacion_ciudadana.apoyos_propuestas']
    assert any(c['name']=='chk_tipo_sujeto' for c in model['checks'])
    assert any(c['conname']=='chk_tipo_sujeto' for c in inventory['constraints'])
    assert all(not f['security_definer'] for f in inventory['functions'])
    assert all(not s['public_create'] for s in inventory['schema_privileges'])
    results['catalog']={'metadata_tables':len(inventory['metadata']),'missing_indexes':0,'check_tipo_sujeto_in_model_and_database':True,'security_definer_functions':0,'public_create_schemas':0,'limit':'Rol propietario local; no acredita permisos de producción ni de otros roles.'}
    results['database']=b.DATABASE
    (b.EVIDENCE/'verificacion_final.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(results,ensure_ascii=False))

asyncio.run(main())
