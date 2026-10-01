import {defineConfig} from 'vite';
import tailwind from '@tailwindcss/vite';
export default defineConfig({root:'/tmp/polis-formularios-browser',plugins:[tailwind()],resolve:{alias:{'@':'/root/polis/src'},dedupe:['react','react-dom']},server:{hmr:false,host:'127.0.0.1',port:3202,strictPort:true,fs:{allow:['/root/polis','/tmp/polis-formularios-browser']}},oxc:{jsx:{runtime:'automatic'}}});
