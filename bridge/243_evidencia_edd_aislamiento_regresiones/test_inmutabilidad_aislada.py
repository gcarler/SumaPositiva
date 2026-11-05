"""Controles reales del esquema de fixture, sin modificar la auditoría principal."""
import json
import uuid

import pytest
from sqlalchemy.exc import DBAPIError

pytest_plugins = ("tests.conftest",)

from tests import test_aportes_legado_publico as b
from tests.test_aportes_legado_publico import cliente_legado, esquema_auditoria_legado


def test_fixture_conserva_inmutabilidad_fk_check_y_json(database_url,cliente_legado,esquema_auditoria_legado):
    assert esquema_auditoria_legado.startswith('test_legado_aportes_')
    proposal,_,_=b.crear_aporte(cliente_legado)
    aid=b.sembrar_devolucion(database_url,proposal,['legado'])
    _,before=b.snapshot(database_url,proposal)
    assert before['auditoria'][0]['metadatos']==['legado']
    for sql in ["DELETE FROM auditoria.registros_auditoria WHERE id=CAST(:id AS uuid)",
                "UPDATE auditoria.registros_auditoria SET metadatos='{}'::jsonb WHERE id=CAST(:id AS uuid)"]:
        with pytest.raises(DBAPIError,match='inmutable'):
            b.consulta(database_url,sql,{'id':aid},escritura=True)
    for column,value,message in [('usuario_id',str(uuid.uuid4()),'foreign key'),('causal','no_permitida','check constraint')]:
        if column=='usuario_id':
            sql="INSERT INTO auditoria.registros_auditoria(tabla_afectada,registro_id,accion,causal,justificacion_motivada,metadatos,usuario_id) VALUES('fixture',CAST(:p AS uuid),'PRUEBA','tecnica','Prueba controlada',CAST(:m AS jsonb),CAST(:v AS uuid))"
        else:
            sql="INSERT INTO auditoria.registros_auditoria(tabla_afectada,registro_id,accion,causal,justificacion_motivada,metadatos) VALUES('fixture',CAST(:p AS uuid),'PRUEBA',:v,'Prueba controlada',CAST(:m AS jsonb))"
        with pytest.raises(DBAPIError,match=message):
            b.consulta(database_url,sql,{'p':proposal,'m':json.dumps(['legado']),'v':value},escritura=True)
    response=cliente_legado.get('/api/v1/aportes/'+proposal+'/devolucion-razon')
    assert response.status_code==200 and response.json()[0]['metadatos']=={}
    _,after=b.snapshot(database_url,proposal)
    assert before==after
