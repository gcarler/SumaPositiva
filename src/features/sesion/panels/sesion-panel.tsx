"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";
import { PanelShell } from "@/core/panels/panel-shell";
import { usePanels, type PanelPropsMap } from "@/core/panels/panel-store";
import { Button } from "@/shared/ui/button";
import { Notice } from "@/shared/ui/notice";
import { useSesionStore } from "@/features/sesion/state/session-store";
import { identidadApi } from "@/features/sesion/services/identidad-api";
import { CampoIdentidad, textoFormulario, comprobarContrasena } from "@/features/sesion/components/campo-identidad";
import { CuentaUsuario } from "@/features/sesion/components/cuenta-usuario";

type Vista = "login" | "registro" | "recuperar" | "restablecer" | "verificar";
const TITULOS: Record<Vista, string> = {login: "Iniciar sesión", registro: "Crear cuenta",
  recuperar: "Recuperar contraseña", restablecer: "Elegir nueva contraseña", verificar: "Verificar correo"};

export function SesionPanel({entryKey, props = {}}: {entryKey: string; props?: PanelPropsMap["sesion"]}) {
  const {closeTop} = usePanels();
  const sesion = useSesionStore((s) => s.sesion);
  const [vista, setVista] = useState<Vista>(props.accion === "recuperar" ? "restablecer" :
    props.accion === "verificar" ? "verificar" : "login");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const tieneAccion = vista === "restablecer" || vista === "verificar";
  function cambiar(v: Vista) {setVista(v); setError(""); setMensaje(""); setOcupado(false);}

  const loginConGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setOcupado(true);
      try {
        const resp = await identidadApi.loginGoogle(tokenResponse.access_token);
        useSesionStore.getState().iniciarSesion(resp);
        toast.success("Sesión iniciada con Google");
        closeTop();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error con Google");
      } finally {
        setOcupado(false);
      }
    },
    onError: () => setError("No se pudo iniciar sesión con Google"),
  });

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    setOcupado(true); setError(""); setMensaje("");
    try {
      if (vista === "login") {
        const respuesta = await identidadApi.login(textoFormulario(datos, "correo"), textoFormulario(datos, "contrasena"));
        useSesionStore.getState().iniciarSesion(respuesta);
        toast.success("Sesión iniciada");
      } else if (vista === "registro") {
        const contrasena = comprobarContrasena(datos);
        await identidadApi.registrar({correo: textoFormulario(datos, "correo"), contrasena,
          nombres: textoFormulario(datos, "nombres"), apellidos: textoFormulario(datos, "apellidos")});
        setVista("login"); setMensaje("Cuenta creada. Inicia sesión para verificar tu correo.");
      } else if (vista === "recuperar") {
        setMensaje((await identidadApi.solicitarRecuperacion(textoFormulario(datos, "correo"))).mensaje);
      } else if (vista === "restablecer") {
        setMensaje((await identidadApi.confirmarRecuperacion(props.token ?? "", comprobarContrasena(datos))).mensaje);
        useSesionStore.getState().limpiarSesion(); setVista("login");
      } else {
        setMensaje((await identidadApi.confirmarVerificacion(props.token ?? "")).mensaje);
        if (sesion?.usuarioId) useSesionStore.getState().actualizarPerfil(await identidadApi.perfil());
        setVista("login");
      }
    } catch (e) {setError(e instanceof Error ? e.message : "No se pudo completar la solicitud");}
    finally {setOcupado(false);}
  }

  return <PanelShell entryKey={entryKey} crumbs={[{label: "Tu cuenta"}]} kicker="Tu cuenta"
    title={sesion?.usuarioId && !tieneAccion ? "Mi cuenta" : TITULOS[vista]}
    subtitle="Accede con tus credenciales o participa de forma anónima." onClose={closeTop} onCloseToKey={closeTop}>
    <div className="mx-auto w-full max-w-xl space-y-5 p-5 sm:p-6">
      {sesion?.usuarioId && !tieneAccion ? <CuentaUsuario /> : <>
        {!tieneAccion && <nav aria-label="Opciones de acceso" className="flex flex-wrap gap-2">
          <Button variant={vista === "login" ? "default" : "outline"} onClick={() => cambiar("login")}>Iniciar sesión</Button>
          <Button variant={vista === "registro" ? "default" : "outline"} onClick={() => cambiar("registro")}>Crear cuenta</Button>
          <Button variant="ghost" onClick={() => cambiar("recuperar")}>Olvidé mi contraseña</Button>
        </nav>}
        {error && <Notice tone="danger" title="No se pudo continuar">{error}</Notice>}
        {mensaje && <Notice tone="success" title="Solicitud completada">{mensaje}</Notice>}
        <form key={vista} onSubmit={enviar} className="space-y-4" aria-busy={ocupado}>
          {(vista === "login" || vista === "registro" || vista === "recuperar") &&
            <CampoIdentidad name="correo" label="Correo electrónico" type="email" autoComplete="email" maxLength={255} />}
          {vista === "registro" && <>
            <CampoIdentidad name="nombres" label="Nombres" autoComplete="given-name" />
            <CampoIdentidad name="apellidos" label="Apellidos" autoComplete="family-name" />
          </>}
          {(vista === "login" || vista === "registro" || vista === "restablecer") &&
            <CampoIdentidad name="contrasena" label="Contraseña" type="password" minLength={vista === "login" ? undefined : 8}
              maxLength={72} autoComplete={vista === "login" ? "current-password" : "new-password"} />}
          {(vista === "registro" || vista === "restablecer") &&
            <CampoIdentidad name="confirmacion" label="Confirmar contraseña" type="password" maxLength={72} autoComplete="new-password" />}
          {vista === "verificar" && <p className="text-sm text-text-secondary">Confirma la verificación del correo asociado a este enlace.</p>}
          <Button type="submit" disabled={ocupado}>{ocupado ? "Procesando…" :
            vista === "recuperar" ? "Solicitar enlace" : vista === "restablecer" ? "Guardar contraseña" : TITULOS[vista]}</Button>
        </form>
        {!tieneAccion && <div className="space-y-3 border-t border-border pt-4">
          <Button variant="outline" disabled={ocupado} onClick={() => {
            useSesionStore.getState().elegirAnonimo(); closeTop();
          }}>Continuar como anónimo</Button>

          {/* Botón de Google OAuth */}
          <Button
            variant="outline"
            className="h-auto min-h-11 whitespace-normal"
            disabled={ocupado}
            onClick={() => loginConGoogle()}
          >
            <svg aria-hidden="true" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>
        </div>}
      </>}
    </div>
  </PanelShell>;
}
