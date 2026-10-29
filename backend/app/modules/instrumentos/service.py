import re
import uuid

from fastapi import HTTPException, status

from app.core.transactions import transaction
from app.modules.instrumentos.models import Instrumento, NodoInstrumento
from app.modules.instrumentos.repository import InstrumentoRepository
from app.modules.instrumentos.schemas import (
    ArbolSerializado,
    ConversionObjetivosPeticion,
    InstrumentoActualizar,
    InstrumentoCrear,
    InstrumentoRespuesta,
    NodoArbolJerarquico,
    NodoInstrumentoActualizar,
    NodoInstrumentoCrear,
    NodoInstrumentoRespuesta,
)

MAPEO_PROBLEMA_A_OBJETIVO = {
    "PROBLEMA_CENTRAL": ("OBJETIVO_CENTRAL", "CENTRAL", 0),
    "CAUSA_DIRECTA": ("MEDIO_DIRECTO", "MEDIO", 1),
    "CAUSA_INDIRECTA": ("MEDIO_INDIRECTO", "MEDIO", 2),
    "EFECTO_DIRECTO": ("FIN_DIRECTO", "FIN", 1),
    "EFECTO_INDIRECTO": ("FIN_INDIRECTO", "FIN", 2),
}

DICCIONARIO_INVERSION_POSITIVA = [
    (r"(?i)^elevados\s+índices\s+de\s+", "Reducir los índices de "),
    (r"(?i)^altos\s+índices\s+de\s+", "Disminuir los índices de "),
    (r"(?i)^falta\s+de\s+", "Garantizar la provisión de "),
    (r"(?i)^ausencia\s+de\s+", "Asegurar la disponibilidad de "),
    (r"(?i)^inexistencia\s+de\s+", "Implementar y consolidar "),
    (r"(?i)^déficit\s+de\s+", "Superar el déficit de "),
    (r"(?i)^baja\s+", "Incrementar la "),
    (r"(?i)^bajo\s+", "Incrementar el "),
    (r"(?i)^alta\s+", "Reducir la "),
    (r"(?i)^alto\s+", "Reducir el "),
    (r"(?i)^deterioro\s+de\s+", "Recuperar y proteger "),
    (r"(?i)^vulneración\s+de\s+", "Garantizar la protección y goce efectivo de "),
    (r"(?i)^desconexión\s+de\s+", "Interconectar y articular "),
    (r"(?i)^inseguridad\s+en\s+", "Fortalecer la seguridad y convivencia en "),
    (r"(?i)^contaminación\s+de\s+", "Descontaminar y sanear "),
    (r"(?i)^sobrecarga\s+de\s+", "Redistribuir equitativamente la carga de "),
]


class InstrumentoService:
    def __init__(self, repository: InstrumentoRepository) -> None:
        self.repository = repository

    async def crear_instrumento(self, datos: InstrumentoCrear) -> InstrumentoRespuesta:
        async with transaction(self.repository.session):
            instrumento = Instrumento(**datos.model_dump())
            creado = await self.repository.crear_instrumento(instrumento)
            return InstrumentoRespuesta.model_validate(creado)

    async def obtener_instrumento(self, instrumento_id: uuid.UUID) -> InstrumentoRespuesta:
        instrumento = await self.repository.obtener_instrumento(instrumento_id)
        if not instrumento:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Instrumento no encontrado")
        return InstrumentoRespuesta.model_validate(instrumento)

    async def listar_instrumentos(
        self,
        mesa_id: uuid.UUID | None = None,
        tipo_instrumento: str | None = None,
        estado: str | None = None,
    ) -> list[InstrumentoRespuesta]:
        instrumentos = await self.repository.listar_instrumentos(mesa_id, tipo_instrumento, estado)
        return [InstrumentoRespuesta.model_validate(i) for i in instrumentos]

    async def actualizar_instrumento(
        self, instrumento_id: uuid.UUID, datos: InstrumentoActualizar
    ) -> InstrumentoRespuesta:
        async with transaction(self.repository.session):
            instrumento = await self.repository.obtener_instrumento(instrumento_id)
            if not instrumento:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Instrumento no encontrado")

            for k, v in datos.model_dump(exclude_unset=True).items():
                if v is not None:
                    setattr(instrumento, k, v)

            actualizado = await self.repository.actualizar_instrumento(instrumento)
            return InstrumentoRespuesta.model_validate(actualizado)

    async def eliminar_instrumento(self, instrumento_id: uuid.UUID) -> None:
        async with transaction(self.repository.session):
            instrumento = await self.repository.obtener_instrumento(instrumento_id)
            if not instrumento:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Instrumento no encontrado")
            await self.repository.eliminar_instrumento(instrumento)

    # --- Gestión de Nodos ---

    def _inferir_relacion_y_nivel(self, tipo_nodo: str) -> tuple[str, int]:
        if tipo_nodo in ("PROBLEMA_CENTRAL", "OBJETIVO_CENTRAL"):
            return "CENTRAL", 0
        elif tipo_nodo in ("CAUSA_DIRECTA", "MEDIO_DIRECTO"):
            return ("CAUSA" if "CAUSA" in tipo_nodo else "MEDIO"), 1
        elif tipo_nodo in ("CAUSA_INDIRECTA", "MEDIO_INDIRECTO"):
            return ("CAUSA" if "CAUSA" in tipo_nodo else "MEDIO"), 2
        elif tipo_nodo in ("EFECTO_DIRECTO", "FIN_DIRECTO"):
            return ("EFECTO" if "EFECTO" in tipo_nodo else "FIN"), 1
        elif tipo_nodo in ("EFECTO_INDIRECTO", "FIN_INDIRECTO"):
            return ("EFECTO" if "EFECTO" in tipo_nodo else "FIN"), 2
        return "CENTRAL", 1

    async def agregar_nodo(self, instrumento_id: uuid.UUID, datos: NodoInstrumentoCrear) -> NodoInstrumentoRespuesta:
        async with transaction(self.repository.session):
            instrumento = await self.repository.obtener_instrumento(instrumento_id)
            if not instrumento:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Instrumento no encontrado")

            # Validación metodológica de pertenencia
            es_problemas = instrumento.tipo_instrumento == "ARBOL_PROBLEMAS"
            if es_problemas and any(k in datos.tipo_nodo for k in ("OBJETIVO", "MEDIO", "FIN")):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail="Un Árbol de Problemas no admite nodos de tipo Objetivo, Medio o Fin.",
                )
            if not es_problemas and any(k in datos.tipo_nodo for k in ("PROBLEMA", "CAUSA", "EFECTO")):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail=("Un Árbol de Objetivos no admite nodos de tipo Problema, Causa o Efecto."),
                )

            tipo_rel, nivel_inferido = self._inferir_relacion_y_nivel(datos.tipo_nodo)
            tipo_relacion = datos.tipo_relacion or tipo_rel
            nivel = datos.nivel if datos.nivel is not None else nivel_inferido

            if datos.nodo_padre_id:
                padre = await self.repository.obtener_nodo(datos.nodo_padre_id)
                if not padre or padre.instrumento_id != instrumento_id:
                    raise HTTPException(
                        status.HTTP_400_BAD_REQUEST,
                        detail="El nodo padre especificado no pertenece a este instrumento.",
                    )

            nodo = NodoInstrumento(
                instrumento_id=instrumento_id,
                nodo_padre_id=datos.nodo_padre_id,
                tipo_nodo=datos.tipo_nodo,
                tipo_relacion=tipo_relacion,
                nivel=nivel,
                orden=datos.orden,
                contenido=datos.contenido,
                metadatos=datos.metadatos,
            )
            creado = await self.repository.crear_nodo(nodo)
            return NodoInstrumentoRespuesta.model_validate(creado)

    async def actualizar_nodo(
        self,
        instrumento_id: uuid.UUID,
        nodo_id: uuid.UUID,
        datos: NodoInstrumentoActualizar,
        if_match: str | None = None,
    ) -> NodoInstrumentoRespuesta:
        # Use with_for_update to acquire row lock
        async with transaction(self.repository.session):
            nodo = await self.repository.obtener_nodo_para_actualizar(nodo_id)
            if not nodo or nodo.instrumento_id != instrumento_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nodo no encontrado en este instrumento")

            # Optmistic Concurrency Control checks
            if if_match and if_match.strip('"') != str(nodo.version_seq):
                raise HTTPException(
                    status.HTTP_412_PRECONDITION_FAILED,
                    detail="El ETag proporcionado no coincide con la versión actual del nodo.",
                )

            if datos.version_esperada is not None and datos.version_esperada != nodo.version_seq:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail=("Conflicto de concurrencia: la versión esperada no coincide con la actual."),
                )

            if datos.version_seq is not None and datos.version_seq != nodo.version_seq:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    detail=("Conflicto de concurrencia: la versión enviada no coincide con la actual."),
                )

            for k, v in datos.model_dump(exclude_unset=True, exclude={"version_esperada", "version_seq"}).items():
                if v is not None:
                    if k == "tipo_nodo":
                        tipo_rel, nivel = self._inferir_relacion_y_nivel(v)
                        nodo.tipo_relacion = tipo_rel
                        nodo.nivel = nivel
                    setattr(nodo, k, v)

            nodo.version_seq += 1
            actualizado = await self.repository.actualizar_nodo(nodo)
            return NodoInstrumentoRespuesta.model_validate(actualizado)

    async def eliminar_nodo(self, instrumento_id: uuid.UUID, nodo_id: uuid.UUID) -> None:
        async with transaction(self.repository.session):
            nodo = await self.repository.obtener_nodo(nodo_id)
            if not nodo or nodo.instrumento_id != instrumento_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nodo no encontrado en este instrumento")
            await self.repository.eliminar_nodo(nodo)

    # --- Serialización Jerárquica del Árbol ---

    async def serializar_arbol(self, instrumento_id: uuid.UUID) -> ArbolSerializado:
        instrumento = await self.repository.obtener_instrumento(instrumento_id)
        if not instrumento:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Instrumento no encontrado")

        nodos = await self.repository.listar_nodos_por_instrumento(instrumento_id)

        # Reconstrucción recursiva del árbol en memoria
        mapa_nodos: dict[uuid.UUID, NodoArbolJerarquico] = {}
        for n in nodos:
            mapa_nodos[n.id] = NodoArbolJerarquico(
                id=n.id,
                tipo_nodo=n.tipo_nodo,
                tipo_relacion=n.tipo_relacion,
                nivel=n.nivel,
                orden=n.orden,
                contenido=n.contenido,
                nodo_padre_id=n.nodo_padre_id,
                nodo_origen_id=n.nodo_origen_id,
                metadatos=n.metadatos,
                hijos=[],
                version_seq=n.version_seq,
                etag=n.etag,
            )

        nodo_central: NodoArbolJerarquico | None = None
        causas_o_medios: list[NodoArbolJerarquico] = []
        efectos_o_fines: list[NodoArbolJerarquico] = []

        for n in nodos:
            nodo_jer = mapa_nodos[n.id]
            if n.tipo_relacion == "CENTRAL" or n.nivel == 0:
                nodo_central = nodo_jer
            elif n.nodo_padre_id and n.nodo_padre_id in mapa_nodos:
                padre_jer = mapa_nodos[n.nodo_padre_id]
                # Si el padre es el nodo central, es un nodo primario (nivel 1)
                if padre_jer.tipo_relacion == "CENTRAL" or padre_jer.nivel == 0:
                    if n.tipo_relacion in ("CAUSA", "MEDIO"):
                        causas_o_medios.append(nodo_jer)
                    elif n.tipo_relacion in ("EFECTO", "FIN"):
                        efectos_o_fines.append(nodo_jer)
                    else:
                        causas_o_medios.append(nodo_jer)
                else:
                    # Es un hijo de segundo nivel (indirecto)
                    padre_jer.hijos.append(nodo_jer)
            else:
                # Nodo sin padre explícito
                if n.tipo_relacion in ("CAUSA", "MEDIO"):
                    causas_o_medios.append(nodo_jer)
                elif n.tipo_relacion in ("EFECTO", "FIN"):
                    efectos_o_fines.append(nodo_jer)
                elif not nodo_central:
                    nodo_central = nodo_jer

        return ArbolSerializado(
            instrumento=InstrumentoRespuesta.model_validate(instrumento),
            nodo_central=nodo_central,
            causas_o_medios=causas_o_medios,
            efectos_o_fines=efectos_o_fines,
            total_nodos=len(nodos),
        )

    # --- Metodología MGA DNP: Conversión de Problemas a Objetivos ---

    def _invertir_a_positivo(self, texto: str) -> str:
        for patron, reemplazo in DICCIONARIO_INVERSION_POSITIVA:
            if re.search(patron, texto.strip()):
                return re.sub(patron, reemplazo, texto.strip(), count=1)
        # Si no coincide con ninguno, aplicar inversión estándar
        return f"Promover y garantizar: {texto.strip()}"

    async def convertir_a_objetivos(
        self, instrumento_id: uuid.UUID, peticion: ConversionObjetivosPeticion
    ) -> ArbolSerializado:
        async with transaction(self.repository.session):
            origen = await self.repository.obtener_instrumento(instrumento_id)
            if not origen:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Árbol de problemas no encontrado")

            if origen.tipo_instrumento != "ARBOL_PROBLEMAS":
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail=("Solo un Árbol de Problemas puede ser convertido a Árbol de Objetivos según la MGA."),
                )

            nodos_origen = await self.repository.listar_nodos_por_instrumento(instrumento_id)
            if not nodos_origen:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail="El Árbol de Problemas no contiene nodos para convertir.",
                )

            # 1. Crear nuevo instrumento Árbol de Objetivos
            nombre_obj = peticion.nombre_objetivos or f"Árbol de Objetivos: {origen.nombre}"
            nuevo_instrumento = Instrumento(
                mesa_id=origen.mesa_id,
                linea_id=origen.linea_id,
                tipo_instrumento="ARBOL_OBJETIVOS",
                nombre=nombre_obj,
                descripcion=(
                    f"Derivado metodológicamente según MGA DNP desde el Árbol de Problemas '{origen.nombre}'."
                ),
                estado="VALIDADO",
                instrumento_origen_id=origen.id,
                metadatos={"origen_id": str(origen.id), "metodologia": "MGA_DNP"},
            )
            instrumento_creado = await self.repository.crear_instrumento(nuevo_instrumento)

            # 2. Mapear y clonar nodos en orden jerárquico (nivel ascendente)
            mapa_ids_viejos_nuevos: dict[uuid.UUID, uuid.UUID] = {}
            nuevos_nodos: list[NodoInstrumento] = []

            # Ordenar nivel 0 primero para que el padre siempre exista en el mapa
            nodos_ordenados = sorted(nodos_origen, key=lambda x: (x.nivel, x.orden))

            for n in nodos_ordenados:
                nuevo_id = uuid.uuid4()
                mapa_ids_viejos_nuevos[n.id] = nuevo_id

                nuevo_padre_id = (
                    mapa_ids_viejos_nuevos.get(n.nodo_padre_id)
                    if n.nodo_padre_id and n.nodo_padre_id in mapa_ids_viejos_nuevos
                    else None
                )

                tipo_obj, rel_obj, nivel_obj = MAPEO_PROBLEMA_A_OBJETIVO.get(
                    n.tipo_nodo, ("OBJETIVO_CENTRAL", "CENTRAL", n.nivel)
                )

                # Contenido convertido
                if str(n.id) in peticion.modificaciones_manuales:
                    contenido_convertido = peticion.modificaciones_manuales[str(n.id)]
                else:
                    contenido_convertido = self._invertir_a_positivo(n.contenido)

                nodo_obj = NodoInstrumento(
                    id=nuevo_id,
                    instrumento_id=instrumento_creado.id,
                    nodo_padre_id=nuevo_padre_id,
                    tipo_nodo=tipo_obj,
                    tipo_relacion=rel_obj,
                    nivel=nivel_obj,
                    orden=n.orden,
                    contenido=contenido_convertido,
                    nodo_origen_id=n.id,
                    metadatos={"problema_origen_id": str(n.id), "contenido_original": n.contenido},
                )
                nuevos_nodos.append(nodo_obj)

            await self.repository.crear_nodos_lote(nuevos_nodos)

            # 3. Marcar instrumento de origen como CONVERTIDO
            origen.estado = "CONVERTIDO"
            await self.repository.actualizar_instrumento(origen)

            # 4. Retornar árbol de objetivos serializado
            return await self.serializar_arbol(instrumento_creado.id)
