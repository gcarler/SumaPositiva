import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{y as n}from"./iframe-DGFn0ebE.js";import{r,t as i}from"./button-CsCxrpBO.js";import{n as a,t as o}from"./plus-B9S0G3Zv.js";import{n as s,t as c}from"./search-HFxOAb5_.js";import{n as l,t as u}from"./user-round-BIOMlXGD.js";import{n as d,t as f}from"./users-BNAI008V.js";import{n as p,t as m}from"./venetian-mask-B1WOoGAg.js";import{n as h,t as g}from"./choice-group-Bto31Bxz.js";import{n as _,t as v}from"./notice-BHPCWy4g.js";import{n as y,t as b}from"./empty-state-D6vPffvy.js";import{n as x,t as S}from"./status-badge-OEvbsRy4.js";import{n as C,t as w}from"./search-field-D8173g5b.js";import{n as T,t as E}from"./filter-chip-CwNW8vRV.js";import{n as D,t as O}from"./skeleton-DrWwWEGz.js";import{n as k,t as A}from"./page-header-CnicqTQl.js";function ee(){let[e,t]=(0,P.useState)(``);return(0,N.jsx)(w,{className:`max-w-md`,label:`Buscar políticas`,value:e,onValueChange:t,placeholder:`Buscar por título o problema…`})}function j(){let[e,t]=(0,P.useState)(`Todas`);return(0,N.jsx)(`div`,{role:`group`,"aria-label":`Filtrar por sector`,className:`flex flex-wrap gap-2`,children:[`Todas`,`Movilidad`,`Salud`,`Ambiente`].map(n=>(0,N.jsx)(E,{active:e===n,onClick:()=>t(n),children:n},n))})}function M(){let[e,t]=(0,P.useState)(`anonimo`);return(0,N.jsx)(g,{className:`max-w-xl`,label:`Forma de participar`,value:e,onValueChange:t,options:[{value:`anonimo`,label:`De forma anónima`,description:`Participa sin publicar tu nombre.`,icon:(0,N.jsx)(m,{})},{value:`identidad`,label:`Con mi identidad`,description:`Firma tus aportes con tu nombre público.`,icon:(0,N.jsx)(u,{})},{value:`institucional`,label:`Cuenta institucional`,description:`Requiere un acceso habilitado.`,disabled:!0}]})}var N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q;function $(){return($=e((()=>{N=n(),P=t(),s(),d(),p(),l(),a(),C(),T(),y(),k(),h(),_(),x(),r(),D(),{expect:F,userEvent:I,waitFor:L,within:R}=__STORYBOOK_MODULE_TEST__,z={title:`Patrones/Composición`,parameters:{layout:`padded`}},B={name:`SearchField`,render:()=>(0,N.jsx)(ee,{}),play:async({canvasElement:e})=>{let t=R(e),n=t.getByRole(`searchbox`);await I.type(n,`Movilidad`),await I.click(t.getByRole(`button`,{name:`Limpiar buscar políticas`})),await F(n).toHaveValue(``)}},V={name:`FilterChip`,render:()=>(0,N.jsx)(j,{}),play:async({canvasElement:e})=>{let t=R(e);await I.click(t.getByRole(`button`,{name:`Salud`})),await F(t.getByRole(`button`,{name:`Salud`})).toHaveAttribute(`aria-pressed`,`true`),await F(t.getByRole(`button`,{name:`Todas`})).toHaveAttribute(`aria-pressed`,`false`)}},H={name:`EmptyState · búsqueda`,render:()=>(0,N.jsx)(b,{icon:(0,N.jsx)(c,{}),title:`No encontramos políticas`,description:`Prueba con otro término o ajusta los filtros.`,action:(0,N.jsx)(i,{variant:`outline`,children:`Limpiar filtros`})})},U={name:`EmptyState · primera visita`,render:()=>(0,N.jsx)(b,{icon:(0,N.jsx)(f,{}),title:`La conversación comienza aquí`,description:`Crea una mesa e invita a tu comunidad a construir acuerdos.`,action:(0,N.jsxs)(i,{children:[(0,N.jsx)(o,{}),`Crear mesa`]})})},W={name:`PageHeader`,render:()=>(0,N.jsx)(A,{eyebrow:`Área de trabajo`,title:`Mesas de trabajo`,description:`Espacios para deliberar, construir acuerdos y documentar propuestas en comunidad.`,action:(0,N.jsxs)(i,{children:[(0,N.jsx)(o,{}),`Crear mesa`]})})},G={name:`ChoiceGroup`,render:()=>(0,N.jsx)(M,{}),play:async({canvasElement:e})=>{let t=R(e);await I.click(t.getByRole(`radio`,{name:/Con mi identidad/})),await F(t.getByRole(`radio`,{name:/Con mi identidad/})).toHaveAttribute(`data-state`,`checked`),await I.keyboard(`{ArrowUp>}`),await L(()=>F(t.getByRole(`radio`,{name:/De forma anónima/})).toHaveAttribute(`data-state`,`checked`)),await I.keyboard(`{/ArrowUp}`)}},K={name:`Notice · estados`,render:()=>(0,N.jsxs)(`div`,{className:`grid max-w-2xl gap-4`,children:[(0,N.jsx)(v,{title:`Consulta abierta`,children:`Puedes aportar hasta la fecha de cierre.`}),(0,N.jsx)(v,{tone:`success`,title:`Aporte publicado`,children:`Tu propuesta ya aparece en la línea estratégica.`}),(0,N.jsx)(v,{tone:`warning`,title:`Revisa tu información`,children:`Completa los campos obligatorios antes de continuar.`}),(0,N.jsx)(v,{tone:`danger`,title:`No pudimos guardar`,children:`Tu borrador sigue disponible. Intenta de nuevo.`})]})},q={name:`StatusBadge`,render:()=>(0,N.jsxs)(`div`,{className:`flex flex-wrap gap-3`,children:[(0,N.jsx)(S,{children:`Programada`}),(0,N.jsx)(S,{tone:`ember`,children:`Consulta pública`}),(0,N.jsx)(S,{tone:`info`,children:`En deliberación`}),(0,N.jsx)(S,{tone:`warning`,children:`En revisión`}),(0,N.jsx)(S,{tone:`success`,children:`Aprobada`}),(0,N.jsx)(S,{tone:`danger`,children:`Cerrada`})]})},J={name:`Skeleton · carga`,render:()=>(0,N.jsx)(`div`,{role:`status`,"aria-label":`Cargando políticas`,className:`grid gap-4 sm:grid-cols-3`,children:[1,2,3].map(e=>(0,N.jsxs)(`div`,{className:`space-y-5 rounded-xl border border-border bg-surface-1 p-6`,children:[(0,N.jsx)(O,{className:`h-4 w-20`}),(0,N.jsx)(O,{className:`h-6 w-4/5`}),(0,N.jsxs)(`div`,{className:`space-y-2`,children:[(0,N.jsx)(O,{className:`h-4 w-full`}),(0,N.jsx)(O,{className:`h-4 w-3/4`})]}),(0,N.jsx)(O,{className:`h-8 w-28`})]},e))})},Y={...K,name:`Notice · tema oscuro`,globals:{theme:`dark`}},X={...G,name:`ChoiceGroup · tema oscuro`,globals:{theme:`dark`}},Z={...q,name:`StatusBadge · tema oscuro`,globals:{theme:`dark`}},Q=[`SearchInput`,`Filters`,`NoResults`,`EmptyWorkspace`,`Header`,`Choices`,`Notices`,`Statuses`,`LoadingCards`,`DarkNotices`,`DarkChoices`,`DarkStatuses`],B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  name: "SearchField",
  render: () => <SearchDemo />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("searchbox");
    await userEvent.type(input, "Movilidad");
    await userEvent.click(canvas.getByRole("button", {
      name: "Limpiar buscar políticas"
    }));
    await expect(input).toHaveValue("");
  }
}`,...B.parameters?.docs?.source}}},V.parameters={...V.parameters,docs:{...V.parameters?.docs,source:{originalSource:`{
  name: "FilterChip",
  render: () => <FiltersDemo />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Salud"
    }));
    await expect(canvas.getByRole("button", {
      name: "Salud"
    })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", {
      name: "Todas"
    })).toHaveAttribute("aria-pressed", "false");
  }
}`,...V.parameters?.docs?.source}}},H.parameters={...H.parameters,docs:{...H.parameters?.docs,source:{originalSource:`{
  name: "EmptyState · búsqueda",
  render: () => <EmptyState icon={<Search />} title="No encontramos políticas" description="Prueba con otro término o ajusta los filtros." action={<Button variant="outline">Limpiar filtros</Button>} />
}`,...H.parameters?.docs?.source}}},U.parameters={...U.parameters,docs:{...U.parameters?.docs,source:{originalSource:`{
  name: "EmptyState · primera visita",
  render: () => <EmptyState icon={<Users />} title="La conversación comienza aquí" description="Crea una mesa e invita a tu comunidad a construir acuerdos." action={<Button>
          <Plus />
          Crear mesa
        </Button>} />
}`,...U.parameters?.docs?.source}}},W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  name: "PageHeader",
  render: () => <PageHeader eyebrow="Área de trabajo" title="Mesas de trabajo" description="Espacios para deliberar, construir acuerdos y documentar propuestas en comunidad." action={<Button>
          <Plus />
          Crear mesa
        </Button>} />
}`,...W.parameters?.docs?.source}}},G.parameters={...G.parameters,docs:{...G.parameters?.docs,source:{originalSource:`{
  name: "ChoiceGroup",
  render: () => <ChoiceDemo />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", {
      name: /Con mi identidad/
    }));
    await expect(canvas.getByRole("radio", {
      name: /Con mi identidad/
    })).toHaveAttribute("data-state", "checked");
    await userEvent.keyboard("{ArrowUp>}");
    await waitFor(() => expect(canvas.getByRole("radio", {
      name: /De forma anónima/
    })).toHaveAttribute("data-state", "checked"));
    await userEvent.keyboard("{/ArrowUp}");
  }
}`,...G.parameters?.docs?.source}}},K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{
  name: "Notice · estados",
  render: () => <div className="grid max-w-2xl gap-4">
      <Notice title="Consulta abierta">
        Puedes aportar hasta la fecha de cierre.
      </Notice>
      <Notice tone="success" title="Aporte publicado">
        Tu propuesta ya aparece en la línea estratégica.
      </Notice>
      <Notice tone="warning" title="Revisa tu información">
        Completa los campos obligatorios antes de continuar.
      </Notice>
      <Notice tone="danger" title="No pudimos guardar">
        Tu borrador sigue disponible. Intenta de nuevo.
      </Notice>
    </div>
}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  name: "StatusBadge",
  render: () => <div className="flex flex-wrap gap-3">
      <StatusBadge>Programada</StatusBadge>
      <StatusBadge tone="ember">Consulta pública</StatusBadge>
      <StatusBadge tone="info">En deliberación</StatusBadge>
      <StatusBadge tone="warning">En revisión</StatusBadge>
      <StatusBadge tone="success">Aprobada</StatusBadge>
      <StatusBadge tone="danger">Cerrada</StatusBadge>
    </div>
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  name: "Skeleton · carga",
  render: () => <div role="status" aria-label="Cargando políticas" className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map(key => <div key={key} className="space-y-5 rounded-xl border border-border bg-surface-1 p-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-4/5" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-8 w-28" />
        </div>)}
    </div>
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  ...Notices,
  name: "Notice · tema oscuro",
  globals: {
    theme: "dark"
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  ...Choices,
  name: "ChoiceGroup · tema oscuro",
  globals: {
    theme: "dark"
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  ...Statuses,
  name: "StatusBadge · tema oscuro",
  globals: {
    theme: "dark"
  }
}`,...Z.parameters?.docs?.source}}}})))()}$();export{G as Choices,X as DarkChoices,Y as DarkNotices,Z as DarkStatuses,U as EmptyWorkspace,V as Filters,W as Header,J as LoadingCards,H as NoResults,K as Notices,B as SearchInput,q as Statuses,Q as __namedExportsOrder,z as default};