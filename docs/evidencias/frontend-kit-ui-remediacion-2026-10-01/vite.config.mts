import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({root:'/tmp/polis-auditoria-frontend',plugins:[tailwindcss()],resolve:{alias:{'@':'/tmp/polis-auditoria-frontend/src-remediacion'},dedupe:['react','react-dom']},server:{hmr:false,host:'127.0.0.1',port:3199,strictPort:true,fs:{allow:['/root/polis','/tmp/polis-auditoria-frontend']}},oxc:{jsx:{runtime:'automatic'}}});
