import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{t}from"./react-BSYpA16D.js";import{y as n}from"./iframe-DGFn0ebE.js";import{r,t as i}from"./button-CsCxrpBO.js";import{n as a,t as o}from"./form-field-aAlrzcZ9.js";import{n as s,t as c}from"./input-BJ5gJouy.js";import{n as l,t as u}from"./textarea-RjYat3JI.js";function d(){let[e,t]=(0,p.useState)(``),[n,r]=(0,p.useState)(!1);return(0,f.jsxs)(`form`,{noValidate:!0,onSubmit:e=>{e.preventDefault(),r(!0)},className:`space-y-4`,children:[(0,f.jsx)(o,{label:`Nombre público`,required:!0,error:n&&e.trim().length<3?`Escribe al menos 3 caracteres.`:void 0,children:n=>(0,f.jsx)(c,{...n,value:e,onChange:e=>t(e.target.value)})}),(0,f.jsx)(i,{type:`submit`,children:`Guardar`})]})}var f,p,m,h,g,_,v,y,b,x,S,C,w;function T(){return(T=e((()=>{f=n(),p=t(),a(),s(),l(),r(),{expect:m,userEvent:h,within:g}=__STORYBOOK_MODULE_TEST__,_={title:`Patrones/FormField`,component:o,args:{label:`Nombre público`,description:`Así aparecerá tu nombre en los aportes.`,children:e=>(0,f.jsx)(c,{...e,placeholder:`Tu nombre`})},decorators:[e=>(0,f.jsx)(`div`,{className:`max-w-md`,children:(0,f.jsx)(e,{})})]},v={},y={args:{required:!0}},b={args:{required:!0,error:`Escribe al menos 3 caracteres.`}},x={args:{children:e=>(0,f.jsx)(c,{...e,disabled:!0,value:`Nombre no editable`,readOnly:!0})}},S={args:{label:`Tu propuesta`,description:`Describe una acción y el beneficio esperado.`,children:e=>(0,f.jsx)(u,{...e,placeholder:`Mi propuesta es…`})}},C={render:()=>(0,f.jsx)(d,{}),play:async({canvasElement:e})=>{let t=g(e);await h.click(t.getByRole(`button`,{name:`Guardar`})),await m(t.getByRole(`textbox`,{name:`Nombre público`})).toHaveAttribute(`aria-invalid`,`true`),await m(t.getByRole(`alert`)).toHaveTextContent(`Escribe al menos 3 caracteres.`),await h.type(t.getByRole(`textbox`),`Ana`),await m(t.queryByRole(`alert`)).not.toBeInTheDocument()}},w=[`Default`,`Required`,`Invalid`,`Disabled`,`LongText`,`Validation`],v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    required: true
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    required: true,
    error: "Escribe al menos 3 caracteres."
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    children: props => <Input {...props} disabled value="Nombre no editable" readOnly />
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Tu propuesta",
    description: "Describe una acción y el beneficio esperado.",
    children: props => <Textarea {...props} placeholder="Mi propuesta es…" />
  }
}`,...S.parameters?.docs?.source}}},C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  render: () => <ValidatedForm />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Guardar"
    }));
    await expect(canvas.getByRole("textbox", {
      name: "Nombre público"
    })).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("alert")).toHaveTextContent("Escribe al menos 3 caracteres.");
    await userEvent.type(canvas.getByRole("textbox"), "Ana");
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  }
}`,...C.parameters?.docs?.source}}}})))()}T();export{v as Default,x as Disabled,b as Invalid,S as LongText,y as Required,C as Validation,w as __namedExportsOrder,_ as default};