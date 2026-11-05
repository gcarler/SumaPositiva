import React from "/root/polis/node_modules/react";
import { createRoot } from "/root/polis/node_modules/react-dom/client";
import { QueryClient, QueryClientProvider } from "/root/polis/node_modules/@tanstack/react-query/build/modern/index.js";
import { IndicadoresCatalogoView } from "/root/polis/src/features/indicadores/views/indicadores-catalogo-view";
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
createRoot(document.getElementById("root")!).render(React.createElement(QueryClientProvider,{client},React.createElement("main",null,React.createElement(IndicadoresCatalogoView))));
