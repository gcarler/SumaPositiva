import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{y as t}from"./iframe-DGFn0ebE.js";import{n,s as r}from"./session-store-j34_iPDb.js";import{n as i,t as a}from"./query-provider-_g-1Rm-2.js";import{n as o,t as s}from"./panel-store-Ce9azu2v.js";import{n as c,t as l}from"./panel-host-DXBO8ixr.js";function u(){let e=window.fetch;return window.fetch=async(t,n)=>{let r=new URL(typeof t==`string`?t:t instanceof URL?t.href:t.url,window.location.origin);return r.pathname===`/api/v1/participacion/consolidado`?Response.json({gran_total_participantes_distrital:12451,participantes_unicos_identificados:9877,total_canal_web:5210,total_canal_mesas:6230,total_canal_escenarios:1011,porcentaje_canal_web:41.84,porcentaje_canal_mesas:50.03,porcentaje_canal_escenarios:8.12,desglose_territorial_agregado:[{territorio:`La Popa`,codigo:`LPO`,total_participacion:850},{territorio:`San Diego`,codigo:`SDI`,total_participacion:412}],fecha_corte:new Date().toISOString()}):r.pathname===`/api/v1/participacion/canal-web`?Response.json({total_aportes:842,total_apoyos:1963,total_respuestas_formularios:512,participantes_unicos_web:1480,por_linea_estrategica:[{linea_id:`l1`,codigo:`L1`,titulo:`Convivencia y seguridad humana`,dimension_codigo:`ds`,dimension_nombre:`Derechos sociales`,total_aportes:312,total_apoyos:812}],por_dimension:[{dimension_id:`d1`,codigo:`ds`,nombre:`Derechos sociales`,total_aportes:418}],por_territorio:[{territorio_id:`t1`,codigo:`LPO`,nombre:`La Popa`,total_aportes:128}],porLineaEstrategica:{L1:312},porDimension:{ds:418}}):r.pathname===`/api/v1/participacion/canal-mesas`?Response.json({total_mesas_principales:15,total_submesas:42,total_participantes:6230,participantes_unicos_mesas:4100,total_actas_cerradas:12,jerarquia_mesas:[{id:`m1`,codigo:`M-01`,nombre:`Mesa de seguridad La Popa`,path:`La Popa`,tipo_mesa:`corregimiento`,asistentes_conteo:320,acta_firmada:!1,submesas:[{id:`m1-s1`,codigo:`M-01-1`,nombre:`Barrio Olaya Herrera`,path:`La Popa / Olaya Herrera`,tipo_mesa:`barrio`,asistentes_conteo:80}],territorio:`LPO`,territorio_nombre:`La Popa`}],porMesa:{"M-01":320}}):r.pathname===`/api/v1/participacion/escenarios-especiales`?Response.json([{id:`e1`,codigo_unico:`ESC-001`,nombre:`Foro Gremial de Comerciantes`,tipo_escenario:`FORO_GREMIAL`,territorio_id:`t1`,territorio_nombre:`La Popa`,fecha:`2026-10-02`,lugar:`Plaza de la Aduana`,entidad_convocante:`Cámara de Comercio de Cartagena`,total_asistentes:145,desglose_poblacional:{hombres:62,mujeres:78,otros:5},sintesis_acuerdos:null,estado:`REALIZADO`}]):e(t,n)},()=>{window.fetch=e}}var d,f,p,m,h,g,_,v,y,b,x,S,C,w;function T(){return(T=e((()=>{d=t(),i(),c(),s(),n(),{expect:f,userEvent:p,waitFor:m,within:h}=__STORYBOOK_MODULE_TEST__,g={id:`01900000-0000-7000-8000-000000000001`,nombres:`Ana`,apellidos:`Torres`,correo:`ana@example.org`,codigo_rol:`funcionario`,activo:!0,correo_verificado_en:null,nivel_identidad:`declarada`,permisos:[`usuarios:leer`,`formularios:leer`,`auditoria:leer`]},_={title:`Plataforma/Participación`,parameters:{layout:`fullscreen`,polis:{screen:!0}},beforeEach:()=>{let e=u();return r.getState().iniciarSesion({usuario:{...g,codigo_rol:`funcionario`},rol:`funcionario`,permisos:g.permisos,nivel_identidad:`declarada`,token_acceso:`token-storybook`,expira_en:`2099-01-01T00:00:00Z`}),o.getState().closeAll(),()=>{e(),o.getState().closeAll(),r.getState().limpiarSesion()}},render:()=>(0,d.jsx)(a,{children:(0,d.jsx)(l,{})})},v={beforeEach:()=>o.getState().openPanel(`participacion-multicanal`,{}),play:async({canvasElement:e})=>{let t=h(await h(e).findByRole(`dialog`,{},{timeout:1e4}));await f(t.getByRole(`tablist`)).toBeVisible();let n=t.getByRole(`tab`,{name:`Consolidado`}),r=t.getByRole(`tab`,{name:`Canal Web`});await m(async()=>{await f(t.getByText(/12[.,]?451/)).toBeVisible()}),n.focus(),await p.keyboard(`{ArrowRight}`),await m(()=>f(r.getAttribute(`aria-selected`)).toBe(`true`)),await f(t.getByText(/Convivencia y seguridad humana/i)).toBeVisible()}},y={...v,globals:{theme:`dark`}},b={beforeEach:()=>o.getState().openPanel(`participacion-multicanal`,{canalInicial:`mesas`}),play:async({canvasElement:e})=>{let t=h(await h(e).findByRole(`dialog`,{},{timeout:1e4}));await m(()=>f(t.getByRole(`tab`,{selected:!0}).textContent||``).toMatch(/mesa/i)),await f(t.getByText(/Mesa de seguridad La Popa/i)).toBeVisible(),await f(t.getByText(/Olaya Herrera/i)).toBeVisible()}},x={...b,globals:{theme:`dark`}},S={beforeEach:()=>o.getState().openPanel(`participacion-multicanal`,{canalInicial:`escenarios`}),play:async({canvasElement:e})=>{let t=h(await h(e).findByRole(`dialog`,{},{timeout:1e4}));await f(t.getByText(/Foro Gremial de Comerciantes/i)).toBeVisible(),await f(t.getByText(/Cámara de Comercio/i)).toBeVisible()}},C={...S,globals:{theme:`dark`}},w=[`MulticanalConsolidado`,`MulticanalConsolidadoOscuro`,`MesasDesglosadas`,`MesasDesglosadasOscuro`,`Escenarios`,`EscenariosOscuro`],v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("participacion-multicanal", {}),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    /* El tablist es operable por teclado (APG): flechas mueven el valor activo. */
    await expect(panel.getByRole("tablist")).toBeVisible();
    const tabConsolidado = panel.getByRole("tab", {
      name: "Consolidado"
    });
    const tabWeb = panel.getByRole("tab", {
      name: "Canal Web"
    });
    /* El panel consume los datos simulados: cifras del consolidado visibles. */
    await waitFor(async () => {
      await expect(panel.getByText(/12[.,]?451/)).toBeVisible();
    });
    tabConsolidado.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(tabWeb.getAttribute("aria-selected")).toBe("true"));
    /* El canal web llega desde el mock: al menos una línea estratégica. */
    await expect(panel.getByText(/Convivencia y seguridad humana/i)).toBeVisible();
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  ...MulticanalConsolidado,
  globals: {
    theme: "dark"
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("participacion-multicanal", {
    canalInicial: "mesas"
  }),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await waitFor(() => expect(panel.getByRole("tab", {
      selected: true
    }).textContent || "").toMatch(/mesa/i));
    await expect(panel.getByText(/Mesa de seguridad La Popa/i)).toBeVisible();
    await expect(panel.getByText(/Olaya Herrera/i)).toBeVisible();
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  ...MesasDesglosadas,
  globals: {
    theme: "dark"
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("participacion-multicanal", {
    canalInicial: "escenarios"
  }),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await expect(panel.getByText(/Foro Gremial de Comerciantes/i)).toBeVisible();
    await expect(panel.getByText(/Cámara de Comercio/i)).toBeVisible();
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  ...Escenarios,
  globals: {
    theme: "dark"
  }
}`,...C.parameters?.docs?.source}}}})))()}T();export{S as Escenarios,C as EscenariosOscuro,b as MesasDesglosadas,x as MesasDesglosadasOscuro,v as MulticanalConsolidado,y as MulticanalConsolidadoOscuro,w as __namedExportsOrder,_ as default};