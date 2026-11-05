import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{y as t}from"./iframe-DGFn0ebE.js";import{n,s as r}from"./session-store-j34_iPDb.js";import{n as i,t as a}from"./QueryClientProvider-BgR4BpIT.js";import{n as o,t as s}from"./queryClient-BTYsqCcE.js";import{n as c,t as l}from"./panel-store-Ce9azu2v.js";import{n as u,t as d}from"./panel-host-DXBO8ixr.js";import{a as f,s as p}from"./dimensiones-meta-DbkuH1WY.js";import{i as m,n as h,r as g,t as _}from"./arquitectura-politica-CcRWpqD8.js";import{n as v,t as y}from"./linea-editor-panel-DnGpobK9.js";var b,x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I,L,R,z;function B(){return(B=e((()=>{b=t(),u(),l(),o(),i(),h(),v(),f(),g(),n(),{fn:x,expect:S,userEvent:C,within:w,waitFor:T}=__STORYBOOK_MODULE_TEST__,E={...p},D=[`economica`,`alimentaria`,`salud`,`ambiental`,`personal`,`comunitaria`,`politica`].map((e,t)=>({id:`01900000-0000-7000-8000-00000000000${t+1}`,codigo:e,nombre:`Seguridad ${e}`,activa:!0})),O=[{id:`01900000-0000-7000-8000-000000000008`,codigo:`FORMULACION`,nombre:`Formulación`}],k={id:`01900000-0000-7000-8000-000000000009`,codigo:`LE-04`,titulo:`Entornos seguros`,descripcion:`Recuperar entornos barriales`,fase_id:O[0].id,dimension_id:D[3].id,problema_abordado:`Entornos deteriorados`,objetivo_especifico:`Mejorar el entorno`,entidad_lider:`Secretaría de Planeación`,fuentes_financiacion:[`FONSET`],costo_estimado:`1000000`,activa:!0,sublineas:[{codigo:`LE-04.1`,titulo:`Iluminación barrial`,descripcion:`Proyecto de iluminación`,meta_cuatrienal:`100 puntos`,indicador_nombre:`Puntos iluminados`,actor_coresponsable:`Infraestructura`}]},A={title:`POLIS/Plataforma/Líneas estratégicas`,parameters:{layout:`fullscreen`,nextjs:{appDirectory:!0,navigation:{pathname:`/plataforma/contenido`}},a11y:{test:`error`}},beforeEach:()=>{let e=r.getState();return c.getState().closeAll(),Object.assign(p,{listar:x().mockResolvedValue([structuredClone(k)]),dimensiones:x().mockResolvedValue(D),fases:x().mockResolvedValue(O),guardar:x().mockResolvedValue(k),eliminar:x().mockRejectedValue(Error(`La línea tiene registros vinculados`))}),r.setState({cargando:!1,errorSesion:null,sesion:{modo:`identidad`,rol:`administrador_identidades`,permisos:[`politicas:gestionar`],sesionId:`qa`,usuarioId:`01900000-0000-7000-8000-000000000010`,token:`qa`,expiraEn:new Date(Date.now()+36e5).toISOString(),desde:new Date().toISOString()}}),()=>{Object.assign(p,E),c.getState().closeAll(),r.setState(e)}},decorators:[e=>(0,b.jsx)(a,{client:new s({defaultOptions:{queries:{retry:!1}}}),children:(0,b.jsx)(e,{})})]},j={render:()=>(0,b.jsx)(_,{}),play:async({canvasElement:e})=>{let t=w(e);await S(await t.findByText(`Seguridad politica`)).toBeVisible(),await C.click(await t.findByRole(`button`,{name:/LE-04 · Entornos/})),await S(await t.findByText(`Iluminación barrial`)).toBeVisible(),await S(t.getByText(`100 puntos`)).toBeVisible(),await C.click(t.getByRole(`button`,{name:`Eliminar LE-04`})),await S(t.getByRole(`button`,{name:`Confirmar eliminación`})).toBeVisible(),await C.click(t.getByRole(`button`,{name:`Confirmar eliminación`})),await T(()=>S(p.eliminar).toHaveBeenCalledWith(k.id)),await S(t.getByText(`Iluminación barrial`)).toBeVisible(),await S(m(D,[{...k,titulo:`=1+1`}])).toContain(`'=1+1`)}},M={render:()=>(0,b.jsx)(y,{entryKey:`qa-linea`,lineaId:k.id}),play:async({canvasElement:e})=>{let t=w(e);await S(await t.findByRole(`textbox`,{name:`Título`})).toHaveValue(k.titulo),await C.click(t.getByRole(`button`,{name:`Agregar sublínea`})),await S(t.getAllByRole(`textbox`,{name:`Código hijo`})[1]).toHaveValue(`LE-04.2`),await C.type(t.getAllByRole(`textbox`,{name:`Título de la intervención`})[1],`Recuperar parques`),await C.click(t.getByRole(`button`,{name:`Guardar línea estratégica`})),await T(()=>S(p.guardar).toHaveBeenCalled())}},N={beforeEach:()=>{r.setState({sesion:{modo:`identidad`,rol:`auditor_forense`,permisos:[],sesionId:`auditor`,desde:new Date().toISOString()}})},render:()=>(0,b.jsx)(_,{}),play:async({canvasElement:e})=>{let t=w(e);await S(await t.findByText(`Seguridad politica`)).toBeVisible(),await C.click(t.getByRole(`button`,{name:/LE-04 · Entornos/})),await S(t.queryByRole(`button`,{name:`Editar LE-04`})).not.toBeInTheDocument(),await S(t.queryByRole(`button`,{name:`Nueva Línea Estratégica`})).not.toBeInTheDocument()}},P={parameters:{viewport:{options:{movil:{name:`320px`,styles:{width:`320px`,height:`740px`}}}},viewportMode:`movil`},render:()=>(0,b.jsx)(`div`,{style:{width:320,maxWidth:`100%`},children:(0,b.jsx)(_,{})})},F={beforeEach:()=>{p.listar=x().mockRejectedValue(Error(`API no disponible`))},render:()=>(0,b.jsx)(_,{}),play:async({canvasElement:e})=>{let t=w(e);await S(await t.findByText(`API no disponible`)).toBeVisible(),await S(t.getByRole(`button`,{name:`Reintentar`})).toBeVisible()}},I={render:()=>(0,b.jsx)(`div`,{className:`dark`,style:{width:320,maxWidth:`100%`},children:(0,b.jsx)(y,{entryKey:`movil`,lineaId:k.id})}),play:async({canvasElement:e})=>{await w(e).findByRole(`textbox`,{name:`Título`});let t=e.firstElementChild;await S(t.scrollWidth).toBeLessThanOrEqual(320)}},L={...I,render:()=>(0,b.jsx)(`div`,{style:{width:320,maxWidth:`100%`},children:(0,b.jsx)(y,{entryKey:`movil`,lineaId:k.id})})},R={render:()=>(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(`div`,{id:`polis-application`,children:(0,b.jsx)(_,{})}),(0,b.jsx)(d,{})]}),play:async({canvasElement:e})=>{let t=w(e),n=await t.findByRole(`button`,{name:`Nueva Línea Estratégica`});await C.click(n);let r=await t.findByRole(`dialog`,{name:`Nueva línea estratégica`},{timeout:1e4});await T(()=>S(r).toHaveFocus()),await C.tab(),await S(r.contains(document.activeElement)).toBe(!0),await C.keyboard(`{Escape}`),await T(()=>S(t.queryByRole(`dialog`)).not.toBeInTheDocument()),await T(()=>S(n).toHaveFocus())}},z=[`Jerarquia`,`Editor`,`Auditor`,`Movil`,`ErrorCarga`,`EditorMovilOscuro`,`EditorMovilClaro`,`NavegacionPanel`],j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => <ArquitecturaPolitica />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("Seguridad politica")).toBeVisible();
    await userEvent.click(await c.findByRole("button", {
      name: /LE-04 · Entornos/
    }));
    await expect(await c.findByText("Iluminación barrial")).toBeVisible();
    await expect(c.getByText("100 puntos")).toBeVisible();
    await userEvent.click(c.getByRole("button", {
      name: "Eliminar LE-04"
    }));
    await expect(c.getByRole("button", {
      name: "Confirmar eliminación"
    })).toBeVisible();
    await userEvent.click(c.getByRole("button", {
      name: "Confirmar eliminación"
    }));
    await waitFor(() => expect(lineasApi.eliminar).toHaveBeenCalledWith(linea.id));
    await expect(c.getByText("Iluminación barrial")).toBeVisible();
    await expect(matrizCsv(dimensiones, [{
      ...linea,
      titulo: "=1+1"
    }])).toContain("'=1+1");
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  render: () => <LineaEditorPanel entryKey="qa-linea" lineaId={linea.id} />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole("textbox", {
      name: "Título"
    })).toHaveValue(linea.titulo);
    await userEvent.click(c.getByRole("button", {
      name: "Agregar sublínea"
    }));
    await expect(c.getAllByRole("textbox", {
      name: "Código hijo"
    })[1]).toHaveValue("LE-04.2");
    await userEvent.type(c.getAllByRole("textbox", {
      name: "Título de la intervención"
    })[1], "Recuperar parques");
    await userEvent.click(c.getByRole("button", {
      name: "Guardar línea estratégica"
    }));
    await waitFor(() => expect(lineasApi.guardar).toHaveBeenCalled());
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    useSesionStore.setState({
      sesion: {
        modo: "identidad",
        rol: "auditor_forense",
        permisos: [],
        sesionId: "auditor",
        desde: new Date().toISOString()
      }
    });
  },
  render: () => <ArquitecturaPolitica />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("Seguridad politica")).toBeVisible();
    await userEvent.click(c.getByRole("button", {
      name: /LE-04 · Entornos/
    }));
    await expect(c.queryByRole("button", {
      name: "Editar LE-04"
    })).not.toBeInTheDocument();
    await expect(c.queryByRole("button", {
      name: "Nueva Línea Estratégica"
    })).not.toBeInTheDocument();
  }
}`,...N.parameters?.docs?.source}}},P.parameters={...P.parameters,docs:{...P.parameters?.docs,source:{originalSource:`{
  parameters: {
    viewport: {
      options: {
        movil: {
          name: "320px",
          styles: {
            width: "320px",
            height: "740px"
          }
        }
      }
    },
    viewportMode: "movil"
  },
  render: () => <div style={{
    width: 320,
    maxWidth: "100%"
  }}>
      <ArquitecturaPolitica />
    </div>
}`,...P.parameters?.docs?.source}}},F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  beforeEach: () => {
    lineasApi.listar = fn().mockRejectedValue(new Error("API no disponible"));
  },
  render: () => <ArquitecturaPolitica />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("API no disponible")).toBeVisible();
    await expect(c.getByRole("button", {
      name: "Reintentar"
    })).toBeVisible();
  }
}`,...F.parameters?.docs?.source}}},I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  render: () => <div className="dark" style={{
    width: 320,
    maxWidth: "100%"
  }}>
      <LineaEditorPanel entryKey="movil" lineaId={linea.id} />
    </div>,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await c.findByRole("textbox", {
      name: "Título"
    });
    const wrapper = canvasElement.firstElementChild as HTMLElement;
    await expect(wrapper.scrollWidth).toBeLessThanOrEqual(320);
  }
}`,...I.parameters?.docs?.source}}},L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  ...EditorMovilOscuro,
  render: () => <div style={{
    width: 320,
    maxWidth: "100%"
  }}>
      <LineaEditorPanel entryKey="movil" lineaId={linea.id} />
    </div>
}`,...L.parameters?.docs?.source}}},R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  render: () => <>
      <div id="polis-application">
        <ArquitecturaPolitica />
      </div>
      <PanelHost />
    </>,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const boton = await c.findByRole("button", {
      name: "Nueva Línea Estratégica"
    });
    await userEvent.click(boton);
    const dialog = await c.findByRole("dialog", {
      name: "Nueva línea estratégica"
    }, {
      timeout: 10000
    });
    await waitFor(() => expect(dialog).toHaveFocus());
    await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(c.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(boton).toHaveFocus());
  }
}`,...R.parameters?.docs?.source}}}})))()}B();export{N as Auditor,M as Editor,L as EditorMovilClaro,I as EditorMovilOscuro,F as ErrorCarga,j as Jerarquia,P as Movil,R as NavegacionPanel,z as __namedExportsOrder,A as default};