const http=require("node:http");
const fs=require("node:fs");
const server=http.createServer((req,res)=>{
 fs.appendFileSync("/tmp/polis_qa297_correcciones/build_api_requests.jsonl",JSON.stringify({utc:new Date().toISOString(),method:req.method,url:req.url})+"\n");
 res.setHeader("Content-Type","application/json");
 if(req.method==="GET" && req.url==="/api/v1/formularios/publicos"){res.end("[]");return;}
 res.statusCode=404;res.end(JSON.stringify({detail:"Solo fixture de catálogo público vacío para compilación aislada"}));
});
server.listen(0,"127.0.0.1",()=>{const port=server.address().port;fs.writeFileSync("/tmp/polis_qa297_correcciones/build_api_port",String(port));console.log(port);});
