"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import {
  tienePermiso,
  useSesionStore,
} from "@/features/sesion/state/session-store";
import {
  CampoIdentidad,
  textoFormulario,
  comprobarContrasena,
} from "@/features/sesion/components/campo-identidad";

export function CuentaUsuario() {
  const sesion = useSesionStore((s) => s.sesion);
  const { closeAll } = usePanels();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const usuario = sesion?.usuario;
  const sesiones = useQuery({
    queryKey: ["identidad", "sesiones", usuario?.id],
    queryFn: identidadApi.sesiones,
  });
  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true);
    setError("");
    setMensaje("");
    try {
      await accion();
      await cache.invalidateQueries({ queryKey: ["identidad"] });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la solicitud",
      );
    } finally {
      setOcupado(false);
    }
  }
  function perfil(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    void ejecutar(async () => {
      const nuevo = await identidadApi.editarPerfil(
        textoFormulario(datos, "nombres"),
        textoFormulario(datos, "apellidos"),
      );
      useSesionStore.getState().actualizarPerfil(nuevo);
      setMensaje("Perfil actualizado");
    });
  }
  function contrasena(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    void ejecutar(async () => {
      await identidadApi.cambiarContrasena(
        textoFormulario(datos, "contrasena_actual"),
        comprobarContrasena(datos),
      );
      useSesionStore.getState().limpiarSesion();
      cache.clear();
    });
  }
  if (!usuario) return null;
  return (
    <div className="space-y-6" aria-busy={ocupado}>
      {error && (
        <Notice tone="danger" title="No se pudo continuar">
          {error}
        </Notice>
      )}
      {mensaje && <Notice tone="success" title={mensaje} />}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-text-primary">Perfil</h3>
        <p className="break-words text-sm text-text-secondary">
          {usuario.correo} · {usuario.codigo_rol}
        </p>
        <p className="text-sm text-text-secondary">
          {usuario.correo_verificado_en
            ? "Correo verificado"
            : "Correo pendiente de verificación"}
        </p>
        {!usuario.correo_verificado_en && (
          <Button
            variant="outline"
            disabled={ocupado}
            onClick={() =>
              void ejecutar(async () => {
                setMensaje(
                  (await identidadApi.solicitarVerificacion()).mensaje,
                );
              })
            }
          >
            Enviar verificación de correo
          </Button>
        )}
        <form key={usuario.id} onSubmit={perfil} className="space-y-3">
          <CampoIdentidad
            name="nombres"
            label="Nombres"
            defaultValue={usuario.nombres}
            autoComplete="given-name"
          />
          <CampoIdentidad
            name="apellidos"
            label="Apellidos"
            defaultValue={usuario.apellidos}
            autoComplete="family-name"
          />
          <Button type="submit" disabled={ocupado}>
            Guardar perfil
          </Button>
        </form>
      </section>
      {sesion?.rol === "administrador_identidades" &&
        tienePermiso(sesion, "usuarios:leer") && (
          <Button asChild variant="outline">
            <Link href="/plataforma/usuarios" onClick={closeAll}>
              Administrar usuarios y permisos
            </Link>
          </Button>
        )}
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-text-primary">
          Cambiar contraseña
        </h3>
        <form onSubmit={contrasena} className="space-y-3">
          <CampoIdentidad
            name="contrasena_actual"
            label="Contraseña actual"
            type="password"
            maxLength={72}
            autoComplete="current-password"
          />
          <CampoIdentidad
            name="contrasena"
            label="Nueva contraseña"
            type="password"
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
          <CampoIdentidad
            name="confirmacion"
            label="Confirmar contraseña"
            type="password"
            maxLength={72}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={ocupado}>
            Cambiar contraseña y cerrar sesiones
          </Button>
        </form>
      </section>
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-text-primary">
          Sesiones activas
        </h3>
        {sesiones.isPending && <p role="status">Cargando sesiones…</p>}
        {sesiones.error && (
          <Notice tone="danger" title="No se pudieron cargar las sesiones">
            <Button variant="outline" onClick={() => void sesiones.refetch()}>
              Reintentar
            </Button>
          </Notice>
        )}
        {sesiones.data?.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
          >
            <span className="text-sm text-text-secondary">
              {s.actual ? "Esta sesión" : "Otra sesión"} ·{" "}
              {new Date(s.creada_en).toLocaleString("es")}
            </span>
            <Button
              variant="outline"
              disabled={ocupado}
              onClick={() =>
                void ejecutar(async () => {
                  await identidadApi.revocarSesion(s.id);
                  if (s.actual) {
                    useSesionStore.getState().limpiarSesion();
                    cache.clear();
                  }
                })
              }
            >
              Cerrar {s.actual ? "esta sesión" : "otra sesión"}
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={ocupado}
            onClick={() =>
              void ejecutar(async () => {
                await identidadApi.revocarSesion();
                useSesionStore.getState().limpiarSesion();
                cache.clear();
              })
            }
          >
            Cerrar todas las sesiones
          </Button>
          <Button
            disabled={ocupado}
            onClick={() =>
              void ejecutar(async () => {
                await useSesionStore.getState().cerrarSesion();
                cache.clear();
              })
            }
          >
            Cerrar sesión
          </Button>
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-text-primary">
          Mis permisos
        </h3>
        <ul className="space-y-1 break-words text-sm text-text-secondary">
          {usuario.permisos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
