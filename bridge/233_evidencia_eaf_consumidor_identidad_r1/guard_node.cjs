// Solo infraestructura del evaluador. Node HTTP/TCP/DNS y escrituras del repo.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const dns = require('node:dns');
const out = process.env.POLIS_EAF_EVIDENCE;
if (!out || !out.endsWith('/233_evidencia_eaf_consumidor_identidad_r1')) throw Error('Guarda Node sin evidencia211');
const root = path.resolve(out, '../..');
const isLocal = host => host == null || ['localhost','127.0.0.1','::1','0.0.0.0','::'].includes(String(host));
const rejectHost = host => { if (!isLocal(host)) throw Error('Guarda Node EAF: red externa rechazada'); };
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const value = Array.isArray(args[0]) ? args[0] : args;
  if (typeof value[0] === 'object' && value[0] !== null) rejectHost(value[0].host ?? value[0].hostname);
  else if (typeof value[0] === 'number') rejectHost(typeof value[1] === 'string' ? value[1] : undefined);
  else if (typeof value[0] === 'string' && /^\d+$/.test(value[0])) rejectHost(value[1]);
  return originalConnect.apply(this, args);
};
const originalLookup = dns.lookup;
dns.lookup = function (host, ...args) { rejectHost(host); return originalLookup.call(this, host, ...args); };
const originalPromisesLookup = dns.promises.lookup;
dns.promises.lookup = async function (host, ...args) { rejectHost(host); return originalPromisesLookup.call(this, host, ...args); };
function checkWrite(value) {
  if (typeof value === 'number' || value == null) return;
  const resolved = path.resolve(value instanceof URL ? require('node:url').fileURLToPath(value) : String(value));
  if ((resolved === root || resolved.startsWith(root + '/')) && !(resolved === out || resolved.startsWith(out + '/')))
    throw Error('Guarda Node EAF: escritura fuera de evidencia rechazada');
}
for (const name of ['writeFile','appendFile','mkdir','rm','rmdir','unlink','chmod','truncate','createWriteStream']) {
  if (fs[name]) { const original = fs[name]; fs[name] = function (p, ...args) { checkWrite(p); return original.call(this,p,...args); }; }
  const sync = name + 'Sync';
  if (fs[sync]) { const original = fs[sync]; fs[sync] = function (p,...args) { checkWrite(p); return original.call(this,p,...args); }; }
  if (fs.promises[name]) { const original = fs.promises[name]; fs.promises[name] = async function (p,...args) { checkWrite(p); return original.call(this,p,...args); }; }
}
for (const name of ['rename','copyFile','cp','link','symlink']) {
  for (const suffix of ['', 'Sync']) {
    const key = name + suffix; const original = fs[key];
    if (original) fs[key] = function (from,to,...args) { if (name === 'rename') checkWrite(from); checkWrite(to); return original.call(this,from,to,...args); };
  }
  const original = fs.promises[name];
  if (original) fs.promises[name] = async function (from,to,...args) { if (name === 'rename') checkWrite(from); checkWrite(to); return original.call(this,from,to,...args); };
}
function writes(flags) { return typeof flags === 'number' ? !!(flags & (fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_TRUNC)) : /[wa+]/.test(String(flags)); }
for (const suffix of ['', 'Sync']) { const key = 'open'+suffix; const original=fs[key]; fs[key]=function(p,flags,...args) { if(writes(flags))checkWrite(p);return original.call(this,p,flags,...args); }; }
const originalOpen=fs.promises.open;
fs.promises.open=async function(p,flags,...args) { if(writes(flags))checkWrite(p);return originalOpen.call(this,p,flags,...args); };
