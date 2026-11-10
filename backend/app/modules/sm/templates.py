"""Motor de plantillas institucional del núcleo SM.

Permite registrar, validar y renderizar plantillas de notificación con variables
dinámicas por canal, garantizando que ninguna notificación se envíe con campos
faltantes o formatos erróneos.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .contracts import SMCanal
from .core import SMError


class SMPlantillaInvalida(SMError):
    """La plantilla no existe o faltan variables requeridas."""


@dataclass(frozen=True)
class SMPlantilla:
    """Definición inmutable de una plantilla institucional."""

    nombre: str
    cuerpo_patron: str
    asunto_patron: str | None = None
    canal: SMCanal | None = None
    variables_requeridas: tuple[str, ...] = ()
    descripcion: str = ""


class SMMotorPlantillas:
    """Motor de registro y renderizado seguro de plantillas SM."""

    def __init__(self) -> None:
        self._plantillas: dict[str, SMPlantilla] = {}
        self._registrar_plantillas_por_defecto()

    def registrar(self, plantilla: SMPlantilla) -> None:
        """Registra una plantilla institucional."""
        if not re.match(r"^[a-z][a-z0-9_\-\.]{1,79}$", plantilla.nombre):
            raise SMPlantillaInvalida(f"Nombre de plantilla inválido: {plantilla.nombre}")
        self._plantillas[plantilla.nombre] = plantilla

    def obtener(self, nombre: str) -> SMPlantilla | None:
        """Obtiene una plantilla registrada por su identificador."""
        return self._plantillas.get(nombre)

    def renderizar(
        self,
        nombre: str,
        variables: dict[str, Any],
    ) -> tuple[str | None, str]:
        """Renderiza una plantilla reemplazando variables.

        Retorna:
            (asunto_renderizado, cuerpo_renderizado)
        """
        plantilla = self.obtener(nombre)
        if not plantilla:
            raise SMPlantillaInvalida(f"Plantilla no encontrada: '{nombre}'")

        # Validar variables requeridas
        faltantes = [v for v in plantilla.variables_requeridas if v not in variables or variables[v] is None]
        if faltantes:
            raise SMPlantillaInvalida(
                f"Faltan variables obligatorias para la plantilla '{nombre}': {', '.join(faltantes)}"
            )

        # Reemplazo seguro
        cuerpo = plantilla.cuerpo_patron
        for clave, valor in variables.items():
            marcador = f"{{{clave}}}"
            if marcador in cuerpo:
                cuerpo = cuerpo.replace(marcador, str(valor))

        asunto = None
        if plantilla.asunto_patron:
            asunto = plantilla.asunto_patron
            for clave, valor in variables.items():
                marcador = f"{{{clave}}}"
                if marcador in asunto:
                    asunto = asunto.replace(marcador, str(valor))

        return asunto, cuerpo

    def _registrar_plantillas_por_defecto(self) -> None:
        """Carga el catálogo institucional por defecto."""
        self.registrar(
            SMPlantilla(
                nombre="sm.notificacion.general",
                asunto_patron="Notificación: {titulo}",
                cuerpo_patron="Estimado/a {actor}:\n\n{mensaje}\n\nCordialmente,\n{entidad}",
                variables_requeridas=("actor", "titulo", "mensaje", "entidad"),
                descripcion="Notificación general institucional",
            )
        )
        self.registrar(
            SMPlantilla(
                nombre="sm.mesa.convocatoria",
                asunto_patron="Convocatoria a Mesa de Trabajo: {mesa_nombre}",
                cuerpo_patron=(
                    "Estimado/a {actor}:\n\n"
                    "Ha sido convocado/a a participar en la mesa '{mesa_nombre}' que tendrá lugar "
                    "el día {fecha} en {lugar}.\n\n"
                    "Consulte los detalles en el portal institucional: {enlace}\n\n"
                    "Atentamente,\nEquipo de Participación Ciudadana"
                ),
                variables_requeridas=("actor", "mesa_nombre", "fecha", "lugar"),
                descripcion="Convocatoria institucional a mesas ciudadanas",
            )
        )
        self.registrar(
            SMPlantilla(
                nombre="sm.compromiso.asignado",
                asunto_patron="Compromiso Asignado: {compromiso_id}",
                cuerpo_patron=(
                    "Estimado/a {actor}:\n\n"
                    "Se le ha asignado la responsabilidad sobre el compromiso: '{titulo}'.\n"
                    "Fecha límite de cumplimiento: {fecha_limite}.\n"
                    "Detalle: {descripcion}\n\n"
                    "Seguimiento: {enlace}"
                ),
                variables_requeridas=("actor", "compromiso_id", "titulo", "fecha_limite"),
                descripcion="Notificación de asignación de compromisos de mesa",
            )
        )
        self.registrar(
            SMPlantilla(
                nombre="sm.seguridad.alerta",
                asunto_patron="Alerta de Seguridad POLIS",
                cuerpo_patron=(
                    "AVISO DE SEGURIDAD\n\n"
                    "Se ha registrado una acción crítica en su cuenta ({accion}) el {fecha}.\n"
                    "Si no reconoce esta actividad, reporte de inmediato a soporte.\n"
                    "Hash de trazabilidad: {hash}"
                ),
                variables_requeridas=("accion", "fecha", "hash"),
                descripcion="Alerta de seguridad y verificación de cuenta",
            )
        )


# Instancia compartida por defecto
motor_plantillas = SMMotorPlantillas()
