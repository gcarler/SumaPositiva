"use client";

import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import {
  GoogleLogin,
  useGoogleOAuth,
  type CredentialResponse,
} from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels, type PanelPropsRegistry } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import {
  CampoIdentidad,
  textoFormulario,
  comprobarContrasena,
} from "@/features/sesion/components/campo-identidad";
import { CuentaUsuario } from "@/features/sesion/components/cuenta-usuario";

type Vista =
  | "login"
  | "magic_link"
  | "registro"
  | "recuperar"
  | "restablecer"
  | "verificar"
  | "mfa";
const TITULOS: Record<Vista, string> = {
  login: "Iniciar sesión",
  magic_link: "Acceso directo (Magic Link)",
  registro: "Crear cuenta",
  recuperar: "Recuperar contraseña",
  restablecer: "Elegir nueva contraseña",
  verificar: "Verificar correo",
  mfa: "Verificación en dos pasos (MFA)",
};

/**
 * Continúa tras una respuesta de login conforme al contrato con EDD (181):
 * - Desafío MFA vigente (mfa_requerido + token_desafio_mfa): pide el código.
 * - Sesión limitada al enrolamiento (mfa_enrolamiento_requerido): guarda la
 *   sesión pero NO anuncia acceso pleno ni navega; mantiene el panel abierto
 *   para configurar el factor.
 * - Sesión plena: siembra la sesión, anuncia el acceso y navega.
 */
function continuarTrasLogin(
  resp: ReturnType<typeof identidadApi.login> extends Promise<infer R> ? R : never,
  anuncioPleno: string,
  navegar: (ruta: string) => void,
  cerrarPanel: () => void,
): "desafio" | "enrolamiento" | "pleno" {
  if (resp.mfa_requerido && resp.token_desafio_mfa) return "desafio";
  if (resp.mfa_enrolamiento_requerido) {
    useSesionStore.getState().iniciarSesion(resp);
    return "enrolamiento";
  }
  useSesionStore.getState().iniciarSesion(resp);
  toast.success(anuncioPleno);
  navegar(resp.rol === "ciudadano" ? "/" : "/plataforma");
  cerrarPanel();
  return "pleno";
}

export function SesionPanel({
  entryKey,
  props = {},
}: {
  entryKey: string;
  props?: PanelPropsRegistry["sesion"];
}) {
  const { closeTop } = usePanels();
  const router = useRouter();
  const { clientId } = useGoogleOAuth();
  const sesion = useSesionStore((s) => s.sesion);
  const [vista, setVista] = useState<Vista>(
    props.accion === "recuperar"
      ? "restablecer"
      : props.accion === "verificar"
        ? "verificar"
        : props.accion === "magic_link"
          ? "magic_link"
          : "login",
  );
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tokenDesafioMfa, setTokenDesafioMfa] = useState<string | null>(null);
  /* Consumo del Magic Link (hallazgo 3 de EAF-ID-06): se marca alutzen una
   * única vez; tras el consumo la ficha pasa a Mi cuenta (si hay sesión) o
   * permite solicitar otro enlace (si el consumo falló). El props.token no
   * reactiva el consumo ni re-anuncia sesión plena. */
  const [enlaceConsumido, setEnlaceConsumido] = useState<
    "desafio" | "enrolamiento" | "pleno" | "fallado" | null
  >(null);
  const tieneAccion =
    vista === "restablecer" ||
    vista === "verificar" ||
    vista === "mfa" ||
    (props.accion === "magic_link" && !!props.token && !enlaceConsumido);

  useEffect(() => {
    if (props.accion === "magic_link" && props.token && !enlaceConsumido) {
      setOcupado(true);
      setError("");
    identidadApi
      .confirmarMagicLink(props.token)
      .then((resp) => {
        const resultado =
          continuarTrasLogin(
            resp,
            "¡Bienvenido! Sesión iniciada con enlace directo.",
            router.push.bind(router),
            closeTop,
          );
        setEnlaceConsumido(resultado);
        if (resultado === "desafio") {
          setTokenDesafioMfa(resp.token_desafio_mfa ?? null);
          setVista("mfa");
        }
      })
      .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : "El enlace de acceso es inválido o ha caducado",
          );
          setEnlaceConsumido("fallado");
        })
        .finally(() => {
          setOcupado(false);
        });
    }
  }, [props.accion, props.token, router, closeTop, enlaceConsumido]);

  function cambiar(v: Vista) {
    setVista(v);
    setError("");
    setMensaje("");
    setOcupado(false);
    if (v !== "mfa") {
      setTokenDesafioMfa(null);
    }
  }

  async function loginConGoogle(credential: CredentialResponse) {
    if (!credential.credential) {
      setError("Google no devolvió una credencial válida.");
      return;
    }
    setOcupado(true);
    setError("");
    try {
      const resp = await identidadApi.loginGoogle(credential.credential);
      if (
        continuarTrasLogin(
          resp,
          "Sesión iniciada con Google",
          router.push.bind(router),
          closeTop,
        ) === "desafio"
      ) {
        setTokenDesafioMfa(resp.token_desafio_mfa ?? null);
        setVista("mfa");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error con Google");
    } finally {
      setOcupado(false);
    }
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    setOcupado(true);
    setError("");
    setMensaje("");
    try {
      if (vista === "login") {
        const respuesta = await identidadApi.login(
          textoFormulario(datos, "correo"),
          textoFormulario(datos, "contrasena"),
        );
        if (
          continuarTrasLogin(
            respuesta,
            "Sesión iniciada",
            router.push.bind(router),
            closeTop,
          ) === "desafio"
        ) {
          setTokenDesafioMfa(respuesta.token_desafio_mfa ?? null);
          setVista("mfa");
        } else if (respuesta.mfa_enrolamiento_requerido) {
          setMensaje("");
          toast.warning(
            "Sesión limitada: configura la verificación en dos pasos para completar tu acceso.",
          );
        }
      } else if (vista === "mfa") {
        const codigo = textoFormulario(datos, "codigo_mfa").trim();
        if (!tokenDesafioMfa) {
          setError("El desafío ha expirado. Inicia sesión nuevamente.");
          setVista("login");
          return;
        }
        const resp = await identidadApi.mfaVerificar(tokenDesafioMfa, codigo);
        if (
          continuarTrasLogin(
            resp,
            "Verificación de dos pasos completada",
            router.push.bind(router),
            closeTop,
          ) === "desafio"
        ) {
          setTokenDesafioMfa(resp.token_desafio_mfa ?? null);
          setVista("mfa");
        }
      } else if (vista === "registro") {
        const contrasena = comprobarContrasena(datos);
        await identidadApi.registrar({
          correo: textoFormulario(datos, "correo"),
          contrasena,
          nombres: textoFormulario(datos, "nombres"),
          apellidos: textoFormulario(datos, "apellidos"),
        });
        setVista("login");
        setMensaje("Cuenta creada. Inicia sesión para verificar tu correo.");
      } else if (vista === "magic_link") {
        const correo = textoFormulario(datos, "correo");
        const resp = await identidadApi.solicitarMagicLink(correo);
        setMensaje(resp.mensaje);
        toast.info("Enlace de acceso enviado. Revisa tu bandeja de entrada.");
      } else if (vista === "recuperar") {
        setMensaje(
          (
            await identidadApi.solicitarRecuperacion(
              textoFormulario(datos, "correo"),
            )
          ).mensaje,
        );
      } else if (vista === "restablecer") {
        setMensaje(
          (
            await identidadApi.confirmarRecuperacion(
              props.token ?? "",
              comprobarContrasena(datos),
            )
          ).mensaje,
        );
        useSesionStore.getState().limpiarSesion();
        setVista("login");
      } else {
        setMensaje(
          (await identidadApi.confirmarVerificacion(props.token ?? "")).mensaje,
        );
        if (sesion?.usuarioId)
          useSesionStore
            .getState()
            .actualizarPerfil(await identidadApi.perfil());
        setVista("login");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la solicitud",
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <PanelShell
      entryKey={entryKey}
      crumbs={[{ label: "Tu cuenta" }]}
      kicker="Tu cuenta"
      title={sesion?.usuarioId && !tieneAccion ? "Mi cuenta" : TITULOS[vista]}
      subtitle="Accede con tus credenciales o participa de forma anónima."
      onClose={closeTop}
      onCloseToKey={closeTop}
    >
      <div className="w-full space-y-5 p-5 sm:p-6">
        {sesion?.usuarioId && !tieneAccion ? (
          <CuentaUsuario />
        ) : (
          <>
            {!tieneAccion && (
              <nav
                aria-label="Opciones de acceso"
                className="flex flex-wrap gap-2"
              >
                <Button
                  variant={vista === "login" ? "default" : "outline"}
                  onClick={() => cambiar("login")}
                >
                  Iniciar sesión
                </Button>
                <Button
                  variant={vista === "magic_link" ? "default" : "outline"}
                  onClick={() => cambiar("magic_link")}
                >
                  Acceso con Magic Link
                </Button>
                <Button
                  variant={vista === "registro" ? "default" : "outline"}
                  onClick={() => cambiar("registro")}
                >
                  Crear cuenta
                </Button>
                <Button variant="ghost" onClick={() => cambiar("recuperar")}>
                  Olvidé mi contraseña
                </Button>
              </nav>
            )}
            {error && (
              <Notice tone="danger" title="No se pudo continuar">
                {error}
              </Notice>
            )}
            {mensaje && (
              <Notice tone="success" title="Solicitud completada">
                {mensaje}
              </Notice>
            )}
            <form
              key={vista}
              onSubmit={enviar}
              className="space-y-4"
              aria-busy={ocupado}
            >
              {(vista === "login" ||
                vista === "magic_link" ||
                vista === "registro" ||
                vista === "recuperar") && (
                <CampoIdentidad
                  name="correo"
                  label="Correo electrónico"
                  type="email"
                  autoComplete="email"
                  maxLength={255}
                />
              )}
              {vista === "magic_link" && (
                <p className="text-sm text-text-secondary">
                  Ingresa tu correo y te enviaremos un enlace de acceso directo válido por 15 minutos para ingresar al instante sin necesidad de contraseña.
                </p>
              )}
              {vista === "registro" && (
                <>
                  <CampoIdentidad
                    name="nombres"
                    label="Nombres"
                    autoComplete="given-name"
                  />
                  <CampoIdentidad
                    name="apellidos"
                    label="Apellidos"
                    autoComplete="family-name"
                  />
                </>
              )}
              {(vista === "login" ||
                vista === "registro" ||
                vista === "restablecer") && (
                <CampoIdentidad
                  name="contrasena"
                  label="Contraseña"
                  type="password"
                  minLength={vista === "login" ? undefined : 8}
                  maxLength={72}
                  autoComplete={
                    vista === "login" ? "current-password" : "new-password"
                  }
                />
              )}
              {(vista === "registro" || vista === "restablecer") && (
                <CampoIdentidad
                  name="confirmacion"
                  label="Confirmar contraseña"
                  type="password"
                  maxLength={72}
                  autoComplete="new-password"
                />
              )}
              {vista === "verificar" && (
                <p className="text-sm text-text-secondary">
                  Confirma la verificación del correo asociado a este enlace.
                </p>
              )}
              {              vista === "mfa" && (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Introduce el código de 6 dígitos generado por tu aplicación autenticadora (TOTP) o uno de tus códigos de recuperación de respaldo de 8 caracteres.
                  </p>
                  <CampoIdentidad
                    name="codigo_mfa"
                    label="Código de autenticación o recuperación"
                    type="text"
                    autoComplete="one-time-code"
                    placeholder="123456 o ABCD-EFGH"
                    required
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button type="submit" disabled={ocupado}>
                      {ocupado ? "Verificando…" : "Verificar y entrar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => {
                        setTokenDesafioMfa(null);
                        setVista("login");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              {vista !== "mfa" && (
                <Button type="submit" disabled={ocupado}>
                  {ocupado
                    ? "Procesando…"
                    : vista === "magic_link"
                      ? "Enviar enlace de acceso"
                      : vista === "recuperar"
                        ? "Solicitar enlace"
                        : vista === "restablecer"
                          ? "Guardar contraseña"
                          : TITULOS[vista]}
                </Button>
              )}
            </form>
            {!tieneAccion && (
              <div className="space-y-3 border-t border-border pt-4">
                <Button
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => {
                    useSesionStore.getState().elegirAnonimo();
                    closeTop();
                  }}
                >
                  Continuar como anónimo
                </Button>

                {clientId && !clientId.startsWith("PENDIENTE") ? (
                  <fieldset
                    disabled={ocupado}
                    aria-label="Acceso con Google"
                    className="min-w-0"
                  >
                    <GoogleLogin
                      width="230"
                      onSuccess={(credential) =>
                        void loginConGoogle(credential)
                      }
                      onError={() =>
                        setError("No se pudo iniciar sesión con Google")
                      }
                    />
                  </fieldset>
                ) : (
                  <p className="text-sm text-text-secondary">
                    El acceso con Google requiere configuración del proveedor.
                    Puedes iniciar sesión con correo y contraseña.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
}
