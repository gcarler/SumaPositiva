import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{S as t,x as n,y as r}from"./iframe-DGFn0ebE.js";import{i,n as a,r as o,t as s}from"./proyectos-view-5lqUqFIB.js";import{n as c,t as l}from"./plataforma-shell-Bv0WXtkW.js";import{n as u,t as d}from"./identidad-api-FrZGqpo3.js";import{n as f,s as p}from"./session-store-j34_iPDb.js";import{n as m,t as h}from"./query-provider-_g-1Rm-2.js";import{n as g,t as _}from"./panel-store-Ce9azu2v.js";import{n as v,t as y}from"./panel-host-DXBO8ixr.js";import{n as b,t as x}from"./agenda-store-kEgosmgK.js";function S(){let e=p.getState();return p.getState().iniciarSesion({usuario:N,rol:N.codigo_rol,permisos:N.permisos,nivel_identidad:`declarada`,token_acceso:`token-storybook-proyectos`,expira_en:`2099-01-01T00:00:00Z`}),g.getState().closeAll(),n().replace?.(`/plataforma/proyectos`),Object.assign(d,{perfil:M(async()=>N),roles:M(async()=>({total:0,elementos:[]}))}),Object.assign(i,{territorios:M(async()=>[]),geometria:M(async()=>({type:`FeatureCollection`,features:[]})),fases:M(async()=>[]),lineas:M(async()=>[]),aportes:M(async()=>({total:0,elementos:[]})),telemetriaSql:M(async()=>({status:`ok`,timestamp:new Date().toISOString(),total_queries_recorded:0,cache_hit_ratio_pct:100,top_queries:[]}))}),()=>{Object.assign(i,P),Object.assign(d,F),window.fetch=I,g.getState().closeAll(),p.setState(e)}}function C(e,t=[]){let n=new Map(t.map(e=>[e.id,e]));window.fetch=async(t,r)=>{let i=new URL(typeof t==`string`?t:t instanceof URL?t.href:t.url,window.location.origin),a=i.pathname.match(/^\/api\/v1\/proyectos\/actividades\/([^/]+)\/anexos(?:\/([^/]+))?(?:\/archivo)?$/);if(a){let[,e,t]=a;if(i.pathname.endsWith(`/archivo`))return n.get(t??``)?new Response(new Blob([`contenido-story`]),{status:200}):Response.json({detail:`No existe`},{status:404});if(r?.method===`POST`){let t=r.body instanceof FormData?r.body:void 0,a=t?.get(`archivo`),o=t?.get(`descripcion`),s={id:`anexo-nuevo-${n.size+1}`,actividad_id:decodeURIComponent(e),nombre_archivo:a?.name??`archivo.pdf`,tipo_mime:`application/pdf`,tamano_bytes:1024,hash_sha256:`hash-story`,descripcion:o??null,subido_por:N.nombres,creado_en:new Date().toISOString(),url_descarga:i.pathname};return n.set(s.id,s),Response.json(s,{status:201})}return r?.method===`DELETE`?(n.delete(t??``),new Response(null,{status:204})):Response.json([...n.values()])}return i.pathname===`/api/v1/proyectos/actividades`?e===`cuelga`?new Promise(()=>void 0):e===`error`?Response.json({detail:`fallo de simulación`},{status:503}):Response.json(e):I(t,r)}}function w(){let e=new Date().getFullYear();return{id:`comunicaciones:tc-larga-${e}`,modulo_dueno:`comunicaciones`,recurso_id:`tc-larga-${e}`,codigo:`TC-2026-0041`,titulo:`Plan de barrido nocturno en 8 barrios priorizados`,descripcion:`Cobertura plurianual de la vigencia`,etapa:`Etapa 3: Despliegue Territorial y Temático`,territorio:``,lugar:null,fecha_inicio:`${e}-01-01`,fecha_fin:`${e+1}-02-28`,hora_inicio:null,hora_fin:null,estado_nativo:`pendiente`,estado_canonico:`en_progreso`,avance_pct:37,responsable:`Reportero Regional`,permiso_editar:`comunicaciones:gestionar`}}function T(e,t){return`${new Date().getFullYear()}-${String(e+1).padStart(2,`0`)}-${String(t).padStart(2,`0`)}`}function E(e){return{id:`anexo-acta-1`,actividad_id:e,nombre_archivo:`Acta de la mesa.pdf`,tipo_mime:`application/pdf`,tamano_bytes:20480,hash_sha256:`hash-ejemplo`,descripcion:`Acta firmada de la sesión`,subido_por:`Facilitador de Mesa`,creado_en:new Date().toISOString(),url_descarga:`/api/v1/proyectos/archivo`}}function D(){let e=new Date,t=e.getFullYear(),n=e.getMonth(),r=w(),i=T(n,10);return[r,{id:`mesas:ag-cortas-1`,modulo_dueno:`mesas`,recurso_id:`ag-cortas-1`,codigo:`AG-2026-0031`,titulo:`Mesa de concertación en San Antoñito`,descripcion:`Sesión única`,etapa:`Mesa de Trabajo`,territorio:`San Antoñito`,lugar:`Cancha del barrio`,fecha_inicio:i,fecha_fin:i,hora_inicio:`09:00`,hora_fin:`12:00`,estado_nativo:`programada`,estado_canonico:`programada`,avance_pct:0,responsable:`Facilitador de Mesa`,permiso_editar:`mesas:abrir`},{id:`comunicaciones:tc-cortas-1`,modulo_dueno:`comunicaciones`,recurso_id:`tc-cortas-1`,codigo:`TC-2026-019`,titulo:`Fotoreportaje sobre el desarme comunitario`,descripcion:`Entrega digital`,etapa:`Etapa 2: Historias y voces`,territorio:`Getsemaní`,lugar:null,fecha_inicio:i,fecha_fin:i,hora_inicio:null,hora_fin:null,estado_nativo:`en_progreso`,estado_canonico:`en_progreso`,avance_pct:0,responsable:`Reportero Regional`,permiso_editar:`comunicaciones:gestionar`},{id:`formularios:fq-cortas-1`,modulo_dueno:`formularios`,recurso_id:`fq-cortas-1`,codigo:`FQ-2026-07`,titulo:`Formulario de diagnóstico barrial abierto`,descripcion:`Recoge por web`,etapa:null,territorio:``,lugar:null,fecha_inicio:`${t}-01-10`,fecha_fin:null,hora_inicio:null,hora_fin:null,estado_nativo:`PUBLICADO`,estado_canonico:`en_progreso`,avance_pct:0,responsable:`Coordinación de Formularios`,permiso_editar:`formularios:gestionar`}].map((e,t)=>({...e,id:`${e.id}-${t}`}))}var O,k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G;function K(){return(K=e((()=>{O=r(),t(),m(),v(),c(),a(),f(),_(),x(),u(),o(),{expect:k,userEvent:A,within:j,fn:M}=__STORYBOOK_MODULE_TEST__,N={id:`01900000-0000-7000-8000-000000000091`,nombres:`Valeria`,apellidos:`Cañas`,correo:`valeria@example.org`,codigo_rol:`gestor_bienestar_social`,activo:!0,correo_verificado_en:null,nivel_identidad:`declarada`,permisos:[`proyectos:leer`,`comunicaciones:gestionar`,`comunicaciones:leer`,`mesas:abrir`,`formularios:gestionar`,`seguimiento:gestionar`]},P={...i},F={...d},I=window.fetch,L={title:`Plataforma/Proyectos`,parameters:{layout:`fullscreen`,polis:{screen:!0},nextjs:{appDirectory:!0,navigation:{pathname:`/plataforma/proyectos`}}},beforeEach:()=>S()},R={render:()=>(C(`cuelga`),(0,O.jsxs)(h,{children:[(0,O.jsx)(l,{children:(0,O.jsx)(s,{})}),(0,O.jsx)(y,{})]})),play:async({canvasElement:e})=>{let t=j(e);await k(document.querySelector(`[data-slot="skeleton"]`),`Skeleton visible durante la carga`).not.toBeNull(),await k(t.getByRole(`tablist`)).toBeVisible(),await k(t.getByRole(`tab`,{name:`Lista`})).toHaveAttribute(`aria-selected`,`true`)}},z={render:()=>(C(`error`),(0,O.jsxs)(h,{children:[(0,O.jsx)(l,{children:(0,O.jsx)(s,{})}),(0,O.jsx)(y,{})]})),play:async({canvasElement:e})=>{let t=j(e);await k(await t.findByText(`No se pudieron cargar las actividades`,{},{timeout:1e4})).toBeVisible(),await k(t.getByText(/fallo de simulación/)).toBeVisible()}},B={render:()=>(C([]),(0,O.jsxs)(h,{children:[(0,O.jsx)(l,{children:(0,O.jsx)(s,{})}),(0,O.jsx)(y,{})]})),play:async({canvasElement:e})=>{let t=j(e);await A.click(t.getByRole(`tab`,{name:`Lista`})),await k(await t.findByText(`Sin actividades con los filtros actuales`,{},{timeout:1e4})).toBeVisible(),await k(t.getByText(/Ajusta la búsqueda/)).toBeVisible(),await A.click(t.getByRole(`tab`,{name:`Gantt`})),await k(await t.findByText(/No hay actividades en los filtros actuales/)).toBeVisible()}},V={render:()=>(C(D()),(0,O.jsxs)(h,{children:[(0,O.jsx)(l,{children:(0,O.jsx)(s,{})}),(0,O.jsx)(y,{})]})),play:async({canvasElement:e})=>{let t=j(e);await k(await t.findByText(`Total actividades`,{},{timeout:1e4})).toBeVisible(),await A.click(t.getByRole(`tab`,{name:`Lista`}));let n=await t.findByRole(`button`,{name:`Plan de barrido nocturno en 8 barrios priorizados`},{timeout:1e4});await A.click(n);let r=await t.findByRole(`dialog`,{name:`Plan de barrido nocturno en 8 barrios priorizados`},{timeout:1e4});await k(r).toBeVisible()}},H={render:()=>(C(D()),(0,O.jsxs)(h,{children:[(0,O.jsx)(l,{children:(0,O.jsx)(s,{})}),(0,O.jsx)(y,{})]})),play:async({canvasElement:e})=>{let t={id:`ag-cortas-1`,nombre:`Mesa de concertación en San Antoñito`,estado:`programada`,fecha:T(new Date().getMonth(),10),horaInicio:`09:00`,horaFin:`12:00`,lugar:`Cancha del barrio`,territorio:`San Antoñito`,tipo:`territorial`,responsable:`Facilitador de Mesa`};b.setState({agendas:[t],cargando:!1,error:null});let n=j(e);await k(await n.findByText(`Total actividades`,{},{timeout:1e4})).toBeVisible(),await A.click(n.getByRole(`tab`,{name:`Lista`}));let r=await n.findByRole(`button`,{name:`Mesa de concertación en San Antoñito`},{timeout:1e4});await A.click(r);let i=await n.findByRole(`dialog`,{name:`Mesa de concertación en San Antoñito`},{timeout:1e4});await k(i).toBeVisible(),await A.click(await j(i).findByRole(`button`,{name:/Editar en Mesas/}));let a=await n.findByRole(`dialog`,{name:`Mesa de concertación en San Antoñito`},{timeout:1e4});await k(await j(a).findByLabelText(/^Lugar/)).toHaveValue(`Cancha del barrio`)}},U={render:()=>{let e=w();return C([e],[E(e.id)]),(0,O.jsxs)(h,{children:[(0,O.jsx)(l,{children:(0,O.jsx)(s,{})}),(0,O.jsx)(y,{})]})},play:async({canvasElement:e})=>{let t=j(e);await k(await t.findByText(`Total actividades`,{},{timeout:1e4})).toBeVisible(),await A.click(t.getByRole(`tab`,{name:`Lista`}));let n=await t.findByRole(`button`,{name:`Plan de barrido nocturno en 8 barrios priorizados`},{timeout:1e4});await A.click(n);let r=await t.findByRole(`dialog`,{name:`Plan de barrido nocturno en 8 barrios priorizados`},{timeout:1e4});await j(r).findByText(`Anexos y Archivos Adjuntos`);let i=await j(r).findByText(`Acta de la mesa.pdf`);await k(i).toBeVisible();let a=r.querySelector(`input[type="file"]`);await k(a).not.toBeNull();let o=new File([`%PDF-1.4 inform`,`e de la mesa`],`informe_tecnico.pdf`,{type:`application/pdf`});await A.upload(a,o),await A.click(await j(r).findByRole(`button`,{name:/Adjuntar a actividad/}));let s=await j(r).findByText(`informe_tecnico.pdf`,{},{timeout:1e4});await k(s).toBeVisible(),await A.click(j(r).getByRole(`button`,{name:`Eliminar informe_tecnico.pdf`})),await A.click(j(r).getByRole(`button`,{name:`Confirmar`})),await j(r).findByText(`No hay archivos adjuntos en esta actividad.`)}},W={render:()=>(C(D()),(0,O.jsxs)(h,{children:[(0,O.jsx)(l,{children:(0,O.jsx)(s,{})}),(0,O.jsx)(y,{})]})),play:async({canvasElement:e})=>{let t=j(e);await k(await t.findByText(`Total actividades`,{},{timeout:1e4})).toBeVisible(),await A.click(t.getByRole(`tab`,{name:`Calendario`})),await k(await t.findByRole(`region`,{name:`Calendario mensual de proyectos`},{timeout:1e4})).toBeVisible();let n=await t.findAllByTitle(`Comunicaciones: Plan de barrido nocturno en 8 barrios priorizados`,{},{timeout:1e4});await k(n.length).toBeGreaterThan(0);for(let e of n)await k(e).toBeVisible()}},G=[`ProyectosCargando`,`ProyectosError`,`ProyectosVacio`,`FichaActividad`,`EdicionAgendaDesdeFicha`,`AnexosDesdeFicha`,`ProyectosVentanaLargaCalendario`],R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  render: () => {
    simularApiProyectos("cuelga");
    return <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // La pestaña activa (Gantt) muestra el Skeleton del kit mientras llega la respuesta.
    await expect(document.querySelector('[data-slot="skeleton"]'), "Skeleton visible durante la carga").not.toBeNull();
    await expect(c.getByRole("tablist")).toBeVisible();
    // Vista por defecto: Lista (encargo 2026-10-28; no Gantt).
    await expect(c.getByRole("tab", {
      name: "Lista"
    })).toHaveAttribute("aria-selected", "true");
  }
}`,...R.parameters?.docs?.source}}},z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  render: () => {
    simularApiProyectos("error");
    return <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("No se pudieron cargar las actividades", {}, {
      timeout: 10000
    })).toBeVisible();
    await expect(c.getByText(/fallo de simulación/)).toBeVisible();
  }
}`,...z.parameters?.docs?.source}}},B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  render: () => {
    simularApiProyectos([]);
    return <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // La vista carga sin datos y muestra el estado vacío del kit en la Lista.
    await userEvent.click(c.getByRole("tab", {
      name: "Lista"
    }));
    await expect(await c.findByText("Sin actividades con los filtros actuales", {}, {
      timeout: 10000
    })).toBeVisible();
    await expect(c.getByText(/Ajusta la búsqueda/)).toBeVisible();

    // El Gantt también comunica su vacío explícitamente (Regla 7).
    await userEvent.click(c.getByRole("tab", {
      name: "Gantt"
    }));
    await expect(await c.findByText(/No hay actividades en los filtros actuales/)).toBeVisible();
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  render: () => {
    simularApiProyectos(datosVentanaLarga());
    return <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("Total actividades", {}, {
      timeout: 10000
    })).toBeVisible();
    await userEvent.click(c.getByRole("tab", {
      name: "Lista"
    }));
    const item = await c.findByRole("button", {
      name: "Plan de barrido nocturno en 8 barrios priorizados"
    }, {
      timeout: 10000
    });
    await userEvent.click(item);
    const ficha = await c.findByRole("dialog", {
      name: "Plan de barrido nocturno en 8 barrios priorizados"
    }, {
      timeout: 10000
    });
    await expect(ficha).toBeVisible();
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  render: () => {
    simularApiProyectos(datosVentanaLarga());
    return <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>;
  },
  play: async ({
    canvasElement
  }) => {
    // Store de agendas pre-cargado: el editor hidrata desde este estado
    // (que se obtiene igualmente desde el backend real en producción).
    const agendaMesa: MesaAgenda = {
      id: "ag-cortas-1",
      nombre: "Mesa de concertación en San Antoñito",
      estado: "programada",
      fecha: mesActual(new Date().getMonth(), 10),
      horaInicio: "09:00",
      horaFin: "12:00",
      lugar: "Cancha del barrio",
      territorio: "San Antoñito",
      tipo: "territorial",
      responsable: "Facilitador de Mesa"
    } as unknown as MesaAgenda;
    useAgendaStore.setState({
      agendas: [agendaMesa],
      cargando: false,
      error: null
    });
    const c = within(canvasElement);
    await expect(await c.findByText("Total actividades", {}, {
      timeout: 10000
    })).toBeVisible();
    await userEvent.click(c.getByRole("tab", {
      name: "Lista"
    }));
    const item = await c.findByRole("button", {
      name: "Mesa de concertación en San Antoñito"
    }, {
      timeout: 10000
    });
    await userEvent.click(item);
    const ficha = await c.findByRole("dialog", {
      name: "Mesa de concertación en San Antoñito"
    }, {
      timeout: 10000
    });
    await expect(ficha).toBeVisible();
    await userEvent.click(await within(ficha).findByRole("button", {
      name: /Editar en Mesas/
    }));
    // El editor hidrata los campos desde el store (aunque llegue frío):
    const editor = await c.findByRole("dialog", {
      name: "Mesa de concertación en San Antoñito"
    }, {
      timeout: 10000
    });
    await expect(await within(editor).findByLabelText(/^Lugar/)).toHaveValue("Cancha del barrio");
  }
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  render: () => {
    const actividad = actividadVentanaLarga();
    simularApiProyectos([actividad], [anexoDeActividad(actividad.id)]);
    return <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("Total actividades", {}, {
      timeout: 10000
    })).toBeVisible();
    await userEvent.click(c.getByRole("tab", {
      name: "Lista"
    }));
    const item = await c.findByRole("button", {
      name: "Plan de barrido nocturno en 8 barrios priorizados"
    }, {
      timeout: 10000
    });
    await userEvent.click(item);
    const ficha = await c.findByRole("dialog", {
      name: "Plan de barrido nocturno en 8 barrios priorizados"
    }, {
      timeout: 10000
    });

    // Lista inicial: el anexo precargado aparece con sus metadatos.
    await within(ficha).findByText("Anexos y Archivos Adjuntos");
    const acta = await within(ficha).findByText("Acta de la mesa.pdf");
    await expect(acta).toBeVisible();

    // Carga de un archivo nuevo desde el control de archivo del kit.
    const input = ficha.querySelector<HTMLInputElement>('input[type="file"]');
    await expect(input).not.toBeNull();
    const archivo = new File(["%PDF-1.4 inform", "e de la mesa"], "informe_tecnico.pdf", {
      type: "application/pdf"
    });
    await userEvent.upload(input!, archivo);
    await userEvent.click(await within(ficha).findByRole("button", {
      name: /Adjuntar a actividad/
    }));
    const informe = await within(ficha).findByText("informe_tecnico.pdf", {}, {
      timeout: 10000
    });
    await expect(informe).toBeVisible();

    // Eliminación con confirmación explícita en dos pasos.
    // El botón expone aria-label específico del anexo (más accesible que el title genérico).
    await userEvent.click(within(ficha).getByRole("button", {
      name: "Eliminar informe_tecnico.pdf"
    }));
    await userEvent.click(within(ficha).getByRole("button", {
      name: "Confirmar"
    }));
    await within(ficha).findByText("No hay archivos adjuntos en esta actividad.");
  }
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  render: () => {
    simularApiProyectos(datosVentanaLarga());
    return <QueryProvider>
        <PlataformaShell>
          <ProyectosView />
        </PlataformaShell>
        <PanelHost />
      </QueryProvider>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(await c.findByText("Total actividades", {}, {
      timeout: 10000
    })).toBeVisible();
    await userEvent.click(c.getByRole("tab", {
      name: "Calendario"
    }));
    await expect(await c.findByRole("region", {
      name: "Calendario mensual de proyectos"
    }, {
      timeout: 10000
    })).toBeVisible();

    // La ventana larga conserva su chip en el mes visible aunque su inicio sea otro mes:
    // aparece en múltiples celdas (una por día), por eso el matcher plural.
    const chipsLarga = await c.findAllByTitle("Comunicaciones: Plan de barrido nocturno en 8 barrios priorizados", {}, {
      timeout: 10000
    });
    await expect(chipsLarga.length).toBeGreaterThan(0);
    for (const chip of chipsLarga) {
      await expect(chip).toBeVisible();
    }
  }
}`,...W.parameters?.docs?.source}}}})))()}K();export{U as AnexosDesdeFicha,H as EdicionAgendaDesdeFicha,V as FichaActividad,R as ProyectosCargando,z as ProyectosError,B as ProyectosVacio,W as ProyectosVentanaLargaCalendario,G as __namedExportsOrder,L as default};