"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePanels } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Badge } from "@/shared/ui/badge";
import {
  ShieldCheck,
  MailCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VisorNotificacionesHerald } from "@/features/notificaciones/components/visor-notificaciones-herald";
import { identidadApi, type MfaIniciar } from "@/features/sesion/services/identidad-api";
import { sincronizarRestriccionMfa } from "@/features/sesion/services/sincronizar-sesion";
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
  const { openPanel, closeAll } = usePanels();
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [avisoHerald, setAvisoHerald] = useState<string | null>(null);
  const [contrasenaCambiada, setContrasenaCambiada] = useState(false);
  const [visorHeraldAbierto, setVisorHeraldAbierto] = useState(false);
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
    setAvisoHerald(null);
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
      setMensaje("Perfil actualizado con éxito.");
      setAvisoHerald(
        "Se ha emitido y enviado una constancia oficial de seguridad a su correo electrónico registrado por POLIS Herald.",
      );
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
      setContrasenaCambiada(true);
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
    const tokenInicial = useSesionStore.getState().sesion?.token ?? "";
    void ejecutar(async () => {
      const resp = await identidadApi.mfaActivar(codigo);
      /* Guarda de vigencia (revisión preventiva 238): un logout o un nuevo
       * login puede haber reemplazado la sesión mientras el backend resolvía;
       * en ese caso no se escribe ni mensaje ni estado local ni perfil. */
      if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
      setMfaSetup(null);
      setCodigosGenerados(resp.codigos_recuperacion);
      setMensaje("Autenticación multifactor activada con éxito.");
      /* La acreditación es solo de esta sesión: recarga el perfil para
       * obtener los permisos efectivos vigentes y deriva la restricción MFA
       * del estado que usa el shell (hallazgo 1 de EAF-ID-06); sin permisos
       * optimistas: el store se actualiza desde la respuesta real del
       * servidor y abandona si la sesión fue reemplazada. */
      const perfil = await identidadApi.perfil();
      /* Guarda después del await: solo la sesión vigente acepta escritura. */
      if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
      useSesionStore.getState().actualizarPerfil(perfil);
      await mfaEstado.refetch();
      await sincronizarRestriccionMfa(perfil, tokenInicial);
    });
  }
  function desactivarMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    const contrasena = textoFormulario(datos, "contrasena_desactivacion");
    const tokenInicial = useSesionStore.getState().sesion?.token ?? "";
    void ejecutar(async () => {
      const resp = await identidadApi.mfaDesactivar(contrasena);
      /* Guarda de vigencia: igual que en activarMfa. */
      if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
      setModoDesactivarMfa(false);
      setMensaje(resp.mensaje);
      await mfaEstado.refetch();
      const perfil = await identidadApi.perfil();
      /* Guarda después del await: solo la sesión vigente acepta escritura. */
      if (useSesionStore.getState().sesion?.token !== tokenInicial) return;
      useSesionStore.getState().actualizarPerfil(perfil);
      await sincronizarRestriccionMfa(perfil, tokenInicial);
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
  if (contrasenaCambiada) {
    return (
      <div className="space-y-6">
        <Notice tone="success" title="Contraseña modificada con éxito">
          <p className="text-sm">
            Se ha emitido y enviado una constancia oficial de seguridad a su correo electrónico registrado por POLIS Herald.
          </p>
          <p className="mt-2 text-xs text-text-secondary">
            Por motivos de seguridad institucional y salvaguarda de credenciales, todas las sesiones activas han sido cerradas.
          </p>
        </Notice>
        <div className="pt-2">
          <Button
            onClick={() => {
              closeAll();
              openPanel("sesion", {});
            }}
          >
            Iniciar sesión nuevamente
          </Button>
        </div>
      </div>
    );
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
      {avisoHerald && (
        <Notice tone="info" title="Constancia de seguridad emitida">
          <p className="text-sm">{avisoHerald}</p>
          <p className="mt-1 text-2xs text-text-tertiary">
            POLIS Herald · Despacho transaccional inmutable con fe pública (Sentencia C-150 de 2015).
          </p>
        </Notice>
      )}
      {/* Enrolamiento exigido: sesión limitada a configurar MFA (contrato con
       * EDD 181). No presenta permisos plenos ni navegación administrativa. */}
      {mfaEstado.data && !mfaEstado.data.activo && mfaEstado.data.exigido_por_rol && (
        <Notice tone="warning" title="Verificación en dos pasos pendiente">
          Tu rol exige la verificación en dos pasos. Esta sesión solo permite
          configurar MFA, ver tu perfil y cerrar sesión; el acceso completo se
          habilita al activarlo.
        </Notice>
      )}
      {/* Sesión anterior a la activación del factor: no está verificada.
       * Se ofrece cerrar sesión para volver a entrar con el desafío vigente. */}
      {mfaEstado.data?.activo &&
        !mfaEstado.data.sesion_verificada && (
          <Notice tone="warning" title="Sesión sin verificar">
            Ya cuentas con la verificación en dos pasos, pero esta sesión se
            inició antes y no está acreditada. Debes cerrar sesión y volver a
            entrar para completar el desafío.
            <div className="pt-2">
              <Button
                variant="outline"
                disabled={ocupado}
                onClick={() =>
                  void ejecutar(async () => {
                    await useSesionStore.getState().cerrarSesion();
                    cache.clear();
                    closeAll();
                  })
                }
              >
                Cerrar sesión y volver a entrar
              </Button>
            </div>
          </Notice>
        )}
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

      {/* POLIS Herald — Fe Pública y Notificaciones */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)] border border-border">
              <ShieldCheck className="size-4 text-[var(--accent)]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                POLIS Herald — Fe Pública y Notificaciones
              </h3>
              <p className="text-xs text-text-secondary">
                Sistema institucional de constancias transaccionales y fe pública
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Sentencia C-150 de 2015
          </Badge>
        </div>

        <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
          <p>
            En cumplimiento del mandato constitucional de proscripción del silencio administrativo y debido proceso,
            cada acción ejecutada en POLIS genera una constancia oficial con valor probatorio institucional.
          </p>
          <p>
            Las actualizaciones de perfil, modificaciones de credenciales, radicación de propuestas y gestiones institucionales
            se despachan de forma inmutable a su correo oficial <strong>{usuario.correo}</strong> bajo el patrón de despacho transaccional (Transactional Outbox).
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-[var(--surface-2)] p-3 text-xs">
          <div className="flex items-center gap-2">
            <MailCheck className="size-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
            <span>
              Canal de despacho: <strong className="text-text-primary">{usuario.correo}</strong>
            </span>
          </div>
          <StatusBadge tone={usuario.correo_verificado_en ? "success" : "warning"}>
            {usuario.correo_verificado_en ? "Canal verificado con fe pública" : "Pendiente de verificación"}
          </StatusBadge>
        </div>

        {(tienePermiso(sesion, "auditoria:leer") ||
          sesion?.rol === "administrador_sistema" ||
          sesion?.rol === "auditor" ||
          sesion?.rol === "administrador_identidades") && (
          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  Supervisión Institucional de Envíos
                </p>
                <p className="text-2xs text-text-secondary">
                  Tu rol institucional cuenta con atribuciones para auditar las constancias despachadas por POLIS Herald.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisorHeraldAbierto((prev) => !prev)}
                className="h-8 gap-1.5 text-xs border-border"
              >
                {visorHeraldAbierto ? (
                  <>
                    <ChevronUp className="size-3.5" aria-hidden="true" />
                    <span>Ocultar visor de auditoría</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                    <span>Desplegar visor de auditoría</span>
                  </>
                )}
              </Button>
            </div>

            {visorHeraldAbierto && (
              <div className="pt-2 animate-in fade-in">
                <VisorNotificacionesHerald />
              </div>
            )}
          </div>
        )}
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
            mfaEstado.data.sesion_verificada ? (
              <StatusBadge tone="success">Activo en esta sesión</StatusBadge>
            ) : (
              <StatusBadge tone="warning">Active · sesión sin verificar</StatusBadge>
            )
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
              <div className="flex flex-wrap gap-2">
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
