import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{y as n}from"./iframe-DGFn0ebE.js";import{a as r,i}from"./ubicacion-pregunta-CeV2wMR5.js";import{i as a,n as o,r as s,t as c}from"./pregunta-ubicacion-fotos-DxsZbCpM.js";function l(){let[e,t]=(0,f.useState)([]);return(0,d.jsx)(s,{fotos:e,cambiar:t})}function u(){let[e,t]=(0,f.useState)(``);return(0,d.jsx)(c,{pregunta:i.preguntas.find(e=>e.id===`P5`),valor:e,cambiar:t,dimension:`d1`})}var d,f,p,m,h,g,_,v,y,b,x,S;function C(){return(C=e((()=>{d=n(),f=t(),a(),o(),r(),{expect:p,userEvent:m,within:h,waitFor:g}=__STORYBOOK_MODULE_TEST__,_={title:`Plataforma/Reporte geoespacial`,parameters:{layout:`padded`},render:()=>(0,d.jsx)(u,{})},v={},y={globals:{theme:`dark`}},b={render:()=>(0,d.jsx)(`div`,{className:`w-80 max-w-full`,children:(0,d.jsx)(u,{})})},x={render:()=>(0,d.jsx)(l,{}),beforeEach:()=>{let e=window.fetch;return window.fetch=async(t,n)=>{let r=typeof t==`string`?t:t instanceof Request?t.url:t.href;if(r.includes(`/evidencias/subir`)){let e=`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+xQAAAAASUVORK5CYII=`;if(n?.body instanceof FormData){let t=n.body.get(`archivo`);if(t instanceof File)try{e=URL.createObjectURL(t)}catch{}}return Response.json({id:`foto-mock-`+Math.random().toString(36).slice(2),propuesta_id:null,autor_sujeto_id:null,nombre_archivo_original:`foto.png`,nombre_archivo_seguro:`foto.png`,tamano_bytes:1024,tipo_mime:`image/png`,hash_sha256:`hash123`,exif_despojado:!0,despojo_exif_exitoso:!0,ancho:100,alto:100,creado_en:new Date().toISOString(),archivo_url:e})}return r.includes(`/sesion`)?Response.json({token_acceso:`fake-jwt-token`,tipo_token:`bearer`,expira_en_segundos:3600,sesion_id:`sesion-mock`,huella_hash:`hash-mock`,rol:`ciudadano_anonimo`}):e(t,n)},()=>{window.fetch=e}},play:async({canvasElement:e})=>{let t=h(e),n=Uint8Array.from(atob(`iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+xQAAAAASUVORK5CYII=`),e=>e.charCodeAt(0)),r=Array.from({length:5},(e,t)=>new File([n],`foto-${t}.png`,{type:`image/png`}));await m.upload(t.getByLabelText(`Adjuntar fotos`),[...r,r[0]]),await g(()=>p(t.getByRole(`alert`)).toHaveTextContent(`Solo puedes adjuntar 5 fotos`)),p(t.queryAllByRole(`img`)).toHaveLength(0),await m.upload(t.getByLabelText(`Adjuntar fotos`),r.slice(0,3)),await g(()=>p(t.getAllByRole(`img`)).toHaveLength(3)),p(t.getByRole(`button`,{name:`Agregar fotos`})).toBeVisible(),await m.upload(t.getByLabelText(`Adjuntar fotos`),r.slice(3)),await g(()=>p(t.getAllByRole(`img`)).toHaveLength(5)),p(t.queryByRole(`button`,{name:`Agregar fotos`})).toBeNull(),await m.click(t.getByRole(`button`,{name:`Eliminar foto 1`})),p(t.getAllByRole(`img`)).toHaveLength(4),p(t.getByRole(`button`,{name:`Agregar fotos`})).toBeVisible()}},S=[`Mapa`,`Oscuro`,`Movil`,`FotosLimite`],v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  globals: {
    theme: "dark"
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-80 max-w-full">
      <Punto />
    </div>
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <Fotos />,
  beforeEach: () => {
    const fetchOriginal = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
      if (url.includes("/evidencias/subir")) {
        let archivoUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+xQAAAAASUVORK5CYII=";
        if (init?.body instanceof FormData) {
          const file = init.body.get("archivo");
          if (file instanceof File) {
            try {
              archivoUrl = URL.createObjectURL(file);
            } catch {}
          }
        }
        return Response.json({
          id: "foto-mock-" + Math.random().toString(36).slice(2),
          propuesta_id: null,
          autor_sujeto_id: null,
          nombre_archivo_original: "foto.png",
          nombre_archivo_seguro: "foto.png",
          tamano_bytes: 1024,
          tipo_mime: "image/png",
          hash_sha256: "hash123",
          exif_despojado: true,
          despojo_exif_exitoso: true,
          ancho: 100,
          alto: 100,
          creado_en: new Date().toISOString(),
          archivo_url: archivoUrl
        });
      }
      if (url.includes("/sesion")) {
        return Response.json({
          token_acceso: "fake-jwt-token",
          tipo_token: "bearer",
          expira_en_segundos: 3600,
          sesion_id: "sesion-mock",
          huella_hash: "hash-mock",
          rol: "ciudadano_anonimo"
        });
      }
      return fetchOriginal(input, init);
    };
    return () => {
      window.fetch = fetchOriginal;
    };
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6+xQAAAAASUVORK5CYII="), x => x.charCodeAt(0));
    const fotos = Array.from({
      length: 5
    }, (_, i) => new File([bytes], \`foto-\${i}.png\`, {
      type: "image/png"
    }));
    await userEvent.upload(c.getByLabelText("Adjuntar fotos"), [...fotos, fotos[0]]);
    await waitFor(() => expect(c.getByRole("alert")).toHaveTextContent("Solo puedes adjuntar 5 fotos"));
    expect(c.queryAllByRole("img")).toHaveLength(0);
    await userEvent.upload(c.getByLabelText("Adjuntar fotos"), fotos.slice(0, 3));
    await waitFor(() => expect(c.getAllByRole("img")).toHaveLength(3));
    expect(c.getByRole("button", {
      name: "Agregar fotos"
    })).toBeVisible();
    await userEvent.upload(c.getByLabelText("Adjuntar fotos"), fotos.slice(3));
    await waitFor(() => expect(c.getAllByRole("img")).toHaveLength(5));
    expect(c.queryByRole("button", {
      name: "Agregar fotos"
    })).toBeNull();
    await userEvent.click(c.getByRole("button", {
      name: "Eliminar foto 1"
    }));
    expect(c.getAllByRole("img")).toHaveLength(4);
    expect(c.getByRole("button", {
      name: "Agregar fotos"
    })).toBeVisible();
  }
}`,...x.parameters?.docs?.source}}}})))()}C();export{x as FotosLimite,v as Mapa,b as Movil,y as Oscuro,S as __namedExportsOrder,_ as default};