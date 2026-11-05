import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{y as t}from"./iframe-DGFn0ebE.js";import{r as n,t as r}from"./button-CsCxrpBO.js";import{n as i,t as a}from"./arrow-right-0ZqcRDgN.js";import{n as o,t as s}from"./plus-B9S0G3Zv.js";var c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O;function k(){return(k=e((()=>{c=t(),i(),o(),n(),{expect:l,fn:u,userEvent:d,within:f}=__STORYBOOK_MODULE_TEST__,p={title:`Componentes/Button`,component:r,args:{children:`Participar`,onClick:u()},argTypes:{variant:{control:`select`,options:[`default`,`ember`,`outline`,`secondary`,`ghost`,`link`,`destructive`]},size:{control:`select`,options:[`sm`,`default`,`lg`,`icon`,`icon-sm`]}},parameters:{docs:{description:{component:"Acciones con foco visible, tamaño consistente y estados disabled/loading. `asChild` permite enlaces; especifica `type=submit` en formularios. Usa `unstyled` únicamente en controles compuestos."}}}},m={play:async({canvasElement:e,args:t})=>{await d.click(f(e).getByRole(`button`,{name:`Participar`})),await l(t.onClick).toHaveBeenCalledOnce()}},h={args:{variant:`ember`}},g={args:{variant:`outline`}},_={args:{variant:`secondary`}},v={args:{variant:`ghost`}},y={args:{variant:`link`,children:`Ver metodología`}},b={args:{variant:`destructive`,children:`Eliminar borrador`}},x={args:{disabled:!0}},S={args:{loading:!0,loadingLabel:`Publicando…`},play:async({canvasElement:e})=>{await l(f(e).getByRole(`button`)).toBeDisabled()}},C={args:{children:(0,c.jsxs)(c.Fragment,{children:[`Crear mesa`,(0,c.jsx)(a,{"aria-hidden":`true`})]})}},w={args:{size:`icon`,variant:`outline`,"aria-label":`Crear mesa`,children:(0,c.jsx)(s,{"aria-hidden":`true`})}},T={render:()=>(0,c.jsxs)(`div`,{className:`flex flex-wrap items-center gap-3`,children:[(0,c.jsx)(r,{size:`sm`,children:`Compacto`}),(0,c.jsx)(r,{children:`Estándar`}),(0,c.jsx)(r,{size:`lg`,children:`Destacado`})]})},E={args:{asChild:!0,children:(0,c.jsx)(`a`,{href:`#contenido`,children:`Explorar políticas`})}},D={render:()=>(0,c.jsx)(`div`,{className:`w-64`,children:(0,c.jsx)(r,{variant:`unstyled`,size:`unstyled`,className:`w-full rounded-lg border border-border p-4 text-left`,children:`Una tarjeta con texto extenso debe conservar todo su contenido al ajustarse al ancho de una pantalla pequeña.`})}),play:async({canvasElement:e})=>{let t=f(e).getByRole(`button`);await l(getComputedStyle(t).whiteSpace).toBe(`normal`),await l(t.scrollWidth).toBeLessThanOrEqual(t.clientWidth)}},O=[`Primary`,`Ember`,`Outline`,`Secondary`,`Ghost`,`Link`,`Destructive`,`Disabled`,`Loading`,`WithIcon`,`IconOnly`,`Sizes`,`AsLink`,`TarjetaConReflujo`],m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    await userEvent.click(within(canvasElement).getByRole("button", {
      name: "Participar"
    }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "ember"
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "outline"
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "secondary"
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "ghost"
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "link",
    children: "Ver metodología"
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "destructive",
    children: "Eliminar borrador"
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    loading: true,
    loadingLabel: "Publicando…"
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("button")).toBeDisabled();
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    children: <>
        Crear mesa
        <ArrowRight aria-hidden="true" />
      </>
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    size: "icon",
    variant: "outline",
    "aria-label": "Crear mesa",
    children: <Plus aria-hidden="true" />
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Compacto</Button>
      <Button>Estándar</Button>
      <Button size="lg">Destacado</Button>
    </div>
}`,...T.parameters?.docs?.source}}},E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    asChild: true,
    children: <a href="#contenido">Explorar políticas</a>
  }
}`,...E.parameters?.docs?.source}}},D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-64">
      <Button variant="unstyled" size="unstyled" className="w-full rounded-lg border border-border p-4 text-left">
        Una tarjeta con texto extenso debe conservar todo su contenido al ajustarse al ancho de una pantalla pequeña.
      </Button>
    </div>,
  play: async ({
    canvasElement
  }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(getComputedStyle(button).whiteSpace).toBe("normal");
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
  }
}`,...D.parameters?.docs?.source}}}})))()}k();export{E as AsLink,b as Destructive,x as Disabled,h as Ember,v as Ghost,w as IconOnly,y as Link,S as Loading,g as Outline,m as Primary,_ as Secondary,T as Sizes,D as TarjetaConReflujo,C as WithIcon,O as __namedExportsOrder,p as default};