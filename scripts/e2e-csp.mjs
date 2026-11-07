/** Ensayo optativo de la política de referencia; nunca recarga el proxy real. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";

export function leerCspEnsayo(env = process.env, contenido) {
  if (!env.POLIS_E2E_CSP) return null;
  if (env.POLIS_E2E_CSP !== "enforce") throw new Error("POLIS_E2E_CSP solo admite enforce");
  const documento = contenido ?? fs.readFileSync(new URL("../docs/nginx-csp-polis.conf", import.meta.url), "utf8");
  const observado = documento.match(/^add_header Content-Security-Policy-Report-Only "([^"\n]+)" always;$/m)?.[1];
  const exigido = documento.match(/^# add_header Content-Security-Policy "([^"\n]+)" always;$/m)?.[1];
  if (!observado || exigido !== observado) throw new Error("Los modos CSP de referencia deben coincidir exactamente");
  if (exigido.includes("'unsafe-eval'") || !exigido.includes("object-src 'none';") ||
      !exigido.includes("report-uri /api/v1/seguridad/csp-report;")) {
    throw new Error("La política de ensayo no conserva las directivas requeridas");
  }
  return Object.freeze({ modo: "enforce", valor: exigido, sha256: createHash("sha256").update(exigido).digest("hex") });
}

export function cabecerasCspEnsayo(cabeceras, politica) {
  if (!politica) return cabeceras;
  const limpio = Object.fromEntries(Object.entries(cabeceras).filter(([clave]) =>
    !["content-security-policy", "content-security-policy-report-only", "reporting-endpoints"].includes(clave.toLowerCase())));
  return {
    ...limpio,
    "content-security-policy": politica.valor,
    "reporting-endpoints": 'csp-endpoint="/api/v1/seguridad/csp-report"',
  };
}

function rutaSinConsulta(valor) {
  if (["data", "blob"].includes(valor)) return valor + ":";
  try {
    const url = new URL(valor);
    return ["http:", "https:"].includes(url.protocol) ? url.origin + url.pathname : url.protocol;
  } catch { return valor; }
}

export async function observarCsp(contexto, rol) {
  const violaciones = [];
  await contexto.exposeBinding("__polisRegistrarCspEnsayo", (_origen, dato) => {
    violaciones.push({ rol, ...dato, documento: rutaSinConsulta(dato.documento), bloqueado: rutaSinConsulta(dato.bloqueado) });
  });
  await contexto.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", evento => {
      window.__polisRegistrarCspEnsayo({
        documento: evento.documentURI, bloqueado: evento.blockedURI,
        directiva: evento.effectiveDirective, disposicion: evento.disposition,
      });
    });
  });
  return { rol, violaciones };
}

export async function comprobarBloqueoCsp(browser, baseUrl, politica) {
  const contexto = await browser.newContext();
  try {
    const registro = await observarCsp(contexto, "sonda_controlada");
    const pagina = await contexto.newPage();
    const respuesta = await pagina.goto(baseUrl, { waitUntil: "networkidle" });
    assert.equal(respuesta.headers()["content-security-policy"], politica.valor);
    assert.equal(respuesta.headers()["content-security-policy-report-only"], undefined);
    await pagina.evaluate(() => {
      window.__polisSondaCspEjecuto = false;
      const script = document.createElement("script");
      script.src = "data:text/javascript,window.__polisSondaCspEjecuto=true";
      document.head.appendChild(script);
    });
    const fin = Date.now() + 5000;
    while (!registro.violaciones.length && Date.now() < fin) await pagina.waitForTimeout(50);
    assert.equal(await pagina.evaluate(() => window.__polisSondaCspEjecuto), false);
    const esperadas = registro.violaciones.filter(v => v.bloqueado === "data:" &&
      v.directiva === "script-src-elem" && v.disposicion === "enforce");
    assert.ok(esperadas.length > 0, "El navegador debe acreditar el bloqueo activo de la sonda");
    assert.equal(registro.violaciones.length, esperadas.length, "La sonda no oculta violaciones de la aplicación");
    return { bloqueo_activo: true, violaciones_esperadas: esperadas };
  } finally { await contexto.close(); }
}
