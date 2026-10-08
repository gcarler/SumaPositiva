import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  construirPayloadParticipante,
  mapearParticipanteARegistro,
  registrarAsistenteMesa,
  listarAsistentesMesa,
  type NuevoAsistenteInput,
  type ParticipanteRespuesta,
} from "./asistencia-api";
import {
  useAsistenciaStore,
  obtenerClavesEquivalentesMesa,
  obtenerRegistrosMesa,
} from "../state/asistencia-store";

describe("Asistencia Digital y Persistencia en PostgreSQL (EDIT-08)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useAsistenciaStore.setState({
      registros: {},
      cargando: false,
      error: null,
    });
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe("Transformación de DTOs y Construcción de Payloads", () => {
    test("construirPayloadParticipante genera sujeto_id determinista y empaqueta metadatos cívicos", () => {
      const input: NuevoAsistenteInput = {
        mesaId: "mt-001",
        nombreCompleto: "Dora Luz Morales Mendoza",
        tipoDocumento: "CC",
        numeroDocumento: " 45.489.120 ",
        genero: "mujer",
        enfoqueDiferencial: "afrodescendiente",
        organizacionOBarrio: "JAC Getsemaní — Calle del Pozo",
        telefonoWhatsApp: "300 458 9123",
        correo: "dora.morales@getsemani.org",
        subMesaAsignada: "Seguridad Ciudadana",
      };

      const payload = construirPayloadParticipante(input);

      expect(payload.sujeto_id).toBe("doc:CC:45.489.120");
      expect(payload.nombre_completo).toBe("Dora Luz Morales Mendoza");
      expect(payload.rol_en_mesa).toBe("ciudadano");
      expect(payload.organizacion_comunitaria).toBe("JAC Getsemaní — Calle del Pozo");
      expect(payload.asistencia_confirmada).toBe(true);
      expect(payload.metadatos.tipo_documento).toBe("CC");
      expect(payload.metadatos.numero_documento).toBe("45.489.120");
      expect(payload.metadatos.enfoque_diferencial).toBe("afrodescendiente");
      expect(payload.metadatos.submesa_asignada).toBe("Seguridad Ciudadana");
    });

    test("mapearParticipanteARegistro convierte DTO de PostgreSQL a formato de UI con flag sincronizado", () => {
      const backendDto: ParticipanteRespuesta = {
        id: "01a10558-7acf-7d4a-9b87-4e433ab67b46",
        mesa_id: "01a10558-7acf-7d4a-9b87-4e433ab67000",
        sujeto_id: "doc:CC:73190450",
        nombre_completo: "Édgar Julio Arrieta",
        rol_en_mesa: "ciudadano",
        organizacion_comunitaria: "Guías Patrimoniales",
        asistencia_confirmada: true,
        hora_ingreso: "2026-10-15T08:22:00.000Z",
        metadatos: {
          tipo_documento: "CC",
          numero_documento: "73.190.450",
          genero: "hombre",
          enfoque_diferencial: "adulto_mayor",
          organizacion_o_barrio: "Guías Patrimoniales",
          submesa_asignada: "Turismo Sostenible",
        },
      };

      const reg = mapearParticipanteARegistro(backendDto, "fallback-id");

      expect(reg.id).toBe("01a10558-7acf-7d4a-9b87-4e433ab67b46");
      expect(reg.mesaId).toBe("01a10558-7acf-7d4a-9b87-4e433ab67000");
      expect(reg.nombreCompleto).toBe("Édgar Julio Arrieta");
      expect(reg.tipoDocumento).toBe("CC");
      expect(reg.numeroDocumento).toBe("73.190.450");
      expect(reg.enfoqueDiferencial).toBe("adulto_mayor");
      expect(reg.pendienteSincronizacion).toBe(false);
      expect(typeof reg.sincronizadoEn).toBe("string");
    });
  });

  describe("Llamadas HTTP a la API REST de Mesas", () => {
    test("registrarAsistenteMesa despacha POST a /mesas/{mesaId}/participantes con el payload correcto", async () => {
      const mesaId = "01a10558-7acf-7d4a-9b87-4e433ab67000";
      const mockRespuesta: ParticipanteRespuesta = {
        id: "01a10558-9999-7d4a-9b87-4e433ab67999",
        mesa_id: mesaId,
        sujeto_id: "doc:CC:1047382910",
        nombre_completo: "Yuliet Paola Zúñiga",
        rol_en_mesa: "ciudadano",
        asistencia_confirmada: true,
        hora_ingreso: "2026-10-15T08:28:00.000Z",
        metadatos: {},
      };

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockRespuesta), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await registrarAsistenteMesa(mesaId, {
        mesaId,
        nombreCompleto: "Yuliet Paola Zúñiga",
        tipoDocumento: "CC",
        numeroDocumento: "1.047.382.910",
        genero: "mujer",
        enfoqueDiferencial: "juventud",
        organizacionOBarrio: "Colectivo Juvenil",
      });

      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`/mesas/${mesaId}/participantes`);
      expect(res.id).toBe("01a10558-9999-7d4a-9b87-4e433ab67999");
      expect(res.nombre_completo).toBe("Yuliet Paola Zúñiga");
    });

    test("listarAsistentesMesa despacha GET a /mesas/{mesaId}/participantes", async () => {
      const mesaId = "01a10558-7acf-7d4a-9b87-4e433ab67000";
      const mockLista: ParticipanteRespuesta[] = [
        {
          id: "part-01",
          mesa_id: mesaId,
          sujeto_id: "doc:CC:111",
          nombre_completo: "Asistente 1",
          rol_en_mesa: "ciudadano",
          asistencia_confirmada: true,
          hora_ingreso: "2026-10-15T09:00:00.000Z",
        },
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockLista), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await listarAsistentesMesa(mesaId);
      expect(fetchSpy).toHaveBeenCalled();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`/mesas/${mesaId}/participantes`);
      expect(res.length).toBe(1);
      expect(res[0].nombre_completo).toBe("Asistente 1");
    });
  });

  describe("Resiliencia Offline y Persistencia en Store Zustand", () => {
    test("cuando la API responde con éxito, el registro en store adopta el UUID de PostgreSQL y marca sincronizado", async () => {
      const mesaId = "mesa-exito-01";
      const uuidPostgres = "01a10558-aaaa-7d4a-9b87-4e433ab67aaa";

      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: uuidPostgres,
            mesa_id: mesaId,
            sujeto_id: "doc:CC:33150892",
            nombre_completo: "Claudia Patricia Herrera",
            rol_en_mesa: "ciudadano",
            asistencia_confirmada: true,
            hora_ingreso: "2026-10-15T08:35:00.000Z",
            metadatos: {
              tipo_documento: "CC",
              numero_documento: "33.150.892",
              enfoque_diferencial: "mujeres",
            },
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const resultado = await useAsistenciaStore.getState().registrarAsistente({
        mesaId,
        nombreCompleto: "Claudia Patricia Herrera",
        tipoDocumento: "CC",
        numeroDocumento: "33.150.892",
        genero: "mujer",
        enfoqueDiferencial: "mujeres",
        organizacionOBarrio: "Red de Mujeres",
      });

      expect(resultado.id).toBe(uuidPostgres);
      expect(resultado.pendienteSincronizacion).toBe(false);
      expect(typeof resultado.sincronizadoEn).toBe("string");

      const registrosGuardados = useAsistenciaStore.getState().registros[mesaId];
      expect(registrosGuardados.length).toBe(1);
      expect(registrosGuardados[0].id).toBe(uuidPostgres);
      expect(registrosGuardados[0].pendienteSincronizacion).toBe(false);
    });

    test("cuando la API falla (offline / caída de red), el registro se retiene en local con pendienteSincronizacion: true", async () => {
      const mesaId = "mesa-offline-02";

      fetchSpy.mockRejectedValueOnce(new Error("Network request failed - Offline in rural zone"));

      const resultado = await useAsistenciaStore.getState().registrarAsistente({
        mesaId,
        nombreCompleto: "Pedro Nel Blanco Cassiani",
        tipoDocumento: "CC",
        numeroDocumento: "73.008.411",
        genero: "hombre",
        enfoqueDiferencial: "afrodescendiente",
        organizacionOBarrio: "Pescadores de La Boquilla",
      });

      expect(resultado.id.startsWith("asist-")).toBe(true);
      expect(resultado.pendienteSincronizacion).toBe(true);
      expect(resultado.nombreCompleto).toBe("Pedro Nel Blanco Cassiani");

      const registrosLocales = useAsistenciaStore.getState().registros[mesaId];
      expect(registrosLocales.length).toBe(1);
      expect(registrosLocales[0].pendienteSincronizacion).toBe(true);
    });

    test("sincronizarPendientes sube los registros locales pendientes y actualiza sus IDs con PostgreSQL", async () => {
      const mesaId = "mesa-sync-03";

      useAsistenciaStore.setState({
        registros: {
          [mesaId]: [
            {
              id: "asist-local-12345",
              mesaId,
              nombreCompleto: "Rosa Inés Márquez Marrugo",
              tipoDocumento: "CC",
              numeroDocumento: "33.201.780",
              genero: "mujer",
              enfoqueDiferencial: "palenquero",
              organizacionOBarrio: "Consejo Comunitario",
              horaRegistro: "2026-10-20T08:12:00.000Z",
              pendienteSincronizacion: true,
            },
          ],
        },
      });

      const pgUuid = "01a10558-bbbb-7d4a-9b87-4e433ab67bbb";
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: pgUuid,
            mesa_id: mesaId,
            sujeto_id: "doc:CC:33201780",
            nombre_completo: "Rosa Inés Márquez Marrugo",
            rol_en_mesa: "ciudadano",
            asistencia_confirmada: true,
            hora_ingreso: "2026-10-20T08:12:00.000Z",
            metadatos: {},
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        )
      );

      const balance = await useAsistenciaStore.getState().sincronizarPendientes(mesaId);
      expect(balance.exitosos).toBe(1);
      expect(balance.fallidos).toBe(0);

      const actualizados = useAsistenciaStore.getState().registros[mesaId];
      expect(actualizados[0].id).toBe(pgUuid);
      expect(actualizados[0].pendienteSincronizacion).toBe(false);
    });

    test("cargarAsistentesDesdeBackend fusiona asistentes remotos sin eliminar pendientes locales", async () => {
      const mesaId = "mesa-merge-04";

      useAsistenciaStore.setState({
        registros: {
          [mesaId]: [
            {
              id: "asist-local-pending",
              mesaId,
              nombreCompleto: "Asistente Local Pendiente",
              tipoDocumento: "CC",
              numeroDocumento: "99.999.999",
              genero: "hombre",
              enfoqueDiferencial: "ninguno",
              organizacionOBarrio: "Local",
              horaRegistro: "2026-10-20T09:00:00.000Z",
              pendienteSincronizacion: true,
            },
          ],
        },
      });

      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "01a10558-cccc-7d4a-9b87-4e433ab67ccc",
              mesa_id: mesaId,
              sujeto_id: "doc:CC:88888888",
              nombre_completo: "Asistente Remoto Confirmado",
              rol_en_mesa: "ciudadano",
              asistencia_confirmada: true,
              hora_ingreso: "2026-10-20T08:00:00.000Z",
              metadatos: {
                tipo_documento: "CC",
                numero_documento: "88.888.888",
                genero: "mujer",
                enfoque_diferencial: "juventud",
              },
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      await useAsistenciaStore.getState().cargarAsistentesDesdeBackend(mesaId);

      const fusionados = useAsistenciaStore.getState().registros[mesaId];
      expect(fusionados.length).toBe(2);
      expect(fusionados.some((r) => r.id === "asist-local-pending")).toBe(true);
      expect(fusionados.some((r) => r.id === "01a10558-cccc-7d4a-9b87-4e433ab67ccc")).toBe(true);
    });

    test("soporta consulta y registro con código de agenda territorial (ej. mt-001) y código oficial (MT-L01-01)", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await listarAsistentesMesa("mt-001");
      expect(fetchSpy).toHaveBeenLastCalledWith(
        expect.stringContaining("/mesas/mt-001/participantes"),
        expect.anything()
      );

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await listarAsistentesMesa("MT-L01-01");
      expect(fetchSpy).toHaveBeenLastCalledWith(
        expect.stringContaining("/mesas/MT-L01-01/participantes"),
        expect.anything()
      );
    });

    test("obtenerClavesEquivalentesMesa resuelve UUID, slug, código oficial y código de agenda (QA-004)", () => {
      // Desde código oficial
      const clavesDesdeCod = obtenerClavesEquivalentesMesa("MT-L01-01");
      expect(clavesDesdeCod).toContain("MT-L01-01");
      expect(clavesDesdeCod).toContain("mt-001");
      expect(clavesDesdeCod).toContain("01a0f5fe-86df-717b-a4d0-5b6605bdf993");

      // Desde UUID
      const clavesDesdeUuid = obtenerClavesEquivalentesMesa("01a0f5fe-86df-717b-a4d0-5b6605bdf993");
      expect(clavesDesdeUuid).toContain("mt-001");
      expect(clavesDesdeUuid).toContain("MT-L01-01");

      // Desde código de agenda
      const clavesDesdeAgenda = obtenerClavesEquivalentesMesa("mt-001");
      expect(clavesDesdeAgenda).toContain("MT-L01-01");
      expect(clavesDesdeAgenda).toContain("01a0f5fe-86df-717b-a4d0-5b6605bdf993");
    });

    test("obtenerRegistrosMesa consolida y deduplica registros indexados bajo distintas claves (QA-004)", () => {
      const registros = {
        "mt-001": [
          {
            id: "reg-1",
            mesaId: "mt-001",
            nombreCompleto: "Ciudadano Agenda",
            tipoDocumento: "CC" as const,
            numeroDocumento: "11111",
            genero: "mujer" as const,
            enfoqueDiferencial: "ninguno" as const,
            organizacionOBarrio: "Centro",
            horaRegistro: "2026-10-15T08:00:00Z",
          },
        ],
        "MT-L01-01": [
          {
            id: "reg-2",
            mesaId: "MT-L01-01",
            nombreCompleto: "Ciudadano Puerta",
            tipoDocumento: "CC" as const,
            numeroDocumento: "22222",
            genero: "hombre" as const,
            enfoqueDiferencial: "juventud" as const,
            organizacionOBarrio: "Manga",
            horaRegistro: "2026-10-15T08:10:00Z",
          },
          // Duplicado con mismo número de documento
          {
            id: "reg-3-dup",
            mesaId: "MT-L01-01",
            nombreCompleto: "Ciudadano Agenda Repetido",
            tipoDocumento: "CC" as const,
            numeroDocumento: "11111",
            genero: "mujer" as const,
            enfoqueDiferencial: "ninguno" as const,
            organizacionOBarrio: "Centro",
            horaRegistro: "2026-10-15T08:20:00Z",
          },
        ],
      };

      // Consultar con el UUID de la mesa debe retornar ambos registros deduplicados
      const consolidados = obtenerRegistrosMesa(registros, "01a0f5fe-86df-717b-a4d0-5b6605bdf993");
      expect(consolidados.length).toBe(2);
      expect(consolidados.map((r) => r.numeroDocumento)).toEqual(["11111", "22222"]);
    });
  });
});
