"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { StatusBadge } from "@/shared/ui/status-badge";
import { identidadApi, type MfaIniciar } from "@/features/sesion/services/identidad-api";
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
  const [mfaSetup, setMfaSetup] = useState<MfaIniciar | null>(null);
  const [codigosGenerados, setCodigosGenerados] = useState<string[] | null>(null);
  const [modoDesactivarMfa, setModoDesactivarMfa] = useState(false);
  const [modoRegenerarMfa, setModoRegenerarMfa] = useState(false);
  const usuario = sesion?.usuario;
  const sesiones = useQuery({
    queryKey: ["identidad", "sesiones", usuario?.id],
    queryFn: identidadApi.sesiones,
  });
  const mfaEstado = useQuery({
    queryKey: ["identidad", "mfa_estado", usuario?.id],
    queryFn: identidadApi.mfaEstado,
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
  function iniciarMfa() {
    void ejecutar(async () => {
      const resp = await identidadApi.mfaIniciar();
      setMfaSetup(resp);
      setCodigosGenerados(null);
    });
  }
  function activarMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const codigo = textoFormulario(datos, "codigo_activacion");
    void ejecutar(async () => {
      const resp = await identidadApi.mfaActivar(codigo);
      setMfaSetup(null);
      setCodigosGenerados(resp.codigos_recuperacion);
      setMensaje("Autenticación multifactor activada con éxito.");
      await mfaEstado.refetch();
    });
  }
  function desactivarMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const contrasena = textoFormulario(datos, "contrasena_desactivacion");
    void ejecutar(async () => {
      const resp = await identidadApi.mfaDesactivar(contrasena);
      setModoDesactivarMfa(false);
      setMensaje(resp.mensaje);
      await mfaEstado.refetch();
    });
  }
  function regenerarCodigos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const codigo = textoFormulario(datos, "codigo_totp");
    void ejecutar(async () => {
      const resp = await identidadApi.mfaRegenerarRecuperacion(codigo);
      setModoRegenerarMfa(false);
      setCodigosGenerados(resp.codigos_recuperacion);
      setMensaje("Nuevos códigos de recuperación generados.");
      await mfaEstado.refetch();
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
      <section className="space-y-4 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Autenticación multifactor (MFA / TOTP)
            </h3>
            <p className="text-sm text-text-secondary">
              Protección de cuenta mediante TOTP (RFC 6238) y códigos de recuperación.
            </p>
          </div>
          {mfaEstado.data?.activo ? (
            <StatusBadge tone="success">Activo</StatusBadge>
          ) : (
            <StatusBadge tone="warning">Inactivo</StatusBadge>
          )}
        </div>

        {codigosGenerados && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <h4 className="font-semibold text-text-primary">
              Códigos de recuperación de respaldo
            </h4>
            <p className="text-xs text-text-secondary">
              Guarda estos 8 códigos en un lugar seguro. Cada código es de un solo uso en caso de que pierdas el acceso a tu dispositivo autenticador.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm font-semibold">
              {codigosGenerados.map((c, i) => (
                <div key={i} className="rounded bg-background p-1.5 text-center border border-border">
                  {c}
                </div>
              ))}
            </div>
            <Button size="sm" onClick={() => setCodigosGenerados(null)}>
              Entendido, los he guardado
            </Button>
          </div>
        )}

        {!mfaEstado.data?.activo && !mfaSetup && (
          <div>
            <Button
              variant="outline"
              disabled={ocupado}
              onClick={iniciarMfa}
            >
              Configurar verificación en dos pasos (TOTP)
            </Button>
          </div>
        )}

        {!mfaEstado.data?.activo && mfaSetup && (
          <div className="space-y-4 rounded-lg border border-border bg-background p-4">
            <h4 className="font-semibold text-text-primary text-sm">
              Paso 1: Escanea el código QR con tu aplicación autenticadora
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src={mfaSetup.qr_code_base64}
                alt="Código QR de configuración TOTP"
                className="h-44 w-44 rounded-md border border-border bg-card p-2"
              />
              <div className="space-y-2 text-xs text-text-secondary">
                <p>
                  Compatible con Google Authenticator, Microsoft Authenticator, 1Password o cualquier app TOTP RFC 6238.
                </p>
                <p>
                  O ingresa manualmente la clave secreta:
                </p>
                <code className="block rounded bg-muted p-2 font-mono text-xs select-all break-all text-text-primary">
                  {mfaSetup.secreto_b32}
                </code>
              </div>
            </div>

            <h4 className="font-semibold text-text-primary text-sm pt-2">
              Paso 2: Confirma el código de 6 dígitos generado
            </h4>
            <form onSubmit={activarMfa} className="space-y-3">
              <CampoIdentidad
                name="codigo_activacion"
                label="Código de verificación"
                placeholder="123456"
                maxLength={6}
                required
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={ocupado}>
                  Verificar y activar MFA
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => setMfaSetup(null)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {mfaEstado.data?.activo && (
          <div className="space-y-3 text-sm text-text-secondary">
            <p>
              Códigos de recuperación disponibles:{" "}
              <strong className="text-text-primary">
                {mfaEstado.data.codigos_restantes} de 8
              </strong>
            </p>
            {mfaEstado.data.activado_en && (
              <p>
                Activado: {new Date(mfaEstado.data.activado_en).toLocaleString("es")}
              </p>
            )}

            {!modoDesactivarMfa && !modoRegenerarMfa && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => setModoRegenerarMfa(true)}
                >
                  Regenerar códigos de respaldo
                </Button>
                <Button
                  variant="destructive"
                  disabled={ocupado}
                  onClick={() => setModoDesactivarMfa(true)}
                >
                  Desactivar MFA
                </Button>
              </div>
            )}

            {modoRegenerarMfa && (
              <form onSubmit={regenerarCodigos} className="space-y-3 rounded-lg border border-border p-3">
                <h5 className="font-semibold text-text-primary text-sm">
                  Regenerar códigos de respaldo
                </h5>
                <p className="text-xs">
                  Ingresa tu código TOTP de 6 dígitos actual para generar un nuevo conjunto de 8 códigos de recuperación.
                </p>
                <CampoIdentidad
                  name="codigo_totp"
                  label="Código TOTP actual"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={ocupado}>
                    Generar nuevos códigos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => setModoRegenerarMfa(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {modoDesactivarMfa && (
              <form onSubmit={desactivarMfa} className="space-y-3 rounded-lg border border-destructive/30 p-3">
                <h5 className="font-semibold text-text-primary text-sm text-destructive">
                  Confirmar desactivación de MFA
                </h5>
                <p className="text-xs">
                  Para desactivar la verificación en dos pasos, confirma tu contraseña actual.
                </p>
                <CampoIdentidad
                  name="contrasena_desactivacion"
                  label="Contraseña actual"
                  type="password"
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="destructive" disabled={ocupado}>
                    Confirmar y desactivar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => setModoDesactivarMfa(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
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
