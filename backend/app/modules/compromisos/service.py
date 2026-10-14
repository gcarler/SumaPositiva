import re
import unicodedata
import uuid
from collections.abc import Sequence
from datetime import UTC, date, datetime

from fastapi import HTTPException, status

from app.core.transactions import transaction
from app.modules.compromisos.models import ActividadPlanAccion, CompromisoPAS
from app.modules.compromisos.repository import CompromisosRepository
from app.modules.compromisos.schemas import (
    ActividadPlanAccionActualizarSeguimiento,
    ActividadPlanAccionCrear,
    ActividadPlanAccionRespuesta,
    BancoConocimientoDNPRespuesta,
    CompromisoPASActualizar,
    CompromisoPASActualizarAvance,
    CompromisoPASCrear,
    CompromisoPASRespuesta,
    KpisSeguimientoRespuesta,
    MatrizPlanAccionRespuesta,
    ResumenEjecutivoPlanAccion,
    ValidarRedaccionRespuesta,
    ValidarRedaccionSolicitud,
)



class CompromisosService:
    def __init__(self, repository: CompromisosRepository) -> None:
        self.repo = repository

    async def listar_compromisos(
        self,
        busqueda: str | None = None,
        entidad: str | None = None,
        estado: str | None = None,
    ) -> Sequence[CompromisoPAS]:
        return await self.repo.listar(busqueda=busqueda, entidad=entidad, estado=estado)

    async def obtener_compromiso(self, id_o_codigo: str | uuid.UUID) -> CompromisoPAS:
        compromiso = await self.repo.obtener_por_id_o_codigo(id_o_codigo)
        if not compromiso:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Compromiso '{id_o_codigo}' no encontrado.",
            )
        return compromiso

    async def crear_compromiso(
        self, datos: CompromisoPASCrear, actor_id: uuid.UUID | None = None
    ) -> CompromisoPAS:
        existente = await self.repo.obtener_por_id_o_codigo(datos.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un compromiso con el código '{datos.codigo}'.",
            )

        meta = datos.meta_cuatrienal_valor if datos.meta_cuatrienal_valor > 0 else 1.0
        if datos.avance_cuatrienal_valor is not None:
            porcentaje = (
                datos.porcentaje_cumplimiento
                if datos.porcentaje_cumplimiento is not None
                else min(100.0, max(0.0, round((datos.avance_cuatrienal_valor / meta) * 100.0, 2)))
            )
            estado = datos.estado if datos.estado != "sin_reporte" else "en_ejecucion"
        else:
            porcentaje = None
            estado = datos.estado

        compromiso = CompromisoPAS(
            codigo=datos.codigo.strip().upper(),
            nombre=datos.nombre.strip(),
            descripcion=datos.descripcion.strip(),
            entidad_responsable=datos.entidad_responsable.strip(),
            linea_estrategica_codigo=datos.linea_estrategica_codigo.strip().upper(),
            alternativa_mga_codigo=datos.alternativa_mga_codigo.strip().upper(),
            indicador_asociado_codigo=datos.indicador_asociado_codigo.strip().upper(),
            meta_cuatrienal_descripcion=datos.meta_cuatrienal_descripcion.strip(),
            meta_cuatrienal_valor=datos.meta_cuatrienal_valor,
            unidad_medida=datos.unidad_medida.strip(),
            avance_cuatrienal_valor=datos.avance_cuatrienal_valor,
            porcentaje_cumplimiento=porcentaje,
            presupuesto_anual_cop=datos.presupuesto_anual_cop,
            vigencias_programadas=datos.vigencias_programadas or [2026, 2027, 2028, 2029],
            estado=datos.estado,
            fecha_corte_ultimo_reporte=datos.fecha_corte_ultimo_reporte,
            metadatos=datos.metadatos,
        )

        async with transaction(self.repo.session):
            creado = await self.repo.crear(compromiso)

            # Registro pericial inmutable en auditoría forense
            await self.repo.registrar_auditoria(
                registro_id=creado.id,
                accion="compromiso_creado",
                justificacion_motivada=f"Creación del compromiso institucional PAS {creado.codigo}: '{creado.nombre}'.",
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": creado.codigo,
                    "entidad": creado.entidad_responsable,
                    "meta": float(creado.meta_cuatrienal_valor),
                    "presupuesto": float(creado.presupuesto_anual_cop),
                },
            )

        return creado

    async def actualizar_avance(
        self,
        id_o_codigo: str | uuid.UUID,
        datos: CompromisoPASActualizarAvance,
        actor_id: uuid.UUID | None = None,
    ) -> CompromisoPAS:
        compromiso = await self.obtener_compromiso(id_o_codigo)

        if datos.avance_cuatrienal_valor is not None:
            meta = float(compromiso.meta_cuatrienal_valor) if compromiso.meta_cuatrienal_valor > 0 else 1.0
            nuevo_avance = float(datos.avance_cuatrienal_valor)
            porcentaje = min(100.0, max(0.0, round((nuevo_avance / meta) * 100.0, 2)))
            compromiso.avance_cuatrienal_valor = nuevo_avance
            compromiso.porcentaje_cumplimiento = porcentaje
        else:
            nuevo_avance = compromiso.avance_cuatrienal_valor
            porcentaje = compromiso.porcentaje_cumplimiento

        if datos.estado:
            nuevo_estado = datos.estado
        elif porcentaje is not None:
            if porcentaje >= 100.0:
                nuevo_estado = "cumplido"
            elif porcentaje < 30.0:
                nuevo_estado = "retrasado"
            elif porcentaje < 50.0:
                nuevo_estado = "en_riesgo"
            else:
                nuevo_estado = "en_ejecucion"
        else:
            nuevo_estado = compromiso.estado

        compromiso.estado = nuevo_estado
        if datos.fecha_corte_ultimo_reporte:
            compromiso.fecha_corte_ultimo_reporte = datos.fecha_corte_ultimo_reporte

        metadatos = dict(compromiso.metadatos or {})
        if datos.observacion_cualitativa:
            metadatos["observacion_cualitativa"] = datos.observacion_cualitativa
        if datos.url_evidencia:
            metadatos["url_evidencia"] = datos.url_evidencia
        metadatos["ultima_modificacion"] = datetime.now(UTC).isoformat()
        compromiso.metadatos = metadatos

        justificacion = (
            f"Actualización de avance de compromiso {compromiso.codigo}: "
            f"avance={nuevo_avance} {compromiso.unidad_medida} ({porcentaje}%), estado={nuevo_estado}."
        )
        if datos.observacion_cualitativa:
            justificacion += f" Observación: {datos.observacion_cualitativa}"

        async with transaction(self.repo.session):
            actualizado = await self.repo.actualizar(compromiso)

            # Registro pericial inmutable en auditoría forense
            await self.repo.registrar_auditoria(
                registro_id=actualizado.id,
                accion="compromiso_actualizado",
                justificacion_motivada=justificacion,
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": actualizado.codigo,
                    "avance_cuatrienal_valor": nuevo_avance,
                    "porcentaje_cumplimiento": porcentaje,
                    "estado": nuevo_estado,
                    "fecha_corte": str(actualizado.fecha_corte_ultimo_reporte),
                },
            )

        return actualizado

    async def actualizar_compromiso(
        self,
        id_o_codigo: str | uuid.UUID,
        datos: CompromisoPASActualizar,
        actor_id: uuid.UUID | None = None,
    ) -> CompromisoPAS:
        compromiso = await self.obtener_compromiso(id_o_codigo)

        campos_actualizados = []
        for campo, valor in datos.model_dump(exclude_unset=True).items():
            if valor is not None:
                setattr(compromiso, campo, valor)
                campos_actualizados.append(campo)

        # Recalcular porcentaje si cambio avance o meta
        if "avance_cuatrienal_valor" in campos_actualizados or "meta_cuatrienal_valor" in campos_actualizados:
            meta = float(compromiso.meta_cuatrienal_valor) if compromiso.meta_cuatrienal_valor > 0 else 1.0
            compromiso.porcentaje_cumplimiento = min(
                100.0, max(0.0, round((float(compromiso.avance_cuatrienal_valor) / meta) * 100.0, 2))
            )

        async with transaction(self.repo.session):
            actualizado = await self.repo.actualizar(compromiso)

            await self.repo.registrar_auditoria(
                registro_id=actualizado.id,
                accion="compromiso_actualizado",
                justificacion_motivada=f"Actualización general de compromiso {actualizado.codigo} (campos: {', '.join(campos_actualizados)}).",
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={"codigo": actualizado.codigo, "campos": campos_actualizados},
            )

        return actualizado

    async def eliminar_compromiso(
        self, id_o_codigo: str | uuid.UUID, actor_id: uuid.UUID | None = None
    ) -> None:
        compromiso = await self.obtener_compromiso(id_o_codigo)
        comp_id = compromiso.id
        codigo = compromiso.codigo

        async with transaction(self.repo.session):
            await self.repo.registrar_auditoria(
                registro_id=comp_id,
                accion="compromiso_eliminado",
                justificacion_motivada=f"Eliminación de compromiso PAS {codigo} de la matriz institucional.",
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={"codigo": codigo},
            )
            await self.repo.eliminar(compromiso)

    async def obtener_kpis(self) -> KpisSeguimientoRespuesta:
        compromisos = await self.repo.listar()
        total = len(compromisos)
        if total == 0:
            return KpisSeguimientoRespuesta(
                totalCompromisos=0,
                compromisosConReporte=0,
                compromisosSinReporte=0,
                compromisosEnEjecucionOCumplidos=0,
                compromisosEnRiesgoORetrasados=0,
                promedioCumplimientoCuatrienal=None,
                presupuestoTotalAnualCop=0.0,
            )

        con_reporte = [
            c for c in compromisos
            if c.porcentaje_cumplimiento is not None and c.estado != "sin_reporte"
        ]
        total_con_reporte = len(con_reporte)
        sin_reporte = total - total_con_reporte

        en_ejecucion_o_cumplidos = sum(
            1 for c in compromisos if c.estado in ("cumplido", "en_ejecucion")
        )
        en_riesgo_o_retrasados = sum(
            1 for c in compromisos if c.estado in ("en_riesgo", "retrasado")
        )
        promedio = (
            round(sum(float(c.porcentaje_cumplimiento) for c in con_reporte) / total_con_reporte, 1)
            if total_con_reporte > 0
            else None
        )
        suma_presupuesto = sum(
            float(c.presupuesto_anual_cop or 0)
            for c in compromisos
            if c.presupuesto_anual_cop is not None
        )

        return KpisSeguimientoRespuesta(
            totalCompromisos=total,
            compromisosConReporte=total_con_reporte,
            compromisosSinReporte=sin_reporte,
            compromisosEnEjecucionOCumplidos=en_ejecucion_o_cumplidos,
            compromisosEnRiesgoORetrasados=en_riesgo_o_retrasados,
            promedioCumplimientoCuatrienal=promedio,
            presupuestoTotalAnualCop=suma_presupuesto,
        )

    # =========================================================================
    # MOTOR DE PLANES DE ACCIÓN DNP / SISPT Y BANCO DE CONOCIMIENTO (OBS-DNP-01)
    # =========================================================================

    VERBOS_DEBILES_PROHIBIDOS: set[str] = {
        "apropiar",
        "asegurar",
        "colaborar",
        "consolidar",
        "contribuir",
        "desarrollar",
        "integrar",
        "fomentar",
        "fortalecer",
        "garantizar",
        "implementar",
        "impulsar",
        "mejorar",
        "movilizar",
        "proponer",
        "promover",
    }

    SUGERENCIAS_POR_TIPO: dict[str, list[str]] = {
        "NORMATIVA": ["Adecuar", "Modificar", "Fijar", "Adoptar", "Eliminar", "Expedir", "Reglamentar", "Derogar"],
        "ADMINISTRATIVA": ["Firmar", "Diseñar", "Ajustar", "Analizar", "Verificar", "Suscribir", "Tramitar", "Auditar"],
        "DE_GESTION": ["Crear", "Identificar", "Expedir", "Ejecutar", "Concertar", "Gestionar", "Asignar", "Convocar"],
        "LOGISTICA": ["Notificar", "Colocar", "Verificar", "Instalar", "Dotar", "Distribuir", "Adecuar", "Suministrar"],
    }
    SUGERENCIAS_GENERALES: list[str] = [
        "Expedir", "Diseñar", "Instalar", "Ejecutar", "Crear", "Adoptar", "Verificar", "Adecuar"
    ]

    @classmethod
    def normalizar_palabra(cls, palabra: str) -> str:
        limpia = re.sub(r"[^\wáéíóúüñÁÉÍÓÚÜÑ]", "", palabra, flags=re.UNICODE)
        tabla = str.maketrans("áéíóúüÁÉÍÓÚÜ", "aeiouuAEIOUU")
        return limpia.translate(tabla).lower()


    @classmethod
    def validar_redaccion_dnp(
        cls, descripcion: str, tipo_actividad: str | None = None
    ) -> ValidarRedaccionRespuesta:
        """Validador Lingüístico Oficial del DNP (Instructivo Kit Financiero, Pág. 12).
        
        Verifica que la actividad inicie obligatoriamente con un verbo fuerte en infinitivo (-ar, -er, -ir)
        y detecta los 16 verbos débiles prohibidos taxativamente por el DNP.
        """
        if not descripcion or not descripcion.strip():
            return ValidarRedaccionRespuesta(
                es_valida=False,
                verbo_detectado="",
                es_infinitivo=False,
                es_verbo_debil_prohibido=False,
                mensaje_dnp="La descripción de la actividad no puede estar vacía.",
                verbos_fuertes_sugeridos=cls.SUGERENCIAS_GENERALES,
            )

        palabras = descripcion.strip().split()
        primera_palabra_cruda = palabras[0] if palabras else ""
        verbo_norm = cls.normalizar_palabra(primera_palabra_cruda)

        tipo_clave = (tipo_actividad or "").strip().upper()
        sugerencias = cls.SUGERENCIAS_POR_TIPO.get(tipo_clave, cls.SUGERENCIAS_GENERALES)

        if verbo_norm in cls.VERBOS_DEBILES_PROHIBIDOS:
            return ValidarRedaccionRespuesta(
                es_valida=False,
                verbo_detectado=verbo_norm,
                es_infinitivo=verbo_norm.endswith(("ar", "er", "ir")),
                es_verbo_debil_prohibido=True,
                mensaje_dnp=(
                    f"El verbo '{primera_palabra_cruda}' pertenece a la lista negra oficial de 16 verbos débiles "
                    f"prohibidos por el DNP (Instructivo Kit Financiero, pág. 12). "
                    f"Sustitúyalo por un verbo fuerte en infinitivo que denote una acción concreta y verificable."
                ),
                verbos_fuertes_sugeridos=sugerencias,
            )

        es_infinitivo = verbo_norm.endswith(("ar", "er", "ir")) and len(verbo_norm) >= 4
        if not es_infinitivo:
            return ValidarRedaccionRespuesta(
                es_valida=False,
                verbo_detectado=verbo_norm,
                es_infinitivo=False,
                es_verbo_debil_prohibido=False,
                mensaje_dnp=(
                    f"La actividad inicia con '{primera_palabra_cruda}', que no es un verbo en infinitivo "
                    f"terminado en -ar, -er o -ir. Según la metodología DNP (pág. 12), toda actividad debe "
                    f"iniciar obligatoriamente con un verbo fuerte en infinitivo."
                ),
                verbos_fuertes_sugeridos=sugerencias,
            )

        return ValidarRedaccionRespuesta(
            es_valida=True,
            verbo_detectado=verbo_norm,
            es_infinitivo=True,
            es_verbo_debil_prohibido=False,
            mensaje_dnp=(
                f"Redacción válida según el estándar DNP. Inicia con el verbo fuerte en infinitivo '{verbo_norm}'."
            ),
            verbos_fuertes_sugeridos=[],
        )

    def obtener_banco_conocimiento(self) -> BancoConocimientoDNPRespuesta:
        """Estructura canónica del Banco de Conocimiento DNP / SisPT."""
        return BancoConocimientoDNPRespuesta(
            marco_normativo=[
                {
                    "norma": "Ley 152 de 1994, Art. 41",
                    "titulo": "Elaboración y Aprobación del Plan de Acción",
                    "descripcion": (
                        "Con base en los planes generales aprobados por el Concejo, cada secretaría y departamento administrativo "
                        "preparará, con la coordinación de la Oficina de Planeación, su correspondiente Plan de Acción y lo "
                        "someterá a la aprobación del Consejo de Gobierno distrital."
                    ),
                    "obligatoriedad": "Obligatorio para todas las dependencias del Distrito.",
                },
                {
                    "norma": "Ley 152 de 1994, Art. 29",
                    "titulo": "Articulación Plan Indicativo (PI) y Planes de Acción (PA)",
                    "descripcion": (
                        "Articulación vinculante entre el Plan Indicativo cuatrienal del Plan de Desarrollo y los Planes "
                        "de Acción anuales como instrumento base para la evaluación de resultados y gestión pública territorial."
                    ),
                    "obligatoriedad": "Marco de evaluación del cuatrienio distrital.",
                },
                {
                    "norma": "Ley 1474 de 2011, Art. 74",
                    "titulo": "Estatuto Anticorrupción - Publicación Oficial a 31 de Enero",
                    "descripcion": (
                        "Todas las entidades del Estado, a más tardar el 31 de enero de cada año, deberán publicar en su "
                        "página web el Plan de Acción para la vigencia (objetivos, estrategias, proyectos, metas, responsables, "
                        "distribución presupuestal) y el informe de gestión del año anterior."
                    ),
                    "obligatoriedad": "Fecha límite improrrogable: 31 de enero de cada vigencia fiscal.",
                },
                {
                    "norma": "Decreto 2482 de 2012 / MIPG",
                    "titulo": "Integración del Modelo de Planeación y Gestión",
                    "descripcion": (
                        "Adopción del Modelo Integrado de Planeación y Gestión (MIPG) articulando los instrumentos de planeación "
                        "operativa y financiera en una sola matriz unificada por dependencia."
                    ),
                    "obligatoriedad": "Estándar de gestión de calidad pública territorial.",
                },
            ],
            encadenamiento_instrumentos=[
                {
                    "instrumento": "PDT y Plan Indicativo (PI)",
                    "etapa": "Insumo Estratégico",
                    "actividad_dnp": "Identificación de metas de producto y de gestión incorporadas en el Plan de Desarrollo.",
                    "producto_dnp": "Metas de gestión y de producto de la vigencia sujetas a seguimiento en el Plan de Acción.",
                },
                {
                    "instrumento": "POAI (Plan Operativo Anual de Inversiones)",
                    "etapa": "Insumo Operativo de Inversión",
                    "actividad_dnp": "Articulación de actividades requeridas con cada proyecto de inversión de la vigencia.",
                    "producto_dnp": "Actividades necesarias con indicadores, recursos, fecha de inicio y terminación.",
                },
                {
                    "instrumento": "MFMP (Marco Fiscal de Mediano Plazo)",
                    "etapa": "Insumo de Consistencia Fiscal",
                    "actividad_dnp": "Definición de la cuota global de inversión para la vigencia fiscal (Hacienda y Planeación).",
                    "producto_dnp": "Cuota global de inversión distribuida entre sectores conforme a la capacidad de pago distrital.",
                },
                {
                    "instrumento": "Presupuesto Anual y PAC",
                    "etapa": "Insumo Presupuestal y Flujo de Caja",
                    "actividad_dnp": "Definición de recursos destinados a inversión y funcionamiento y cronograma mensualizado de caja.",
                    "producto_dnp": "Disponibilidad cierta de recursos financieros para financiar las actividades del Plan de Acción.",
                },
            ],
            ruta_metodologica_7_pasos=[
                {
                    "paso": 1,
                    "nombre": "Orientaciones Metodológicas y Competencias",
                    "responsable": "Oficina de Planeación Distrital y Secretarías",
                    "descripcion": "Planeación imparte lineamientos, cronograma y formatos a los enlaces designados por dependencia, revisando misión y competencias.",
                },
                {
                    "paso": 2,
                    "nombre": "Consolidación y Revisión de Insumos",
                    "responsable": "Enlaces de Planeación por Dependencia",
                    "descripcion": "Consolidación de metas de producto del PI, proyectos POAI, cuota MFMP y asignaciones presupuestales aprobadas.",
                },
                {
                    "paso": 3,
                    "nombre": "Incorporación de Metas de Gestión y Administrativas",
                    "responsable": "Secretarías y Dependencias Ejecutoras",
                    "descripcion": "Identificación de metas recurrentes, procesos internos clave y gestión de recursos externos/nacionales que requieran seguimiento.",
                },
                {
                    "paso": 4,
                    "nombre": "Programación de Actividades y Articulación Interinstitucional",
                    "responsable": "Dependencias Ejecutoras y Co-responsables",
                    "descripcion": "Definición de actividades indispensables por meta de producto/proyecto, identificando corresponsabilidad interinstitucional entre dependencias.",
                },
                {
                    "paso": 5,
                    "nombre": "Diligenciamiento de la Matriz Oficial (Hoja 1 y Hoja 2)",
                    "responsable": "Líderes de Formulación por Secretaría",
                    "descripcion": "Llenado técnico de la Matriz del Plan de Acción (Hoja 1 PA vinculada a Hoja 2 Plan Indicativo) con validación de verbos fuertes y fuentes.",
                },
                {
                    "paso": 6,
                    "nombre": "Presentación y Aprobación en Consejo de Gobierno",
                    "responsable": "Alcalde Mayor, Secretario de Planeación y Gabinete",
                    "descripcion": "Sometimiento formal de los Planes de Acción consolidados a la aprobación del Consejo de Gobierno distrital (Art. 41 Ley 152/94).",
                },
                {
                    "paso": 7,
                    "nombre": "Publicación Oficial a más tardar el 31 de Enero",
                    "responsable": "Oficina de Planeación y Tecnologías de la Información",
                    "descripcion": "Publicación en el portal web institucional distrital y reporte al SisPT antes del 31 de enero conforme al Art. 74 Ley 1474/11.",
                },
            ],
            pasos_diligenciamiento_matriz=[
                {
                    "numero": "4.1",
                    "nombre": "Paso 1: Responsables de la Ejecución",
                    "campos": ["entidad_responsable", "lider_responsable", "dependencias_articuladas"],
                    "guia": "Identificar la secretaría u organismo distrital que lidera y las dependencias articuladas en corresponsabilidad.",
                },
                {
                    "numero": "4.2",
                    "nombre": "Paso 2: Clasificación de la Meta",
                    "campos": ["tipo_meta"],
                    "guia": "Clasificar en META_PRODUCTO (bienes y servicios al ciudadano), META_GESTION (procesos y gestión de recursos) o ACTIVIDAD (tareas específicas de proyecto).",
                },
                {
                    "numero": "4.3",
                    "nombre": "Paso 3: Articulación con Hoja 2 Plan Indicativo",
                    "campos": ["codigo_meta_pi", "programa_pi", "meta_producto_vigencia"],
                    "guia": "Vincular con el código único del Plan Indicativo (PAS), el programa estratégico y la meta cuantitativa programada para el año.",
                },
                {
                    "numero": "4.4",
                    "nombre": "Paso 4: Vinculación con Proyectos BPIM / MGA",
                    "campos": ["codigo_bpim", "proyecto_nombre", "objetivo_proyecto"],
                    "guia": "Registrar el código de 13 dígitos del Banco de Proyectos de Inversión Municipal (BPIM), nombre y objetivo central priorizado en POAI.",
                },
                {
                    "numero": "4.5",
                    "nombre": "Paso 5: Programación de Actividades y Regla de Verbos Fuertes",
                    "campos": ["tipo_actividad", "descripcion_actividad", "fecha_inicio", "fecha_terminacion", "avance_trimestral"],
                    "guia": "Redactar iniciando obligatoriamente con verbo fuerte en infinitivo (-ar, -er, -ir), clasificar en NORMATIVA, ADMINISTRATIVA, DE_GESTION o LOGISTICA, y fijar metas trimestrales T1-T4.",
                },
                {
                    "numero": "4.6",
                    "nombre": "Paso 6: Fuentes de Financiación por Vigencia",
                    "campos": ["categoria_recursos", "fuente_financiacion", "monto_programado_cop", "monto_ejecutado_cop"],
                    "guia": "Asignar la categoría (INVERSION, FUNCIONAMIENTO, RECURSOS_GESTION) y la fuente presupuestal exacta (SGP, Regalías, Propios, Crédito, etc.).",
                },
            ],
            taxonomia_metas=[
                {
                    "tipo": "META_PRODUCTO",
                    "nombre": "Meta de Producto",
                    "definicion": "Cuantifica los bienes y/o servicios públicos entregados a la comunidad para resolver la problemática diagnosticada en la política pública.",
                    "ejemplo": "250 cámaras de videovigilancia y analítica LPR operativas enlazadas al CAD MECAR.",
                },
                {
                    "tipo": "META_GESTION",
                    "nombre": "Meta de Gestión",
                    "definicion": "Cuantifica el nivel de cumplimiento de procesos, trámites y acciones internas o de gestión de recursos necesarias para materializar los productos.",
                    "ejemplo": "12 comités barriales de mediación y resolución comunitaria de conflictos instalados.",
                },
                {
                    "tipo": "ACTIVIDAD",
                    "nombre": "Actividad de Proyecto / Recurrente",
                    "definicion": "Acción específica o recurrente requerida durante la vigencia fiscal para avanzar en metas de proyectos o procesos misionales continuos.",
                    "ejemplo": "Colocar 1.200 luminarias LED de 150W en senderos escolares y paraderos del SITM.",
                },
            ],
            taxonomia_actividades=[
                {
                    "tipo": "NORMATIVA",
                    "nombre": "Actividad Normativa",
                    "descripcion": "Expedición o ajuste de normas, decretos, resoluciones, estatutos, tarifas o reglamentos distritales.",
                    "ejemplos_verbos": ["Expedir", "Adecuar", "Adoptar", "Modificar", "Fijar", "Eliminar", "Reglamentar"],
                },
                {
                    "tipo": "ADMINISTRATIVA",
                    "nombre": "Actividad Administrativa",
                    "descripcion": "Gestión de contratos, convenios, diseño de software, ajuste de procesos y trámites interinstitucionales.",
                    "ejemplos_verbos": ["Firmar", "Diseñar", "Ajustar", "Analizar", "Verificar", "Suscribir", "Tramitar"],
                },
                {
                    "tipo": "DE_GESTION",
                    "nombre": "Actividad de Gestión",
                    "descripcion": "Acciones operativas directas en territorio, ejecución de programas, fondos comunitarios y mesas de concertación.",
                    "ejemplos_verbos": ["Crear", "Identificar", "Ejecutar", "Concertar", "Gestionar", "Asignar", "Convocar"],
                },
                {
                    "tipo": "LOGISTICA",
                    "nombre": "Actividad Logística",
                    "descripcion": "Instalación de infraestructura, colocación de equipos, dotaciones físicas, distribución y notificaciones.",
                    "ejemplos_verbos": ["Instalar", "Colocar", "Notificar", "Dotar", "Distribuir", "Adecuar", "Suministrar"],
                },
            ],
            regla_linguistica_dnp={
                "fundamento": "Instructivo Plan de Acción DNP / Kit Financiero, pág. 12",
                "regla_oro": "La redacción de toda actividad DEBE iniciar con un verbo fuerte en infinitivo (-ar, -er, -ir) que denote acción observable y resultado verificable.",
                "verbos_debiles_prohibidos": sorted(list(self.VERBOS_DEBILES_PROHIBIDOS)),
                "motivo_prohibicion": (
                    "El DNP prohíbe taxativamente estos 16 verbos porque denotan intenciones genéricas, difusas o ambiguas "
                    "que impiden la verificación objetiva del avance físico y el control social y fiscal."
                ),
                "catalogo_verbos_fuertes": self.SUGERENCIAS_POR_TIPO,
            },
            catalogo_fuentes_financiacion={
                "INVERSION": [
                    {"codigo": "RECURSOS_PROPIOS", "nombre": "Recursos Propios (ICLD / Impuestos Distritales)"},
                    {"codigo": "SGP", "nombre": "Sistema General de Participaciones (Ley 715 de 2001)"},
                    {"codigo": "REGALIAS", "nombre": "Sistema General de Regalías (SGR / FCTI / Asignaciones Paz)"},
                    {"codigo": "CREDITO", "nombre": "Recursos de Crédito Público Autorizado"},
                    {"codigo": "COFINANCIACION", "nombre": "Cofinanciación de la Nación / Cooperación Internacional"},
                    {"codigo": "OTROS", "nombre": "Otros Recursos de Capital y Donaciones"},
                ],
                "FUNCIONAMIENTO": [
                    {"codigo": "GASTOS_PERSONAL", "nombre": "Servicios Personales de Nómina y Supernumerarios"},
                    {"codigo": "GASTOS_GENERALES", "nombre": "Adquisición de Bienes, Servicios y Mantenimiento"},
                    {"codigo": "TRANSFERENCIAS", "nombre": "Transferencias Corrientes de Ley"},
                ],
                "RECURSOS_GESTION": [
                    {"codigo": "GESTION_NO_PRESUPUESTAL", "nombre": "Gestión Interinstitucional Directa (Sin Erogación Presupuestal ET)"},
                ],
            },
            enlaces_oficiales=[
                {"titulo": "SisPT - Sistema de Planeación Territorial DNP", "url": "https://sispt.dnp.gov.co/"},
                {"titulo": "Portal Territorial DNP - Kit Financiero", "url": "https://portalterritorial.dnp.gov.co/"},
                {"titulo": "Instructivo Metodológico Plan de Acción DNP", "url": "/docs/Instructivo_PlandeAccion_DNP.pdf"},
            ],
        )

    async def obtener_matriz_plan_accion(
        self,
        vigencia: int | None = None,
        entidad: str | None = None,
        linea_codigo: str | None = None,
        tipo_meta: str | None = None,
        tipo_actividad: str | None = None,
        categoria_recursos: str | None = None,
        fuente_financiacion: str | None = None,
        busqueda: str | None = None,
    ) -> MatrizPlanAccionRespuesta:
        """Obtiene la matriz completa DNP: Resumen Ejecutivo, Hoja 1 (PA) y Hoja 2 (PI)."""
        actividades = await self.repo.listar_actividades(
            vigencia=vigencia,
            entidad=entidad,
            linea_codigo=linea_codigo,
            tipo_meta=tipo_meta,
            tipo_actividad=tipo_actividad,
            categoria_recursos=categoria_recursos,
            fuente_financiacion=fuente_financiacion,
            busqueda=busqueda,
        )

        compromisos_pas = await self.repo.listar()
        hoja_2_map = {c.codigo: c for c in compromisos_pas}

        total_act = len(actividades)
        total_producto = sum(1 for a in actividades if a.tipo_meta == "META_PRODUCTO")
        total_gestion = sum(1 for a in actividades if a.tipo_meta == "META_GESTION")
        total_act_tipo = sum(1 for a in actividades if a.tipo_meta == "ACTIVIDAD")

        promedio_fisico = (
            round(sum(float(a.porcentaje_avance_fisico) for a in actividades) / total_act, 2)
            if total_act > 0
            else 0.0
        )

        suma_prog = sum(float(a.monto_programado_cop or 0) for a in actividades)
        suma_ejec = sum(float(a.monto_ejecutado_cop or 0) for a in actividades)
        pct_ejec_fin = round((suma_ejec / suma_prog) * 100.0, 2) if suma_prog > 0 else 0.0

        # Desglose por fuente
        desglose_fuentes: dict[str, dict[str, float]] = {}
        for a in actividades:
            fuente = a.fuente_financiacion
            if fuente not in desglose_fuentes:
                desglose_fuentes[fuente] = {"programado": 0.0, "ejecutado": 0.0}
            desglose_fuentes[fuente]["programado"] += float(a.monto_programado_cop or 0)
            desglose_fuentes[fuente]["ejecutado"] += float(a.monto_ejecutado_cop or 0)

        # Desglose por tipo actividad
        desglose_tipo_act: dict[str, int] = {}
        for a in actividades:
            t = a.tipo_actividad
            desglose_tipo_act[t] = desglose_tipo_act.get(t, 0) + 1

        # Semáforo de alertas
        semaforo = {
            "en_meta": sum(1 for a in actividades if float(a.porcentaje_avance_fisico) >= 80.0),
            "alerta_preventiva": sum(
                1 for a in actividades if 50.0 <= float(a.porcentaje_avance_fisico) < 80.0
            ),
            "rezago_critico": sum(1 for a in actividades if float(a.porcentaje_avance_fisico) < 50.0),
        }

        resumen = ResumenEjecutivoPlanAccion(
            total_actividades=total_act,
            total_metas_producto=total_producto,
            total_metas_gestion=total_gestion,
            total_actividades_tipo=total_act_tipo,
            avance_fisico_promedio=promedio_fisico,
            presupuesto_total_programado_cop=suma_prog,
            presupuesto_total_ejecutado_cop=suma_ejec,
            porcentaje_ejecucion_financiera=pct_ejec_fin,
            desglose_fuentes=desglose_fuentes,
            desglose_tipo_actividad=desglose_tipo_act,
            semaforo_alertas=semaforo,
        )

        # Hoja 2 articulada: compromisos que coinciden con las actividades o todos
        codigos_articulados = {a.compromiso_pas_codigo for a in actividades}
        hoja_2 = [
            CompromisoPASRespuesta.model_validate(c)
            for c in compromisos_pas
            if not codigos_articulados or c.codigo in codigos_articulados
        ]

        return MatrizPlanAccionRespuesta(
            resumen_ejecutivo=resumen,
            hoja_1_plan_accion=[ActividadPlanAccionRespuesta.model_validate(a) for a in actividades],
            hoja_2_plan_indicativo=hoja_2,
        )

    async def obtener_actividad(self, id_o_codigo: str | uuid.UUID) -> ActividadPlanAccion:
        actividad = await self.repo.obtener_actividad_por_id_o_codigo(id_o_codigo)
        if not actividad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Actividad '{id_o_codigo}' no encontrada en el Plan de Acción.",
            )
        return actividad

    async def crear_actividad(
        self, datos: ActividadPlanAccionCrear, actor_id: uuid.UUID | None = None
    ) -> ActividadPlanAccion:
        # 1. Validación Lingüística DNP obligatoria
        valida = self.validar_redaccion_dnp(datos.descripcion_actividad, datos.tipo_actividad)
        if not valida.es_valida:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "mensaje": valida.mensaje_dnp,
                    "verbo_detectado": valida.verbo_detectado,
                    "es_verbo_debil_prohibido": valida.es_verbo_debil_prohibido,
                    "sugerencias": valida.verbos_fuertes_sugeridos,
                },
            )

        # 2. Comprobar unicidad de código
        existente = await self.repo.obtener_actividad_por_id_o_codigo(datos.codigo)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe una actividad en el Plan de Acción con el código '{datos.codigo}'.",
            )

        # 3. Recalcular avance físico inicial
        t_values = [datos.avance_t1, datos.avance_t2, datos.avance_t3, datos.avance_t4]
        reported = [v for v in t_values if v > 0]
        avance_fisico = (
            round(sum(reported) / len(reported), 2)
            if reported
            else (datos.porcentaje_avance_fisico or 0.0)
        )

        actividad = ActividadPlanAccion(
            codigo=datos.codigo.strip().upper(),
            vigencia=datos.vigencia or 2026,
            compromiso_pas_codigo=datos.compromiso_pas_codigo.strip().upper(),
            linea_estrategica_codigo=datos.linea_estrategica_codigo.strip().upper(),
            programa_nombre=datos.programa_nombre.strip(),
            entidad_responsable=datos.entidad_responsable.strip(),
            lider_responsable=datos.lider_responsable.strip(),
            dependencias_articuladas=datos.dependencias_articuladas or [],
            tipo_meta=datos.tipo_meta,
            meta_producto_vigencia=datos.meta_producto_vigencia.strip(),
            meta_valor_vigencia=datos.meta_valor_vigencia or 1.0,
            unidad_medida=datos.unidad_medida.strip(),
            codigo_bpim=datos.codigo_bpim.strip(),
            proyecto_nombre=datos.proyecto_nombre.strip(),
            objetivo_proyecto=datos.objetivo_proyecto.strip(),
            tipo_actividad=datos.tipo_actividad,
            descripcion_actividad=datos.descripcion_actividad.strip(),
            verbo_infinitivo=valida.verbo_detectado or (datos.verbo_infinitivo or "").strip().lower(),
            fecha_inicio=datos.fecha_inicio,
            fecha_terminacion=datos.fecha_terminacion,
            periodicidad_seguimiento=datos.periodicidad_seguimiento or "TRIMESTRAL",
            avance_t1=datos.avance_t1 or 0.0,
            avance_t2=datos.avance_t2 or 0.0,
            avance_t3=datos.avance_t3 or 0.0,
            avance_t4=datos.avance_t4 or 0.0,
            porcentaje_avance_fisico=avance_fisico,
            categoria_recursos=datos.categoria_recursos,
            fuente_financiacion=datos.fuente_financiacion,
            monto_programado_cop=datos.monto_programado_cop or 0.0,
            monto_ejecutado_cop=datos.monto_ejecutado_cop or 0.0,
            estado_aprobacion=datos.estado_aprobacion or "APROBADO_CONSEJO_GOBIERNO",
            evidencia_soporte=datos.evidencia_soporte,
            metadatos=datos.metadatos or {},
        )

        async with transaction(self.repo.session):
            creada = await self.repo.crear_actividad(actividad)

            await self.repo.registrar_auditoria(
                registro_id=creada.id,
                accion="actividad_pa_creada",
                justificacion_motivada=(
                    f"Registro de actividad {creada.codigo} en el Plan de Acción {creada.vigencia} "
                    f"con verbo fuerte '{creada.verbo_infinitivo}'."
                ),
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": creada.codigo,
                    "entidad": creada.entidad_responsable,
                    "compromiso": creada.compromiso_pas_codigo,
                    "tipo_actividad": creada.tipo_actividad,
                    "monto_programado_cop": float(creada.monto_programado_cop),
                },
            )

        return creada

    async def actualizar_seguimiento_actividad(
        self,
        id_o_codigo: str | uuid.UUID,
        datos: ActividadPlanAccionActualizarSeguimiento,
        actor_id: uuid.UUID | None = None,
    ) -> ActividadPlanAccion:
        actividad = await self.obtener_actividad(id_o_codigo)

        campos_actualizados = []
        if datos.avance_t1 is not None:
            actividad.avance_t1 = datos.avance_t1
            campos_actualizados.append("avance_t1")
        if datos.avance_t2 is not None:
            actividad.avance_t2 = datos.avance_t2
            campos_actualizados.append("avance_t2")
        if datos.avance_t3 is not None:
            actividad.avance_t3 = datos.avance_t3
            campos_actualizados.append("avance_t3")
        if datos.avance_t4 is not None:
            actividad.avance_t4 = datos.avance_t4
            campos_actualizados.append("avance_t4")
        if datos.monto_ejecutado_cop is not None:
            actividad.monto_ejecutado_cop = datos.monto_ejecutado_cop
            campos_actualizados.append("monto_ejecutado_cop")
        if datos.evidencia_soporte is not None:
            actividad.evidencia_soporte = datos.evidencia_soporte
            campos_actualizados.append("evidencia_soporte")
        if datos.estado_aprobacion is not None:
            actividad.estado_aprobacion = datos.estado_aprobacion
            campos_actualizados.append("estado_aprobacion")

        # Recalcular avance físico promedio ponderado
        t_values = [
            float(actividad.avance_t1),
            float(actividad.avance_t2),
            float(actividad.avance_t3),
            float(actividad.avance_t4),
        ]
        reported = [v for v in t_values if v > 0]
        actividad.porcentaje_avance_fisico = (
            round(sum(reported) / len(reported), 2) if reported else 0.0
        )

        metadatos = dict(actividad.metadatos or {})
        if datos.observacion_cualitativa:
            metadatos["observacion_cualitativa"] = datos.observacion_cualitativa
        metadatos["ultima_modificacion"] = datetime.now(UTC).isoformat()
        actividad.metadatos = metadatos

        justificacion = (
            f"Seguimiento trimestral actualizado en actividad {actividad.codigo}: "
            f"avance={actividad.porcentaje_avance_fisico}%, ejecutado={actividad.monto_ejecutado_cop} COP."
        )

        async with transaction(self.repo.session):
            actualizada = await self.repo.actualizar_actividad(actividad)

            await self.repo.registrar_auditoria(
                registro_id=actualizada.id,
                accion="actividad_pa_seguimiento_actualizado",
                justificacion_motivada=justificacion,
                usuario_id=actor_id,
                causal="tecnica",
                metadatos={
                    "codigo": actualizada.codigo,
                    "campos_actualizados": campos_actualizados,
                    "avance_fisico": float(actualizada.porcentaje_avance_fisico),
                    "monto_ejecutado_cop": float(actualizada.monto_ejecutado_cop),
                },
            )

        return actualizada

