import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {summarize} from './rating-summary.js';

const executable=process.argv[2],anchor=Number(process.argv[3]||1320),budget=Number(process.argv[4]||1200),pairCount=Number(process.argv[5]||6);
if(!executable||![1,2,3,6].includes(pairCount))throw Error('Usage: node external-match.js STOCKFISH_PATH [ELO=1320] [MS=1200] [PAIRS=6, or 1/2/3]');
const stem=`external-${anchor}-${budget}`,groupSize=pairCount===6?2:1,shards=pairCount===6?[0,2,4]:Array.from({length:pairCount},(_,i)=>i);
// Three independent games can search concurrently without sharing engine state.
// Each reference engine uses one CPU thread. Record this concurrency explicitly.
await Promise.all(shards.map((offset,group)=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['external-benchmark.js',executable,String(anchor),String(budget),String(groupSize),`${stem}-part-${offset}`,String(offset)],{cwd:new URL('.',import.meta.url),windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',data=>process.stdout.write(`[Pair group ${group+1}] ${data}`));child.stderr.on('data',data=>process.stderr.write(data));
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`Match shard ${offset} exited ${code}`)));
})));
const parts=shards.map(offset=>JSON.parse(readFileSync(new URL(`./reports/${stem}-part-${offset}.json`,import.meta.url),'utf8')));
for(const p of parts)if(p.status!=='complete'||JSON.stringify(p.settings)!==JSON.stringify(parts[0].settings)||JSON.stringify(p.hashes)!==JSON.stringify(parts[0].hashes))throw Error('Incompatible or incomplete match parts');
const results=parts.flatMap(p=>p.results).sort((a,b)=>a.opening-b.opening||(a.botColor==='w'?-1:1)),finished=results.filter(g=>g.score!==null),points=finished.reduce((n,g)=>n+g.score,0),rate=finished.length?points/finished.length:null;
const report={...parts[0],started:parts.map(p=>p.started).sort()[0],updated:new Date().toISOString(),concurrency:shards.length,parts:shards.map(offset=>`${stem}-part-${offset}.json`),plannedGames:pairCount*2,games:results.length,wins:finished.filter(g=>g.score===1).length,draws:finished.filter(g=>g.score===.5).length,losses:finished.filter(g=>g.score===0).length,unresolved:results.length-finished.length,points,scoreRate:rate,anchoredEstimate:null,results,sourceFile:`${stem}.json`};
const summary=summarize(report);report.anchoredEstimate=summary.estimate;
writeFileSync(new URL(`./reports/${stem}.json`,import.meta.url),JSON.stringify(report,null,2));
writeFileSync(new URL(`./reports/${stem}.pgn`,import.meta.url),shards.map(offset=>readFileSync(new URL(`./reports/${stem}-part-${offset}.pgn`,import.meta.url),'utf8')).join('\n\n'));
writeFileSync(new URL('./reports/rating.json',import.meta.url),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
