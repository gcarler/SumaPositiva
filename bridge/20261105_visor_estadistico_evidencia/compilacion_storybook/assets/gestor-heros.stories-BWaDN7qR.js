import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{y as t}from"./iframe-DGFn0ebE.js";import{i as n,n as r,s as i,t as a}from"./hero-store-D4z15M--.js";import{n as o,t as s}from"./middleware-CKfXLUf0.js";import{n as c,t as l}from"./gestor-heros-plataforma-Dp5PSbd8.js";var u,d,f,p,m,h,g,_,v,y,b,x;function S(){return(S=e((()=>{u=t(),o(),c(),n(),{expect:d,userEvent:f,waitFor:p,within:m}=__STORYBOOK_MODULE_TEST__,h={title:`Plataforma/Gestor de heros`,component:l,args:{editar:!0},beforeEach(){let e=globalThis.fetch;globalThis.fetch=async(e,t)=>{let n=typeof e==`string`?e:e instanceof URL?e.href:e.url;if(n.endsWith(`/politicas/heros`)){if(t?.method===`PUT`)return new Response(t.body?.toString()??`{}`,{status:200,headers:{"Content-Type":`application/json`}});let e=i.getState();return Response.json({slides:e.slides,catalogoImagenes:e.imagenesCatalogo,heroImageId:e.heroImageId,opacidad:e.opacidad,modoCarrusel:e.modoCarrusel,intervaloSegundos:e.intervaloSegundos,pageImages:e.pageImages})}if(n.endsWith(`/politicas/heros/subir-imagen`))return Response.json({url:`/images/hero/hero-marco-logico.webp?subida=243`});throw Error(`La historia no permite solicitudes externas: ${n}`)};let t=i.persist.getOptions().storage,n=new Map;return i.persist.setOptions({storage:s(()=>({getItem:e=>n.get(e)??null,setItem:(e,t)=>{n.set(e,t)},removeItem:e=>{n.delete(e)}}))}),i.getState().resetearHeroConfig(),()=>{globalThis.fetch=e,i.getState().resetearHeroConfig(),i.persist.setOptions({storage:t})}},render:e=>(0,u.jsxs)(`div`,{className:`mx-auto w-full max-w-5xl space-y-4`,children:[(0,u.jsx)(`h1`,{className:`text-xl font-semibold text-text-primary`,children:`Gestión de imágenes hero`}),(0,u.jsx)(`h2`,{className:`text-base font-semibold text-text-primary`,children:`Apariencia de los espacios públicos`}),(0,u.jsx)(l,{...e})]})},g={play:async({canvasElement:e})=>{let t=m(e);await f.click(t.getByRole(`button`,{name:`Nueva imagen hero`})),await f.type(t.getByLabelText(/Título de la imagen/),`Encuentro vecinal 243`),await f.type(t.getByLabelText(/Descripción de la imagen/),`Diálogo y acuerdos de la comunidad.`),await f.type(t.getByLabelText(/Enfoque o tema territorial/),`Participación comunitaria`),await f.type(t.getByLabelText(/URL o ruta de la imagen/),`/images/hero/hero-marco-logico.webp?catalogo=243`),await f.click(t.getByRole(`button`,{name:`Guardar imagen`}));let n=await t.findByRole(`article`,{name:`Encuentro vecinal 243`}),r=i.getState().imagenesCatalogo.find(e=>e.titulo===`Encuentro vecinal 243`);if(!r)throw Error(`El alta no quedó en el catálogo`);await d(r.thumbnail).toBe(r.archivo),await d(t.getAllByRole(`article`)).toHaveLength(7),await f.click(m(n).getByRole(`button`,{name:`Asignar Encuentro vecinal 243`})),await d(i.getState().heroImageId).toBe(r.id),await f.click(m(n).getByRole(`switch`)),await d(m(n).getByText(`Deshabilitada`)).toBeVisible(),await d(m(n).getByRole(`button`,{name:`Asignar Encuentro vecinal 243`})).toBeDisabled(),await d(i.getState().heroImageId).toBe(a),await f.click(m(n).getByRole(`switch`)),await d(m(n).getByRole(`switch`)).toBeChecked(),await f.click(m(n).getByRole(`button`,{name:`Asignar Encuentro vecinal 243`})),await f.click(m(n).getByRole(`button`,{name:`Eliminar Encuentro vecinal 243`})),await d(t.getByRole(`button`,{name:`Confirmar retiro`})).toBeVisible(),await d(i.getState().imagenesCatalogo).toHaveLength(7),await f.click(t.getByRole(`button`,{name:`Cancelar`})),await d(n).toBeVisible(),await f.click(m(n).getByRole(`button`,{name:`Eliminar Encuentro vecinal 243`})),await f.click(t.getByRole(`button`,{name:`Confirmar retiro`})),await p(()=>d(t.queryByRole(`article`,{name:`Encuentro vecinal 243`})).not.toBeInTheDocument()),await d(i.getState().heroImageId).toBe(a),await d(i.getState().imagenesCatalogo).toHaveLength(6),await f.click(t.getByRole(`button`,{name:`Guardar Cambios en la Plataforma`})),await p(()=>d(i.getState().cambiosPendientes).toBe(!1))}},_={...g,globals:{theme:`dark`}},v={play:async({canvasElement:e})=>{let t=m(e);t.getByRole(`button`,{name:`Nueva imagen hero`}).focus(),await f.keyboard(`{Enter}`),await d(t.getByRole(`form`,{name:`Nueva imagen hero`})).toBeVisible(),await f.type(t.getByLabelText(/Título de la imagen/),`Título conservado`),await f.type(t.getByLabelText(/URL o ruta de la imagen/),`javascript:alert(1)`),await f.click(t.getByRole(`button`,{name:`Guardar imagen`})),await d(t.getByLabelText(/URL o ruta de la imagen/)).toHaveAttribute(`aria-invalid`,`true`),await d(t.getByLabelText(/Título de la imagen/)).toHaveValue(`Título conservado`),await d(i.getState().imagenesCatalogo).toHaveLength(6),await d(t.getByRole(`form`,{name:`Nueva imagen hero`})).toBeVisible()}},y={beforeEach(){for(let e of r)i.getState().eliminarImagen(e.id)},play:async({canvasElement:e})=>{let t=m(e);await d(t.getByText(/No hay imágenes en la biblioteca/)).toBeVisible(),await f.click(t.getByRole(`button`,{name:`Restaurar catálogo oficial`})),await d(i.getState().imagenesCatalogo).toHaveLength(0),await f.click(t.getByRole(`button`,{name:`Confirmar restauración`})),await p(()=>d(t.getAllByRole(`article`)).toHaveLength(6)),await d(i.getState().imagenesCatalogo.every(e=>e.habilitada)).toBe(!0)}},b={args:{editar:!1},play:async({canvasElement:e})=>{let t=m(e);await d(t.getByRole(`button`,{name:`Nueva imagen hero`})).toBeDisabled(),await d(t.getByRole(`button`,{name:`Restaurar catálogo oficial`})).toBeDisabled();for(let e of t.getAllByRole(`switch`))await d(e).toBeDisabled();for(let e of t.getAllByRole(`button`,{name:/^Eliminar /}))await d(e).toBeDisabled();await d(i.getState().imagenesCatalogo).toHaveLength(6)}},x=[`GestionCompleta`,`GestionCompletaOscura`,`ValidacionYTeclado`,`BibliotecaVacia`,`SoloLectura`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const vista = within(canvasElement);
    await userEvent.click(vista.getByRole("button", {
      name: "Nueva imagen hero"
    }));
    await userEvent.type(vista.getByLabelText(/Título de la imagen/), "Encuentro vecinal 243");
    await userEvent.type(vista.getByLabelText(/Descripción de la imagen/), "Diálogo y acuerdos de la comunidad.");
    await userEvent.type(vista.getByLabelText(/Enfoque o tema territorial/), "Participación comunitaria");
    await userEvent.type(vista.getByLabelText(/URL o ruta de la imagen/), "/images/hero/hero-marco-logico.webp?catalogo=243");
    await userEvent.click(vista.getByRole("button", {
      name: "Guardar imagen"
    }));
    const tarjeta = await vista.findByRole("article", {
      name: "Encuentro vecinal 243"
    });
    const imagen = useHeroConfigStore.getState().imagenesCatalogo.find(fila => fila.titulo === "Encuentro vecinal 243");
    if (!imagen) throw new Error("El alta no quedó en el catálogo");
    await expect(imagen.thumbnail).toBe(imagen.archivo);
    await expect(vista.getAllByRole("article")).toHaveLength(7);
    await userEvent.click(within(tarjeta).getByRole("button", {
      name: "Asignar Encuentro vecinal 243"
    }));
    await expect(useHeroConfigStore.getState().heroImageId).toBe(imagen.id);
    await userEvent.click(within(tarjeta).getByRole("switch"));
    await expect(within(tarjeta).getByText("Deshabilitada")).toBeVisible();
    await expect(within(tarjeta).getByRole("button", {
      name: "Asignar Encuentro vecinal 243"
    })).toBeDisabled();
    await expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    await userEvent.click(within(tarjeta).getByRole("switch"));
    await expect(within(tarjeta).getByRole("switch")).toBeChecked();
    await userEvent.click(within(tarjeta).getByRole("button", {
      name: "Asignar Encuentro vecinal 243"
    }));
    await userEvent.click(within(tarjeta).getByRole("button", {
      name: "Eliminar Encuentro vecinal 243"
    }));
    await expect(vista.getByRole("button", {
      name: "Confirmar retiro"
    })).toBeVisible();
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(7);
    await userEvent.click(vista.getByRole("button", {
      name: "Cancelar"
    }));
    await expect(tarjeta).toBeVisible();
    await userEvent.click(within(tarjeta).getByRole("button", {
      name: "Eliminar Encuentro vecinal 243"
    }));
    await userEvent.click(vista.getByRole("button", {
      name: "Confirmar retiro"
    }));
    await waitFor(() => expect(vista.queryByRole("article", {
      name: "Encuentro vecinal 243"
    })).not.toBeInTheDocument());
    await expect(useHeroConfigStore.getState().heroImageId).toBe(HERO_DEFAULT_IMAGE_ID);
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(6);
    await userEvent.click(vista.getByRole("button", {
      name: "Guardar Cambios en la Plataforma"
    }));
    await waitFor(() => expect(useHeroConfigStore.getState().cambiosPendientes).toBe(false));
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  ...GestionCompleta,
  globals: {
    theme: "dark"
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const vista = within(canvasElement);
    const abrir = vista.getByRole("button", {
      name: "Nueva imagen hero"
    });
    abrir.focus();
    await userEvent.keyboard("{Enter}");
    await expect(vista.getByRole("form", {
      name: "Nueva imagen hero"
    })).toBeVisible();
    await userEvent.type(vista.getByLabelText(/Título de la imagen/), "Título conservado");
    await userEvent.type(vista.getByLabelText(/URL o ruta de la imagen/), "javascript:alert(1)");
    await userEvent.click(vista.getByRole("button", {
      name: "Guardar imagen"
    }));
    await expect(vista.getByLabelText(/URL o ruta de la imagen/)).toHaveAttribute("aria-invalid", "true");
    await expect(vista.getByLabelText(/Título de la imagen/)).toHaveValue("Título conservado");
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(6);
    await expect(vista.getByRole("form", {
      name: "Nueva imagen hero"
    })).toBeVisible();
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  beforeEach() {
    for (const imagen of HERO_IMAGE_OPTIONS) useHeroConfigStore.getState().eliminarImagen(imagen.id);
  },
  play: async ({
    canvasElement
  }) => {
    const vista = within(canvasElement);
    await expect(vista.getByText(/No hay imágenes en la biblioteca/)).toBeVisible();
    await userEvent.click(vista.getByRole("button", {
      name: "Restaurar catálogo oficial"
    }));
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(0);
    await userEvent.click(vista.getByRole("button", {
      name: "Confirmar restauración"
    }));
    await waitFor(() => expect(vista.getAllByRole("article")).toHaveLength(6));
    await expect(useHeroConfigStore.getState().imagenesCatalogo.every(imagen => imagen.habilitada)).toBe(true);
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    editar: false
  },
  play: async ({
    canvasElement
  }) => {
    const vista = within(canvasElement);
    await expect(vista.getByRole("button", {
      name: "Nueva imagen hero"
    })).toBeDisabled();
    await expect(vista.getByRole("button", {
      name: "Restaurar catálogo oficial"
    })).toBeDisabled();
    for (const control of vista.getAllByRole("switch")) await expect(control).toBeDisabled();
    for (const boton of vista.getAllByRole("button", {
      name: /^Eliminar /
    })) await expect(boton).toBeDisabled();
    await expect(useHeroConfigStore.getState().imagenesCatalogo).toHaveLength(6);
  }
}`,...b.parameters?.docs?.source}}}})))()}S();export{y as BibliotecaVacia,g as GestionCompleta,_ as GestionCompletaOscura,b as SoloLectura,v as ValidacionYTeclado,x as __namedExportsOrder,h as default};