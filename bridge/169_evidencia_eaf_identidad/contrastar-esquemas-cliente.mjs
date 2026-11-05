import { readFileSync, writeFileSync } from "node:fs";
import {
  mfaEstadoSchema,
  mfaIniciarSchema,
  ambitoTerritorialSchema,
} from "../../src/features/sesion/services/identidad-api.ts";

const dir = new URL("./", import.meta.url);
const mfa = JSON.parse(readFileSync(new URL("contrato-mfa-respuestas-api-sanitizadas.json", dir), "utf8"));
const ambito = JSON.parse(readFileSync(new URL("contrato-ambito-respuesta-api.json", dir), "utf8"));
const results = [
  ["GET /identidad/mfa/estado", mfaEstadoSchema, mfa.estado],
  ["POST /identidad/mfa/iniciar", mfaIniciarSchema, mfa.inicio],
  ["POST /identidad/usuarios/{id}/ambitos", ambitoTerritorialSchema, ambito],
].map(([ruta, schema, body]) => {
  const parsed = schema.safeParse(body);
  return {
    ruta,
    claves_respuesta_api: Object.keys(body),
    cliente_acepta_respuesta: parsed.success,
    errores: parsed.success ? [] : parsed.error.issues.map(({ code, path, expected }) => ({ code, path, expected })),
  };
});
writeFileSync(new URL("contratos-cliente-resultado.json", dir), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.every((r) => r.cliente_acepta_respuesta) ? 0 : 1;
