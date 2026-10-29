import { describe, expect, test } from "vitest";
import type { Sesion } from "@/features/sesion/models/sesion";
import {
  MODULOS,
  puedeEntrar,
  puedeEditar,
  puedeVer,
  modulosPermitidos,
  panelPermitido,
  moduloDeRuta,
} from "./acceso";
const sesion = (rol: string, cambios: Partial<Sesion> = {}): Sesion => ({
  modo: "institucional",
  usuarioId: "prueba",
  token: "token-prueba",
  expiraEn: "2099-01-01T00:00:00Z",
  desde: "2026-10-01",
  rol,
  permisos: [
    "formularios:gestionar",
    "mesas:abrir",
    "mesas:acuerdos",
    "usuarios:gestionar",
    "politicas:gestionar",
  ],
  ...cambios,
});
describe("Matriz de rutas internas", () => {
  test.each([
    ["ciudadano", []],
    [
      "autoridad_distrital",
      ["dashboard", "formularios", "geovisor", "mesas", "contenido", "noticias", "testimonios", "fuentes", "actores", "diagnostico", "alternativas", "seguimiento", "proyectos", "comunicaciones"],
    ],
    ["facilitador_mesa", ["dashboard", "formularios", "mesas", "testimonios", "actores", "proyectos", "comunicaciones"]],
    [
      "auditor_forense",
      [
        "dashboard",
        "formularios",
        "geovisor",
        "mesas",
        "contenido",
        "noticias",
        "fuentes",
        "actores",
        "diagnostico",
        "alternativas",
        "seguimiento",
        "proyectos",
        "comunicaciones",
        "configuracion",
      ],
    ],
    ["administrador_identidades", MODULOS.map((m) => m.id)],
    ["rol_desconocido", []],
  ] as const)("%s: enlaces y acceso directo coinciden", (rol, esperados) => {
    const actual = sesion(rol, rol === "rol_desconocido" ? { permisos: [] } : {});
    expect(modulosPermitidos(actual).map((m) => m.id)).toEqual(esperados);
    for (const m of MODULOS)
      expect(puedeVer(actual, m.id)).toBe(esperados.some((v) => v === m.id));
  });
  test.each([
    null,
    sesion("autoridad_distrital", { modo: "anonimo" }),
    sesion("autoridad_distrital", { token: undefined }),
    sesion("autoridad_distrital", { usuarioId: undefined }),
    sesion("autoridad_distrital", { expiraEn: "2020-01-01" }),
    sesion("autoridad_distrital", { expiraEn: "inválida" }),
  ])("Una sesión incompleta o caducada no accede", (s) => {
    expect(puedeEntrar(s)).toBe(false);
  });
  test("auditor no puede abrir editores ni emitir respuestas", () => {
    const auditor = sesion("auditor_forense");
    for (const m of MODULOS) expect(puedeEditar(auditor, m.id)).toBe(false);
    for (const p of [
      "formulario-editor",
      "formulario-respuesta",
      "mesa-editor",
      "papelografo",
      "fases-control",
      "fuente-editor",
      "actor-editor",
      "medicion-editor",
      "alternativa-editor",
    ] as const)
      expect(panelPermitido(auditor, p)).toBe(false);
    expect(panelPermitido(auditor, "formulario-analitica")).toBe(true);
    expect(panelPermitido(auditor, "evaluacion-viabilidad")).toBe(true);
    expect(panelPermitido(auditor, "auditoria-consola")).toBe(false);
    const auditorConPermiso = sesion("auditor_forense", { permisos: ["auditoria:leer"] });
    expect(panelPermitido(auditorConPermiso, "auditoria-consola")).toBe(true);
    expect(panelPermitido(auditor, "usuarios")).toBe(false);
  });
  test("ficha-actividad-proyecto exige lectura de proyectos", () => {
    const gestor = sesion("gestor_bienestar_social", {
      permisos: ["proyectos:leer"],
    });
    expect(panelPermitido(gestor, "ficha-actividad-proyecto")).toBe(true);
    // Rol personalizado: la ficha queda ligada a proyectos:leer
    const lector = sesion("liga_comunitaria", { permisos: ["proyectos:leer"] });
    expect(panelPermitido(lector, "ficha-actividad-proyecto")).toBe(true);
    const sinProyectos = sesion("liga_comunitaria", {
      permisos: ["testimonios:moderar"],
    });
    expect(panelPermitido(sinProyectos, "ficha-actividad-proyecto")).toBe(false);
  });
  test("paneles internos de mesas y diagnóstico sin caso quedaban bloqueados", () => {
    const gestor = sesion("gestor_bienestar_social", {
      permisos: ["mesas:abrir", "diagnostico:leer"],
    });
    // Acta y agenda de mesa: lectura/edición del módulo mesas
    expect(panelPermitido(gestor, "mesa-acta")).toBe(true);
    expect(panelPermitido(gestor, "agenda-editor")).toBe(true);
    // Proyecciones read-only del diagnóstico: basta lectura
    expect(panelPermitido(gestor, "ficha-territorial")).toBe(true);
    expect(panelPermitido(gestor, "validacion-mga")).toBe(true);
    // El módulo dueño gatea: sin mesas ni diagnóstico no hay panel
    const soloProyectos = sesion("liga_comunitaria", {
      permisos: ["proyectos:leer"],
    });
    expect(panelPermitido(soloProyectos, "mesa-acta")).toBe(false);
    expect(panelPermitido(soloProyectos, "agenda-editor")).toBe(false);
    expect(panelPermitido(soloProyectos, "ficha-territorial")).toBe(false);
    expect(panelPermitido(soloProyectos, "validacion-mga")).toBe(false);
  });
  test("facilitador consulta formularios y gestiona mesas y testimonios sin editar actores", () => {
    const f = sesion("facilitador_mesa");
    expect(puedeEditar(f, "formularios")).toBe(false);
    expect(panelPermitido(f, "formulario-editor")).toBe(false);
    expect(puedeEditar(f, "mesas")).toBe(true);
    expect(puedeEditar(f, "actores")).toBe(false);
    expect(panelPermitido(f, "actor-editor")).toBe(false);
    expect(puedeEditar(f, "testimonios")).toBe(true);
    expect(panelPermitido(f, "testimonios-moderacion")).toBe(true);
    expect(puedeVer(f, "noticias")).toBe(false);
  });
  test("noticias y testimonios tienen permisos y paneles separados", () => {
    const autoridad = sesion("autoridad_distrital", { permisos: [] });
    expect(puedeVer(autoridad, "noticias")).toBe(true);
    expect(puedeEditar(autoridad, "noticias")).toBe(true);
    expect(panelPermitido(autoridad, "noticia")).toBe(true);
    expect(panelPermitido(autoridad, "noticia-editor")).toBe(true);
    expect(panelPermitido(autoridad, "testimonios-moderacion")).toBe(true);
    expect(panelPermitido(autoridad, "testimonio-editor")).toBe(true);
    expect(panelPermitido(autoridad, "testimonio-nuevo")).toBe(true);
    expect(panelPermitido(autoridad, "testimonios-galeria")).toBe(true);

    const lector = sesion("lector_contenido", { permisos: ["contenido:leer"] });
    expect(puedeVer(lector, "noticias")).toBe(true);
    expect(puedeEditar(lector, "noticias")).toBe(false);
    expect(puedeVer(lector, "testimonios")).toBe(false);
    expect(panelPermitido(lector, "noticia-editor")).toBe(false);
    expect(panelPermitido(lector, "testimonios-moderacion")).toBe(false);
    expect(panelPermitido(lector, "testimonio-editor")).toBe(false);

    const moderador = sesion("moderador_testimonios", {
      permisos: ["testimonios:moderar"],
    });
    expect(modulosPermitidos(moderador).map((modulo) => modulo.id)).toEqual([
      "dashboard",
      "testimonios",
    ]);
    expect(panelPermitido(moderador, "testimonios-moderacion")).toBe(true);
    expect(panelPermitido(moderador, "testimonio-editor")).toBe(true);
    expect(panelPermitido(moderador, "testimonio-nuevo")).toBe(true);
    expect(panelPermitido(moderador, "testimonios-galeria")).toBe(true);
    expect(panelPermitido(moderador, "noticia-editor")).toBe(false);
  });
  test("perfil personalizado administra solo los módulos concedidos", () => {
    const administradorFormularios = sesion("admin_formularios", {
      permisos: ["formularios:leer", "formularios:gestionar"],
    });
    expect(puedeEntrar(administradorFormularios)).toBe(true);
    expect(modulosPermitidos(administradorFormularios).map((modulo) => modulo.id)).toEqual([
      "dashboard",
      "formularios",
    ]);
    expect(puedeEditar(administradorFormularios, "formularios")).toBe(true);
    expect(puedeVer(administradorFormularios, "mesas")).toBe(false);
    expect(puedeEditar(administradorFormularios, "usuarios")).toBe(false);
    expect(panelPermitido(administradorFormularios, "formulario-editor")).toBe(true);
    expect(panelPermitido(administradorFormularios, "mesa-editor")).toBe(false);

    const lectorGeovisor = sesion("lector_geovisor", { permisos: ["geovisor:leer"] });
    expect(modulosPermitidos(lectorGeovisor).map((modulo) => modulo.id)).toEqual([
      "dashboard",
      "geovisor",
    ]);
    expect(puedeEditar(lectorGeovisor, "geovisor")).toBe(false);

    const adminConfiguracion = sesion("admin_configuracion", {
      permisos: ["configuracion:leer", "configuracion:gestionar"],
    });
    expect(puedeEditar(adminConfiguracion, "configuracion")).toBe(true);
    expect(panelPermitido(adminConfiguracion, "fases-control")).toBe(false);

    const adminInstrumentos = sesion("admin_instrumentos", {
      permisos: ["instrumentos:gestionar"],
    });
    expect(puedeEditar(adminInstrumentos, "formularios")).toBe(true);
  });
  test("roles autorizados editan según matriz de acceso por rol", () => {
    expect(
      puedeEditar(
        sesion("administrador_identidades", { permisos: [] }),
        "formularios",
      ),
    ).toBe(true);
    expect(
      puedeEditar(sesion("autoridad_distrital", { permisos: [] }), "mesas"),
    ).toBe(true);
    expect(
      puedeEditar(sesion("autoridad_distrital", { permisos: [] }), "fuentes"),
    ).toBe(true);
    expect(
      puedeEditar(
        sesion("administrador_identidades", { permisos: [] }),
        "fuentes",
      ),
    ).toBe(true);
    expect(
      puedeEditar(
        sesion("administrador_identidades", { permisos: [] }),
        "actores",
      ),
    ).toBe(true);
    expect(
      puedeEditar(sesion("autoridad_distrital", { permisos: [] }), "actores"),
    ).toBe(true);
    expect(
      puedeEditar(
        sesion("administrador_identidades", { permisos: [] }),
        "diagnostico",
      ),
    ).toBe(true);
    expect(
      puedeEditar(sesion("autoridad_distrital", { permisos: [] }), "diagnostico"),
    ).toBe(true);
    expect(
      puedeEditar(sesion("ciudadano"), "mesas"),
    ).toBe(false);
    expect(
      puedeEditar(sesion("ciudadano"), "fuentes"),
    ).toBe(false);
    expect(
      puedeEditar(sesion("ciudadano"), "actores"),
    ).toBe(false);
    expect(
      puedeEditar(sesion("ciudadano"), "diagnostico"),
    ).toBe(false);
    expect(
      puedeEditar(
        sesion("administrador_identidades", { permisos: [] }),
        "alternativas",
      ),
    ).toBe(true);
    expect(
      puedeEditar(sesion("autoridad_distrital", { permisos: [] }), "alternativas"),
    ).toBe(true);
    expect(
      puedeEditar(sesion("ciudadano"), "alternativas"),
    ).toBe(false);
    expect(
      panelPermitido(sesion("autoridad_distrital"), "alternativa-editor"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("auditor_forense"), "evaluacion-viabilidad"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("autoridad_distrital"), "asignacion-presupuestal"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("auditor_forense"), "asignacion-presupuestal"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("ciudadano"), "asignacion-presupuestal"),
    ).toBe(false);
    expect(
      puedeEditar(
        sesion("administrador_identidades", { permisos: [] }),
        "seguimiento",
      ),
    ).toBe(true);
    expect(
      puedeEditar(sesion("autoridad_distrital", { permisos: [] }), "seguimiento"),
    ).toBe(true);
    expect(
      puedeEditar(sesion("ciudadano"), "seguimiento"),
    ).toBe(false);
    expect(
      panelPermitido(sesion("autoridad_distrital"), "compromiso-editor"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("auditor_forense"), "compromiso-editor"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("ciudadano"), "compromiso-editor"),
    ).toBe(false);
    expect(
      panelPermitido(sesion("autoridad_distrital"), "indicador-detalle"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("auditor_forense"), "indicador-detalle"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("administrador_identidades"), "indicador-detalle"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("ciudadano"), "indicador-detalle"),
    ).toBe(false);
    expect(
      panelPermitido(sesion("autoridad_distrital"), "devolucion-detalle"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("auditor_forense"), "devolucion-detalle"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("administrador_identidades"), "devolucion-detalle"),
    ).toBe(true);
    expect(
      panelPermitido(sesion("ciudadano"), "devolucion-detalle"),
    ).toBe(false);
  });
  test("rutas exactas y normalización de barra final", () => {
    expect(moduloDeRuta("/plataforma/mesas/")).toBe("mesas");
    expect(moduloDeRuta("/plataforma/alternativas")).toBe("alternativas");
    expect(moduloDeRuta("/plataforma/alternativas/")).toBe("alternativas");
    expect(moduloDeRuta("/plataforma/seguimiento")).toBe("seguimiento");
    expect(moduloDeRuta("/plataforma/seguimiento/")).toBe("seguimiento");
    expect(moduloDeRuta("/plataforma/noticias")).toBe("noticias");
    expect(moduloDeRuta("/plataforma/testimonios/")).toBe("testimonios");
    expect(moduloDeRuta("/plataforma/usuarios/desconocido")).toBeUndefined();
  });
});
