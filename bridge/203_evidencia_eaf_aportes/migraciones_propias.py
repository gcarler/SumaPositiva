"""Ensayos0084 independientes y destructivos, solo DB secundaria exacta EAF203."""
import asyncio
import hashlib
import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

OUT=Path(__file__).resolve().parent
MAIN=os.environ['POLIS_TEST_DATABASE_URL'];MIG=os.environ['POLIS_TEST_MIGRATIONS_DATABASE_URL']
MAIN_DB=json.loads((OUT/'base.json').read_text())['database'];MIG_DB=json.loads((OUT/'base_migraciones.json').read_text())['database']
assert make_url(MAIN).database==MAIN_DB and make_url(MIG).database==MIG_DB and MAIN_DB!=MIG_DB
SCHEMAS=['motor_politicas','geodatos','participacion_ciudadana','autenticacion','auditoria','mesas_trabajo','motor_instrumentos','presupuesto','indicadores','comunicacion','seguimiento']
REV='0083_conciliador_gold_set';HEAD='0084_aportes_colas_y_apoyos'

def record(name,**values):
    row={'scenario':name,'utc':datetime.now(UTC).isoformat(),**values}
    with (OUT/'migraciones_escenarios.jsonl').open('a') as f:f.write(json.dumps(row,default=str,ensure_ascii=False)+'\n')
    print(name,flush=True)

async def sql_async(sql,params=None,mutate=False,url=MIG):
    engine=create_async_engine(url,poolclass=NullPool,hide_parameters=True)
    try:
        async with engine.connect() as connection:
            assert await connection.scalar(text('SELECT current_database()'))==(MIG_DB if url==MIG else MAIN_DB)
            result=await connection.execute(text(sql),params or {})
            rows=[dict(r) for r in result.mappings()] if result.returns_rows else []
            if mutate:await connection.commit()
            return rows
    finally:await engine.dispose()

def sql(statement,params=None,mutate=False,url=MIG):return asyncio.run(sql_async(statement,params,mutate,url))

def migrate(action,target=None):
    assert make_url(MIG).database==MIG_DB
    old=os.environ['POLIS_DATABASE_URL'];os.environ['POLIS_DATABASE_URL']=MIG
    try:
        cfg=Config(str(OUT.parents[1]/'backend/alembic.ini'))
        getattr(command,action)(cfg,*([target] if target is not None else []))
    finally:os.environ['POLIS_DATABASE_URL']=old

def sha(value):return hashlib.sha256(json.dumps(value,sort_keys=True,default=str,separators=(',',':')).encode()).hexdigest()

def snapshot(url=MIG):
    tables=sql("SELECT schemaname,tablename FROM pg_tables WHERE schemaname=ANY(:schemas) OR (schemaname='public' AND tablename='alembic_version') ORDER BY 1,2",{'schemas':SCHEMAS},url=url)
    data={}
    for t in tables:
        rows=sql('SELECT row_to_json(t)::text AS body FROM "'+t['schemaname']+'"."'+t['tablename']+'" t ORDER BY body',url=url)
        data[t['schemaname']+'.'+t['tablename']]={'rows':len(rows),'sha256':sha(rows)}
    catalog={}
    catalog['columns']=sql('''SELECT table_schema,table_name,column_name,data_type,udt_schema,udt_name,is_nullable,column_default,character_maximum_length FROM information_schema.columns WHERE table_schema=ANY(:schemas) OR (table_schema='public' AND table_name='alembic_version') ORDER BY 1,2,ordinal_position''',{'schemas':SCHEMAS},url=url)
    catalog['constraints']=sql('''SELECT n.nspname,c.relname,co.conname,co.contype,pg_get_constraintdef(co.oid) AS def FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY(:schemas) ORDER BY 1,2,3''',{'schemas':SCHEMAS},url=url)
    catalog['indexes']=sql('SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=ANY(:schemas) ORDER BY 1,2,3',{'schemas':SCHEMAS},url=url)
    catalog['triggers']=sql('''SELECT n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) AS def FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname=ANY(:schemas) ORDER BY 1,2,3''',{'schemas':SCHEMAS},url=url)
    version=sql("SELECT version_num FROM public.alembic_version",url=url)[0]['version_num']
    return {'database':MIG_DB if url==MIG else MAIN_DB,'version':version,'tables':data,'data_sha256':sha(data),'catalog_sha256':sha(catalog)}


def atomic_rejection(name,action,target):
    before=snapshot()
    try:migrate(action,target)
    except RuntimeError as error:message=str(error)
    else:raise AssertionError('Expected atomic migration rejection: '+name)
    after=snapshot();assert after==before,name
    record(name,before=before,after=after,rejection=message,snapshot_identical=True)


def line():
    found=sql('SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1')
    if found:return found[0]['id']
    return sql("INSERT INTO motor_politicas.lineas_estrategicas(fase_id,dimension_id,codigo,titulo,descripcion) SELECT f.id,d.id,'EAF203-MIG','Migración aislada203','Sintético' FROM motor_politicas.fases_politica f CROSS JOIN motor_politicas.dimensiones_seguridad_humana d ORDER BY f.codigo,d.codigo LIMIT 1 RETURNING id",mutate=True)[0]['id']

def prop(metadata=None):
    return sql("INSERT INTO participacion_ciudadana.propuestas_ciudadanas(linea_id,tipo_aporte,titulo,descripcion,metadatos) VALUES(:l,'propuesta',:t,'Datos legados sintéticos',CAST(:m AS jsonb)) RETURNING id,codigo_radicado",{'l':line(),'t':'EAF203 migration '+uuid.uuid4().hex,'m':json.dumps({} if metadata is None else metadata)},True)[0]

def user(uid=None):
    uid=uid or uuid.uuid4()
    sql("INSERT INTO autenticacion.usuarios(id,rol_id,correo,hash_contrasena,nombres,apellidos) SELECT :id,id,:email,'synthetic','EAF','203' FROM autenticacion.roles WHERE codigo='ciudadano'",{'id':uid,'email':uid.hex+'@example.org'},True)
    return uid

def session(uid,sid=None):
    sid=sid or uuid.uuid4()
    sql("INSERT INTO autenticacion.sesiones_usuario(id,usuario_id,creada_en,expira_en) VALUES(:s,:u,now(),now()+interval '1 day')",{'s':sid,'u':uid},True)
    return sid

def support(p,s,kind='usuario'):
    return sql('INSERT INTO participacion_ciudadana.apoyos_propuestas(propuesta_id,sujeto_id,tipo_sujeto) VALUES(:p,:s,:k) RETURNING id,sujeto_id,tipo_sujeto,creado_en',{'p':p,'s':s,'k':kind},True)[0]


def main():
    primary_before=snapshot(MAIN)
    (OUT/'principal_antes_migraciones.json').write_text(json.dumps(primary_before,indent=2,default=str)+'\n')
    migrate('upgrade','head');migrate('upgrade','head');migrate('check')
    record('MIG_empty_install_repeat_check',snapshot=snapshot())
    migrate('downgrade','base')
    remaining=sql("SELECT schemaname,tablename FROM pg_tables WHERE schemaname=ANY(:schemas)",{'schemas':SCHEMAS})
    assert not remaining
    record('MIG_downgrade_empty_base',application_tables=0)
    migrate('upgrade','head');migrate('check');record('MIG_reconstruct_from_base',version=snapshot()['version'])
    migrate('downgrade',REV)
    for value in [203,True,{'private':'object'},['private'],'x'*256]:
        p=prop({'correo_contacto':value,'conservado':True})
        atomic_rejection('MIG_reject_legacy_contact_'+type(value).__name__,'upgrade','head')
        sql('DELETE FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id',{'id':p['id']},True)
    cases=[{}, {'correo_contacto':None},{'correo_contacto':'legacy203@example.org'},{'correo_contacto':'x'*255},{'correo_contacto':''},{'correo_contacto':'  legacy203@example.org  '}]
    contacts=[(prop(meta),meta) for meta in cases]
    pa=prop({'correo_contacto':'legacy203@example.org'});pb=prop();drift=prop()
    ua=user();ub=user();sa=session(ua);sa2=session(ua);sb=session(ub)
    original_a=[support(pa['id'],s) for s in (sa,sa2,ua)]
    anon=support(pa['id'],uuid.uuid4(),'sesion_anonima');original_b=support(pb['id'],sb)
    sql('UPDATE participacion_ciudadana.propuestas_ciudadanas SET apoyos_contador=9 WHERE id=:id',{'id':drift['id']},True)
    old_date=sql("INSERT INTO participacion_ciudadana.notificaciones_transaccionales(codigo_radicado,destinatario_correo,tipo_evento,asunto,cuerpo_html,estado_envio,enviado_en) VALUES(:r,'legacy203@example.org','radicacion','Legado sintético','Local','simulado',now()) RETURNING id,enviado_en",{'r':pa['codigo_radicado']},True)[0]
    migrate('upgrade','head');migrate('check')
    for p,meta in contacts:
        row=sql('SELECT correo_contacto,metadatos FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id',{'id':p['id']})[0]
        assert row['correo_contacto']==meta.get('correo_contacto') and row['metadatos']==meta
    rows=sql('SELECT id,sujeto_id,tipo_sujeto,trazabilidad FROM participacion_ciudadana.apoyos_propuestas WHERE propuesta_id=:p',{'p':pa['id']})
    assert len(rows)==2
    survivor=next(r for r in rows if r['tipo_sujeto']=='usuario')
    assert survivor['sujeto_id']==ua and {r['id'] for r in survivor['trazabilidad']}=={str(r['id']) for r in original_a}
    assert sql('SELECT apoyos_contador FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id',{'id':pa['id']})[0]['apoyos_contador']==2
    journals=sql('SELECT propuesta_id,filas_antes,filas_despues,contador_antes,contador_despues FROM participacion_ciudadana.migracion_apoyos_0084')
    journal_drift=next(r for r in journals if r['propuesta_id']==drift['id']);assert (journal_drift['contador_antes'],journal_drift['contador_despues'])==(9,0)
    migrated_notice=sql('SELECT enviado_en,simulado_en FROM participacion_ciudadana.notificaciones_transaccionales WHERE id=:id',{'id':old_date['id']})[0]
    assert migrated_notice['enviado_en'] is None and migrated_notice['simulado_en']==old_date['enviado_en']
    record('MIG_legacy_valid_contacts_consolidation_journal',contacts_cases=len(contacts),preserved_contacts=True,original_supports=4,account_supports_after=1,anonymous_unchanged=True,trace_original_ids=[r['id'] for r in original_a],journal_count=len(journals),drift_before=9,drift_after=0,simulation_date_separated=True)
    sql('DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE id=:id',{'id':survivor['id']},True)
    migrate('downgrade',REV)
    restored_a=sql('SELECT id,sujeto_id,tipo_sujeto FROM participacion_ciudadana.apoyos_propuestas WHERE propuesta_id=:p',{'p':pa['id']})
    restored_b=sql('SELECT id,sujeto_id,tipo_sujeto,creado_en FROM participacion_ciudadana.apoyos_propuestas WHERE propuesta_id=:p',{'p':pb['id']})
    assert len(restored_a)==1 and restored_a[0]['id']==anon['id'] and restored_b==[original_b]
    archived=sql("SELECT registro_id,metadatos FROM auditoria.registros_auditoria WHERE accion='MIGRACION_APOYOS_0084'")
    assert len(archived)==len(journals)
    assert all('filas_antes' in r['metadatos'] and 'filas_despues' in r['metadatos'] for r in archived)
    record('MIG_compatible_downgrade_no_resurrection',deleted_account_supports_restored=0,anonymous_preserved=True,other_original_row_identical=True,private_journals_archived=len(archived))
    migrate('upgrade','head')
    assert len(sql('SELECT id FROM participacion_ciudadana.apoyos_propuestas WHERE propuesta_id=:p',{'p':pa['id']}))==1
    record('MIG_reupgrade_no_resurrection',removed_account_stays_removed=True)
    migrate('downgrade',REV)
    orphan=prop();bad=support(orphan['id'],uuid.uuid4())
    atomic_rejection('MIG_reject_orphan_support','upgrade','head')
    sql('DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE id=:id',{'id':bad['id']},True)
    ambiguous=prop();uc=user();session(ua,uc);bad=support(ambiguous['id'],uc)
    atomic_rejection('MIG_reject_ambiguous_support','upgrade','head')
    sql('DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE id=:id',{'id':bad['id']},True)
    mixed=prop();bad1=support(mixed['id'],sa);bad2=support(mixed['id'],ua,'sesion_anonima')
    atomic_rejection('MIG_reject_anonymous_account_collision','upgrade','head')
    sql('DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE id=ANY(:ids)',{'ids':[bad1['id'],bad2['id']]},True)
    migrate('upgrade','head')
    private=prop();sql('UPDATE participacion_ciudadana.propuestas_ciudadanas SET correo_contacto=:c WHERE id=:id',{'c':'only-private203@example.org','id':private['id']},True)
    atomic_rejection('MIG_downgrade_reject_private_contact','downgrade',REV)
    sql('DELETE FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id',{'id':private['id']},True)
    new_support=support(pa['id'],ub)
    atomic_rejection('MIG_downgrade_reject_new_account_support','downgrade',REV)
    sql('DELETE FROM participacion_ciudadana.apoyos_propuestas WHERE id=:id',{'id':new_support['id']},True)
    sql("INSERT INTO participacion_ciudadana.whatsapp_inbox(cuenta_proveedor,mensaje_externo_id,contenido_hash,payload) VALUES('eaf203-mig','eaf203-durable',:hash,'{}'::jsonb)",{'hash':'a'*64},True)
    atomic_rejection('MIG_downgrade_reject_durable_inbox','downgrade',REV)
    migrate('check')
    primary_after=snapshot(MAIN)
    assert primary_after==primary_before
    (OUT/'principal_despues_migraciones.json').write_text(json.dumps(primary_after,indent=2,default=str)+'\n')
    record('MIG_principal_untouched',database=MAIN_DB,data_sha256=primary_after['data_sha256'],catalog_sha256=primary_after['catalog_sha256'],same_snapshot=True)
    (OUT/'migraciones_final.json').write_text(json.dumps({'secondary':MIG_DB,'snapshot':snapshot(),'primary_unchanged':True,'limit':'No downgrade de principal; rechazo de incompatibles no equivale a downgrade universal'},indent=2,default=str)+'\n')

if __name__=='__main__':main()
