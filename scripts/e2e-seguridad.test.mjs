import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";
import { comprobarPuertosLibres, leerConfiguracionE2E } from "./e2e-seguridad.mjs";

const entorno = {
  POLIS_DB_HOST: "127.0.0.1", POLIS_DB_PORT: "5433", POLIS_DB_USER: "polis_test_runner",
  POLIS_DB_PASS: "solo_fixture", POLIS_E2E_DB_NAME: "polis_test_e2e",
  POLIS_TEMPLATE_DB_NAME: "polis_test_plantilla",
};

test("acepta configuración local de pruebas y codifica la contraseña", () => {
  const c = leerConfiguracionE2E({ ...entorno, POLIS_DB_PASS: "fixture@con:signos" });
  assert.equal(c.databaseUrl, "postgresql+asyncpg://polis_test_runner:fixture%40con%3Asignos@127.0.0.1:5433/polis_test_e2e");
});

for (const cambios of [
  { POLIS_E2E_DB_NAME: "bd_csh" }, { POLIS_TEMPLATE_DB_NAME: "bd_csh" },
  { POLIS_E2E_DB_NAME: "polis_test_x; DROP DATABASE polis" },
  { POLIS_TEMPLATE_DB_NAME: "polis_test_e2e" }, { POLIS_DB_PORT: "5432" },
  { POLIS_DB_HOST: "servidor-remoto" }, { POLIS_DB_PASS: "" },
  { E2E_BACKEND_PORT: "8000" }, { E2E_PROXY_PORT: "3000" },
  { E2E_BACKEND_PORT: "3100" }, { E2E_PROXY_PORT: "5433" },
  { E2E_PROXY_PORT: "1; echo invalido" }, { E2E_PROXY_PORT: "0" },
  { POLIS_DB_USER: "rol; SQL" },
]) {
  test(`rechaza configuración insegura: ${JSON.stringify(cambios)}`, () => {
    assert.throws(() => leerConfiguracionE2E({ ...entorno, ...cambios }));
  });
}

test("un puerto ocupado se rechaza conservando su servidor", async () => {
  const servidor = net.createServer();
  await new Promise(resolve => servidor.listen(0, "127.0.0.1", resolve));
  const numero = servidor.address().port;
  try {
    await assert.rejects(comprobarPuertosLibres([numero]), /ocupado/);
    assert.equal(servidor.listening, true);
  } finally {
    await new Promise(resolve => servidor.close(resolve));
  }
});
