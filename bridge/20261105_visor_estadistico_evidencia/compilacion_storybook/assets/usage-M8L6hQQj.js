import{n as e}from"./rolldown-runtime-BcKkbAw3.js";import{y as t}from"./iframe-DGFn0ebE.js";import{i as n,r}from"./react-Da5dQK34.js";import{a as i,o as a}from"./blocks-DCebX2s0.js";function o(e){let t={code:`code`,h1:`h1`,h2:`h2`,li:`li`,ol:`ol`,p:`p`,pre:`pre`,...n(),...e.components};return(0,c.jsxs)(c.Fragment,{children:[(0,c.jsx)(i,{title:`Fundamentos/Guía de uso`}),`
`,(0,c.jsx)(t.h1,{id:`polis-ui`,children:`POLIS UI`}),`
`,(0,c.jsxs)(t.p,{children:[`Un sistema de diseño compartido por la aplicación y Storybook. El código de los
componentes vive en `,(0,c.jsx)(t.code,{children:`src/shared/ui`}),`; las variables semánticas y escalas viven en
`,(0,c.jsx)(t.code,{children:`src/shared/design-system/tokens.css`}),`.`]}),`
`,(0,c.jsx)(t.h2,{id:`cómo-construir-una-pantalla`,children:`Cómo construir una pantalla`}),`
`,(0,c.jsxs)(t.ol,{children:[`
`,(0,c.jsxs)(t.li,{children:[`Usa `,(0,c.jsx)(t.code,{children:`PageHeader`}),` para la cabecera, `,(0,c.jsx)(t.code,{children:`SearchField`}),` para búsqueda y `,(0,c.jsx)(t.code,{children:`FilterChip`}),` para filtros.`]}),`
`,(0,c.jsxs)(t.li,{children:[`Compón acciones con `,(0,c.jsx)(t.code,{children:`Button`}),`; usa `,(0,c.jsx)(t.code,{children:`FormField`}),` para asociar etiqueta, ayuda y error.`]}),`
`,(0,c.jsxs)(t.li,{children:[`Expresa carga con `,(0,c.jsx)(t.code,{children:`Skeleton`}),`, ausencia de datos con `,(0,c.jsx)(t.code,{children:`EmptyState`}),` y mensajes con `,(0,c.jsx)(t.code,{children:`Notice`}),`.`]}),`
`,(0,c.jsxs)(t.li,{children:[`Usa `,(0,c.jsx)(t.code,{children:`SidePanel`}),` para lectura y edición; la aplicación lo conecta a su host de paneles.`]}),`
`,(0,c.jsx)(t.li,{children:`Revisa la pantalla en ambos temas, a 360 px y con navegación por teclado.`}),`
`]}),`
`,(0,c.jsx)(t.pre,{children:(0,c.jsx)(t.code,{className:`language-tsx`,children:`import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';

<FormField label="Nombre de la mesa" required error={error}>
  {(control) => <Input {...control} value={name} onChange={onChange} />}
</FormField>
<Button type="submit" loading={saving} loadingLabel="Guardando…">
  Crear mesa
</Button>
`})}),`
`,(0,c.jsx)(t.h2,{id:`convenciones`,children:`Convenciones`}),`
`,(0,c.jsxs)(t.p,{children:[`| Área         | Regla                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Color        | Usa roles semánticos: `,(0,c.jsx)(t.code,{children:`bg-surface-1`}),`, `,(0,c.jsx)(t.code,{children:`text-text-secondary`}),`, `,(0,c.jsx)(t.code,{children:`border-border`}),`, `,(0,c.jsx)(t.code,{children:`text-ember`}),`.                   |
| Acciones     | Una acción principal por contexto. `,(0,c.jsx)(t.code,{children:`outline`}),` para secundaria; `,(0,c.jsx)(t.code,{children:`destructive`}),` para consecuencias irreversibles. |
| Formularios  | Etiqueta visible, campos obligatorios señalados, errores asociados al control y valor conservado.             |
| Navegación   | El foco queda en el panel activo; Escape cierra un nivel y devuelve el foco.                                  |
| Mensajes     | Describe qué ocurrió y cómo continuar. Evita promesas de persistencia cuando el flujo es de demostración.     |
| Iconos       | Iconos decorativos con `,(0,c.jsx)(t.code,{children:`aria-hidden`}),`; controles de icono con `,(0,c.jsx)(t.code,{children:`aria-label`}),`.                                    |
| Dependencias | La biblioteca no conoce stores, endpoints ni modelos del negocio.                                             |`]}),`
`,(0,c.jsx)(t.h2,{id:`componentes-de-compatibilidad`,children:`Componentes de compatibilidad`}),`
`,(0,c.jsxs)(t.p,{children:[`Los primitivos de Radix/shadcn siguen disponibles. `,(0,c.jsx)(t.code,{children:`Dialog`}),` y `,(0,c.jsx)(t.code,{children:`AlertDialog`}),` abren
lateralmente. Para los flujos de la plataforma utiliza `,(0,c.jsx)(t.code,{children:`SidePanel`}),` y el host de
paneles existente, que gestiona foco y apilado. La aplicación utiliza Sonner;
`,(0,c.jsx)(t.code,{children:`Toast`}),` y el `,(0,c.jsx)(t.code,{children:`Toaster`}),` anterior se conservan como compatibilidad, sin crear un
segundo sistema de notificaciones.`]}),`
`,(0,c.jsx)(t.h2,{id:`pruebas-y-contribuciones`,children:`Pruebas y contribuciones`}),`
`,(0,c.jsx)(t.p,{children:`Cada nuevo componente debe incluir una historia con su uso real y sus estados
relevantes. Las historias se prueban en Chromium con Vitest; las comprobaciones de
accesibilidad se ejecutan con el addon a11y. Las pruebas automatizadas no certifican
por sí solas el cumplimiento completo de WCAG.`}),`
`,(0,c.jsx)(t.pre,{children:(0,c.jsx)(t.code,{className:`language-bash`,children:`bun run storybook
bun run storybook:build
bun run ui:test
`})})]})}function s(e={}){let{wrapper:t}={...n(),...e.components};return t?(0,c.jsx)(t,{...e,children:(0,c.jsx)(o,{...e})}):o(e)}var c;function l(){return(l=e((()=>{c=t(),r(),a()})))()}l();export{s as default};