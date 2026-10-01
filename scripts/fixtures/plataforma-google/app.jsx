import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SesionPanel } from '@/features/sesion/panels/sesion-panel';
import { useSesionStore } from '@/features/sesion/state/session-store';
import { usePanelStore } from '@/core/panels/panel-store';
import './style.css';
useSesionStore.setState({ sesion: null, cargando: false });
const entry = usePanelStore.getState().openPanel('sesion', {});
window.__panelCount = () => usePanelStore.getState().entries.length;
createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={new QueryClient()}>
    <GoogleOAuthProvider clientId="cliente-qa-local"><SesionPanel entryKey={entry} /></GoogleOAuthProvider>
  </QueryClientProvider>,
);
