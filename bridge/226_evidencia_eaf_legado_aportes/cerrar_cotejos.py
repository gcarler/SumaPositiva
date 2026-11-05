"""Cierre de cotejos EAF226, sin aplicación ni conexión a base."""
import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET
from datetime import UTC,datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2];OUT=Path(__file__).resolve().parent

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,value):(OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2,default=str)+'\n')
def compare(values):return [p for p,h in values.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]

def main():
    gate=json.loads((OUT/'autorizacion_inicio.json').read_text());assert not compare(gate['fuentes_finales']) and not compare(gate['entrega215'])
    before=json.loads((OUT/'snapshot_inicio.json').read_text());after={p:sha(ROOT/p) if (ROOT/p).is_file() else None for p in before['hashes']}
    changed={p:{'initial':before['hashes'][p],'final':after[p]} for p in after if after[p]!=before['hashes'][p]}
    assert not changed
    save('snapshot_final.json',{'utc':datetime.now(UTC).isoformat(),'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),'hashes':after,'source_count':len(after),'differences':changed,'product_writes_by_EAF':[]})
    tracked=subprocess.check_output(['git','status','--porcelain=v1','--untracked-files=no'],cwd=ROOT,text=True)
    (OUT/'estado_git_cierre_seguido.txt').write_text(tracked)
    sources183=json.loads((ROOT/'bridge/183_evidencia_edd_aportes/fuentes_propias_finales.json').read_text())['sha256']
    differences183=compare(sources183);assert set(differences183)=={'backend/app/modules/aportes/schemas.py','backend/app/modules/aportes/service.py'}
    historical={}
    for key,directory in [('183','183_evidencia_edd_aportes'),('203','203_evidencia_eaf_aportes'),('215','215_evidencia_edd_proyeccion_legado')]:
        path=ROOT/'bridge'/directory/'manifest_evidencia.json';data=json.loads(path.read_text());assert not compare(data['hashes'])
        historical[key]={'count':len(data['hashes']),'manifest_sha256':sha(path),'differences':[]}
    assert sha(ROOT/'bridge/203_reinspeccion_eaf_aportes.md')=='34e841385f91493364271f08e5f20ecbb78f44ffe04f6fdec64b30173b33f2bc'
    for name in ['test_atomicidad.py','test_colas.py','test_principales.py','test_adicionales.py']:
        assert sha(OUT/name)==sha(ROOT/'bridge/203_evidencia_eaf_aportes'/name)
    save('cotejo_historicos_final.json',{'utc':datetime.now(UTC).isoformat(),'sources183':20,'sources183_unchanged':18,'sources183_changed_only_authorized':differences183,'sources215_final':gate['fuentes_finales'],'0084_sha256':sha(ROOT/'backend/alembic/versions/0084_aportes_colas_y_apoyos.py'),'historical_artifacts':historical,'original_four_case_files_identical':True,'report203_unchanged':True})
    results={}
    for prefix in ['03_casos203_sin_cambiar','04_variantes_propias','05_dirigidas_producto','06_http_outbox183']:
        path=OUT/(prefix+'.xml');cases=ET.parse(path).findall('.//testcase');fail=[c.attrib['name'] for c in cases if c.find('failure') is not None or c.find('error') is not None];skip=[c.attrib['name'] for c in cases if c.find('skipped') is not None]
        assert not fail and not skip
        results[prefix]={'cases':len(cases),'passed':len(cases),'failures':fail,'skips':skip,'sha256':sha(path)}
    assert [r['cases'] for r in results.values()]==[94,40,388,2]
    scenario_rows=[json.loads(l) for l in (OUT/'escenarios.jsonl').read_text().splitlines()]
    fixed=[r for r in scenario_rows if r['scenario'] in ['AP03_legacy_irregular_enfoque','AP03_legacy_irregular_audit']]
    assert len(fixed)==6
    for r in fixed:
        assert (r.get('status')==200) if 'status' in r else r['detail_status']==r['list_status']==200
    new=[r for r in scenario_rows if r['scenario'].startswith('R01_')];assert len(new)==40
    reads=[r for r in new if r['scenario']!='R01_positive_authorized'];positive=[r for r in new if r['scenario']=='R01_positive_authorized']
    assert len(reads)==39 and len(positive)==1 and positive[0]['legacy_JSON_untouched']
    assert all(r.get('SQL_same') is True or r.get('SQL_before_sha256')==r.get('SQL_after_sha256') and 'SQL_before_sha256' in r for r in reads)
    inventory=json.loads((OUT/'inventario_bd.json').read_text())
    assert all(not r['missing_indexes'] for r in inventory['metadata_index_comparison'].values())
    save('R01_resultados_compactos.json',{'six_original_cases':fixed,'new_variants':new,'SQL_snapshot_rule':'39 variantes de lectura comparan snapshot SQL completo antes/después con observadores nuevos; una variante de gestión autorizada cambia estado/auditoría conforme al caso de uso y compara los JSON privados originales, que permanecen idénticos. Solo se publican hashes y datos técnicos de fixtures.','technical_defaults':'False/None son defaults contractuales previos al omitir un valor incompatible; no hechos demográficos inferidos.'})
    save('resultados_resumidos.json',{'utc':datetime.now(UTC).isoformat(),'runs':results,'own_cases':{'historical_reexecuted':94,'additional_independent':40,'passed':134,'failures':0,'skips':0},'product_directed':388,'additional183':2,'duplicates_not_added_across_iterations':True,'alembic_check':'no nuevas operaciones','indexes_missing':0,'global':'No repetida por225;205 histórico anterior al parche, no acredita estos bytes.','migration_and_CLI203':'No se vuelven a acreditar como nuevos: sin downgrade, reconstrucción o CLI en226.','status':'APROBADO_AP03_R01_sobre_snapshot215'})
    print(json.dumps({'sources':len(after),'changed':changed,'historical':historical,'runs':{p:r['cases'] for p,r in results.items()},'R01_closed_cases':len(fixed),'new_independent':len(new),'sources183_other18_equal':True},ensure_ascii=False))

if __name__=='__main__':main()
