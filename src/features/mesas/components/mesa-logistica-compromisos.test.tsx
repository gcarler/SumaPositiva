import { describe, test, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { useMesasStore } from "@/features/mesas/state/mesas-store";
import {
  crearLogisticaPorDefecto,
  type MesaDeTrabajo,
  type CompromisoMesa,
  type NotaMesa,
} from "@/features/mesas/models/mesas";
import { MesaLogisticaPanel } from "./mesa-logistica-panel";
import { MesaCompromisosTabla } from "./mesa-compromisos-tabla";
import { MesaSorteoAzar } from "./mesa-sorteo-azar";
import { MesaGaleriaEvidencias } from "./mesa-galeria-evidencias";
import { MesaNotasBitacora } from "./mesa-notas-bitacora";

function crearMesaMock(id = "mesa-test-308"): MesaDeTrabajo {
  return {
    id,
    nombre: "Mesa Territorial de Seguridad Humana - Nelson Mandela",
    fecha: "2026-11-15",
    lugar: "Salón Comunal Sector Las Vegas",
    entidad: "Alcaldía Mayor de Cartagena",
    facilitador: "Dra. Carmen Valiente",
    totalAsistentes: 45,
    estado: "en_curso",
    plenaria: {
      acuerdos: "Priorizar seguridad juvenil y recuperación del parque deportivo",
    },
    submesas: [],
    logistica: crearLogisticaPorDefecto(),
    compromisos: [
      {
        id: "comp-1",
        codigo: "COMP-01",
        descripcion: "Instalación de 10 luminarias LED solares en la cancha",
        entidadResponsable: "Secretaría General / Alumbrado Público",
        personaResponsable: "Ing. Marco Aurelio",
        fechaLimite: "2026-12-15",
        tipo: "inversion_distrital",
        estado: "en_ejecucion",
        avancePorcentaje: 40,
        observaciones: "Aprobada viabilidad técnica",
      },
    ],
    sorteoAzar: {
      metodoConvocatoria: "sorteo_civico_aleatorio",
      estratificacion: "UCG-03 paridad de género",
      intervencionesSorteo: [
        {
          asistenteId: "asist-01",
          nombre: "Marcos Julio Restrepo",
          horaSorteo: "2026-11-15T09:30:00Z",
          duracionMinutos: 3,
          tema: "Alumbrado público sector Las Vegas",
        },
      ],
      muestraAleatoriaAuditoria: ["asist-01", "asist-02"],
    },
    galeriaFotos: [
      {
        id: "foto-1",
        nombre: "Plenaria Comunitaria de Apertura",
        categoria: "apertura",
        url: "https://ejemplo.org/fotos/apertura.jpg",
        tamanoBytes: 154200,
        subidoEn: "2026-11-15T08:45:00Z",
        subidoPor: "Relatoría Distrital",
        exifDespojado: true,
        descripcion: "Instalación de la mesa con líderes comunales",
      },
    ],
    notas: [
      {
        id: "nota-1",
        autor: "Dra. Carmen Valiente",
        rolAutor: "Facilitadora Principal",
        momento: "plenaria_apertura",
        contenido: "Fuerte concurrencia de madres comunitarias y líderes juveniles.",
        creadoEn: "2026-11-15T09:15:00Z",
        esPrivada: false,
      },
      {
        id: "nota-2",
        autor: "Dra. Carmen Valiente",
        rolAutor: "Facilitadora Principal",
        momento: "submesas",
        contenido: "Tensión entre dos sectores vecinos superada tras mediación.",
        creadoEn: "2026-11-15T10:30:00Z",
        esPrivada: true,
      },
    ],
  };
}

describe("Motor Integral de Mesas de Trabajo (Encargo 308)", () => {
  beforeEach(() => {
    const mesa = crearMesaMock("mesa-test-308");
    useMesasStore.setState({
      mesas: [mesa],
    });
  });

  describe("FASE 1: Preparación Logística y Checklist Operativo", () => {
    test("renderiza panel logístico con categorías canónicas y KPIs de avance", () => {
      const mesa = useMesasStore.getState().mesas[0];
      const html = renderToString(<MesaLogisticaPanel mesa={mesa} />);

      expect(html).toContain("Fase 1: Preparación Logística");
      expect(html).toContain("Espacio y Salón");
      expect(html).toContain("Sistemas Audiovisuales");
      expect(html).toContain("Insumos Metodológicos");
      expect(html).toContain("Hidratación y Refrigerios");
      expect(html).toContain("Seguridad y Accesibilidad");
      expect(html).toContain("Equipo y Roles de Soporte en Terreno");
    });

    test("store: toggleChecklistLogistico alterna estado de tarea", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";
      const primerItem = store.mesas[0].logistica?.checklist[0];
      expect(primerItem).toBeDefined();
      expect(primerItem?.completado).toBe(false);

      store.toggleChecklistLogistico(mesaId, primerItem!.id);
      const mesaActualizada = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesaActualizada?.logistica?.checklist[0].completado).toBe(true);

      // Re-toggle vuelve a false
      useMesasStore.getState().toggleChecklistLogistico(mesaId, primerItem!.id);
      const mesaReToggle = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesaReToggle?.logistica?.checklist[0].completado).toBe(false);
    });

    test("store: agregarItemChecklist y eliminarItemChecklist", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";
      const totalInicial = store.mesas[0].logistica?.checklist.length ?? 0;

      store.agregarItemChecklist(mesaId, {
        categoria: "audiovisual",
        tarea: "Verificar baterías de repuesto para megáfono",
        completado: false,
        responsable: "Pedro Martínez",
      });

      const mesaConItem = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesaConItem?.logistica?.checklist.length).toBe(totalInicial + 1);
      const agregado = mesaConItem?.logistica?.checklist.find(
        (i) => i.tarea === "Verificar baterías de repuesto para megáfono"
      );
      expect(agregado).toBeDefined();

      store.eliminarItemChecklist(mesaId, agregado!.id);
      const mesaSinItem = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesaSinItem?.logistica?.checklist.length).toBe(totalInicial);
    });

    test("store: agregarResponsableLogistico y eliminarResponsableLogistico", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";

      store.agregarResponsableLogistico(mesaId, {
        nombre: "Valeria Gómez",
        rolLogistico: "coordinador_general",
        telefono: "3009998877",
        entidad: "Secretaría del Interior",
      });

      const mesaConResp = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesaConResp?.logistica?.equipoLogistico.length).toBe(1);
      const respAgregado = mesaConResp?.logistica?.equipoLogistico[0];
      expect(respAgregado?.nombre).toBe("Valeria Gómez");

      store.eliminarResponsableLogistico(mesaId, respAgregado!.id);
      const mesaSinResp = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesaSinResp?.logistica?.equipoLogistico.length).toBe(0);
    });
  });

  describe("FASE 2: Ejecución, Deliberación y Sorteo Cívico al Azar", () => {
    test("renderiza componente de sorteo cívico con turnos e intervenciones", () => {
      const mesa = useMesasStore.getState().mesas[0];
      const html = renderToString(<MesaSorteoAzar mesa={mesa} />);

      expect(html).toContain("Sorteo Cívico al Azar y Distribución Equitativa de la Palabra");
      expect(html).toContain("Marcos Julio Restrepo");
      expect(html).toContain("Alumbrado público sector Las Vegas");
      expect(html).toContain("Modalidad de Convocatoria");
    });

    test("store: ejecutarSorteoIntervencion registra un nuevo turno al azar", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";

      store.ejecutarSorteoIntervencion(
        mesaId,
        { id: "asist-99", nombre: "Leonor Paternina" },
        4,
        "Seguridad en entornos escolares"
      );

      const mesaActualizada = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      const intervenciones = mesaActualizada?.sorteoAzar?.intervencionesSorteo ?? [];
      expect(intervenciones.length).toBe(2);
      expect(intervenciones[1].nombre).toBe("Leonor Paternina");
      expect(intervenciones[1].tema).toBe("Seguridad en entornos escolares");
      expect(intervenciones[1].duracionMinutos).toBe(4);
    });

    test("store: generarMuestraAleatoriaAsistencia con algoritmo Fisher-Yates", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";
      const universoIds = ["id-1", "id-2", "id-3", "id-4", "id-5", "id-6", "id-7"];

      const muestra = store.generarMuestraAleatoriaAsistencia(mesaId, universoIds, 3);
      expect(muestra.length).toBe(3);

      const mesaActualizada = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      const muestraGuardada = mesaActualizada?.sorteoAzar?.muestraAleatoriaAuditoria ?? [];
      expect(muestraGuardada.length).toBe(3);
      for (const id of muestraGuardada) {
        expect(universoIds).toContain(id);
      }
    });

    test("store: actualizarMetodoConvocatoria", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";

      store.actualizarMetodoConvocatoria(
        mesaId,
        "sorteo_civico_aleatorio",
        "Estratificación por cuadrantes de Policía"
      );

      const mesaActualizada = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesaActualizada?.sorteoAzar?.metodoConvocatoria).toBe("sorteo_civico_aleatorio");
      expect(mesaActualizada?.sorteoAzar?.estratificacion).toBe(
        "Estratificación por cuadrantes de Policía"
      );
    });
  });

  describe("FASE 3: Documentación, Compromisos, Galería y Bitácora", () => {
    test("renderiza tabla de compromisos con badges, responsables y porcentajes", () => {
      const mesa = useMesasStore.getState().mesas[0];
      const html = renderToString(<MesaCompromisosTabla mesa={mesa} />);

      expect(html).toContain("Matriz de Acuerdos Territoriales con Trazabilidad");
      expect(html).toContain("COMP-01");
      expect(html).toContain("Instalación de 10 luminarias LED solares en la cancha");
      expect(html).toContain("Secretaría General / Alumbrado Público");
      expect(html).toContain("Ing. Marco Aurelio");
      expect(html).toContain("40%");
    });

    test("store: agregarCompromiso, actualizarCompromiso y eliminarCompromiso", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";

      const nuevoCompromiso: Omit<CompromisoMesa, "id"> = {
        codigo: "COMP-02",
        descripcion: "Jornada integral de desarme voluntario y talleres de arte",
        entidadResponsable: "Secretaría del Interior y Convivencia",
        personaResponsable: "Dra. Sofía Mendoza",
        fechaLimite: "2026-12-30",
        tipo: "acuerdo_comunitario",
        estado: "pendiente",
        avancePorcentaje: 0,
      };

      store.agregarCompromiso(mesaId, nuevoCompromiso);
      let mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesa?.compromisos?.length).toBe(2);
      const agregado = mesa?.compromisos?.find((c) => c.codigo === "COMP-02");
      expect(agregado).toBeDefined();

      // Actualizar estado a cumplido y 100%
      store.actualizarCompromiso(mesaId, agregado!.id, {
        estado: "cumplido",
        avancePorcentaje: 100,
      });
      mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      const modificado = mesa?.compromisos?.find((c) => c.id === agregado!.id);
      expect(modificado?.estado).toBe("cumplido");
      expect(modificado?.avancePorcentaje).toBe(100);

      // Eliminar compromiso
      store.eliminarCompromiso(mesaId, agregado!.id);
      mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesa?.compromisos?.length).toBe(1);
    });

    test("renderiza galería de evidencias con sello de privacidad Ley 1581/2012", () => {
      const mesa = useMesasStore.getState().mesas[0];
      const html = renderToString(<MesaGaleriaEvidencias mesa={mesa} />);

      expect(html).toContain("Galería de Evidencias Fotográficas");
      expect(html).toContain("Plenaria Comunitaria de Apertura");
      expect(html).toContain("EXIF/GPS Limpio");
      expect(html).toContain("Ley 1581/2012");
    });

    test("store: recargarFotoEvidencia permite reemplazar archivo purgando metadatos", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";
      const fotoId = "foto-1";

      store.recargarFotoEvidencia(mesaId, fotoId, {
        url: "https://ejemplo.org/fotos/apertura-alta-resolucion.jpg",
        nombre: "Plenaria Comunitaria de Apertura (Reemplazo HD)",
        tamanoBytes: 520000,
        exifDespojado: true,
      });

      const mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      const fotoActualizada = mesa?.galeriaFotos?.find((f) => f.id === fotoId);
      expect(fotoActualizada?.url).toBe(
        "https://ejemplo.org/fotos/apertura-alta-resolucion.jpg"
      );
      expect(fotoActualizada?.nombre).toBe(
        "Plenaria Comunitaria de Apertura (Reemplazo HD)"
      );
      expect(fotoActualizada?.tamanoBytes).toBe(520000);
      expect(fotoActualizada?.exifDespojado).toBe(true);
    });

    test("renderiza bitácora y notas de campo del facilitador con privacidad", () => {
      const mesa = useMesasStore.getState().mesas[0];
      const html = renderToString(<MesaNotasBitacora mesa={mesa} />);

      expect(html).toContain("Bitácora y Notas de Campo del Facilitador");
      expect(html).toContain("Fuerte concurrencia de madres comunitarias");
      expect(html).toContain("Tensión entre dos sectores vecinos superada tras mediación.");
      expect(html).toContain("Interna facilitador");
      expect(html).toContain("Pública");
    });

    test("store: agregarNotaMesa y eliminarNotaMesa", () => {
      const store = useMesasStore.getState();
      const mesaId = "mesa-test-308";

      const nuevaNota: Omit<NotaMesa, "id" | "creadoEn"> = {
        autor: "Ing. Relator",
        rolAutor: "Sistematizador",
        momento: "plenaria_cierre",
        contenido: "Se firma acta sin observaciones discordantes.",
        esPrivada: false,
      };

      store.agregarNotaMesa(mesaId, nuevaNota);
      let mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesa?.notas?.length).toBe(3);
      const agregada = mesa?.notas?.[0]; // recién agregada va al inicio
      expect(agregada).toBeDefined();

      store.eliminarNotaMesa(mesaId, agregada!.id);
      mesa = useMesasStore.getState().mesas.find((m) => m.id === mesaId);
      expect(mesa?.notas?.length).toBe(2);
    });
  });
});
