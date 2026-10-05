// A dependency-free local preview. Never bind this development server publicly.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,relative,extname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.gz':'application/gzip','.pgn':'application/x-chess-pgn','.jpg':'image/jpeg','.png':'image/png','.md':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    const pathname=decodeURIComponent(url.pathname);
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    const inside=relative(root,file);
    if(inside.startsWith('..')||isAbsolute(inside)||inside.split(/[\\/]/).some(part=>part.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
    const bytes=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(8768,'127.0.0.1',()=>console.log('Between Moves: http://127.0.0.1:8768'));
