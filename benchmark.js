import {parse,legal,apply,outcome,positionKey,notation,fen,search} from './engine-v2.js';
import {search as baseline} from './engine-v1.js';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';

const budget=Number(process.argv[2]||40),maxPlies=240;
// Paired starts: each engine plays both colors. Deterministic legal opening sequences.
const openings=[[],['e2e4','e7e5','g1f3','b8c6'],['d2d4','d7d5','c2c4'],['e2e4','c7c5'],['g1f3','d7d5','g2g3'],['d2d4','g8f6','c2c4','e7e6']];
const games=[];
for(let opening=0;opening<openings.length;opening++)for(const upgradedColor of ['w','b']){
  let state=parse(),history=[positionKey(state)],sans=[];
  for(const uci of openings[opening]){const m=legal(state).find(m=>notationUci(m)===uci);if(!m)throw Error('Invalid opening');sans.push(notation(state,m));state=apply(state,m);history.push(positionKey(state));}
  let end=outcome(state,history),plies=0;
  while(!end.over&&plies<maxPlies){const choose=state.turn===upgradedColor?search:baseline;const r=choose(state,{milliseconds:budget,maxDepth:6,history,trace:false});if(!r||!legal(state).some(m=>notationUci(m)===notationUci(r.move)))throw Error('Illegal engine move');sans.push(notation(state,r.move));state=apply(state,r.move);history.push(positionKey(state));end=outcome(state,history);plies++;}
  let score=null;
  if(end.over)score=end.text.includes('wins')?(end.text.includes(upgradedColor==='w'?'White wins':'Black wins')?1:0):.5;
  const game={opening,upgradedColor,score,termination:end.over?end.text:'Unresolved: ply cap',plies,finalFen:fen(state),moves:sans};games.push(game);
  console.log(`Game ${games.length}/12: v2 ${upgradedColor}, ${game.termination}, score ${score}`);
}
function notationUci(m){const sq=i=>'abcdefgh'[i%8]+(8-(i>>3));return sq(m.from)+sq(m.to)+(m.promotion||'');}
const finished=games.filter(g=>g.score!==null),points=finished.reduce((n,g)=>n+g.score,0),rate=finished.length?points/finished.length:null;
const elo=p=>p===0?'-Infinity':p===1?'Infinity':Math.round(400*Math.log10(p/(1-p)));
const report={date:'2026-10-03',opponent:'Frozen Between Moves v1 (unrated)',budgetMs:budget,maxPlies,hardware:os.cpus()[0]?.model,node:process.version,hashes:Object.fromEntries(['engine-v2.js','search-v2.js','engine-v1.js'].map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,import.meta.url))).digest('hex')])),games:games.length,wins:finished.filter(g=>g.score===1).length,draws:finished.filter(g=>g.score===.5).length,losses:finished.filter(g=>g.score===0).length,unresolved:games.length-finished.length,scoreRate:rate,relativeElo:games.length===finished.length&&rate!==null?elo(rate):null,absoluteElo:null,limitation:'Small paired-opening development match. Relative Elo is descriptive only, not FIDE/online Elo. No confidence claim. Capped games remain unresolved, not draws. Equal nominal milliseconds, single process, approximate deadlines. No external rated opponent tested.',results:games};
mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});writeFileSync(new URL('./reports/benchmark.json',import.meta.url),JSON.stringify(report,null,2));
writeFileSync(new URL('./reports/benchmark.pgn',import.meta.url),games.map((g,i)=>{const result=g.score===null?'*':g.score===.5?'1/2-1/2':(g.score===1)===(g.upgradedColor==='w')?'1-0':'0-1';return `[Event "Between Moves development match ${i+1}"]\n[White "${g.upgradedColor==='w'?'v2':'v1'}"]\n[Black "${g.upgradedColor==='b'?'v2':'v1'}"]\n[Result "${result}"]\n\n${g.moves.map((m,j)=>(j%2===0?`${j/2+1}. `:'')+m).join(' ')} ${result}`;}).join('\n\n'));
console.log(JSON.stringify({...report,results:undefined,hashes:undefined}));
