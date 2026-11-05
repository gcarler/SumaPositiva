import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{y as n}from"./iframe-DGFn0ebE.js";import{r,t as i}from"./button-CsCxrpBO.js";import{n as a,t as o}from"./side-panel-DFRcvOur.js";import{n as s,t as c}from"./form-field-aAlrzcZ9.js";import{n as l,t as u}from"./textarea-RjYat3JI.js";import{n as d,t as f}from"./notice-BHPCWy4g.js";function p(){let[e,t]=(0,h.useState)(!1);return(0,m.jsx)(`div`,{className:e?`h-[640px] w-full`:`ml-auto h-[640px] max-w-xl`,children:(0,m.jsx)(o,{title:`Mesa territorial`,onClose:_(),maximized:e,onToggleMaximized:()=>t(!e),children:(0,m.jsx)(`div`,{className:`ui-panel-body`,children:(0,m.jsx)(`p`,{className:`text-text-secondary`,children:`Amplía el espacio para trabajar con comodidad.`})})})})}var m,h,g,_,v,y,b,x,S,C,w,T,E;function D(){return(D=e((()=>{m=n(),h=t(),a(),r(),s(),l(),d(),{expect:g,fn:_,userEvent:v,within:y}=__STORYBOOK_MODULE_TEST__,b={title:`Patrones/SidePanel`,component:o,args:{title:`Construyamos una propuesta`,kicker:`Participación ciudadana`,subtitle:`Tu experiencia ayuda a identificar lo que necesita tu comunidad.`,onClose:_(),breadcrumbs:[{label:`Política de movilidad`},{label:`Formulación`},{label:`LE-01`}],children:(0,m.jsxs)(`div`,{className:`ui-panel-body space-y-6`,children:[(0,m.jsx)(f,{title:`Tu aporte es público`,children:`Evita incluir datos personales de terceros.`}),(0,m.jsx)(c,{label:`Tu propuesta`,children:e=>(0,m.jsx)(u,{...e,placeholder:`Describe tu idea…`})})]}),footer:(0,m.jsxs)(`div`,{className:`flex justify-end gap-2`,children:[(0,m.jsx)(i,{variant:`outline`,size:`sm`,children:`Descartar`}),(0,m.jsx)(i,{size:`sm`,children:`Publicar aporte`})]})},decorators:[e=>(0,m.jsx)(`div`,{className:`ml-auto h-[640px] max-w-xl`,children:(0,m.jsx)(e,{})})],parameters:{docs:{description:{component:`Panel visual sin stores de negocio. El host de la aplicación controla apilado, foco, Escape y retorno de foco. El contenido se desplaza mientras cabecera y acciones permanecen visibles.`}}}},x={play:async({canvasElement:e,args:t})=>{await v.click(y(e).getByRole(`button`,{name:`Cerrar panel`})),await g(t.onClose).toHaveBeenCalledOnce()}},S={args:{title:`Formulación participativa de la Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias`}},C={args:{children:(0,m.jsx)(`div`,{className:`ui-panel-body space-y-5`,children:Array.from({length:12},(e,t)=>(0,m.jsxs)(`p`,{className:`text-sm leading-relaxed text-text-secondary`,children:[`Propuesta `,t+1,`. La comunidad identifica necesidades, delibera sobre sus causas y construye acuerdos para mejorar el territorio.`]},t))})}},w={decorators:[e=>(0,m.jsx)(`div`,{className:`w-full`,children:(0,m.jsx)(e,{})})],render:()=>(0,m.jsx)(p,{}),play:async({canvasElement:e})=>{let t=y(e);await v.click(t.getByRole(`button`,{name:`Maximizar panel`})),await g(t.getByRole(`button`,{name:`Minimizar panel`})).toBeVisible()}},T={globals:{viewport:{value:`mobile1`,isRotated:!1}},args:{title:`Nueva propuesta`},decorators:[e=>(0,m.jsx)(`div`,{className:`h-[700px] max-w-[360px]`,children:(0,m.jsx)(e,{})})]},E=[`Default`,`LongTitle`,`LongContent`,`Maximizable`,`Mobile`],x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    await userEvent.click(within(canvasElement).getByRole("button", {
      name: "Cerrar panel"
    }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Formulación participativa de la Política Pública de Seguridad Humana Integral del Distrito de Cartagena de Indias"
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  args: {
    children: <div className="ui-panel-body space-y-5">
        {Array.from({
        length: 12
      }, (_, index) => <p key={index} className="text-sm leading-relaxed text-text-secondary">
            Propuesta {index + 1}. La comunidad identifica necesidades, delibera
            sobre sus causas y construye acuerdos para mejorar el territorio.
          </p>)}
      </div>
  }
}`,...C.parameters?.docs?.source}}},w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  decorators: [Story => <div className="w-full">
        <Story />
      </div>],
  render: () => <ResizablePanel />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Maximizar panel"
    }));
    await expect(canvas.getByRole("button", {
      name: "Minimizar panel"
    })).toBeVisible();
  }
}`,...w.parameters?.docs?.source}}},T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  globals: {
    viewport: {
      value: "mobile1",
      isRotated: false
    }
  },
  args: {
    title: "Nueva propuesta"
  },
  decorators: [Story => <div className="h-[700px] max-w-[360px]">
        <Story />
      </div>]
}`,...T.parameters?.docs?.source}}}})))()}D();export{x as Default,C as LongContent,S as LongTitle,w as Maximizable,T as Mobile,E as __namedExportsOrder,b as default};