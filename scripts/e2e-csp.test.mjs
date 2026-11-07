import assert from "node:assert/strict";
import { test } from "node:test";
import { cabecerasCspEnsayo, leerCspEnsayo } from "./e2e-csp.mjs";

const base = "default-src 'self'; script-src 'self'; object-src 'none'; report-uri /api/v1/seguridad/csp-report;";
function documento(valor = base, otro = valor) {
  return `add_header Content-Security-Policy-Report-Only "${valor}" always;\n# add_header Content-Security-Policy "${otro}" always;\n`;
}

test("el ensayo CSP está desactivado por defecto", () => {
  assert.equal(leerCspEnsayo({}), null);
});
test("solo admite enforce explícito y la política idéntica en ambos modos", () => {
  assert.throws(() => leerCspEnsayo({ POLIS_E2E_CSP: "otro" }));
  assert.throws(() => leerCspEnsayo({ POLIS_E2E_CSP: "enforce" }, documento(base, base + " img-src *;")));
  assert.throws(() => leerCspEnsayo({ POLIS_E2E_CSP: "enforce" }, ""));
});
test("rechaza unsafe-eval y la ausencia de las directivas requeridas", () => {
  for (const valor of [base + " 'unsafe-eval';", base.replace("object-src 'none';", ""), base.replace("report-uri /api/v1/seguridad/csp-report;", "")]) {
    assert.throws(() => leerCspEnsayo({ POLIS_E2E_CSP: "enforce" }, documento(valor)));
  }
});
test("conserva literalmente la política y sustituye cabeceras previas sin mutarlas", () => {
  const politica = leerCspEnsayo({ POLIS_E2E_CSP: "enforce" }, documento());
  assert.equal(politica.valor, base);
  assert.match(politica.sha256, /^[a-f0-9]{64}$/);
  const anteriores = { "Content-Security-Policy": "otra", "CONTENT-SECURITY-POLICY-REPORT-ONLY": "otra", "content-type": "text/html" };
  const nuevas = cabecerasCspEnsayo(anteriores, politica);
  assert.deepEqual(Object.keys(nuevas).sort(), ["content-security-policy", "content-type", "reporting-endpoints"]);
  assert.equal(nuevas["content-security-policy"], base);
  assert.equal(anteriores["Content-Security-Policy"], "otra");
});
test("el modo por defecto conserva las cabeceras originales", () => {
  const cabeceras = { "content-security-policy": "propia" };
  assert.equal(cabecerasCspEnsayo(cabeceras, null), cabeceras);
});
test("la referencia del repositorio es válida sin cambiar su modo real", () => {
  assert.equal(leerCspEnsayo({ POLIS_E2E_CSP: "enforce" }).modo, "enforce");
});
