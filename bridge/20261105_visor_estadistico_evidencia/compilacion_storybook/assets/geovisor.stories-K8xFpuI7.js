import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{y as n}from"./iframe-DGFn0ebE.js";import{n as r,t as i}from"./QueryClientProvider-BgR4BpIT.js";import{n as a,t as o}from"./queryClient-BTYsqCcE.js";import{n as s,t as c}from"./mapa-cartagena-DcFNjMWn.js";function l({children:e}){let[t]=(0,d.useState)(()=>new o({defaultOptions:{queries:{retry:!1}}}));return(0,u.jsx)(i,{client:t,children:e})}var u,d,f,p,m,h,g,_,v,y,b;function x(){return(x=e((()=>{u=n(),a(),r(),d=t(),s(),{expect:f,fn:p,userEvent:m,within:h,waitFor:g}=__STORYBOOK_MODULE_TEST__,_={title:`Plataforma/Geovisor/MapaCartagena`,component:c,parameters:{layout:`fullscreen`,polis:{screen:!0}},args:{onSelectTerritorio:()=>void 0},decorators:[e=>(0,u.jsx)(l,{children:(0,u.jsx)(e,{})})]},v={args:{onSelectTerritorio:p()},play:async({canvasElement:e,args:t})=>{let n=h(e),r=n.getByRole(`application`,{name:/Mapa interactivo de Cartagena de Indias/});await g(()=>{f(r.querySelector(`.ol-viewport`)).toBeInTheDocument(),f(r.querySelector(`.ol-viewport canvas`)).toBeInTheDocument()});let i=n.getByRole(`combobox`,{name:`Filtrar por localidad`});await f(i).toHaveTextContent(`Todas las localidades (205 barrios)`),await m.click(i),await m.click(h(e.ownerDocument.body).getByRole(`option`,{name:/Localidad 2 \(53 barrios\)/})),await f(i).toHaveTextContent(`Localidad 2 (53 barrios)`);let a=n.getByRole(`textbox`,{name:`Buscar territorio o barrio`});await m.type(a,`boquilla`);let o=await n.findByRole(`list`,{name:`Resultados de búsqueda`});await f(h(o).getByText(`LA BOQUILLA`)).toBeVisible(),await f(h(o).getByText(/Localidad 2 · UCG/)).toBeVisible(),await m.click(h(o).getByRole(`button`,{name:/LA BOQUILLA/})),await f(a).toHaveValue(`LA BOQUILLA`),await f(i).toHaveTextContent(`Localidad 2 (53 barrios)`),await f(t.onSelectTerritorio).toHaveBeenCalledWith(`loc-2`),await f(n.getByText(/no coordenadas ni polígonos barriales/i)).toBeVisible()}},y={globals:{theme:`dark`}},b=[`MapaYBarrios`,`MapaOscuro`],v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    onSelectTerritorio: fn()
  },
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    const mapHost = canvas.getByRole("application", {
      name: /Mapa interactivo de Cartagena de Indias/
    });
    await waitFor(() => {
      expect(mapHost.querySelector(".ol-viewport")).toBeInTheDocument();
      expect(mapHost.querySelector(".ol-viewport canvas")).toBeInTheDocument();
    });
    const filtro = canvas.getByRole("combobox", {
      name: "Filtrar por localidad"
    });
    await expect(filtro).toHaveTextContent("Todas las localidades (205 barrios)");
    await userEvent.click(filtro);
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole("option", {
      name: /Localidad 2 \\(53 barrios\\)/
    }));
    await expect(filtro).toHaveTextContent("Localidad 2 (53 barrios)");
    const search = canvas.getByRole("textbox", {
      name: "Buscar territorio o barrio"
    });
    await userEvent.type(search, "boquilla");
    const suggestions = await canvas.findByRole("list", {
      name: "Resultados de búsqueda"
    });
    await expect(within(suggestions).getByText("LA BOQUILLA")).toBeVisible();
    await expect(within(suggestions).getByText(/Localidad 2 · UCG/)).toBeVisible();
    await userEvent.click(within(suggestions).getByRole("button", {
      name: /LA BOQUILLA/
    }));
    await expect(search).toHaveValue("LA BOQUILLA");
    await expect(filtro).toHaveTextContent("Localidad 2 (53 barrios)");
    await expect(args.onSelectTerritorio).toHaveBeenCalledWith("loc-2");
    // El catálogo no ofrece geometría para mover el mapa a una ubicación barrial.
    await expect(canvas.getByText(/no coordenadas ni polígonos barriales/i)).toBeVisible();
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  globals: {
    theme: "dark"
  }
}`,...y.parameters?.docs?.source}}}})))()}x();export{y as MapaOscuro,v as MapaYBarrios,b as __namedExportsOrder,_ as default};