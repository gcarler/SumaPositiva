import net from "node:net";

const BASE_PRUEBAS = /^polis_test[a-z0-9_]*$/;
const IDENTIFICADOR = /^[a-z_][a-z0-9_]{0,62}$/;

function puerto(valor, nombre) {
  if (!/^\d+$/.test(String(valor ?? ""))) {
    throw new Error(`${nombre} debe ser un puerto explícito`);
  }
  const numero = Number(valor);
  if (numero < 1024 || numero > 65535) {
    throw new Error(`${nombre} fuera del rango de laboratorio`);
  }
  return numero;
}

export function leerConfiguracionE2E(env = process.env) {
  const dbHost = env.POLIS_DB_HOST;
  if (!["127.0.0.1", "localhost", "::1"].includes(dbHost)) {
    throw new Error("E2E requiere un host PostgreSQL local explícito");
  }
  const dbPort = puerto(env.POLIS_DB_PORT, "POLIS_DB_PORT");
  if (dbPort === 5432) throw new Error("El puerto PostgreSQL productivo está reservado");
  const dbName = env.POLIS_E2E_DB_NAME;
  const templateName = env.POLIS_TEMPLATE_DB_NAME;
  for (const nombre of [dbName, templateName]) {
    if (!BASE_PRUEBAS.test(nombre ?? "") || nombre.length > 63) {
      throw new Error("Origen y destino E2E deben ser bases explícitas polis_test*");
    }
  }
  if (dbName === templateName) throw new Error("La plantilla E2E debe ser otra base");
  const dbUser = env.POLIS_DB_USER;
  if (!IDENTIFICADOR.test(dbUser ?? "")) throw new Error("Rol PostgreSQL E2E inválido");
  const dbPass = env.POLIS_DB_PASS || env.PGPASSWORD;
  if (!dbPass) throw new Error("E2E requiere credenciales de laboratorio explícitas");
  const backendPort = puerto(env.E2E_BACKEND_PORT ?? "8100", "E2E_BACKEND_PORT");
  const frontendPort = puerto(env.E2E_FRONTEND_STANDALONE_PORT ?? "3105", "E2E_FRONTEND_STANDALONE_PORT");
  const proxyPort = puerto(env.E2E_PROXY_PORT ?? "3100", "E2E_PROXY_PORT");
  const puertos = [backendPort, frontendPort, proxyPort];
  if (new Set(puertos).size !== 3 || puertos.some(p => [3000, 8000, 5432, dbPort].includes(p))) {
    throw new Error("Los puertos HTTP E2E deben ser distintos y no productivos");
  }
  const hostUrl = dbHost === "::1" ? "[::1]" : dbHost;
  return {
    backendPort, frontendPort, proxyPort, dbHost, dbPort, dbUser, dbName, templateName,
    databaseUrl: `postgresql+asyncpg://${dbUser}:${encodeURIComponent(dbPass)}@${hostUrl}:${dbPort}/${dbName}`,
    frontendServer: env.POLIS_E2E_FRONTEND_SERVER || ".next/standalone/server.js",
  };
}

export async function comprobarPuertosLibres(puertos) {
  const servidores = [];
  try {
    for (const numero of puertos) {
      const servidor = net.createServer();
      servidores.push(servidor);
      await new Promise((resolve, reject) => {
        servidor.once("error", error => reject(new Error(`Puerto de laboratorio ${numero} ocupado: ${error.code}`)));
        servidor.listen(numero, "127.0.0.1", resolve);
      });
    }
  } finally {
    await Promise.all(servidores.map(servidor => new Promise(resolve => {
      if (servidor.listening) servidor.close(resolve);
      else resolve();
    })));
  }
}
