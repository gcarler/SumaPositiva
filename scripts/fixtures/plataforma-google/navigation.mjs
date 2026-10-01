export const useRouter = () => ({ push: ruta => { window.__ruta = ruta; }, replace: ruta => { window.__ruta = ruta; } });
export const usePathname = () => '/';
