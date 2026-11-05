import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{y as t}from"./iframe-DGFn0ebE.js";import{n,t as r}from"./plataforma-shell-Bv0WXtkW.js";import{a as i,i as a,t as o}from"./api-client-Da9ZfOik.js";import{n as s,t as c}from"./identidad-api-FrZGqpo3.js";import{n as l,s as u}from"./session-store-j34_iPDb.js";import{n as d,t as f}from"./query-provider-_g-1Rm-2.js";import{l as p,n as m}from"./acceso-6wk9lEFE.js";import{n as h,t as g}from"./panel-store-Ce9azu2v.js";import{n as _,t as v}from"./panel-host-DXBO8ixr.js";import{r as y,t as b}from"./sincronizar-sesion-BH_t6LoM.js";function x(){c.perfil=E(async()=>(i(u.getState().sesion?.token??null),A))}function S(){u.setState({cargando:!1,errorSesion:null,estadoMfa:null,sesion:{modo:`institucional`,identidad:{nombre:`Rosa Martínez`,email:k.correo},usuarioId:k.id,usuario:k,rol:k.codigo_rol,permisos:[],token:`token-sesion-limitada-storybook`,expiraEn:`2099-01-01T00:00:00Z`,desde:`2026-10-26T00:00:00.000Z`}})}var C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W;function G(){return(G=e((()=>{C=t(),a(),d(),_(),g(),n(),l(),b(),m(),s(),{expect:w,within:T,fn:E,userEvent:D,waitFor:O}=__STORYBOOK_MODULE_TEST__,k={id:`01900000-0000-7000-8000-000000000006`,nombres:`Rosa`,apellidos:`Martínez`,correo:`rosa.martinez@cartagena.gov.co`,codigo_rol:`administrador_identidades`,activo:!0,correo_verificado_en:null,nivel_identidad:`declarada`,permisos:[],mfa_activo:!1},A={...k,permisos:[`alternativas:gestionar`,`indicadores:gestionar`,`politicas:gestionar`,`seguimiento:gestionar`]},j={activo:!1,activado_en:null,codigos_restantes:0,exigido_por_rol:!0,sesion_verificada:!1},M={activo:!0,activado_en:`2026-10-26T00:00:00.000Z`,codigos_restantes:8,exigido_por_rol:!0,sesion_verificada:!0},N={secreto_b32:`JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`,otpauth_uri:`otpauth://totp/POLIS:rosa.martinez@cartagena.gov.co?secret=JBSWY3DPEHPK3PXP`,qr_code_base64:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=`},P={mensaje:`MFA activado para esta sesión`,codigos_recuperacion:[`AAAA-1111`,`BBBB-2222`,`CCCC-3333`,`DDDD-4444`,`EEEE-5555`,`FFFF-6666`,`GGGG-7777`,`HHHH-8888`]},F={...c},I={title:`Plataforma/Sesión restringida por MFA`,parameters:{layout:`fullscreen`,polis:{screen:!0},nextjs:{appDirectory:!0,navigation:{pathname:`/plataforma`}}},beforeEach:async()=>{let e=u.getState();return u.persist.clearStorage(),await u.persist.rehydrate(),S(),h.getState().closeAll(),c.perfil=E(async()=>k),c.mfaEstado=E(async()=>j),c.logout=E(async()=>({mensaje:`Sesión cerrada`})),c.mfaIniciar=E(async()=>N),c.mfaActivar=E(async()=>P),c.sesiones=E(async()=>[{id:`01900000-0000-7000-8000-0000000000aa`,creada_en:`2026-10-26T00:00:00.000Z`,expira_en:`2099-01-01T00:00:00.000Z`,actual:!0}]),()=>{u.setState(e),u.getState().limpiarSesion(),Object.assign(c,F)}},render:()=>(0,C.jsxs)(f,{children:[(0,C.jsx)(r,{children:(0,C.jsx)(`p`,{children:`Contenido institucional oculto por la restricción.`})}),(0,C.jsx)(v,{})]})},L={play:async({canvasElement:e})=>{await y();let t=T(e);await w(await t.findByRole(`heading`,{name:`Acceso restringido`})).toBeVisible(),await w(await t.findByText(/Acceso restringido hasta activar/)).toBeVisible(),await w(t.getByRole(`button`,{name:`Configurar verificación en dos pasos`})).toBeVisible(),await w(t.getByRole(`button`,{name:`Cerrar sesión`})).toBeVisible(),await w(t.queryByText(`Contenido institucional oculto por la restricción.`)).toBeNull(),w(c.mfaEstado).toHaveBeenCalled()}},R={...L,globals:{theme:`dark`}},z={beforeEach:async()=>{S(),u.setState({estadoMfa:{activo:!0,activado_en:`2026-09-01T00:00:00.000Z`,codigos_restantes:8,exigido_por_rol:!0,sesion_verificada:!1}})},play:async({canvasElement:e})=>{let t=T(e);await w(await t.findByText(/Sesión sin verificar/)).toBeVisible(),await w(t.getByRole(`button`,{name:`Cerrar sesión`})).toBeVisible(),await w(t.queryByRole(`button`,{name:`Configurar verificación en dos pasos`})).toBeNull(),await w(t.queryByText(`Contenido institucional oculto por la restricción.`)).toBeNull(),await D.click(t.getByRole(`button`,{name:`Cerrar sesión`})),await O(()=>w(u.getState().sesion).toBeNull()),w(c.logout).toHaveBeenCalledOnce()}},B={play:async({canvasElement:e})=>{let t=T(e);await y(),await w(await t.findByRole(`heading`,{name:`Acceso restringido`})).toBeVisible(),h.getState().closeAll(),h.getState().openPanel(`sesion`,{});let n=T(document.body);await D.click(await n.findByRole(`button`,{name:`Configurar verificación en dos pasos (TOTP)`})),await O(()=>w(c.mfaIniciar).toHaveBeenCalledOnce()),await w(await n.findByText(/Paso 1: Escanea el código QR/)).toBeVisible(),await D.type(await n.findByLabelText(/Código de verificación/),`123456`),x(),c.mfaEstado=E(async()=>M),await D.click(await n.findByRole(`button`,{name:`Verificar y activar MFA`})),await O(()=>w(c.mfaActivar).toHaveBeenCalledWith(`123456`)),await O(()=>w(c.perfil).toHaveBeenCalledOnce()),await O(()=>w(t.queryByRole(`heading`,{name:`Acceso restringido`})).toBeNull()),await w(t.queryByText(`Contenido institucional oculto por la restricción.`)).toBeVisible(),await w(await n.findByText(/AAAA-1111/)).toBeVisible(),w(p(u.getState().sesion)).toBe(!0)}},V={...B,globals:{theme:`dark`}},H={play:async({canvasElement:e})=>{c.mfaEstado=E(async()=>{throw new o(503,`Servicio de MFA no disponible`)}),await y();let t=T(e);await w(await t.findByRole(`heading`,{name:`Verificación en dos pasos no disponible`})).toBeVisible(),await w(t.queryByText(`Contenido institucional oculto por la restricción.`)).toBeNull(),await w(t.queryByText(/Acceso pleno/)).toBeNull(),await w(t.getByRole(`button`,{name:`Revisar acceso`})).toBeVisible()}},U={...H,globals:{theme:`dark`}},W=[`EnrolamientoPendiente`,`EnrolamientoPendienteOscuro`,`SesionPreviaSinAcreditar`,`ActivacionReflejaShell`,`ActivacionReflejaShellOscuro`,`LecturaMfaNoDisponible`,`LecturaMfaNoDisponibleOscuro`],L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    /* Flujo 186 real: la restauración consulta el estado MFA porque el perfil
     * llega con permisos vacíos conservando el rol interno. */
    await sincronizarSesion();
    const c = within(canvasElement);
    await expect(await c.findByRole("heading", {
      name: "Acceso restringido"
    })).toBeVisible();
    await expect(await c.findByText(/Acceso restringido hasta activar/)).toBeVisible();
    /* Acciones reales: configurar el factor y cerrar sesión; el contenido
     * institucional no queda disponible con el rol nominal. */
    await expect(c.getByRole("button", {
      name: "Configurar verificación en dos pasos"
    })).toBeVisible();
    await expect(c.getByRole("button", {
      name: "Cerrar sesión"
    })).toBeVisible();
    await expect(c.queryByText("Contenido institucional oculto por la restricción.")).toBeNull();
    expect(identidadApi.mfaEstado).toHaveBeenCalled();
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  ...EnrolamientoPendiente,
  globals: {
    theme: "dark"
  }
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  beforeEach: async () => {
    sembrarSesionRestaurada();
    useSesionStore.setState({
      estadoMfa: {
        activo: true,
        activado_en: "2026-09-01T00:00:00.000Z",
        codigos_restantes: 8,
        exigido_por_rol: true,
        sesion_verificada: false
      }
    });
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText(/Sesión sin verificar/)).toBeVisible();
    await expect(c.getByRole("button", {
      name: "Cerrar sesión"
    })).toBeVisible();
    await expect(c.queryByRole("button", {
      name: "Configurar verificación en dos pasos"
    })).toBeNull();
    await expect(c.queryByText("Contenido institucional oculto por la restricción.")).toBeNull();
    await userEvent.click(c.getByRole("button", {
      name: "Cerrar sesión"
    }));
    await waitFor(() => expect(useSesionStore.getState().sesion).toBeNull());
    expect(identidadApi.logout).toHaveBeenCalledOnce();
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await sincronizarSesion();
    await expect(await c.findByRole("heading", {
      name: "Acceso restringido"
    })).toBeVisible();
    /* Registro del factor con el flujo real del panel de "Mi cuenta": el
     * acreditamiento llega del servidor y el permiso efectivo del perfil. */
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("sesion", {});
    const cuerpo = within(document.body);
    await userEvent.click(await cuerpo.findByRole("button", {
      name: "Configurar verificación en dos pasos (TOTP)"
    }));
    await waitFor(() => expect(identidadApi.mfaIniciar).toHaveBeenCalledOnce());
    await expect(await cuerpo.findByText(/Paso 1: Escanea el código QR/)).toBeVisible();
    await userEvent.type(await cuerpo.findByLabelText(/Código de verificación/), "123456");
    /* El backend acredita la sesión: la siguiente lectura del perfil trae
     * los permisos efectivos y el estado MFA de esa sesión. */
    responderPerfilPleno();
    identidadApi.mfaEstado = fn(async () => estadoMfaActivoVerificado);
    await userEvent.click(await cuerpo.findByRole("button", {
      name: "Verificar y activar MFA"
    }));
    await waitFor(() => expect(identidadApi.mfaActivar).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(identidadApi.perfil).toHaveBeenCalledOnce());
    /* Sin recargar la página: el shell reacciona al store y deja de anunciar
     * "Acceso restringido"; muestra el contenido institucional del mismo shell. */
    await waitFor(() => expect(c.queryByRole("heading", {
      name: "Acceso restringido"
    })).toBeNull());
    await expect(c.queryByText("Contenido institucional oculto por la restricción.")).toBeVisible();
    /* El anuncio de "Acceso pleno" no se repite: la cuenta muestra el
     * resultado real y el shell institucional queda disponible. */
    await expect(await cuerpo.findByText(/AAAA-1111/)).toBeVisible();
    expect(sesionActiva(useSesionStore.getState().sesion)).toBe(true);
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  ...ActivacionReflejaShell,
  globals: {
    theme: "dark"
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    identidadApi.mfaEstado = fn(async () => {
      throw new ApiError(503, "Servicio de MFA no disponible");
    });
    await sincronizarSesion();
    const c = within(canvasElement);
    await expect(await c.findByRole("heading", {
      name: "Verificación en dos pasos no disponible"
    })).toBeVisible();
    await expect(c.queryByText("Contenido institucional oculto por la restricción.")).toBeNull();
    await expect(c.queryByText(/Acceso pleno/)).toBeNull();
    await expect(c.getByRole("button", {
      name: "Revisar acceso"
    })).toBeVisible();
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  ...LecturaMfaNoDisponible,
  globals: {
    theme: "dark"
  }
}`,...U.parameters?.docs?.source}}}})))()}G();export{B as ActivacionReflejaShell,V as ActivacionReflejaShellOscuro,L as EnrolamientoPendiente,R as EnrolamientoPendienteOscuro,H as LecturaMfaNoDisponible,U as LecturaMfaNoDisponibleOscuro,z as SesionPreviaSinAcreditar,W as __namedExportsOrder,I as default};