#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(process.cwd());
export const DEFAULT_DIST_DIR = ".next";
const PUBLIC_DIRNAME = "public";
const DEFAULT_NEXT_BIN = "node_modules/next/dist/bin/next";

function isFile(ruta) {
  try {
    return fs.statSync(ruta).isFile();
  } catch {
    return false;
  }
}

function isDirectory(ruta) {
  try {
    return fs.statSync(ruta).isDirectory();
  } catch {
    return false;
  }
}

function isSymlink(ruta) {
  try {
    return fs.lstatSync(ruta).isSymbolicLink();
  } catch {
    return false;
  }
}

function relative_to_root(root, destination) {
  const rootReal = path.resolve(root);
  const destinationReal = path.resolve(destination);
  const relative = path.relative(rootReal, destinationReal);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`distDir debe permanecer dentro de ${rootReal}`);
  }
  return relative;
}

function walk_without_symlinks(root, destination) {
  const rootReal = path.resolve(root);
  const destinationReal = path.resolve(destination);
  const relative = path.relative(rootReal, destinationReal);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error("distDir no puede ser la raíz ni salir del proyecto");
  }
  let accumulated = path.resolve(rootReal);
  for (const component of relative.split(path.sep)) {
    if (!component || component === ".") continue;
    accumulated = path.join(accumulated, component);
    if (isSymlink(accumulated)) {
      throw new Error(`distDir no puede recorrer un enlace simbólico: ${accumulated}`);
    }
  }
}

export function resolver_direccion(root, distDir=DEFAULT_DIST_DIR) {
  if (!distDir || distDir === "." || distDir === "..") {
    throw new Error("distDir no puede ser raíz ni vacío");
  }
  if (path.isAbsolute(distDir)) {
    throw new Error("distDir debe ser una ruta relativa al proyecto");
  }
  const rootReal = path.resolve(root);
  const distDirReal = path.resolve(rootReal, distDir);
  relative_to_root(rootReal, distDirReal);
  walk_without_symlinks(rootReal, distDirReal);
  return distDirReal;
}

function copiar_arbol(origen, destino) {
  if (!isDirectory(origen)) throw new Error(`Origen no es carpeta: ${origen}`);
  if (isSymlink(origen)) throw new Error(`Origen simbólico no permitido: ${origen}`);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.mkdirSync(destino, { recursive: false });
  for (const entrada of fs.readdirSync(origen, { withFileTypes: true })) {
    const origenEntrada = path.join(origen, entrada.name);
    const destinoEntrada = path.join(destino, entrada.name);
    if (isSymlink(origenEntrada)) {
      throw new Error(`Entrada simbólica no permitida: ${origenEntrada}`);
    }
    if (entrada.isDirectory()) {
      copiar_arbol(origenEntrada, destinoEntrada);
    } else if (entrada.isFile()) {
      fs.copyFileSync(origenEntrada, destinoEntrada);
    } else {
      throw new Error(`Entrada no soportada: ${origenEntrada}`);
    }
  }
}

function solapamiento(origen, destino) {
  const destinoReal = path.resolve(destino);
  const origenReal = path.resolve(origen);
  const relative = path.relative(origenReal, destinoReal);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && relative !== "";
}

export function ensamblar(root, distDir) {
  const rootReal = path.resolve(root);
  const distDirReal = path.resolve(distDir);
  const rootRelativo = relative_to_root(rootReal, distDirReal);
  const standalone = path.join(distDirReal, "standalone");
  const origenStatic = path.join(distDirReal, "static");
  const destinoStatic = path.join(standalone, rootRelativo, "static");
  const origenPublic = path.join(rootReal, PUBLIC_DIRNAME);
  const destinoPublic = path.join(standalone, PUBLIC_DIRNAME);
  const rutaServerJs = path.join(standalone, "server.js");

  if (!isDirectory(origenStatic)) throw new Error(`Falta build estático: ${origenStatic}`);
  if (!isDirectory(origenPublic)) throw new Error(`Falta public: ${origenPublic}`);
  if (!isFile(rutaServerJs)) throw new Error(`Falta standalone server.js: ${rutaServerJs}`);
  if (isSymlink(rutaServerJs)) throw new Error(`server.js simbólico no permitido: ${rutaServerJs}`);

  walk_without_symlinks(rootReal, destinoStatic);
  walk_without_symlinks(rootReal, destinoPublic);

  if (solapamiento(origenPublic, destinoPublic)) {
    throw new Error("El destino public no puede solaparse con el origen public");
  }
  if (solapamiento(origenStatic, destinoStatic)) {
    throw new Error("El destino static no puede solaparse con el origen static");
  }

  copiar_arbol(origenStatic, destinoStatic);
  copiar_arbol(origenPublic, destinoPublic);

  return {
    distDir: rootRelativo,
    standalone,
    origenStatic,
    destinoStatic,
    origenPublic,
    destinoPublic,
    serverJs: rutaServerJs,
  };
}

export function construir(root=ROOT, options={}) {
  const rootReal = path.resolve(root);
  const candidatoDist =
    options.distDir ??
    process.env.POLIS_NEXT_DIST_DIR ??
    DEFAULT_DIST_DIR;
  const distDir = resolver_direccion(rootReal, candidatoDist);
  const nextBin = options.nextBin ?? process.env.POLIS_NEXT_BIN ?? DEFAULT_NEXT_BIN;
  const env = { ...(options.env ?? process.env) };
  env.POLIS_NEXT_DIST_DIR = candidatoDist;
  if (options.nextBin) env.POLIS_NEXT_BIN = options.nextBin;
  const argumentos = [nextBin, "build"];
  const ejecucion = spawnSync(process.execPath, argumentos, {
    cwd: rootReal,
    env,
    stdio: options.stdio ?? "inherit",
    shell: false,
  });
  if (ejecucion.status !== 0) return {ok:false, code: ejecucion.status ?? 1, dist_dir: candidatoDist};
  const ensamblado = ensamblar(rootReal, distDir);
  return {ok:true, code:0, dist_dir: candidatoDist, ensamblado};
}

const modulePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === modulePath) {
  const resultado = construir(ROOT, {
    distDir: process.env.POLIS_NEXT_DIST_DIR,
    nextBin: process.env.POLIS_NEXT_BIN,
    stdio: "inherit"
  });
  if (process.env.POLIS_BUILD_DEBUG === "1") {
    console.log(resultado);
  }
  process.exit(resultado.code);
}
