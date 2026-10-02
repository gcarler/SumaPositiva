"""Tabulación compatible con preguntas legadas y documentos del constructor."""

import json
from math import isfinite


def tabular_pregunta(pregunta, respuestas):
    tipo = pregunta.get("tipo", "texto_libre")
    datos = [r.datos_respuesta.get(pregunta["id"]) for r in respuestas]
    salida = {"texto": pregunta.get("texto", ""), "tipo": tipo}
    if tipo in ("opcion_unica", "lista_desplegable", "opcion_multiple"):
        opciones = pregunta.get("opciones", [])
        etiquetas = {o["id"]: o["texto"] for o in opciones if isinstance(o, dict)}
        conteos = {o["id"] if isinstance(o, dict) else o: 0 for o in opciones}
        respondidos = 0
        for dato in datos:
            valores = dato if isinstance(dato, list) else [dato]
            contabilizados = set()
            for v in valores:
                if not isinstance(v, str):
                    continue
                clave = (
                    v
                    if v in conteos
                    else next(
                        (
                            o["id"]
                            for o in opciones
                            if isinstance(o, dict)
                            and o.get("esOtro")
                            and v.startswith(o["id"] + ":")
                        ),
                        None,
                    )
                )
                if clave in conteos and clave not in contabilizados:
                    conteos[clave] += 1
                    contabilizados.add(clave)
            respondidos += bool(contabilizados)
        salida.update(conteos=conteos, respondidos=respondidos)
        if etiquetas:
            salida["etiquetas"] = etiquetas
        if tipo != "opcion_multiple":
            salida["porcentajes"] = {
                k: round(v / respondidos * 100, 1) if respondidos else 0.0
                for k, v in conteos.items()
            }
    elif tipo in ("escala_likert", "likert", "escala_lineal", "numero"):
        valores = []
        for dato in datos:
            if isinstance(dato, bool) or not isinstance(dato, (str, int, float)):
                continue
            try:
                n = float(dato)
                if isfinite(n):
                    valores.append(n)
            except ValueError:
                continue
        distribucion = (
            {str(i): 0 for i in range(1, 6)} if tipo in ("escala_likert", "likert") else {}
        )
        for n in valores:
            clave = str(int(n)) if n.is_integer() else str(n)
            distribucion[clave] = distribucion.get(clave, 0) + 1
        salida.update(
            distribucion=distribucion,
            respondidos=len(valores),
            promedio=round(sum(valores) / len(valores), 2) if valores else 0.0,
        )
    elif tipo == "ubicacion_geografica":
        # Las coordenadas y las evidencias originales solo se sirven por respuestas privadas.
        puntos = []
        for dato in datos:
            if isinstance(dato, str):
                try:
                    dato = json.loads(dato)
                except (ValueError, TypeError):
                    continue
            if isinstance(dato, dict) and (dato.get("tipo") == tipo or dato.get("type") == "Point"):
                puntos.append(dato)
        salida.update(
            total_puntos=len(puntos),
            total_fotos=sum(len(d.get("valor", {}).get("fotos", [])) for d in puntos),
        )
    elif tipo == "foto_multiple":
        salida["total_fotos"] = sum(len(d) for d in datos if isinstance(d, list))
    else:
        muestras = [d.strip() for d in datos if isinstance(d, str) and d.strip()]
        salida.update(total_aportes_texto=len(muestras), muestras=muestras[:5])
    return salida
