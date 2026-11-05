import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{y as n}from"./iframe-DGFn0ebE.js";import{n as r,t as i}from"./formulario-runtime-CFiZDlrA.js";import{n as a,t as o}from"./ubicacion-pregunta-CeV2wMR5.js";import{n as s,r as c}from"./ubicacion-geografica-eYyW7yrN.js";import{f as l,i as u,l as d,s as f,u as p}from"./formulario-engine-9f1BJDYM.js";import{i as m,r as h}from"./formulario-CJ2NBTXj.js";import{n as g,r as _,t as v}from"./formularios.fixture-CBhjt4Te.js";import{a as y,i as b,n as x,o as S,r as C}from"./formulario-url-C--phEIk.js";import{n as w,t as T}from"./react-CMSMJo6i.js";var E,D,O;function k(){return(k=e((()=>{_(),C(),y(),w(),u(),E=()=>({formularios:structuredClone(v),respuestas:structuredClone(g),previews:{}}),D=e=>{let t=p(e);if(t.length)throw Error(t.join(` `))},O=T((e,t)=>({...E(),identidadAnonima:`anonimo-demo`,crearFormulario:t=>{let n=new Date().toISOString(),r=x(t.titulo),i={...structuredClone(t),configuracion:{...structuredClone(t.configuracion),slug:r,urlPublica:b(r)},origenDatos:`demo`,id:S(),respuestasCount:0,creadoEn:n,actualizadoEn:n};return D(i),e(e=>({formularios:[...e.formularios,i]})),i},actualizarFormulario:(n,r)=>{let i=t().formularios.find(e=>e.id===n);if(!i)throw Error(`Formulario no encontrado.`);let a={...i,...structuredClone(r),id:i.id,configuracion:{...i.configuracion,...r.configuracion,slug:i.configuracion.slug,urlPublica:i.configuracion.urlPublica},creadoEn:i.creadoEn,respuestasCount:i.respuestasCount,actualizadoEn:new Date().toISOString()};D(a),e(e=>({formularios:e.formularios.map(e=>e.id===n?a:e)}))},eliminarFormulario:t=>e(e=>({formularios:e.formularios.filter(e=>e.id!==t),respuestas:e.respuestas.filter(e=>e.formularioId!==t)})),enviarRespuesta:n=>{let r=t(),i=r.formularios.find(e=>e.id===n.formularioId);if(!i)throw Error(`Formulario no encontrado.`);let a=r.respuestas.find(e=>e.formularioId===i.id&&e.sesionId===n.sesionId),o=f(i);if(o&&!(a&&i.configuracion.permitirEdicion&&o===`Se alcanzó el límite de respuestas.`))throw Error(o);if(i.configuracion.requiereAutenticacion&&!n.autenticado)throw Error(`Inicia sesión para responder.`);if(a&&!i.configuracion.permitirEdicion)throw Error(`Ya respondiste este formulario en esta sesión.`);let s=l(i,n.respuestas);if(Object.keys(s).length)throw Error(Object.values(s).join(` `));let c={id:a?.id??S(),formularioId:i.id,sesionId:n.sesionId,respuestas:structuredClone(d(i,n.respuestas)),enfoqueDiferencial:n.enfoqueDiferencial,enviadoEn:new Date().toISOString()};e(e=>({respuestas:a?e.respuestas.map(e=>e.id===a.id?c:e):[...e.respuestas,c],formularios:e.formularios.map(e=>e.id===i.id?{...e,respuestasCount:e.respuestasCount+ +!a}:e)}))},ponerPreview:(t,n)=>e(e=>({previews:{...e.previews,[t]:structuredClone(n)}})),reiniciarDemo:()=>e({...E(),identidadAnonima:`anonimo-demo`})}))})))()}function A(){let[e,t]=(0,N.useState)(``);return(0,M.jsx)(o,{pregunta:R.preguntas[1],valor:e,cambiar:t})}function j(e){let t=Object.getOwnPropertyDescriptor(navigator,`geolocation`);return Object.defineProperty(navigator,"geolocation",{configurable:!0,value:{getCurrentPosition:(t,n)=>{setTimeout(()=>{e?n({code:1,message:`Permiso denegado`,PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3}):t({coords:{latitude:10.391,longitude:-75.5144,accuracy:12}})},50)}}}),()=>{t?Object.defineProperty(navigator,"geolocation",t):Reflect.deleteProperty(navigator,`geolocation`)}}var M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y;function X(){return(X=e((()=>{M=n(),N=t(),r(),a(),m(),s(),k(),{expect:P,userEvent:F,within:I,waitFor:L}=__STORYBOOK_MODULE_TEST__,R={...h(),id:`geografico`,titulo:`Reporta un punto de Cartagena`,estado:`activo`,preguntas:[{id:`detalle`,texto:`Describe lo que ocurre`,tipo:`texto_corto`,obligatoria:!0,orden:0},{id:`punto`,texto:`¿Dónde ocurre?`,tipo:`ubicacion_geografica`,obligatoria:!0,orden:1}]},z={title:`Plataforma/Formularios geográficos`,parameters:{layout:`fullscreen`,polis:{screen:!0}},beforeEach:()=>{let e=O.getState();return O.setState({formularios:[structuredClone(R)],respuestas:[]}),()=>O.setState(e)},render:()=>(0,M.jsx)(`div`,{className:`min-w-0 p-4`,children:(0,M.jsx)(i,{form:R,enviar:async e=>{O.getState().enviarRespuesta({formularioId:R.id,respuestas:e})}})})},B={play:async({canvasElement:e})=>{let t=I(e);await F.type(t.getByLabelText(`Describe lo que ocurre`,{exact:!1}),`Falta alumbrado junto al parque`),await F.type(await t.findByLabelText(`Latitud`,{exact:!0}),`10.391`),await F.type(t.getByLabelText(`Longitud`,{exact:!0}),`-75.5144`),await F.type(t.getByLabelText(`Referencia del lugar (opcional)`),`Parque`),await F.click(t.getByRole(`button`,{name:`Enviar respuestas`})),await L(()=>{let e=O.getState().respuestas[0];P(e.respuestas.detalle).toBe(`Falta alumbrado junto al parque`),P(c(e.respuestas.punto)?.coordinates).toEqual([-75.5144,10.391])})}},V={render:()=>(0,M.jsx)(`div`,{className:`p-4`,children:(0,M.jsx)(A,{})}),play:async({canvasElement:e})=>{let t=I(e);await F.click(await t.findByRole(`button`,{name:`Marcar centro del mapa`})),await P(t.getByLabelText(`Latitud`,{exact:!0})).toHaveValue(10.391),await P(t.getByLabelText(`Longitud`,{exact:!0})).toHaveValue(-75.4794),await F.click(t.getByRole(`button`,{name:`Quitar punto`})),await P(t.getByLabelText(`Latitud`,{exact:!0})).toHaveValue(null),await P(t.getByRole(`status`)).toHaveTextContent(`No hay un punto válido seleccionado.`)}},H={play:async({canvasElement:e})=>{let t=I(e);await F.type(t.getByLabelText(`Describe lo que ocurre`,{exact:!1}),`Situación del barrio`),await F.click(t.getByRole(`button`,{name:`Enviar respuestas`})),await P(await t.findByText(`Esta pregunta es obligatoria.`)).toBeVisible(),P(O.getState().respuestas).toHaveLength(0)}},U={play:async({canvasElement:e})=>{let t=I(e);await F.type(t.getByLabelText(`Describe lo que ocurre`,{exact:!1}),`Situación del barrio`),await F.type(await t.findByLabelText(`Latitud`,{exact:!0}),`95`),await F.type(t.getByLabelText(`Longitud`,{exact:!0}),`-75.5`),await F.click(t.getByRole(`button`,{name:`Enviar respuestas`})),await P(await t.findByText(`Selecciona un punto válido o introduce latitud y longitud válidas.`)).toBeVisible(),P(O.getState().respuestas).toHaveLength(0)}},W={render:()=>(0,M.jsx)(`div`,{className:`p-4`,children:(0,M.jsx)(i,{form:R,preview:!0,enviar:async()=>{throw Error(`La vista previa no envía`)}})})},G={globals:{theme:`dark`}},K={render:()=>(0,M.jsx)(`div`,{className:`w-80 max-w-full p-4`,children:(0,M.jsx)(A,{})}),play:async({canvasElement:e})=>{await I(e).findByLabelText(`Latitud`,{exact:!0});let t=e.querySelector(`section`);P(t).not.toBeNull(),P(t.scrollWidth).toBeLessThanOrEqual(t.clientWidth)}},q={beforeEach:()=>j(!1),play:async({canvasElement:e})=>{let t=I(e);await F.type(t.getByLabelText(`Describe lo que ocurre`,{exact:!1}),`Reporte con GPS`),await F.click(await t.findByRole(`button`,{name:`Usar mi ubicación`})),await L(()=>P(t.getByLabelText(`Latitud`,{exact:!0})).toHaveValue(10.391)),await F.click(t.getByRole(`button`,{name:`Enviar respuestas`})),await L(()=>P(c(O.getState().respuestas[0]?.respuestas.punto)).toMatchObject({origen:`gps`,precisionMetros:12}))}},J={beforeEach:()=>j(!0),render:()=>(0,M.jsx)(`div`,{className:`p-4`,children:(0,M.jsx)(A,{})}),play:async({canvasElement:e})=>{let t=I(e);await F.click(await t.findByRole(`button`,{name:`Usar mi ubicación`})),await P(await t.findByText(/No se pudo obtener tu ubicación/)).toBeVisible(),await P(t.getByLabelText(`Latitud`,{exact:!0})).toHaveValue(null)}},Y=[`Coordenadas`,`MapaYLimpiar`,`Obligatorio`,`PuntoInvalido`,`VistaPrevia`,`Oscuro`,`Movil`,`UbicacionDispositivo`,`GpsDenegado`],B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText("Describe lo que ocurre", {
      exact: false
    }), "Falta alumbrado junto al parque");
    await userEvent.type(await c.findByLabelText("Latitud", {
      exact: true
    }), "10.391");
    await userEvent.type(c.getByLabelText("Longitud", {
      exact: true
    }), "-75.5144");
    await userEvent.type(c.getByLabelText("Referencia del lugar (opcional)"), "Parque");
    await userEvent.click(c.getByRole("button", {
      name: "Enviar respuestas"
    }));
    await waitFor(() => {
      const r = useFormulariosStore.getState().respuestas[0];
      expect(r.respuestas.detalle).toBe("Falta alumbrado junto al parque");
      expect(leerPunto(r.respuestas.punto)?.coordinates).toEqual([-75.5144, 10.391]);
    });
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  render: () => <div className="p-4">
      <Punto />
    </div>,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole("button", {
      name: "Marcar centro del mapa"
    }));
    await expect(c.getByLabelText("Latitud", {
      exact: true
    })).toHaveValue(10.391);
    await expect(c.getByLabelText("Longitud", {
      exact: true
    })).toHaveValue(-75.4794);
    await userEvent.click(c.getByRole("button", {
      name: "Quitar punto"
    }));
    await expect(c.getByLabelText("Latitud", {
      exact: true
    })).toHaveValue(null);
    await expect(c.getByRole("status")).toHaveTextContent("No hay un punto válido seleccionado.");
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText("Describe lo que ocurre", {
      exact: false
    }), "Situación del barrio");
    await userEvent.click(c.getByRole("button", {
      name: "Enviar respuestas"
    }));
    await expect(await c.findByText("Esta pregunta es obligatoria.")).toBeVisible();
    expect(useFormulariosStore.getState().respuestas).toHaveLength(0);
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText("Describe lo que ocurre", {
      exact: false
    }), "Situación del barrio");
    await userEvent.type(await c.findByLabelText("Latitud", {
      exact: true
    }), "95");
    await userEvent.type(c.getByLabelText("Longitud", {
      exact: true
    }), "-75.5");
    await userEvent.click(c.getByRole("button", {
      name: "Enviar respuestas"
    }));
    await expect(await c.findByText("Selecciona un punto válido o introduce latitud y longitud válidas.")).toBeVisible();
    expect(useFormulariosStore.getState().respuestas).toHaveLength(0);
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  render: () => <div className="p-4">
      <FormularioRuntime form={form} preview enviar={async () => {
      throw Error("La vista previa no envía");
    }} />
    </div>
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  globals: {
    theme: "dark"
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-80 max-w-full p-4">
      <Punto />
    </div>,
  play: async ({
    canvasElement
  }) => {
    await within(canvasElement).findByLabelText("Latitud", {
      exact: true
    });
    const contenedor = canvasElement.querySelector("section");
    expect(contenedor).not.toBeNull();
    expect(contenedor!.scrollWidth).toBeLessThanOrEqual(contenedor!.clientWidth);
  }
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  beforeEach: () => simularGps(false),
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText("Describe lo que ocurre", {
      exact: false
    }), "Reporte con GPS");
    await userEvent.click(await c.findByRole("button", {
      name: "Usar mi ubicación"
    }));
    await waitFor(() => expect(c.getByLabelText("Latitud", {
      exact: true
    })).toHaveValue(10.391));
    await userEvent.click(c.getByRole("button", {
      name: "Enviar respuestas"
    }));
    await waitFor(() => expect(leerPunto(useFormulariosStore.getState().respuestas[0]?.respuestas.punto)).toMatchObject({
      origen: "gps",
      precisionMetros: 12
    }));
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  beforeEach: () => simularGps(true),
  render: () => <div className="p-4">
      <Punto />
    </div>,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.click(await c.findByRole("button", {
      name: "Usar mi ubicación"
    }));
    await expect(await c.findByText(/No se pudo obtener tu ubicación/)).toBeVisible();
    await expect(c.getByLabelText("Latitud", {
      exact: true
    })).toHaveValue(null);
  }
}`,...J.parameters?.docs?.source}}}})))()}X();export{B as Coordenadas,J as GpsDenegado,V as MapaYLimpiar,K as Movil,H as Obligatorio,G as Oscuro,U as PuntoInvalido,q as UbicacionDispositivo,W as VistaPrevia,Y as __namedExportsOrder,z as default};