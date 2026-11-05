/**
 * FB-ID-CONTRATOS-01 · Contraste de contratos de consumidor (Freebuff).
 * Entradas NO editadas:
 *  - bridge/181_evidencia_edd_identidad/contratos-identidad-final.json (congelado EDD):
 *    5 JSON Schemas finales y 8 respuestas HTTP reales sanitizadas (flags y otpauth_uri).
 *  - bridge/169_evidencia_eaf_identidad/contrato-mfa-respuestas-api-sanitizadas.json (respuestas reales EAF169)
 *  - bridge/169_evidencia_eaf_identidad/contrato-ambito-respuesta-api.json (respuesta real EAF169)
 * Los esquemas importados son la implementación real del consumidor Frontend:
 * ninguna entrada de este directorio modifica definiciones del producto, solo
 * contrasta y conserva el resultado.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  tokenSchema,
  usuarioSchema,
  mfaEstadoSchema,
  mfaIniciarSchema,
  ambitoTerritorialSchema,
} from "../../src/features/sesion/services/identidad-api.ts";

const dir = new URL("./", import.meta.url);
const congelado181 = JSON.parse(
  readFileSync(
    new URL("../../bridge/181_evidencia_edd_identidad/contratos-identidad-final.json", import.meta.url),
    "utf8",
  ),
);
const mfa169 = JSON.parse(
  readFileSync(
    new URL("../../bridge/169_evidencia_eaf_identidad/contrato-mfa-respuestas-api-sanitizadas.json", import.meta.url),
    "utf8",
  ),
);
const ambito169 = JSON.parse(
  readFileSync(
    new URL("../../bridge/169_evidencia_eaf_identidad/contrato-ambito-respuesta-api.json", import.meta.url),
    "utf8",
  ),
);

const { ejemplos } = congelado181;
const casos = [
  ["181 · login_limitado (real)", tokenSchema, ejemplos.login_limitado],
  ["181 · login_desafio (real)", tokenSchema, ejemplos.login_desafio],
  ["181 · login_completo (real)", tokenSchema, ejemplos.login_completo],
  ["181 · perfil_limitado (real)", usuarioSchema, ejemplos.perfil_limitado],
  ["181 · estado_pendiente (real)", mfaEstadoSchema, ejemplos.estado_pendiente],
  ["181 · estado_acreditado (real)", mfaEstadoSchema, ejemplos.estado_acreditado],
  ["181 · enrolamiento (real)", mfaIniciarSchema, ejemplos.enrolamiento],
  ["181 · ambito (real)", ambitoTerritorialSchema, ejemplos.ambito],
  ["169 · GET /identidad/mfa/estado (real, congelado EAF)", mfaEstadoSchema, mfa169.estado],
  ["169 · POST /identidad/mfa/iniciar (real, congelado EAF)", mfaIniciarSchema, mfa169.inicio],
  ["169 · POST /identidad/usuarios/{id}/ambitos (real, congelado EAF)", ambitoTerritorialSchema, ambito169],
];

const resultados = casos.map(([caso, schema, entrada]) => {
  const parsed = schema.safeParse(structuredClone(entrada));
  return {
    caso,
    aceptado: parsed.success,
    errores: parsed.success ? [] : parsed.error.issues.map(({ code, path }) => ({ code, path })),
  };
});

const salvaguardia = (() => {
  // El contrato del consumidor NO declara un último uso que la API no entrega
  // ni reinventa uri_totp; una respuesta antigua con uri_totp se rechaza.
  const parseAceptaAntiguo = mfaIniciarSchema.safeParse({
    secreto_b32: "X",
    uri_totp: "Y",
    qr_code_base64: "Z",
  });
  return {
    caso: "Salvaguardia: uri_totp/ultimo_uso_en ausentes del contrato",
    clave_uri_totp_descartada: !("uri_totp" in mfaIniciarSchema.shape),
    clave_ultimo_uso_en_descartada: !("ultimo_uso_en" in mfaEstadoSchema.shape),
    respuesta_con_uri_totp_aceptada: parseAceptaAntiguo.success,
  };
})();

const banderas181 = {
  caso: "Banderas finales de 181",
  login_limitado_marca_enrolamiento: ejemplos.login_limitado.mfa_enrolamiento_requerido === true,
  login_desafio_sin_enrolamiento: ejemplos.login_desafio.mfa_enrolamiento_requerido === false && ejemplos.login_desafio.mfa_requerido === true,
  completo_acredita: ejemplos.login_completo.mfa_enrolamiento_requerido === false && ejemplos.login_completo.mfa_requerido === false,
  estado_usa_sesion_verificada:
    ejemplos.estado_pendiente.sesion_verificada === false &&
    ejemplos.estado_acreditado.sesion_verificada === true,
};

mkdirSync(dir, { recursive: true });
writeFileSync(
  new URL("contrato-contraste-resultado.json", dir),
  JSON.stringify({ fecha: new Date().toISOString(), resultados, banderas181, salvaguardia }, null, 2) + "\n",
);

const todoOk =
  resultados.every((r) => r.aceptado) &&
  Object.entries(banderas181)
    .filter(([k]) => k !== "caso")
    .every(([, v]) => v === true) &&
  salvaguardia.clave_uri_totp_descartada &&
  salvaguardia.clave_ultimo_uso_en_descartada &&
  !salvaguardia.respuesta_con_uri_totp_aceptada;
console.log(JSON.stringify({ resultados, banderas181, salvaguardia, todo_ok: todoOk }));
process.exitCode = todoOk ? 0 : 1;
