import { listarAportes, crearAporte, obtenerSesionAnonima, respaldarAporte } from "../src/features/aportes/services/aportes-api";
import { setBearerToken, apiFetch } from "../src/core/http/api-client";

// Mock localStorage para el entorno de node/bun
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};

async function ejecutar() {
  console.log("🚀 Iniciando prueba E2E de persistencia (Frontend -> FastAPI -> PostgreSQL)...");

  // Reconfigurar apiFetch para apuntar al backend local completo (ya que Next.js en bun lo resolvería como localhost)
  // En NextJS normal es /api/v1 (proxy), pero en Bun directo es necesario la URL completa.
  // Inyectar un BASE_URL en el fetch
  const API_URL = "http://127.0.0.1:8000/api/v1";
  
  const originalFetch = global.fetch;
  global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    if (typeof url === 'string' && url.startsWith('/')) {
      if (url.startsWith('/api/v1')) {
        url = `http://127.0.0.1:8000${url}`;
      } else {
        url = `${API_URL}${url}`;
      }
    }
    return originalFetch(url, init);
  };

  try {
    console.log("1. Emitiendo sesión anónima...");
    const sesion = await obtenerSesionAnonima();
    console.log("✅ Sesión creada. Token:", sesion.token_acceso.slice(0, 15) + "...");
    setBearerToken(sesion.token_acceso);

    console.log("2. Consultando líneas estratégicas disponibles...");
    const lineas = await apiFetch<Array<{ id: string }>>("/politicas/lineas");
    if (lineas.length === 0) {
      console.error("❌ No hay líneas estratégicas creadas en la base de datos.");
      return;
    }
    
    const lineaId = lineas[0].id;
    console.log("✅ Línea estratégica seleccionada:", lineaId);

    console.log("3. Creando aporte ciudadano (propuesta)...");
    const nuevoAporte = await crearAporte({
      linea_id: lineaId,
      tipo_aporte: "propuesta",
      titulo: "Propuesta E2E Automatizada",
      descripcion: "Esta es una propuesta creada de manera automatizada para validar la persistencia E2E.",
      autor_nombre: "Test E2E",
      es_anonimo: true,
    });
    console.log("✅ Aporte creado con ID:", nuevoAporte.id);

    console.log("4. Listando aportes para la línea estratégica...");
    const paginacion = await listarAportes({ linea_id: lineaId });
    const encontrado = paginacion.elementos.find((a) => a.id === nuevoAporte.id);
    if (encontrado) {
      console.log("✅ El aporte persiste en la base de datos y se recupera correctamente.");
    } else {
      console.error("❌ El aporte no apareció en el listado.");
      return;
    }

    console.log("5. Respaldando el aporte...");
    const respaldo = await respaldarAporte(nuevoAporte.id);
    console.log("✅ Aporte respaldado. Apoyos actuales:", respaldo.apoyos_contador);

    console.log("🎉 Prueba E2E completada exitosamente.");
  } catch (error: unknown) {
    console.error("❌ Error durante la prueba E2E:");
    console.error(error);
    process.exit(1);
  }
}

ejecutar();
