import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{y as t}from"./iframe-DGFn0ebE.js";import{n,t as r}from"./formulario-runtime-CFiZDlrA.js";import{i,r as a}from"./formulario-CJ2NBTXj.js";import{n as o,r as s,t as c}from"./formularios.fixture-CBhjt4Te.js";import{n as l,s as u}from"./session-store-j34_iPDb.js";import{n as d,t as f}from"./formularios-store-CQFZqnIT.js";import{n as p,t as m}from"./formularios-mock-api-CgBWUs3K.js";import{n as h,t as g}from"./query-provider-_g-1Rm-2.js";import{n as _,t as v}from"./panel-store-Ce9azu2v.js";import{n as y,t as b}from"./panel-host-DXBO8ixr.js";var x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W;function G(){return(G=e((()=>{x=t(),s(),m(),h(),y(),v(),l(),f(),n(),i(),{expect:S,userEvent:C,within:w,waitFor:T}=__STORYBOOK_MODULE_TEST__,E=[`texto_corto`,`texto_largo`,`opcion_unica`,`opcion_multiple`,`lista_desplegable`,`likert`,`escala_lineal`,`fecha`,`hora`,`numero`,`carga_archivo`,`ubicacion_geografica`,`seccion`,`descripcion`],D={...a(),id:`tipos`,titulo:`Todos los tipos`,estado:`activo`,preguntas:E.map((e,t)=>({id:e,tipo:e,texto:`Ejemplo ${e}`,obligatoria:!1,orden:t,opciones:[{id:`a`,texto:`Opción A`},{id:`otro`,texto:`Otro`,esOtro:!0}],escalaMin:1,escalaMax:5,tiposArchivo:`imagen`})),configuracion:{...a().configuracion}},O={...a(),id:`condicional`,titulo:`Formulario condicional`,estado:`activo`,preguntas:[{id:`origen`,tipo:`opcion_unica`,texto:`¿Quieres detallar?`,obligatoria:!0,orden:0,opciones:[{id:`si`,texto:`Sí`},{id:`no`,texto:`No`}]},{id:`detalle`,tipo:`texto_largo`,texto:`Describe tu propuesta`,obligatoria:!0,orden:1,logica:[{preguntaOrigenId:`origen`,operador:`igual`,valor:`si`,accion:`mostrar`}]}]},k={title:`Plataforma/Formularios`,parameters:{layout:`fullscreen`,polis:{screen:!0}},beforeEach:()=>{let e=p(),t=d.getState();return d.setState({formularios:structuredClone(c).map(e=>({...e,origenDatos:`api`})),respuestas:structuredClone(o),previews:{}}),u.getState().limpiarSesion(),_.getState().closeAll(),()=>{e(),_.getState().closeAll(),d.setState(t),u.getState().limpiarSesion()}},render:()=>(0,x.jsx)(g,{children:(0,x.jsx)(b,{})})},A={beforeEach:()=>_.getState().openPanel(`formulario-editor`,{}),play:async({canvasElement:e})=>{let t=w(await w(e).findByRole(`dialog`,{},{timeout:1e4}));await C.type(t.getByLabelText(`Título del Formulario`),`Formulario creado en prueba`),await C.click(t.getByRole(`button`,{name:`Añadir Sección`})),await C.click(t.getByRole(`button`,{name:`Añadir Pregunta`})),await C.type(t.getByLabelText(`Enunciado (1)`),`¿Qué necesitas?`),await C.click(t.getByRole(`button`,{name:`Guardar Formulario`})),await T(()=>S(d.getState().formularios.some(e=>e.titulo===`Formulario creado en prueba`)).toBe(!0))}},j={beforeEach:()=>_.getState().openPanel(`formulario-editor`,{formularioId:`f1`}),play:async({canvasElement:e})=>{let t=w(await w(e).findByRole(`dialog`,{},{timeout:1e4}));await S(t.getByLabelText(`Título del Formulario`)).toHaveValue(`Diagnóstico de Seguridad en mi Barrio`),await S(t.getByLabelText(`Enunciado (5)`)).toHaveValue(`¿Has participado en alguna mesa comunitaria?`),await C.click(t.getByRole(`button`,{name:`Vista Previa`}));let n=w(await w(e).findByRole(`dialog`,{name:`Vista Previa`},{timeout:1e4}));await S(n.getByRole(`combobox`,{name:/En qué barrio/})).toBeVisible();let r=d.getState().respuestas.length;await C.keyboard(`{Escape}`),await S(d.getState().respuestas.length).toBe(r)}},M={...j,globals:{theme:`dark`}},N={render:()=>(0,x.jsxs)(`main`,{className:`mx-auto max-w-2xl p-6`,children:[(0,x.jsx)(`h1`,{className:`text-xl`,children:`Tipos de pregunta`}),(0,x.jsx)(`h2`,{className:`text-lg`,children:`Formulario de demostración`}),(0,x.jsx)(r,{form:D,preview:!0,enviar:async()=>{}})]})},P={...N,globals:{theme:`dark`}},F={beforeEach:()=>{d.setState({formularios:[O],respuestas:[]}),_.getState().openPanel(`formulario-respuesta`,{formularioId:O.id})},play:async({canvasElement:e})=>{let t=w(await w(e).findByRole(`dialog`,{},{timeout:1e4}));await S(t.queryByLabelText(/Describe tu propuesta/)).not.toBeInTheDocument(),await C.click(t.getByRole(`radio`,{name:`Sí`})),await C.type(t.getByLabelText(/Describe tu propuesta/),`Contenido que luego queda oculto`),await C.click(t.getByRole(`radio`,{name:`No`})),await S(t.queryByLabelText(/Describe tu propuesta/)).not.toBeInTheDocument(),await C.click(t.getByRole(`button`,{name:`Enviar respuestas`})),await t.findByText(`Respuesta recibida`),await S(d.getState().respuestas[0].respuestas).toEqual({origen:`no`})}},I={beforeEach:()=>_.getState().openPanel(`formulario-respuesta`,{formularioId:`f1`}),play:async({canvasElement:e})=>{let t=w(await w(e).findByRole(`dialog`,{},{timeout:1e4}));await C.click(t.getByRole(`combobox`,{name:/En qué barrio/})),await C.click(w(e.ownerDocument.body).getByRole(`option`,{name:`BOCAGRANDE`})),await C.click(t.getByRole(`radio`,{name:`Hurto`})),await C.click(t.getByRole(`button`,{name:`Siguiente`})),await C.click(t.getByRole(`radio`,{name:`4`})),await C.click(t.getByRole(`radio`,{name:`Sí`})),await C.click(t.getByRole(`button`,{name:`Enviar respuestas`})),await t.findByText(`Respuesta recibida`),await S(d.getState().formularios.find(e=>e.id===`f1`)?.respuestasCount).toBe(3)}},L={beforeEach:()=>{d.setState({formularios:[O],respuestas:[]}),_.getState().openPanel(`formulario-respuesta`,{formularioId:O.id})},play:async({canvasElement:e})=>{let t=w(await w(e).findByRole(`dialog`,{},{timeout:1e4}));await C.click(t.getByRole(`button`,{name:`Enviar respuestas`})),await t.findByText(`Esta pregunta es obligatoria.`),await S(d.getState().respuestas).toHaveLength(0)}},R={beforeEach:()=>{d.setState(e=>({formularios:e.formularios.map(e=>e.id===`f1`?{...e,estado:`cerrado`}:e)})),_.getState().openPanel(`formulario-respuesta`,{formularioId:`f1`})}},z={beforeEach:()=>{let e=d.getState().formularios[0];d.setState({formularios:[{...e,configuracion:{...e.configuracion,requiereAutenticacion:!0}}]}),_.getState().openPanel(`formulario-respuesta`,{formularioId:e.id})}},B={beforeEach:()=>_.getState().openPanel(`formulario-analitica`,{formularioId:`f1`}),play:async({canvasElement:e})=>{let t=w(await w(e).findByRole(`dialog`,{},{timeout:1e4}));await T(()=>S(t.getByRole(`button`,{name:`Exportar CSV`})).toBeEnabled()),await S(t.getByText(`Distribución de Respuestas por Pregunta`)).toBeVisible()}},V={...B,globals:{theme:`dark`}},H={beforeEach:()=>{d.setState({respuestas:[]}),_.getState().openPanel(`formulario-analitica`,{formularioId:`f1`})}},U={beforeEach:()=>_.getState().openPanel(`formularios`,{soloRespuesta:!0}),play:async({canvasElement:e})=>{let t=w(await w(e).findByRole(`dialog`,{},{timeout:1e4}));await S(t.queryByRole(`button`,{name:`Crear Formulario`})).not.toBeInTheDocument(),await S(t.getAllByRole(`button`,{name:`Responder`})).toHaveLength(2),await C.click(t.getAllByRole(`button`,{name:`Responder`})[0]),await S(await w(e).findByRole(`dialog`,{name:`Diagnóstico de Seguridad en mi Barrio`},{timeout:1e4})).toBeVisible()}},W=[`EditorNuevo`,`EdicionHidratada`,`EditorOscuro`,`TodosLosTipos`,`TodosLosTiposOscuro`,`Condicional`,`RespuestaConSecciones`,`ValidacionObligatoria`,`Cierre`,`RequiereSesion`,`Analitica`,`AnaliticaOscura`,`AnaliticaVacia`,`CatalogoCiudadano`],A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("formulario-editor", {}),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await userEvent.type(panel.getByLabelText("Título del Formulario"), "Formulario creado en prueba");
    await userEvent.click(panel.getByRole("button", {
      name: "Añadir Sección"
    }));
    await userEvent.click(panel.getByRole("button", {
      name: "Añadir Pregunta"
    }));
    await userEvent.type(panel.getByLabelText("Enunciado (1)"), "¿Qué necesitas?");
    await userEvent.click(panel.getByRole("button", {
      name: "Guardar Formulario"
    }));
    await waitFor(() => expect(useFormulariosStore.getState().formularios.some(f => f.titulo === "Formulario creado en prueba")).toBe(true));
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("formulario-editor", {
    formularioId: "f1"
  }),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await expect(panel.getByLabelText("Título del Formulario")).toHaveValue("Diagnóstico de Seguridad en mi Barrio");
    await expect(panel.getByLabelText("Enunciado (5)")).toHaveValue("¿Has participado en alguna mesa comunitaria?");
    await userEvent.click(panel.getByRole("button", {
      name: "Vista Previa"
    }));
    const preview = within(await within(canvasElement).findByRole("dialog", {
      name: "Vista Previa"
    }, {
      timeout: 10000
    }));
    await expect(preview.getByRole("combobox", {
      name: /En qué barrio/
    })).toBeVisible();
    const antes = useFormulariosStore.getState().respuestas.length;
    await userEvent.keyboard("{Escape}");
    await expect(useFormulariosStore.getState().respuestas.length).toBe(antes);
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  ...EdicionHidratada,
  globals: {
    theme: "dark"
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  render: () => <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl">Tipos de pregunta</h1>
      <h2 className="text-lg">Formulario de demostración</h2>
      <FormularioRuntime form={completa} preview enviar={async () => {}} />
    </main>
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  ...TodosLosTipos,
  globals: {
    theme: "dark"
  }
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useFormulariosStore.setState({
      formularios: [condicional],
      respuestas: []
    });
    usePanelStore.getState().openPanel("formulario-respuesta", {
      formularioId: condicional.id
    });
  },
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await expect(panel.queryByLabelText(/Describe tu propuesta/)).not.toBeInTheDocument();
    await userEvent.click(panel.getByRole("radio", {
      name: "Sí"
    }));
    await userEvent.type(panel.getByLabelText(/Describe tu propuesta/), "Contenido que luego queda oculto");
    await userEvent.click(panel.getByRole("radio", {
      name: "No"
    }));
    await expect(panel.queryByLabelText(/Describe tu propuesta/)).not.toBeInTheDocument();
    await userEvent.click(panel.getByRole("button", {
      name: "Enviar respuestas"
    }));
    await panel.findByText("Respuesta recibida");
    await expect(useFormulariosStore.getState().respuestas[0].respuestas).toEqual({
      origen: "no"
    });
  }
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("formulario-respuesta", {
    formularioId: "f1"
  }),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await userEvent.click(panel.getByRole("combobox", {
      name: /En qué barrio/
    }));
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole("option", {
      name: "BOCAGRANDE"
    }));
    await userEvent.click(panel.getByRole("radio", {
      name: "Hurto"
    }));
    await userEvent.click(panel.getByRole("button", {
      name: "Siguiente"
    }));
    await userEvent.click(panel.getByRole("radio", {
      name: "4"
    }));
    await userEvent.click(panel.getByRole("radio", {
      name: "Sí"
    }));
    await userEvent.click(panel.getByRole("button", {
      name: "Enviar respuestas"
    }));
    await panel.findByText("Respuesta recibida");
    await expect(useFormulariosStore.getState().formularios.find(f => f.id === "f1")?.respuestasCount).toBe(3);
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useFormulariosStore.setState({
      formularios: [condicional],
      respuestas: []
    });
    usePanelStore.getState().openPanel("formulario-respuesta", {
      formularioId: condicional.id
    });
  },
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await userEvent.click(panel.getByRole("button", {
      name: "Enviar respuestas"
    }));
    await panel.findByText("Esta pregunta es obligatoria.");
    await expect(useFormulariosStore.getState().respuestas).toHaveLength(0);
  }
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useFormulariosStore.setState(s => ({
      formularios: s.formularios.map(f => f.id === "f1" ? {
        ...f,
        estado: "cerrado"
      } : f)
    }));
    usePanelStore.getState().openPanel("formulario-respuesta", {
      formularioId: "f1"
    });
  }
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    const f = useFormulariosStore.getState().formularios[0];
    useFormulariosStore.setState({
      formularios: [{
        ...f,
        configuracion: {
          ...f.configuracion,
          requiereAutenticacion: true
        }
      }]
    });
    usePanelStore.getState().openPanel("formulario-respuesta", {
      formularioId: f.id
    });
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("formulario-analitica", {
    formularioId: "f1"
  }),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await waitFor(() => expect(panel.getByRole("button", {
      name: "Exportar CSV"
    })).toBeEnabled());
    await expect(panel.getByText("Distribución de Respuestas por Pregunta")).toBeVisible();
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  ...Analitica,
  globals: {
    theme: "dark"
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useFormulariosStore.setState({
      respuestas: []
    });
    usePanelStore.getState().openPanel("formulario-analitica", {
      formularioId: "f1"
    });
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  beforeEach: () => usePanelStore.getState().openPanel("formularios", {
    soloRespuesta: true
  }),
  play: async ({
    canvasElement
  }) => {
    const panel = within(await within(canvasElement).findByRole("dialog", {}, {
      timeout: 10000
    }));
    await expect(panel.queryByRole("button", {
      name: "Crear Formulario"
    })).not.toBeInTheDocument();
    await expect(panel.getAllByRole("button", {
      name: "Responder"
    })).toHaveLength(2);
    await userEvent.click(panel.getAllByRole("button", {
      name: "Responder"
    })[0]);
    await expect(await within(canvasElement).findByRole("dialog", {
      name: "Diagnóstico de Seguridad en mi Barrio"
    }, {
      timeout: 10000
    })).toBeVisible();
  }
}`,...U.parameters?.docs?.source}}}})))()}G();export{B as Analitica,V as AnaliticaOscura,H as AnaliticaVacia,U as CatalogoCiudadano,R as Cierre,F as Condicional,j as EdicionHidratada,A as EditorNuevo,M as EditorOscuro,z as RequiereSesion,I as RespuestaConSecciones,N as TodosLosTipos,P as TodosLosTiposOscuro,L as ValidacionObligatoria,W as __namedExportsOrder,k as default};