const fs=require('fs'),path=require('path'),ts=require('typescript'),crypto=require('crypto');
const root='/root/polis';const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p);}}walk(root+'/src');
const inventory=files.sort().map(p=>{const text=fs.readFileSync(p,'utf8'),ext=path.extname(p);const r={archivo:path.relative(root,p),sha256:crypto.createHash('sha256').update(text).digest('hex'),lineas:text.split('\n').length};if(!['.ts','.tsx'].includes(ext))return r;
 const sf=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true,ext==='.tsx'?ts.ScriptKind.TSX:ts.ScriptKind.TS);r.imports=[];r.funciones=[];r.exportaciones=[];r.controles=[];r.any=[];r.eventos=[];r.labels_sin_asociacion=[];
 function visit(n){const line=sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1;
 if(ts.isImportDeclaration(n))r.imports.push({modulo:n.moduleSpecifier.text,linea:line});
 if(ts.isFunctionDeclaration(n)&&n.name)r.funciones.push({nombre:n.name.text,linea:line});
 if(ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause))r.exportaciones.push(...n.exportClause.elements.map(e=>e.name.text));
 if(n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)){if(n.name)r.exportaciones.push(n.name.text);if(ts.isVariableStatement(n))r.exportaciones.push(...n.declarationList.declarations.map(d=>d.name.getText(sf)));}
 if(n.kind===ts.SyntaxKind.AnyKeyword)r.any.push(line);
 if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const name=n.tagName.getText(sf);const attrs=n.attributes.properties.filter(ts.isJsxAttribute);const names=attrs.map(a=>a.name.getText(sf));if(['button','Button','input','Input','Textarea','Label','SelectTrigger','path'].includes(name))r.controles.push({tag:name,linea:line,atributos:names});if(name==='Label'&&!names.some(a=>a==='htmlFor'))r.labels_sin_asociacion.push(line);if(names.some(a=>/^on(Click|MouseDown|KeyDown)$/.test(a)))r.eventos.push({tag:name,linea:line,atributos:names});}
 ts.forEachChild(n,visit);
 }visit(sf);return r;});fs.writeFileSync('/tmp/polis-auditoria-frontend/inventario.json',JSON.stringify(inventory,null,2));console.log(JSON.stringify({archivos:inventory.length,tsx:inventory.filter(r=>r.archivo.endsWith('.tsx')).length,any:inventory.filter(r=>r.any?.length).map(r=>({archivo:r.archivo,lineas:r.any})),labels:inventory.filter(r=>r.labels_sin_asociacion?.length).map(r=>({archivo:r.archivo,lineas:r.labels_sin_asociacion})),ui:inventory.filter(r=>r.archivo.startsWith('src/shared/ui/')&&!r.archivo.includes('stories')&&r.archivo.endsWith('.tsx')).length},null,2));
