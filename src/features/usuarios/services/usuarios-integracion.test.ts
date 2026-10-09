import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { identidadApi, type Usuario, type Rol } from "@/features/sesion/services/identidad-api";
import { ApiError } from "@/core/http/api-client";

describe("GAP-FIX-02: Gestión de Usuarios y Roles conectada a API FastAPI", () => {
  const usuarioMock: Usuario = {
    id: "01900000-0000-7000-8000-000000000099",
    correo: "funcionario.nuevo@cartagena.gov.co",
    nombres: "Diana",
    apellidos: "Salcedo",
    codigo_rol: "facilitador_mesa",
    permisos: ["mesas:abrir", "mesas:acuerdos"],
    activo: true,
    nivel_identidad: "declarada",
    correo_verificado_en: null,
  };

  const rolesMock: Rol[] = [
    {
      id: "01900000-0000-7000-8000-000000000010",
      codigo: "administrador_identidades",
      nombre: "Administrador de identidades",
      permisos: ["usuarios:leer", "usuarios:gestionar"],
      sistema: true,
    },
    {
      id: "01900000-0000-7000-8000-000000000020",
      codigo: "facilitador_mesa",
      nombre: "Facilitador de mesa",
      permisos: ["mesas:abrir"],
      sistema: true,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("identidadApi.usuarios consulta usuarios con búsqueda y paginación real", async () => {
    const spy = vi.spyOn(identidadApi, "usuarios").mockResolvedValue({
      total: 1,
      elementos: [usuarioMock],
    });

    const resultado = await identidadApi.usuarios("diana", 0, 20);
    expect(spy).toHaveBeenCalledWith("diana", 0, 20);
    expect(resultado.total).toBe(1);
    expect(resultado.elementos[0].correo).toBe("funcionario.nuevo@cartagena.gov.co");
  });

  test("identidadApi.crearUsuario envía payload completo para alta administrativa", async () => {
    const spy = vi.spyOn(identidadApi, "crearUsuario").mockResolvedValue(usuarioMock);

    const payload = {
      correo: "funcionario.nuevo@cartagena.gov.co",
      contrasena: "Cartagena2026*",
      nombres: "Diana",
      apellidos: "Salcedo",
      codigo_rol: "facilitador_mesa",
      motivo: "Alta de facilitador territorial para Localidad 2",
    };

    const creado = await identidadApi.crearUsuario(payload);
    expect(spy).toHaveBeenCalledWith(payload);
    expect(creado.nombres).toBe("Diana");
    expect(creado.codigo_rol).toBe("facilitador_mesa");
  });

  test("identidadApi.editarUsuario procesa actualización con trazabilidad de motivo", async () => {
    const spy = vi.spyOn(identidadApi, "editarUsuario").mockResolvedValue({
      ...usuarioMock,
      activo: false,
    });

    const edicion = {
      nombres: "Diana",
      apellidos: "Salcedo",
      codigo_rol: "facilitador_mesa",
      activo: false,
      motivo: "Suspensión temporal por traslado administrativo",
    };

    const actualizado = await identidadApi.editarUsuario(usuarioMock.id, edicion);
    expect(spy).toHaveBeenCalledWith(usuarioMock.id, edicion);
    expect(actualizado.activo).toBe(false);
  });

  test("identidadApi.revocarUsuario invoca endpoint de seguridad para invalidar sesiones", async () => {
    const spy = vi.spyOn(identidadApi, "revocarUsuario").mockResolvedValue({
      mensaje: "Sesiones revocadas",
    });

    const res = await identidadApi.revocarUsuario(usuarioMock.id);
    expect(spy).toHaveBeenCalledWith(usuarioMock.id);
    expect(res.mensaje).toBe("Sesiones revocadas");
  });

  test("identidadApi.roles lista roles canónicos y personalizados del sistema", async () => {
    const spy = vi.spyOn(identidadApi, "roles").mockResolvedValue(rolesMock);

    const roles = await identidadApi.roles();
    expect(spy).toHaveBeenCalled();
    expect(roles).toHaveLength(2);
    expect(roles.map((r) => r.codigo)).toContain("administrador_identidades");
  });

  test("manejo tipado de error ante respuesta 409 o 422 de FastAPI", async () => {
    vi.spyOn(identidadApi, "crearUsuario").mockRejectedValue(
      new ApiError(409, "El correo electrónico ya se encuentra registrado"),
    );

    await expect(
      identidadApi.crearUsuario({
        correo: "existente@cartagena.gov.co",
        contrasena: "Cartagena2026*",
        nombres: "Prueba",
        apellidos: "Existente",
        codigo_rol: "ciudadano",
        motivo: "Prueba de duplicidad",
      }),
    ).rejects.toThrow("El correo electrónico ya se encuentra registrado");
  });
});
