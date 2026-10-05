import {parse,search} from './engine.js';
import {search as baseline} from './engine-v2.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
// Fixed completed depth isolates search work. This is not an Elo measurement.
const positions=[
 ['Start','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'],
 ['Open game','r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'],
 ['Queen pawn','rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2'],
 ['Pawn ending','4k3/pp6/8/8/8/8/PP6/4K3 w - - 0 1']
];
const results=[];
for(const [name,fen] of positions){const options={maxDepth:4,milliseconds:30000,trace:true};const old=baseline(parse(fen),options),current=search(parse(fen),options);results.push({name,fen,previous:{depth:old.depth,score:old.score,nodes:old.nodes,ms:old.ms},current:{depth:current.depth,score:current.score,nodes:current.nodes,ms:current.ms,ttHits:current.ttHits,traceRecorded:current.traceRecorded}});console.log(name,JSON.stringify(results.at(-1)));}
const report={date:new Date().toISOString(),hardware:os.cpus()[0]?.model,node:process.version,protocol:'One cold run per position, frozen v2 first, both trace-enabled at completed depth 4, 30-second safety budget. Current build records deeper traces. No opening book, tablebase or opponent memory used.',limitation:'Small fixed-depth search-work check, not a strength match, Elo estimate or timing guarantee. Order and JIT warmup may affect times.',hashes:Object.fromEntries(['engine.js','search.js','opponent.js','book.js','tablebase.js','endgame-geometry.js','engine-v2.js','search-v2.js'].map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,import.meta.url))).digest('hex')])),results};
writeFileSync(new URL('./reports/upgrade-search-check.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
