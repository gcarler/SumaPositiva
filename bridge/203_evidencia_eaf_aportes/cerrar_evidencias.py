"""Cotejos documentales y de fuentes; no carga aplicación ni conecta DB."""
import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET
from datetime import UTC,datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,value):(OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n')
def compare(mapping):return [p for p,h in mapping.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]

def main():
    initial=json.loads((OUT/'snapshot_inicio.json').read_text())
    hashes={p:sha(ROOT/p) if (ROOT/p).is_file() else None for p in initial['hashes']}
    changed={p:{'initial':initial['hashes'][p],'final':hashes[p]} for p in hashes if hashes[p]!=initial['hashes'][p]}
    helpers={p:sha(ROOT/p) for p in ['backend/tests/cli_workspace.py','backend/tests/test_cli_workspace.py']}
    allowed={'backend/tests/test_adaptador_catalogo_fuentes_polis.py','backend/tests/test_conciliacion_retrospectiva_fuentes_polis.py','backend/tests/test_conciliador_gold_set.py','backend/tests/test_ficha_territorial_polis.py','backend/tests/test_ingesta_masiva_triada.py','backend/tests/test_ipc_deflactor_polis.py'}
    assert set(changed)<=allowed
    save('snapshot_final.json',{'utc':datetime.now(UTC).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),'hashes':hashes,'changed_only_authorized_coordination_tests':changed,'helpers_added_by_coordination':helpers,'product_changes_by_EAF':[]})
    s183=ROOT/'bridge/183_evidencia_edd_aportes';s171=ROOT/'bridge/171_evidencia_eaf_persistencia_aportes'
    input_sources=json.loads((s183/'fuentes_propias_finales.json').read_text())['sha256']
    m183=json.loads((s183/'manifest_evidencia.json').read_text())['hashes'];m171=json.loads((s171/'manifest_evidencia.json').read_text())['hashes']
    original_report=ROOT/'bridge/171_dictamen_eaf_persistencia_aportes.md'
    cotejo={'source183_count':len(input_sources),'sources183_differences':compare(input_sources),'evidence183_count':len(m183),'evidence183_differences':compare(m183),'evidence171_count':len(m171),'evidence171_differences':compare(m171),'report171_sha256':sha(original_report),'report171_unchanged':sha(original_report)=='744dccf64f1fd3f698a36a80c7db7d08fb8a14e3f924e04343f0d56518f123e2','source183_hashes':input_sources}
    assert not cotejo['sources183_differences'] and not cotejo['evidence183_differences'] and not cotejo['evidence171_differences'] and cotejo['report171_unchanged']
    save('cotejo_183_171_final.json',cotejo)
    d205=ROOT/'bridge/205_evidencia_temporales_pruebas';begin=json.loads((d205/'snapshot_inicial.json').read_text());end=json.loads((d205/'snapshot_final.json').read_text())
    assert begin['sha256']==end['sha256'] and not compare(end['sha256'])
    xml=ET.parse(d205/'backend_check_final.xml');cases=xml.findall('.//testcase')
    failures=[c for c in cases if c.find('failure') is not None or c.find('error') is not None];skips=[c for c in cases if c.find('skipped') is not None]
    classified=json.loads((d205/'resultado_global_clasificado.json').read_text())
    assert len(cases)==1450 and len(failures)==3 and len(skips)==16 and len(cases)-len(failures)-len(skips)==1431
    paths=[d205/p for p in ['backend_check_final.json','backend_check_final.log','backend_check_final.xml','resultado_global_clasificado.json','snapshot_inicial.json','snapshot_final.json','ruff_final.log','format_final.log','guardas_verificadas_v2.json']]
    save('global205_leido.json',{'origin':'Coordinación; lectura/cotejo EAF203, no ejecución propia','sha256':{str(p.relative_to(ROOT)):sha(p) for p in paths},'tests':len(cases),'passed':1431,'failed':3,'skipped':16,'snapshot_sources':len(end['sha256']),'current_source_differences':[],'classification':classified,'global_approved':False,'late_SQL_injection_reached':False})
    outputs={}
    for prefix in ['03_atomicidad','04_colas','05_colas','06_principales','07_principales','10_adicionales','11_dirigidas_producto','15_propias_consolidadas']:
        path=OUT/(prefix+'.xml');cases=ET.parse(path).findall('.//testcase');failed=[c.attrib['name'] for c in cases if c.find('failure') is not None or c.find('error') is not None];skipped=[c for c in cases if c.find('skipped') is not None]
        outputs[prefix]={'tests':len(cases),'passed':len(cases)-len(failed)-len(skipped),'failed':failed,'skipped':len(skipped),'sha256':sha(path)}
    assert outputs['15_propias_consolidadas']['passed']==88 and len(outputs['15_propias_consolidadas']['failed'])==6
    save('resultados_resumidos.json',{'runs':outputs,'unique_own_cases':94,'own_passed':88,'own_failed':6,'migration_script_scenarios':len((OUT/'migraciones_escenarios.jsonl').read_text().splitlines()),'additional_real_process_crash':1,'product_directed_passed':123,'counts_not_added_across_iterations':True,'harness_initial_failures_documented':'ajustes_harness.jsonl'})
    docs=['docs/permisos-api.md','docs/operacion.md','docs/transacciones.md','docs/identidad.md','docs/arquitectura.md','docs/equipo_auditores_forenses.md','AGENTS.md','.agents/skills/polis-eaf-transactions/SKILL.md']
    save('revision_documental.json',{'sha256':{p:sha(ROOT/p) for p in docs},'reviewed_contracts':['intención y aporte atómicos; transporte tras claim confirmado','HMAC cuerpo crudo; inbox durable distinto de radicación','simulado con fecha propia; no entrega real','at least once y duplicados tras aceptación/caída','scheduler y proveedores por configurar, no acreditados por CLI','principal estable y permisos actuales','extensiones y conciliación previa; downgrade condicionado; segunda DB','texto libre declarado permanece público; JSON privado no amplía salida'],'assessment':'Documentos coherentes con contratos principales comprobados; no describen ni resuelven HTTP500 de JSON legado irregular R01.','limits':['No activación de scheduler, Meta o SMTP','No validación UI/frontend','No autorización global ni jurídica']})
    print(json.dumps({'own':outputs['15_propias_consolidadas'],'sources183_equal':len(input_sources),'evidence171_equal':len(m171),'evidence183_equal':len(m183),'shared_global':{'passed':1431,'failed':3,'skipped':16},'authorized_source_changes':len(changed)},ensure_ascii=False))

if __name__=='__main__':main()
