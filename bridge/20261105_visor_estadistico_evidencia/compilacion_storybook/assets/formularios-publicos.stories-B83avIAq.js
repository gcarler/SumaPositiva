import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{S as n,w as r,y as i}from"./iframe-DGFn0ebE.js";import{r as a,t as o}from"./button-CsCxrpBO.js";import{n as s,t as c}from"./arrow-left-CAZaEhsk.js";import{n as l,t as u}from"./formulario-runtime-CFiZDlrA.js";import{n as d,t as f}from"./notice-BHPCWy4g.js";import{i as p,t as m}from"./api-client-Da9ZfOik.js";import{i as h,s as g}from"./formulario-engine-9f1BJDYM.js";import{i as _,r as v}from"./formulario-CJ2NBTXj.js";import{n as y,s as b}from"./session-store-j34_iPDb.js";import{n as x,t as S}from"./formularios-remotos-s700-SKI.js";import{n as C,t as w}from"./formularios-store-CQFZqnIT.js";import{n as T,t as ee}from"./formularios-mock-api-CgBWUs3K.js";import{n as te,t as ne}from"./useQuery-B3_AiON4.js";import{n as re,t as E}from"./query-provider-_g-1Rm-2.js";import{n as D,t as ie}from"./link-DG3r3EFK.js";import{n as O,r as k}from"./dist-Qokd2K9m.js";import{n as A,t as j}from"./logo-polis-CbS8aI2x.js";import{n as M,t as N}from"./compartir-formulario-DgXHrVJW.js";function P({slug:e,inicial:t,borrador:n=!1}){let i=r(),a=b(e=>e.sesion),s=b(e=>e.cargando),[l,d]=(0,I.useState)(!1),p=n&&!!a?.usuarioId,h=te({queryKey:[`formulario-publico`,e,p?`privado`:`publico`,p?a?.usuarioId:null],queryFn:()=>p?S.privado(e):S.publico(e),initialData:t,enabled:!n||p,refetchOnWindowFocus:!0,retry:1});(0,I.useEffect)(()=>{n&&!s&&!a?.usuarioId&&i.replace(`/`)},[n,s,a?.usuarioId,i]),(0,I.useEffect)(()=>{h.error instanceof m&&h.error.status===403&&!a?.usuarioId&&i.replace(`/`)},[h.error,a?.usuarioId,i]);let _=h.data,v=_?g(_):void 0;return(0,F.jsxs)(`div`,{className:`min-h-screen min-w-0 bg-background text-foreground`,children:[(0,F.jsx)(`a`,{href:`#formulario-publico`,className:`ui-skip-link`,children:`Saltar al formulario`}),(0,F.jsx)(`header`,{className:`border-b border-border bg-surface-1`,children:(0,F.jsxs)(`div`,{className:`mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:py-5`,children:[(0,F.jsxs)(D,{href:`/`,"aria-label":`Ir a la página principal de POLIS`,className:`group flex items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg`,children:[(0,F.jsx)(`div`,{className:`relative flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)] p-1.5 shadow-xs transition-transform group-hover:scale-105`,children:(0,F.jsx)(j,{className:`size-full`})}),(0,F.jsx)(`p`,{className:`text-xs sm:text-sm font-semibold text-foreground`,children:`Política Pública de Seguridad Humana Integral — Cartagena 2026–2036`})]}),(0,F.jsx)(o,{asChild:!0,variant:`outline`,size:`sm`,className:`shrink-0 text-xs font-medium`,children:(0,F.jsxs)(D,{href:`/`,className:`inline-flex items-center gap-1.5`,children:[(0,F.jsx)(c,{className:`size-3.5`}),(0,F.jsx)(`span`,{className:`hidden sm:inline`,children:`Volver al inicio`}),(0,F.jsx)(`span`,{className:`sm:hidden`,children:`Inicio`})]})})]})}),(0,F.jsxs)(`main`,{id:`formulario-publico`,tabIndex:-1,className:`mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6`,children:[n&&(0,F.jsx)(f,{title:`Vista previa privada`,children:`Este borrador no admite respuestas públicas.`}),h.isPending||!_?(0,F.jsx)(`p`,{role:h.error?`alert`:`status`,children:h.error?`No se pudo abrir el formulario. Intenta nuevamente.`:`Preparando formulario…`}):(0,F.jsxs)(`section`,{className:`min-w-0 rounded-2xl border border-border bg-surface-1 p-4 sm:p-6`,children:[(0,F.jsx)(`h1`,{className:`break-words text-2xl font-bold`,children:_.titulo}),(0,F.jsx)(`p`,{className:`mt-2 whitespace-pre-wrap break-words text-text-secondary`,children:_.descripcion}),(0,F.jsxs)(`p`,{className:`my-4 text-sm text-text-secondary`,children:[_.preguntas.filter(e=>![`seccion`,`descripcion`].includes(e.tipo)).length,` `,`preguntas`]}),h.error?(0,F.jsxs)(f,{tone:`danger`,title:`No se pudo verificar la publicación`,children:[`Reintenta antes de responder.`,` `,(0,F.jsx)(o,{variant:`outline`,onClick:()=>void h.refetch(),children:`Reintentar`})]}):l?(0,F.jsxs)(`div`,{role:`status`,children:[(0,F.jsx)(`h2`,{className:`font-semibold`,children:`Respuesta recibida`}),(0,F.jsx)(`p`,{className:`whitespace-pre-wrap`,children:_.configuracion.mensajeConfirmacion})]}):v&&!n?(0,F.jsx)(f,{title:`Formulario cerrado`,children:v}):(0,F.jsxs)(F.Fragment,{children:[(0,F.jsx)(`h2`,{className:`sr-only`,children:`Responder al formulario`}),(0,F.jsx)(u,{form:_,etiquetaEnvio:`Enviar respuesta`,preview:n,enviar:async(e,t)=>{await S.enviar(_,e,t),d(!0),_.configuracion.slug===`reporte-inseguridad`&&k.success(`Reporte recibido. Gracias por participar.`)}},`${_.id}-${_.actualizadoEn}`)]})]})]}),(0,F.jsx)(`footer`,{className:`mx-auto max-w-3xl px-4 py-6 text-center text-xs text-text-secondary`,children:`© Alcaldía de Cartagena — Secretaría de Planeación Distrital`})]})}var F,I;function L(){return(L=e((()=>{F=i(),p(),s(),ie(),O(),I=t(),n(),ne(),y(),a(),d(),A(),l(),x(),h(),P.__docgenInfo={description:``,methods:[],displayName:`FormularioPublicoPage`,props:{slug:{required:!0,tsType:{name:`string`},description:``},inicial:{required:!1,tsType:{name:`Formulario`},description:``},borrador:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`false`,computed:!1}}}}})))()}var R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q;function $(){return($=e((()=>{R=i(),ee(),x(),re(),L(),M(),w(),y(),_(),{expect:z,userEvent:B,within:V}=__STORYBOOK_MODULE_TEST__,H={...v(),id:`publico-demo`,origenDatos:`api`,titulo:`Consulta ciudadana`,descripcion:`Participa desde un enlace compartido.`,estado:`activo`,preguntas:[{id:`detalle`,tipo:`texto_corto`,texto:`Tu propuesta`,orden:0,obligatoria:!0}],configuracion:{...v().configuracion,slug:`consulta-ciudadana`,urlPublica:`https://seguridadhumanaintegral.org/f/consulta-ciudadana`}},U={title:`Plataforma/Formularios públicos`,parameters:{layout:`fullscreen`,polis:{screen:!0}},beforeEach:()=>{let e=T();S.publico=async()=>structuredClone(H);let t=C.getState(),n=b.getState();return C.setState({formularios:[structuredClone(H)],respuestas:[]}),b.setState({sesion:null,cargando:!1}),()=>{e(),C.setState(t),b.setState(n)}},render:()=>(0,R.jsx)(E,{children:(0,R.jsx)(P,{slug:H.configuracion.slug,inicial:H})})},W={},G={globals:{theme:`dark`}},K={render:()=>(0,R.jsx)(`div`,{className:`w-80 max-w-full`,children:(0,R.jsx)(E,{children:(0,R.jsx)(P,{slug:H.configuracion.slug,inicial:H})})})},q={play:async({canvasElement:e})=>{let t=V(e);await B.type(t.getByLabelText(/Tu propuesta/),`Mejorar el alumbrado`),await B.click(t.getByRole(`button`,{name:`Enviar respuesta`})),await z(await t.findByText(`Respuesta recibida`)).toBeVisible(),z(C.getState().respuestas[0].respuestas.detalle).toBe(`Mejorar el alumbrado`)}},J={render:()=>(0,R.jsx)(E,{children:(0,R.jsx)(P,{slug:H.configuracion.slug,inicial:{...H,estado:`cerrado`}})})},Y={render:()=>(0,R.jsx)(`div`,{className:`max-w-xl p-4`,children:(0,R.jsx)(N,{form:H})}),play:async({canvasElement:e})=>{let t=V(e);z(t.getByRole(`link`,{name:`WhatsApp`})).toHaveAttribute(`href`,z.stringContaining(`wa.me`)),z(t.getByRole(`link`,{name:`Telegram`})).toHaveAttribute(`href`,z.stringContaining(`t.me/share/url`)),await B.click(t.getByRole(`button`,{name:`QR`})),await z(t.getByRole(`img`,{name:/Código QR/})).toBeVisible()}},X={render:()=>(0,R.jsx)(`div`,{className:`w-80 max-w-full p-4`,children:(0,R.jsx)(N,{form:H})})},Z={render:()=>(0,R.jsx)(`div`,{className:`p-4`,children:(0,R.jsx)(N,{form:{...H,estado:`borrador`}})})},Q=[`Publico`,`Oscuro`,`Movil`,`EnviarSinLogin`,`Cerrado`,`Compartir`,`CompartirMovil`,`CompartirBorrador`],W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  globals: {
    theme: "dark"
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-80 max-w-full">
      <QueryProvider>
        <FormularioPublicoPage slug={form.configuracion.slug} inicial={form} />
      </QueryProvider>
    </div>
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText(/Tu propuesta/), "Mejorar el alumbrado");
    await userEvent.click(c.getByRole("button", {
      name: "Enviar respuesta"
    }));
    await expect(await c.findByText("Respuesta recibida")).toBeVisible();
    expect(useFormulariosStore.getState().respuestas[0].respuestas.detalle).toBe("Mejorar el alumbrado");
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  render: () => <QueryProvider>
      <FormularioPublicoPage slug={form.configuracion.slug} inicial={{
      ...form,
      estado: "cerrado"
    }} />
    </QueryProvider>
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  render: () => <div className="max-w-xl p-4">
      <CompartirFormulario form={form} />
    </div>,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    expect(c.getByRole("link", {
      name: "WhatsApp"
    })).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(c.getByRole("link", {
      name: "Telegram"
    })).toHaveAttribute("href", expect.stringContaining("t.me/share/url"));
    await userEvent.click(c.getByRole("button", {
      name: "QR"
    }));
    await expect(c.getByRole("img", {
      name: /Código QR/
    })).toBeVisible();
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-80 max-w-full p-4">
      <CompartirFormulario form={form} />
    </div>
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  render: () => <div className="p-4">
      <CompartirFormulario form={{
      ...form,
      estado: "borrador"
    }} />
    </div>
}`,...Z.parameters?.docs?.source}}}})))()}$();export{J as Cerrado,Y as Compartir,Z as CompartirBorrador,X as CompartirMovil,q as EnviarSinLogin,K as Movil,G as Oscuro,W as Publico,Q as __namedExportsOrder,U as default};