import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import {mkdtempSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

import {
  construir,
  ensamblar,
  resolver_direccion,
  DEFAULT_DIST_DIR,
} from "./build-polis.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function raizTemporal() {
  const base = path.join(fs.realpathSync(os.tmpdir()), "polis-build-");
  return fs.realpathSync(mkdtempSync(base));
}

function escribir(ruta, contenido="x") {
  fs.mkdirSync(path.dirname(ruta), {recursive:true});
  fs.writeFileSync(ruta, contenido);
}

function preparar(raiz, distDir) {
  fs.mkdirSync(raiz, {recursive:true});
  escribir(path.join(raiz, "public/index.html"));
  escribir(path.join(raiz, distDir, "static/app.js"));
  escribir(path.join(raiz, distDir, "standalone/server.js"));
}

function fakeNext(ruta, exitCode, salida="fake-next-build") {
  const contenido = `
    import fs from "node:fs";
    import path from "node:path";
    const distDir = path.resolve(process.env.POLIS_NEXT_DIST_DIR ?? ".next");
    fs.mkdirSync(path.join(distDir, "static"), {recursive:true});
    fs.writeFileSync(path.join(distDir, "static", "app.js"), "x");
    fs.mkdirSync(path.join(distDir, "standalone"), {recursive:true});
    fs.writeFileSync(path.join(distDir, "standalone", "server.js"), "x");
    console.log(${JSON.stringify(salida)});
    process.exit(${exitCode});
  `;
  fs.writeFileSync(ruta, contenido, {mode:0o755});
  return ruta;
}


test("resolver distDir default", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  const distDir = resolver_direccion(root);
  assert.equal(path.resolve(distDir), path.resolve(root, DEFAULT_DIST_DIR));
});

test("resolver distDir alternativo interno", () => {
  const root = raizTemporal();
  preparar(root, "build/isolated");
  const distDir = resolver_direccion(root, "build/isolated");
  assert.equal(path.resolve(distDir), path.resolve(root, "build/isolated"));
});

test("distDir absoluto y raíz se rechazan", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  assert.throws(() => resolver_direccion(root, "/tmp/polis-absoluto"), /debe ser una ruta relativa/);
  assert.throws(() => resolver_direccion(root, root), /debe ser una ruta relativa/);
});

test("distDir fuera del proyecto se rechaza", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  assert.throws(() => resolver_direccion(root, "../fuera"), /distDir debe permanecer dentro de/);
});

test("distDir con symlink se rechaza", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  const destinoReal = path.join(root, "build/isolated");
  fs.mkdirSync(destinoReal, {recursive:true});
  fs.symlinkSync(destinoReal, path.join(root, "build/enlace"));
  assert.throws(() => resolver_direccion(root, "build/enlace"), /no puede recorrer un enlace simbólico/);
});

test("destination en enlace simbólico se rechaza", () => {
  const root = raizTemporal();
  preparar(root, "build/isolated");
  const external = fs.mkdtempSync(path.join(os.tmpdir(), "polis-ext-"));
  fs.symlinkSync(external, path.join(root, "build/enlace"));
  fs.mkdirSync(path.join(external, "static"), {recursive:true});
  fs.writeFileSync(path.join(external, "static/app.js"), "x");
  fs.mkdirSync(path.join(external, "standalone"), {recursive:true});
  fs.writeFileSync(path.join(external, "standalone/server.js"), "x");
  assert.throws(() => ensamblar(root, path.resolve(root, "build/enlace")), /no puede recorrer un enlace simbólico/);
  assert.equal(fs.existsSync(path.join(external, "standalone/build/enlace")), false);
});

test("destination archivo se rechaza", () => {
  const root = raizTemporal();
  preparar(root, "build/isolated");
  const destinoArchivo = path.join(root, "build/archivo");
  escribir(destinoArchivo, "archivo");
  assert.throws(() => ensamblar(root, path.resolve(root, "build/archivo")), /Falta build estático|Falta standalone server.js|Falta public/);
  assert.equal(fs.readFileSync(destinoArchivo, "utf8"), "archivo");
});

test("default usa ruta literal de estáticos", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  const distDir = path.resolve(root, DEFAULT_DIST_DIR);
  const resultado = ensamblar(root, distDir);
  assert.equal(
    fs.readFileSync(path.join(resultado.destinoStatic, "app.js"), "utf8"),
    "x",
  );
  assert.equal(
    fs.readFileSync(
      path.join(
        distDir,
        "standalone",
        DEFAULT_DIST_DIR,
        "static",
        "app.js",
      ),
      "utf8",
    ),
    "x",
  );
});

test("alternativa usa ruta literal de estáticos", () => {
  const root = raizTemporal();
  preparar(root, "build/isolated");
  const distDir = path.resolve(root, "build/isolated");
  const resultado = ensamblar(root, distDir);
  assert.equal(
    fs.readFileSync(path.join(resultado.destinoStatic, "app.js"), "utf8"),
    "x",
  );
  assert.equal(
    fs.readFileSync(
      path.join(distDir, "standalone", "build", "isolated", "static", "app.js"),
      "utf8",
    ),
    "x",
  );
});

test("public no se duplica", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  const resultado = ensamblar(root, path.resolve(root, DEFAULT_DIST_DIR));
  assert.equal(fs.readFileSync(path.join(resultado.destinoPublic, "index.html"), "utf8"), "x");
  assert.equal(fs.existsSync(path.join(resultado.destinoPublic, "public")), false);
});

test("distDir public/build se rechaza", () => {
  const root = raizTemporal();
  preparar(root, "public/build");
  assert.throws(() => ensamblar(root, path.resolve(root, "public/build")), /solaparse/);
});

test("falta build estático", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  fs.rmSync(path.join(root, DEFAULT_DIST_DIR, "static"), {recursive:true, force:true});
  assert.throws(() => ensamblar(root, path.resolve(root, DEFAULT_DIST_DIR)), /Falta build estático/);
});

test("falta server.js", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  fs.rmSync(path.join(root, DEFAULT_DIST_DIR, "standalone/server.js"), {force:true});
  assert.throws(() => ensamblar(root, path.resolve(root, DEFAULT_DIST_DIR)), /Falta standalone server.js/);
});

test("falta public", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  fs.rmSync(path.join(root, "public"), {recursive:true, force:true});
  assert.throws(() => ensamblar(root, path.resolve(root, DEFAULT_DIST_DIR)), /Falta public/);
});

test("fallo compilador no ensambla", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  const fake = path.join(root, "fake-next.mjs");
  fakeNext(fake, 1);
  const resultado = construir(root, {
    distDir: DEFAULT_DIST_DIR,
    nextBin: fake,
    stdio:"pipe",
  });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.code, 1);
  assert.equal(fs.existsSync(path.join(root, DEFAULT_DIST_DIR, "standalone", DEFAULT_DIST_DIR, "static")), false);
});

test("CLI real con fake Next", () => {
  const root = raizTemporal();
  preparar(root, "build/isolated");
  const fake = path.join(root, "fake-next.mjs");
  fakeNext(fake, 0);
  const script = path.join(RAIZ, "build-polis.mjs");
  const resultado = spawnSync(
    process.execPath,
    [script],
    {
      cwd: root,
      env: {
        ...process.env,
        POLIS_NEXT_BIN: fake,
        POLIS_NEXT_DIST_DIR: "build/isolated",
      },
      stdio: "pipe",
      encoding: "utf8",
    },
  );
  assert.equal(resultado.status, 0);
  assert.ok(resultado.stdout.includes("fake-next-build"));
  assert.equal(resultado.stderr, "");
  assert.equal(
    fs.readFileSync(
      path.join(root, "build/isolated/standalone/build/isolated/static/app.js"),
      "utf8",
    ),
    "x",
  );
  assert.equal(fs.readFileSync(path.join(root, "build/isolated/standalone/public/index.html"), "utf8"), "x");
  assert.equal(fs.readFileSync(path.join(root, "build/isolated/standalone/server.js"), "utf8"), "x");
});

test("CLI real con fallo de compilador", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  const fake = path.join(root, "fake-next.mjs");
  fakeNext(fake, 1);
  const script = path.join(RAIZ, "build-polis.mjs");
  const resultado = spawnSync(
    process.execPath,
    [script],
    {
      cwd: root,
      env: {
        ...process.env,
        POLIS_NEXT_BIN: fake,
        POLIS_NEXT_DIST_DIR: DEFAULT_DIST_DIR,
      },
      stdio: "pipe",
      encoding: "utf8",
    },
  );
  assert.equal(resultado.status, 1);
  assert.equal(resultado.stdout.includes("fake-next-build"), true);
  assert.equal(fs.existsSync(path.join(root, DEFAULT_DIST_DIR, "standalone", DEFAULT_DIST_DIR, "static")), false);
});

test("distDir inválido lanza", () => {
  const root = raizTemporal();
  preparar(root, DEFAULT_DIST_DIR);
  const fake = path.join(root, "fake-next.mjs");
  fakeNext(fake, 0);
  assert.throws(() => construir(root, {distDir:"/tmp/no-permitido", nextBin:fake, stdio:"pipe"}), /debe ser una ruta relativa/);
});
