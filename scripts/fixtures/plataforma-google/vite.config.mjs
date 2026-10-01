import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
const fixture = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('../../../', import.meta.url));
export default defineConfig({
  root: fixture,
  plugins: [tailwind()],
  resolve: { alias: {
    '@': `${repo}/src`,
    'next/navigation': `${fixture}/navigation.mjs`,
    'next/link': `${fixture}/link.jsx`,
  }, dedupe: ['react', 'react-dom'] },
  server: { hmr: false, host: '127.0.0.1', port: 3204, strictPort: true, fs: { allow: [repo] } },
  oxc: { jsx: { runtime: 'automatic' } },
});
