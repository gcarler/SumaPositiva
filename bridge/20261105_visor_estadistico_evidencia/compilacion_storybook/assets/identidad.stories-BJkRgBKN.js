import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{C as n,S as r,x as i,y as ee}from"./iframe-DGFn0ebE.js";import{n as a,t as te}from"./page-C3u151B-.js";import{a as ne,i as re,o as ie,t as o}from"./api-client-Da9ZfOik.js";import{n as ae,t as s}from"./identidad-api-FrZGqpo3.js";import{n as oe,s as c}from"./session-store-j34_iPDb.js";import{n as se,r as ce}from"./QueryClientProvider-BgR4BpIT.js";import{n as le,t as l}from"./query-provider-_g-1Rm-2.js";import{n as u,t as ue}from"./panel-store-Ce9azu2v.js";import{n as de,t as d}from"./panel-host-DXBO8ixr.js";import{r as fe,t as pe}from"./sincronizar-sesion-BH_t6LoM.js";import{n as me,t as he}from"./sesion-panel-9uxzCkRZ.js";import{n as ge,t as _e}from"./usuarios-panel-HLhDcPXZ.js";function ve(){let e=ce(),t=n();return(0,f.useEffect)(()=>{localStorage.removeItem(`polis-sesion-v1`),localStorage.removeItem(`polis_sesion_token`);let t=new URLSearchParams(window.location.hash.slice(1)),n=new URLSearchParams(window.location.search),r=t.get(`accion`)??n.get(`accion`),i=t.get(`token`)??n.get(`token`);(r===`recuperar`||r===`verificar`||r===`magic_link`)&&i&&(window.history.replaceState(null,``,window.location.pathname),u.getState().openPanel(`sesion`,{accion:r,token:i}));let ee=()=>{c.getState().limpiarSesion(),e.clear()};ie(ee);let a=()=>fe();(async()=>{await c.persist.rehydrate(),await a()})();let te=c.subscribe((t,n)=>{(t.sesion?.usuarioId!==n.sesion?.usuarioId||t.sesion?.rol!==n.sesion?.rol||[...t.sesion?.permisos??[]].sort().join()!==[...n.sesion?.permisos??[]].sort().join())&&e.clear()}),ne=setInterval(()=>void a(),6e4),re=setInterval(()=>{let e=c.getState().sesion;e?.expiraEn&&!(Date.parse(e.expiraEn)>Date.now())&&ee()},1e3);return window.addEventListener(`focus`,a),()=>{te(),clearInterval(ne),clearInterval(re),window.removeEventListener(`focus`,a),ie(null)}},[e]),(0,f.useEffect)(()=>{let e=new URLSearchParams(window.location.hash.slice(1)).get(`accion`),t=new URLSearchParams(window.location.search);if(window.location.pathname===`/`&&t.get(`login`)===`1`&&!e){u.getState().entries.some(e=>e.type===`sesion`)||u.getState().openPanel(`sesion`,{}),t.delete(`login`);let e=t.toString();window.history.replaceState(window.history.state,``,`/`+(e?`?`+e:``)+window.location.hash)}},[t]),null}var f;function ye(){return(ye=e((()=>{f=t(),r(),se(),re(),ue(),oe(),pe()})))()}var p,m,h,g,_,v,y,b,x,S,C,be,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,xe,Se,W,Ce,we,G,K,q,J,Y,X,Z,Q,$,Te;function Ee(){return(Ee=e((()=>{p=ee(),r(),ye(),a(),le(),de(),ue(),re(),ae(),oe(),me(),ge(),{expect:m,fn:h,userEvent:g,within:_,waitFor:v}=__STORYBOOK_MODULE_TEST__,y={id:`01900000-0000-7000-8000-000000000001`,correo:`ana@example.org`,nombres:`Ana`,apellidos:`Torres`,codigo_rol:`administrador_identidades`,activo:!0,nivel_identidad:`declarada`,correo_verificado_en:null,permisos:[`usuarios:leer`,`usuarios:gestionar`,`roles:gestionar`,`identidad:auditar`]},b=[{id:`01900000-0000-7000-8000-000000000002`,codigo:`ciudadano`,nombre:`Ciudadano`,permisos:[`aportes:crear`],sistema:!0},{id:`01900000-0000-7000-8000-000000000003`,codigo:`operador`,nombre:`Operador`,permisos:[`usuarios:leer`],sistema:!1}],x={usuario:y,rol:y.codigo_rol,permisos:y.permisos,nivel_identidad:`declarada`,token_acceso:`token-exclusivo-de-storybook`,expira_en:`2099-01-01T00:00:00Z`,mfa_enrolamiento_requerido:!1},S={...s},C={mensaje:`Solicitud completada`},be={title:`Plataforma/Identidad`,parameters:{layout:`fullscreen`,polis:{screen:!0}},beforeEach:()=>(u.getState().closeAll(),c.getState().limpiarSesion(),Object.assign(s,{login:h(async()=>structuredClone(x)),loginGoogle:h(async()=>structuredClone(x)),registrar:h(async()=>structuredClone(y)),perfil:h(async()=>structuredClone(y)),editarPerfil:h(async()=>structuredClone(y)),logout:h(async()=>C),sesiones:h(async()=>[{id:`01900000-0000-7000-8000-000000000004`,creada_en:`2026-10-01T12:00:00Z`,expira_en:`2099-01-01T00:00:00Z`,actual:!0}]),revocarSesion:h(async()=>C),cambiarContrasena:h(async()=>C),solicitarRecuperacion:h(async()=>C),confirmarRecuperacion:h(async()=>C),solicitarVerificacion:h(async()=>C),confirmarVerificacion:h(async()=>C),solicitarMagicLink:h(async()=>C),confirmarMagicLink:h(async()=>structuredClone(x)),usuarios:h(async()=>({total:1,elementos:[structuredClone(y)]})),crearUsuario:h(async()=>structuredClone(y)),editarUsuario:h(async()=>structuredClone(y)),revocarUsuario:h(async()=>C),roles:h(async()=>structuredClone(b)),permisos:h(async()=>({"usuarios:leer":`Consultar usuarios`,"mesas:abrir":`Crear mesas`})),crearRol:h(async()=>structuredClone(b[1])),editarRol:h(async()=>structuredClone(b[1])),eliminarRol:h(async()=>C),eventos:h(async()=>[]),mfaEstado:h(async()=>({activo:!1,activado_en:null,codigos_restantes:0,exigido_por_rol:!1,sesion_verificada:!1})),mfaIniciar:h(async()=>({secreto_b32:`JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`,otpauth_uri:`otpauth://totp/POLIS:test@example.org?secret=JBSWY3DPEHPK3PXP`,qr_code_base64:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=`})),mfaActivar:h(async()=>({mensaje:`MFA activado`,codigos_recuperacion:[`AAAA-1111`,`BBBB-2222`,`CCCC-3333`,`DDDD-4444`,`EEEE-5555`,`FFFF-6666`,`GGGG-7777`,`HHHH-8888`]})),mfaDesactivar:h(async()=>C),mfaRegenerarRecuperacion:h(async()=>({mensaje:`Códigos regenerados`,codigos_recuperacion:[`AAAA-1111`,`BBBB-2222`,`CCCC-3333`,`DDDD-4444`,`EEEE-5555`,`FFFF-6666`,`GGGG-7777`,`HHHH-8888`]})),mfaVerificar:h(async()=>structuredClone(x)),ambitosUsuario:h(async()=>[]),asignarAmbitoUsuario:h(async(e,t)=>({id:`01900000-0000-7000-8000-0000000000bb`,usuario_id:`01900000-0000-7000-8000-000000000099`,tipo_ambito:t.tipo_ambito,identificador_territorial:t.identificador_territorial,activo:!0,creado_en:new Date().toISOString(),actualizado_en:new Date().toISOString()})),revocarAmbitoUsuario:h(async()=>C)}),u.getState().openPanel(`sesion`,{}),()=>{Object.assign(s,S),u.getState().closeAll(),c.getState().limpiarSesion(),ne(null)}),render:()=>(0,p.jsx)(l,{children:(0,p.jsx)(d,{})})},w={render:()=>(0,p.jsx)(l,{children:(0,p.jsx)(he,{entryKey:`sesion-story`})})},T={globals:{theme:`dark`}},E={parameters:{viewport:{defaultViewport:`mobile1`}}},D={play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.type(t.getByLabelText(`Correo electrónico`,{exact:!1}),`ana@example.org`),await g.type(t.getByLabelText(/^Contraseña/),`ClavePrueba2026*`),await g.click(t.getAllByRole(`button`,{name:`Iniciar sesión`})[1]),await v(()=>m(c.getState().sesion?.usuarioId).toBe(y.id)),await v(()=>m(i().push).toHaveBeenCalledWith(`/plataforma`)),await m(u.getState().entries).toHaveLength(0)}},O={beforeEach:()=>{s.login=h(async()=>{throw new o(401,`Correo o contraseña incorrectos`)})},play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`)),n=t.getByLabelText(`Correo electrónico`,{exact:!1});await g.type(n,`ana@example.org`),await g.type(t.getByLabelText(/^Contraseña/),`ClaveErrada`),await g.click(t.getAllByRole(`button`,{name:`Iniciar sesión`})[1]),await m(await t.findByText(`Correo o contraseña incorrectos`)).toBeVisible(),await m(n).toHaveValue(`ana@example.org`),await m(c.getState().sesion).toBeNull()}},k={play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.click(t.getByRole(`button`,{name:`Crear cuenta`})),await g.type(t.getByLabelText(`Correo electrónico`,{exact:!1}),`ana@example.org`),await g.type(t.getByLabelText(`Nombres`,{exact:!1}),`Ana`),await g.type(t.getByLabelText(`Apellidos`,{exact:!1}),`Torres`),await g.type(t.getByLabelText(/^Contraseña/),`ClavePrueba2026*`),await g.type(t.getByLabelText(`Confirmar contraseña`,{exact:!1}),`ClavePrueba2026*`),await g.click(t.getAllByRole(`button`,{name:`Crear cuenta`})[1]),await m(await t.findByText(/Cuenta creada/)).toBeVisible(),await m(s.registrar).toHaveBeenCalledWith({correo:`ana@example.org`,nombres:`Ana`,apellidos:`Torres`,contrasena:`ClavePrueba2026*`})}},A={play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.click(t.getByRole(`button`,{name:`Olvidé mi contraseña`})),await g.type(t.getByLabelText(`Correo electrónico`,{exact:!1}),`ana@example.org`),await g.click(t.getByRole(`button`,{name:`Solicitar enlace`})),await v(()=>m(s.solicitarRecuperacion).toHaveBeenCalledWith(`ana@example.org`))}},j={beforeEach:()=>{u.getState().closeAll(),u.getState().openPanel(`sesion`,{accion:`recuperar`,token:`enlace-story`})}},M={beforeEach:()=>{u.getState().closeAll(),u.getState().openPanel(`sesion`,{accion:`verificar`,token:`enlace-story`})},play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.click(t.getByRole(`button`,{name:`Verificar correo`})),await v(()=>m(s.confirmarVerificacion).toHaveBeenCalledWith(`enlace-story`))}},N={beforeEach:()=>{c.getState().iniciarSesion(x)}},P={...N,play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.click(await t.findByRole(`button`,{name:`Cerrar sesión`})),await v(()=>m(c.getState().sesion).toBeNull()),await m(s.logout).toHaveBeenCalledOnce()}},F={beforeEach:()=>{c.getState().iniciarSesion(x),u.getState().closeAll(),u.getState().openPanel(`usuarios`,{})},render:()=>(0,p.jsx)(l,{children:(0,p.jsx)(_e,{entryKey:`usuarios-story`})})},I={...F,globals:{theme:`dark`}},L={...F,beforeEach:()=>{c.getState().iniciarSesion(x),u.getState().closeAll(),u.getState().openPanel(`usuarios`,{}),s.usuarios=h(async()=>({total:0,elementos:[]}))}},R={...F,beforeEach:()=>{c.getState().iniciarSesion(x),u.getState().closeAll(),u.getState().openPanel(`usuarios`,{}),s.usuarios=h(async()=>{throw new o(503,`Servicio no disponible`)})}},z={...F,play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.click(t.getByRole(`button`,{name:`Roles y permisos`})),await g.click(await t.findByRole(`button`,{name:`Editar Operador`})),await g.click(t.getByRole(`checkbox`,{name:/Crear mesas/})),await g.type(t.getByLabelText(`Motivo del cambio`,{exact:!1}),`Asignación autorizada para operación`),await g.click(t.getByRole(`button`,{name:`Guardar rol`})),await v(()=>m(s.editarRol).toHaveBeenCalledWith(`operador`,{nombre:`Operador`,permisos:[`usuarios:leer`,`mesas:abrir`],motivo:`Asignación autorizada para operación`}))}},B={...F,beforeEach:()=>{c.getState().iniciarSesion({...x,permisos:[],usuario:{...y,permisos:[],codigo_rol:`ciudadano`}}),u.getState().closeAll(),u.getState().openPanel(`usuarios`,{})}},V={beforeEach:()=>{c.getState().iniciarSesion(x)},play:async({canvasElement:e})=>{let t=_(e),n=_(await t.findByRole(`dialog`));await m(n.getByRole(`link`,{name:`Administrar usuarios y permisos`})).toHaveAttribute(`href`,`/plataforma/usuarios`),u.getState().openPanel(`usuarios`,{}),n=_(await t.findByRole(`dialog`,{name:`Usuarios y permisos`})),await g.click(await n.findByRole(`button`,{name:`Crear usuario`})),await g.click(n.getByRole(`combobox`,{name:/Rol/}));let r=await _(document.body).findByRole(`option`,{name:`Operador`});await v(()=>{let e=r.getBoundingClientRect(),t=document.elementFromPoint(e.x+e.width/2,e.y+e.height/2);m(t===r||r.contains(t)).toBe(!0)}),await g.click(r),await m(n.getByRole(`combobox`,{name:/Rol/})).toHaveTextContent(`Operador`)}},H={beforeEach:()=>{c.getState().iniciarSesion(x),u.getState().closeAll()},render:()=>(0,p.jsxs)(l,{children:[(0,p.jsx)(te,{}),(0,p.jsx)(d,{})]})},U={...H,globals:{theme:`dark`}},W={beforeEach:()=>{c.getState().iniciarSesion(x),Se=new Promise((e,t)=>{xe=t}),s.perfil=h(()=>Se??Promise.reject(Error(`Sin solicitud`)))},render:()=>(0,p.jsxs)(l,{children:[(0,p.jsx)(ve,{}),(0,p.jsx)(d,{})]}),play:async()=>{await v(()=>m(s.perfil).toHaveBeenCalled()),c.getState().iniciarSesion({...x,token_acceso:`sesion-nueva-story`}),xe?.(new o(401,`La sesión anterior fue revocada`)),await Se?.catch(()=>void 0),await m(c.getState().sesion?.token).toBe(`sesion-nueva-story`)}},Ce={...x,token_acceso:`token-limite-storybook`,permisos:[],usuario:{...y,permisos:[]},mfa_enrolamiento_requerido:!0},we={...Ce,token_acceso:`token-magic-limitado-storybook`},G={beforeEach:()=>{s.login=h(async()=>structuredClone(Ce)),s.mfaEstado=h(async()=>({activo:!1,activado_en:null,codigos_restantes:0,exigido_por_rol:!0,sesion_verificada:!1}))},play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.type(t.getByLabelText(`Correo electrónico`,{exact:!1}),`ana@example.org`),await g.type(t.getByLabelText(/^Contraseña/),`ClavePrueba2026*`),await g.click(t.getAllByRole(`button`,{name:`Iniciar sesión`})[1]),await v(()=>m(c.getState().sesion?.token).toBe(`token-limite-storybook`)),m(i().push).not.toHaveBeenCalledWith(`/plataforma`),await m(await t.findByText(/Verificación en dos pasos pendiente/)).toBeVisible(),await g.click(t.getByRole(`button`,{name:`Configurar verificación en dos pasos (TOTP)`})),await m(t.getByAltText(`Código QR de configuración TOTP`)).toBeVisible()}},K={...G,globals:{theme:`dark`}},q={...N,play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`)),n=()=>{},r=new Promise(e=>{n=e});s.perfil=h(()=>r),await g.click(await t.findByRole(`button`,{name:`Configurar verificación en dos pasos (TOTP)`})),await g.type(await t.findByLabelText(/Código de verificación/),`123456`),await g.click(t.getByRole(`button`,{name:`Verificar y activar MFA`})),await v(()=>m(s.mfaActivar).toHaveBeenCalledWith(`123456`)),c.getState().iniciarSesion({...x,token_acceso:`token-reemplazo-storybook`}),n({...x.usuario,correo:`sesion.reemplazada@example.org`,apellidos:`DelFactorReemplazado`}),await v(()=>m(c.getState().sesion?.token).toBe(`token-reemplazo-storybook`)),await m(s.perfil).toHaveBeenCalled(),await m(await v(()=>c.getState().sesion?.usuario?.apellidos)).toBe(`Torres`),await m(c.getState().sesion?.usuario?.correo).toBe(x.usuario.correo),await m(c.getState().sesion?.permisos).toEqual(x.permisos),await m(c.getState().sesion?.rol).toBe(x.rol)}},J={beforeEach:()=>{let e=structuredClone(we);return s.confirmarMagicLink=h(async()=>e),s.mfaEstado=h(async()=>({activo:!1,activado_en:null,codigos_restantes:0,exigido_por_rol:!0,sesion_verificada:!1})),u.getState().closeAll(),u.getState().openPanel(`sesion`,{accion:`magic_link`,token:`enlace-magic-story`}),()=>{s.confirmarMagicLink=S.confirmarMagicLink,s.mfaEstado=S.mfaEstado,u.getState().closeAll(),c.getState().limpiarSesion()}},play:async()=>{await v(()=>m(c.getState().sesion?.token).toBe(`token-magic-limitado-storybook`)),await m(s.confirmarMagicLink).toHaveBeenCalledTimes(1),m(i().push).not.toHaveBeenCalledWith(`/plataforma`);let e=_(document.body),t=await e.findByRole(`heading`,{name:`Mi cuenta`});await m(t).toBeVisible(),await m(await e.findByText(/Verificación en dos pasos pendiente/)).toBeVisible(),await v(async()=>{await m(await e.findByRole(`heading`,{name:`Mi cuenta`})).toBeVisible()}),u.getState().closeAll(),u.getState().openPanel(`sesion`,{}),await v(async()=>{await m(await e.findByRole(`heading`,{name:`Mi cuenta`})).toBeVisible()}),await m(s.confirmarMagicLink).toHaveBeenCalledTimes(1)}},Y={...J,globals:{theme:`dark`}},X={...J,parameters:{viewport:{defaultViewport:`mobile1`}}},Z={...N,beforeEach:()=>{c.getState().iniciarSesion(x),s.mfaEstado=h(async()=>({activo:!0,activado_en:`2026-10-20T10:00:00Z`,codigos_restantes:8,exigido_por_rol:!0,sesion_verificada:!1}))},play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await m(await t.findByText(/Sesión sin verificar/)).toBeVisible(),await g.click(t.getByRole(`button`,{name:`Cerrar sesión y volver a entrar`})),await v(()=>m(c.getState().sesion).toBeNull())}},Q={...N,play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));s.mfaIniciar=h(async()=>{throw new o(409,`Ya existe un factor activo para esta cuenta`)}),await g.click(await t.findByRole(`button`,{name:`Configurar verificación en dos pasos (TOTP)`})),await m(await t.findByText(/Ya existe un factor activo/)).toBeVisible(),await m(t.queryByAltText(`Código QR de configuración TOTP`)).toBeNull()}},$={...N,play:async({canvasElement:e})=>{let t=_(await _(e).findByRole(`dialog`));await g.click(t.getByRole(`button`,{name:`Configurar verificación en dos pasos (TOTP)`})),await g.type(await t.findByLabelText(/Código de verificación/),`123456`),await g.click(t.getByRole(`button`,{name:`Verificar y activar MFA`})),await m(await t.findByText(`Autenticación multifactor activada con éxito.`)).toBeVisible(),await v(()=>m(s.perfil).toHaveBeenCalled()),await m(await t.findByText(/AAAA-1111/)).toBeVisible()}},Te=`LoginPanel.LoginOscuro.LoginMovil.LoginCorrecto.CredencialesIncorrectas.Registro.Recuperar.Restablecer.VerificarCorreo.MiCuenta.CerrarSesion.Usuarios.UsuariosOscuro.UsuariosVacio.UsuariosError.EditarRol.SinPermiso.SelectEnPanelApilado.NavegacionAdministrador.NavegacionAdministradorOscuro.SesionNuevaConRespuestaAnterior.EnrolamientoExigido.EnrolamientoExigidoOscuro.ActivacionMfaSesionReemplazada.MagicLinkLimitado.MagicLinkLimitadoOscuro.MagicLinkLimitadoMovil.MfaExigidoSesionPrevia.MfaConFactorActivo409.ActivacionMfaAcreditaSesion`.split(`.`),w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <QueryProvider>
      <SesionPanel entryKey="sesion-story" />
    </QueryProvider>
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  globals: {
    theme: "dark"
  }
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  parameters: {
    viewport: {
      defaultViewport: "mobile1"
    }
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.type(panel.getByLabelText("Correo electrónico", {
      exact: false
    }), "ana@example.org");
    await userEvent.type(panel.getByLabelText(/^Contraseña/), "ClavePrueba2026*");
    await userEvent.click(panel.getAllByRole("button", {
      name: "Iniciar sesión"
    })[1]);
    await waitFor(() => expect(useSesionStore.getState().sesion?.usuarioId).toBe(usuario.id));
    await waitFor(() => expect(getRouter().push).toHaveBeenCalledWith("/plataforma"));
    await expect(usePanelStore.getState().entries).toHaveLength(0);
  }
}`,...D.parameters?.docs?.source}}},O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    identidadApi.login = fn(async () => {
      throw new ApiError(401, "Correo o contraseña incorrectos");
    });
  },
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    const correo = panel.getByLabelText("Correo electrónico", {
      exact: false
    });
    await userEvent.type(correo, "ana@example.org");
    await userEvent.type(panel.getByLabelText(/^Contraseña/), "ClaveErrada");
    await userEvent.click(panel.getAllByRole("button", {
      name: "Iniciar sesión"
    })[1]);
    await expect(await panel.findByText("Correo o contraseña incorrectos")).toBeVisible();
    await expect(correo).toHaveValue("ana@example.org");
    await expect(useSesionStore.getState().sesion).toBeNull();
  }
}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(panel.getByRole("button", {
      name: "Crear cuenta"
    }));
    await userEvent.type(panel.getByLabelText("Correo electrónico", {
      exact: false
    }), "ana@example.org");
    await userEvent.type(panel.getByLabelText("Nombres", {
      exact: false
    }), "Ana");
    await userEvent.type(panel.getByLabelText("Apellidos", {
      exact: false
    }), "Torres");
    await userEvent.type(panel.getByLabelText(/^Contraseña/), "ClavePrueba2026*");
    await userEvent.type(panel.getByLabelText("Confirmar contraseña", {
      exact: false
    }), "ClavePrueba2026*");
    await userEvent.click(panel.getAllByRole("button", {
      name: "Crear cuenta"
    })[1]);
    await expect(await panel.findByText(/Cuenta creada/)).toBeVisible();
    await expect(identidadApi.registrar).toHaveBeenCalledWith({
      correo: "ana@example.org",
      nombres: "Ana",
      apellidos: "Torres",
      contrasena: "ClavePrueba2026*"
    });
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(panel.getByRole("button", {
      name: "Olvidé mi contraseña"
    }));
    await userEvent.type(panel.getByLabelText("Correo electrónico", {
      exact: false
    }), "ana@example.org");
    await userEvent.click(panel.getByRole("button", {
      name: "Solicitar enlace"
    }));
    await waitFor(() => expect(identidadApi.solicitarRecuperacion).toHaveBeenCalledWith("ana@example.org"));
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("sesion", {
      accion: "recuperar",
      token: "enlace-story"
    });
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("sesion", {
      accion: "verificar",
      token: "enlace-story"
    });
  },
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(panel.getByRole("button", {
      name: "Verificar correo"
    }));
    await waitFor(() => expect(identidadApi.confirmarVerificacion).toHaveBeenCalledWith("enlace-story"));
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
  }
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  ...MiCuenta,
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(await panel.findByRole("button", {
      name: "Cerrar sesión"
    }));
    await waitFor(() => expect(useSesionStore.getState().sesion).toBeNull());
    await expect(identidadApi.logout).toHaveBeenCalledOnce();
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
  },
  render: () => <QueryProvider>
      <UsuariosPanel entryKey="usuarios-story" />
    </QueryProvider>
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  ...Usuarios,
  globals: {
    theme: "dark"
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  ...Usuarios,
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
    identidadApi.usuarios = fn(async () => ({
      total: 0,
      elementos: []
    }));
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  ...Usuarios,
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
    identidadApi.usuarios = fn(async () => {
      throw new ApiError(503, "Servicio no disponible");
    });
  }
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  ...Usuarios,
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(panel.getByRole("button", {
      name: "Roles y permisos"
    }));
    await userEvent.click(await panel.findByRole("button", {
      name: "Editar Operador"
    }));
    await userEvent.click(panel.getByRole("checkbox", {
      name: /Crear mesas/
    }));
    await userEvent.type(panel.getByLabelText("Motivo del cambio", {
      exact: false
    }), "Asignación autorizada para operación");
    await userEvent.click(panel.getByRole("button", {
      name: "Guardar rol"
    }));
    await waitFor(() => expect(identidadApi.editarRol).toHaveBeenCalledWith("operador", {
      nombre: "Operador",
      permisos: ["usuarios:leer", "mesas:abrir"],
      motivo: "Asignación autorizada para operación"
    }));
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  ...Usuarios,
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion({
      ...login,
      permisos: [],
      usuario: {
        ...usuario,
        permisos: [],
        codigo_rol: "ciudadano"
      }
    });
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("usuarios", {});
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    let panel = within(await canvas.findByRole("dialog"));
    await expect(panel.getByRole("link", {
      name: "Administrar usuarios y permisos"
    })).toHaveAttribute("href", "/plataforma/usuarios");
    // Verificar el Select del kit dentro de una pila de paneles, independientemente
    // del enlace que ahora lleva a la ruta privada de administración.
    usePanelStore.getState().openPanel("usuarios", {});
    panel = within(await canvas.findByRole("dialog", {
      name: "Usuarios y permisos"
    }));
    await userEvent.click(await panel.findByRole("button", {
      name: "Crear usuario"
    }));
    await userEvent.click(panel.getByRole("combobox", {
      name: /Rol/
    }));
    const opcion = await within(document.body).findByRole("option", {
      name: "Operador"
    });
    await waitFor(() => {
      const rect = opcion.getBoundingClientRect();
      const elemento = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      expect(elemento === opcion || opcion.contains(elemento)).toBe(true);
    });
    await userEvent.click(opcion);
    await expect(panel.getByRole("combobox", {
      name: /Rol/
    })).toHaveTextContent("Operador");
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    usePanelStore.getState().closeAll();
  },
  render: () => <QueryProvider>
      <Home />
      <PanelHost />
    </QueryProvider>
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  ...NavegacionAdministrador,
  globals: {
    theme: "dark"
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    perfilPendiente = new Promise<Usuario>((_, reject) => {
      rechazarPerfil = reject;
    });
    identidadApi.perfil = fn(() => perfilPendiente ?? Promise.reject(new Error("Sin solicitud")));
  },
  render: () => <QueryProvider>
      <SesionSync />
      <PanelHost />
    </QueryProvider>,
  play: async () => {
    await waitFor(() => expect(identidadApi.perfil).toHaveBeenCalled());
    useSesionStore.getState().iniciarSesion({
      ...login,
      token_acceso: "sesion-nueva-story"
    });
    rechazarPerfil?.(new ApiError(401, "La sesión anterior fue revocada"));
    await perfilPendiente?.catch(() => undefined);
    await expect(useSesionStore.getState().sesion?.token).toBe("sesion-nueva-story");
  }
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    identidadApi.login = fn(async () => structuredClone(loginLimitado));
    identidadApi.mfaEstado = fn(async () => ({
      activo: false,
      activado_en: null,
      codigos_restantes: 0,
      exigido_por_rol: true,
      sesion_verificada: false
    }));
  },
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.type(panel.getByLabelText("Correo electrónico", {
      exact: false
    }), "ana@example.org");
    await userEvent.type(panel.getByLabelText(/^Contraseña/), "ClavePrueba2026*");
    await userEvent.click(panel.getAllByRole("button", {
      name: "Iniciar sesión"
    })[1]);
    /* Sesión limitada sembrada: sin anuncio de acceso pleno ni navegación. */
    await waitFor(() => expect(useSesionStore.getState().sesion?.token).toBe("token-limite-storybook"));
    expect(getRouter().push).not.toHaveBeenCalledWith("/plataforma");
    /* El enrolamiento pendiente se representa y lleva a la configuración real. */
    await expect(await panel.findByText(/Verificación en dos pasos pendiente/)).toBeVisible();
    await userEvent.click(panel.getByRole("button", {
      name: "Configurar verificación en dos pasos (TOTP)"
    }));
    await expect(panel.getByAltText("Código QR de configuración TOTP")).toBeVisible();
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  ...EnrolamientoExigido,
  globals: {
    theme: "dark"
  }
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  ...MiCuenta,
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    let resolverPerfil: (usuario: Usuario) => void = () => {};
    const perfilDiferido = new Promise<Usuario>(resolver => {
      resolverPerfil = resolver;
    });
    identidadApi.perfil = fn(() => perfilDiferido);
    await userEvent.click(await panel.findByRole("button", {
      name: "Configurar verificación en dos pasos (TOTP)"
    }));
    await userEvent.type(await panel.findByLabelText(/Código de verificación/), "123456");
    await userEvent.click(panel.getByRole("button", {
      name: "Verificar y activar MFA"
    }));
    await waitFor(() => expect(identidadApi.mfaActivar).toHaveBeenCalledWith("123456"));
    /* La sesión fue reemplazada mientras el perfil retardado seguía vivo. */
    useSesionStore.getState().iniciarSesion({
      ...login,
      token_acceso: "token-reemplazo-storybook"
    });
    /* El perfil retardado responde con datos de la sesión vieja. */
    resolverPerfil({
      ...login.usuario,
      correo: "sesion.reemplazada@example.org",
      apellidos: "DelFactorReemplazado"
    });
    await waitFor(() => expect(useSesionStore.getState().sesion?.token).toBe("token-reemplazo-storybook"));
    /* Sin guardas, identidad/permisos/rol serían pisados por el perfil viejo. */
    await expect(identidadApi.perfil).toHaveBeenCalled();
    await expect(await waitFor(() => useSesionStore.getState().sesion?.usuario?.apellidos)).toBe("Torres");
    await expect(useSesionStore.getState().sesion?.usuario?.correo).toBe(login.usuario.correo);
    await expect(useSesionStore.getState().sesion?.permisos).toEqual(login.permisos);
    await expect(useSesionStore.getState().sesion?.rol).toBe(login.rol);
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    const sesionDeshabilitada = structuredClone(magicLinkLimitado);
    identidadApi.confirmarMagicLink = fn(async () => sesionDeshabilitada);
    identidadApi.mfaEstado = fn(async () => ({
      activo: false,
      activado_en: null,
      codigos_restantes: 0,
      exigido_por_rol: true,
      sesion_verificada: false
    }));
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("sesion", {
      accion: "magic_link",
      token: "enlace-magic-story"
    });
    return () => {
      identidadApi.confirmarMagicLink = originales.confirmarMagicLink;
      identidadApi.mfaEstado = originales.mfaEstado;
      usePanelStore.getState().closeAll();
      useSesionStore.getState().limpiarSesion();
    };
  },
  play: async () => {
    /* Consumo único y real: sesión limitada sin anuncio de acceso pleno. */
    await waitFor(() => expect(useSesionStore.getState().sesion?.token).toBe("token-magic-limitado-storybook"));
    await expect(identidadApi.confirmarMagicLink).toHaveBeenCalledTimes(1);
    expect(getRouter().push).not.toHaveBeenCalledWith("/plataforma");
    /* La ficha pasa a "Mi cuenta" con el enrolamiento del rol pendiente. */
    const cuerpo = within(document.body);
    const ficha = await cuerpo.findByRole("heading", {
      name: "Mi cuenta"
    });
    await expect(ficha).toBeVisible();
    await expect(await cuerpo.findByText(/Verificación en dos pasos pendiente/)).toBeVisible();
    /* El token no se re-consume montajes posteriores del panel. */
    await waitFor(async () => {
      await expect(await cuerpo.findByRole("heading", {
        name: "Mi cuenta"
      })).toBeVisible();
    });
    usePanelStore.getState().closeAll();
    usePanelStore.getState().openPanel("sesion", {});
    await waitFor(async () => {
      await expect(await cuerpo.findByRole("heading", {
        name: "Mi cuenta"
      })).toBeVisible();
    });
    await expect(identidadApi.confirmarMagicLink).toHaveBeenCalledTimes(1);
  }
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  ...MagicLinkLimitado,
  globals: {
    theme: "dark"
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  ...MagicLinkLimitado,
  parameters: {
    viewport: {
      defaultViewport: "mobile1"
    }
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  ...MiCuenta,
  beforeEach: () => {
    useSesionStore.getState().iniciarSesion(login);
    identidadApi.mfaEstado = fn(async () => ({
      activo: true,
      activado_en: "2026-10-20T10:00:00Z",
      codigos_restantes: 8,
      exigido_por_rol: true,
      sesion_verificada: false
    }));
  },
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await expect(await panel.findByText(/Sesión sin verificar/)).toBeVisible();
    await userEvent.click(panel.getByRole("button", {
      name: "Cerrar sesión y volver a entrar"
    }));
    await waitFor(() => expect(useSesionStore.getState().sesion).toBeNull());
  }
}`,...Z.parameters?.docs?.source}}},Q.parameters={...Q.parameters,docs:{...Q.parameters?.docs,source:{originalSource:`{
  ...MiCuenta,
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    /* La API rechaza reiniciar un factor ya activo con 409 (contrato con EDD). */
    identidadApi.mfaIniciar = fn(async () => {
      throw new ApiError(409, "Ya existe un factor activo para esta cuenta");
    });
    await userEvent.click(await panel.findByRole("button", {
      name: "Configurar verificación en dos pasos (TOTP)"
    }));
    await expect(await panel.findByText(/Ya existe un factor activo/)).toBeVisible();
    /* No se anuncia enrolamiento ni éxito: el error queda presente. */
    await expect(panel.queryByAltText("Código QR de configuración TOTP")).toBeNull();
  }
}`,...Q.parameters?.docs?.source}}},$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  ...MiCuenta,
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog"));
    await userEvent.click(panel.getByRole("button", {
      name: "Configurar verificación en dos pasos (TOTP)"
    }));
    await userEvent.type(await panel.findByLabelText(/Código de verificación/), "123456");
    await userEvent.click(panel.getByRole("button", {
      name: "Verificar y activar MFA"
    }));
    await expect(await panel.findByText("Autenticación multifactor activada con éxito.")).toBeVisible();
    /* La acreditación es de esta sesión: se refresca el perfil para obtener
     * los permisos efectivos y el estado de verificación actualizado. */
    await waitFor(() => expect(identidadApi.perfil).toHaveBeenCalled());
    await expect(await panel.findByText(/AAAA-1111/)).toBeVisible();
  }
}`,...$.parameters?.docs?.source}}}})))()}Ee();export{$ as ActivacionMfaAcreditaSesion,q as ActivacionMfaSesionReemplazada,P as CerrarSesion,O as CredencialesIncorrectas,z as EditarRol,G as EnrolamientoExigido,K as EnrolamientoExigidoOscuro,D as LoginCorrecto,E as LoginMovil,T as LoginOscuro,w as LoginPanel,J as MagicLinkLimitado,X as MagicLinkLimitadoMovil,Y as MagicLinkLimitadoOscuro,Q as MfaConFactorActivo409,Z as MfaExigidoSesionPrevia,N as MiCuenta,H as NavegacionAdministrador,U as NavegacionAdministradorOscuro,A as Recuperar,k as Registro,j as Restablecer,V as SelectEnPanelApilado,W as SesionNuevaConRespuestaAnterior,B as SinPermiso,F as Usuarios,R as UsuariosError,I as UsuariosOscuro,L as UsuariosVacio,M as VerificarCorreo,Te as __namedExportsOrder,be as default};