"""Módulo Proyectos: vista agregada read-only de las actividades de formulación.

Agrega en una sola proyección las fuentes del proceso de formulación de la
política pública: tareas de comunicaciones (comunicacion.tareas_comunicacion),
agendas de mesas (mesas_trabajo.agendas) y formularios de consulta
(participacion_ciudadana.formularios_consulta).

Las actividades de los Planes de Desarrollo (seguimiento.actividades_plan_
accion) NO se agregan aquí: pertenecen al módulo de Seguimiento
(/api/v1/seguimiento).

No crea persistencia paralela: solo lee tablas existentes. La escritura
sigue ocurriendo por los módulos nativos, identificados en cada
`ActividadProyectoLectura.perfil` por `modulo_dueno` y `permiso_editar`.
"""
