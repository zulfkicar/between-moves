import {SIZE,decode,valid,checks,successors,predecessors} from './endgame-geometry.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const directory=new URL('./tablebases/',import.meta.url);mkdirSync(directory,{recursive:true});const records=[];
for(const type of ['q','r']){
  const started=performance.now(),distance=new Int16Array(SIZE).fill(-2),remaining=new Uint8Array(SIZE),longest=new Uint8Array(SIZE),queue=new Uint32Array(SIZE);let head=0,tail=0,legalStates=0;
  for(let id=0;id<SIZE;id++){const [a,b,p,turn]=decode(id);if(!valid(type,a,b,p,turn))continue;legalStates++;distance[id]=-1;remaining[id]=successors(type,a,b,p,turn).length;if(turn===1&&!remaining[id]&&checks(type,a,b,p)){distance[id]=0;queue[tail++]=id;}}
  console.log(`${type}: initialized ${legalStates} legal positions, ${tail} mates`);
  while(head<tail){const id=queue[head++],[a,b,p,turn]=decode(id),d=distance[id];for(const prev of predecessors(type,a,b,p,turn)){if(distance[prev]!==-1)continue;const prevTurn=prev%2;if(prevTurn===0){distance[prev]=d+1;queue[tail++]=prev;}else{remaining[prev]--;longest[prev]=Math.max(longest[prev],d);if(!remaining[prev]){distance[prev]=longest[prev]+1;queue[tail++]=prev;}}}}
  let maxDistance=0,draws=0;for(const d of distance){if(d===-1)draws++;if(d>maxDistance)maxDistance=d;}
  // Byte format: 255 invalid, 254 drawn, otherwise exact mate distance in plies.
  const bytes=Uint8Array.from(distance,d=>d===-2?255:d===-1?254:d);if(maxDistance>=254)throw Error('Distance exceeds byte format');
  const compressed=gzipSync(bytes,{level:9});writeFileSync(new URL(`k${type}k.bin`,directory),bytes);writeFileSync(new URL(`k${type}k.bin.gz`,directory),compressed);
  const record={type:`K${type.toUpperCase()}K`,states:SIZE,legalStates,winningStates:tail,drawnStates:draws,maxMatePlies:maxDistance,bytes:bytes.length,gzipBytes:compressed.length,sha256:createHash('sha256').update(bytes).digest('hex'),seconds:Math.round((performance.now()-started)/1000)};records.push(record);console.log(record);
}
writeFileSync(new URL('manifest.json',directory),JSON.stringify({format:'Between Moves DTM v1',generated:new Date().toISOString(),index:'(((strongKing*64+weakKing)*64+piece)*2+turn), turn 0=strong, 1=weak',values:'255 invalid, 254 draw, 0..253 exact DTM plies',coverage:'KQK and KRK only, no castling rights. Repetition and fifty-move context checked at runtime.',tables:records},null,2));
