import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import dns from 'node:dns';
const out=process.env.POLIS_EAF_EVIDENCE;
const rejected=[];
function refusal(label,fn){assert.throws(fn,/Guarda Node EAF/);rejected.push(label);}
const socket=new net.Socket();refusal('TCP externo antes de conectar',()=>socket.connect({host:'203.0.113.1',port:443}));socket.destroy();
refusal('DNS externo antes de resolver',()=>dns.lookup('example.invalid',()=>{}));
const sentinel='/root/polis/data/eaf211_sentinel_no_debe_existir';assert(!fs.existsSync(sentinel));refusal('escritura fuera de211 antes de crear',()=>fs.writeFileSync(sentinel,'rechazar'));assert(!fs.existsSync(sentinel));
fs.writeFileSync(out+'/guardas-node.json',JSON.stringify({negativas:rejected,count:rejected.length,sentinel_creado:false,limites:'Guarda de API JavaScript/Node; no cubre toda llamada nativa, subproceso, symlink o red de Chromium. Chrome usa rutas propias y bloqueo de peticiones antes de red.'},null,2)+'\n');console.log(JSON.stringify({rechazos:rejected.length}));
