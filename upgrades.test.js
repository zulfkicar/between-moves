import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse,legal,apply,positionKey,outcome,fen,search} from './engine.js';
import {bookDecision,bookSize,uci} from './book.js';
import {buildProfile,learnedPreference,personalize} from './opponent.js';
import {probe,tablebaseDecision,material} from './tablebase.js';
const tables=Object.fromEntries(['q','r'].map(t=>[t,new Uint8Array(readFileSync(new URL(`./tablebases/k${t}k.bin`,import.meta.url)))]));
const move=(s,code)=>legal(s).find(m=>uci(m)===code);
test('every curated line compiles legally and book moves have no fabricated score or tree',()=>{
  assert.ok(bookSize()>50);const s=parse(),seen=new Set();for(const random of [0,.25,.5,.75,.999]){const r=bookDecision(s,{random:()=>random});assert.ok(move(s,uci(r.move)));assert.equal(r.score,null);assert.deepEqual(r.tree,[]);seen.add(uci(r.move));}assert.ok(seen.size>=3);
  assert.equal(bookDecision(s,{history:Array(18).fill(positionKey(s))}),null);
});
test('tablebase decisions mate with either stronger color, fastest offense and longest defense',()=>{
  for(const type of ['q','r'])for(const strong of ['w','b']){let s=parse(`7k/8/8/8/8/8/4K3/3${type.toUpperCase()}4 w - - 0 1`);if(strong==='b'){s.board=s.board.map(p=>p?p===p.toUpperCase()?p.toLowerCase():p.toUpperCase():null);s.turn='b';}const initial=probe(s,tables);assert.equal(initial.wdl,1);let previous=initial.dtm,history=[positionKey(s)],plies=0;while(!outcome(s,history).over&&plies<40){const decision=tablebaseDecision(s,tables,history);assert.ok(decision,fen(s));assert.ok(move(s,uci(decision.move)));s=apply(s,decision.move);history.push(positionKey(s));const next=probe(s,tables);assert.equal(next.dtm,previous-1);previous=next.dtm;plies++;}assert.equal(plies,initial.dtm);assert.ok(outcome(s,history).text.includes('Checkmate'));}
});
test('tablebase handling respects the automatic fifty-move rule, capture draws and repetition fallback',()=>{
  const s=parse('7k/8/8/8/8/8/4K3/3R4 w - - 99 1');assert.equal(probe(s,tables).wdl,0);
  const mate=parse('7k/8/5KQ1/8/8/8/8/8 w - - 99 1');const decision=tablebaseDecision(mate,tables,[positionKey(mate)]);assert.equal(decision.tablebase.dtm,1);assert.ok(outcome(apply(mate,decision.move)).text.includes('Checkmate'));
  const capture=parse('8/8/8/8/8/1k6/R7/7K b - - 0 1');assert.equal(tablebaseDecision(capture,tables).score,0);
  assert.equal(probe(s,tables,[positionKey(s),positionKey(s)]),null);
  assert.equal(material(parse()),null);
});
test('transposition search agrees with uncached completed scores including repetition and fifty-move context',()=>{
  const positions=['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1','r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3','7k/8/8/8/8/2K5/8/3R4 w - - 96 1','7k/8/8/8/8/2K5/8/3R4 w - - 0 1'];
  for(const text of positions){const s=parse(text),history=[positionKey(s),positionKey(s)];const a=search(s,{maxDepth:3,milliseconds:30000,useTT:false,history}),b=search(s,{maxDepth:3,milliseconds:30000,useTT:true,history});assert.equal(a.depth,3);assert.equal(b.depth,3);assert.equal(a.score,b.score,text);assert.deepEqual(a.candidates.map(c=>c.score),b.candidates.map(c=>c.score));}
});
test('tree records real legal paths deeper than three plies, including tactical continuations',()=>{
  const s=parse(),r=search(s,{maxDepth:3,milliseconds:30000,traceDepth:8});let deepest=0,records=0;
  function walk(node,before){records++;assert.ok(move(before,uci(node.move)));const next=apply(before,node.move);deepest=Math.max(deepest,node.ply);assert.equal(node.children.length<=6,true);assert.equal(node.nodes>=1,true);assert.ok(['exact','lower','upper'].includes(node.bound));if(node.source==='transposition')assert.equal(node.children.length,0);for(const child of node.children)walk(child,next);}
  r.tree.forEach(n=>walk(n,s));assert.ok(deepest>3);assert.ok(deepest<=8);assert.equal(records,r.traceRecorded);assert.ok(records<=2400+r.tree.length);
});
test('score cache is exercised and does not invent expanded cached visits',()=>{
  const s=parse('4k3/pp6/8/8/8/8/PP6/4K3 w - - 0 1'),r=search(s,{maxDepth:5,milliseconds:30000});assert.equal(r.depth,5);assert.ok(r.ttHits>0);assert.ok(r.ttEntries<=12000);const cached=[];function visit(n){if(n.source==='transposition')cached.push(n);n.children.forEach(visit);}r.tree.forEach(visit);for(const n of cached)assert.deepEqual(n.children,[]);
});
test('already drawn root positions do not produce a move',()=>{
  const s=parse();assert.equal(search({...s,half:100}),null);assert.equal(search(s,{history:Array(3).fill(positionKey(s))}),null);assert.equal(search(parse('7k/8/8/8/8/8/8/K7 w - - 0 1')),null);
});
test('memory ignores unfinished, illegal and nonstandard games and requires three observations',()=>{
  const game={human:'w',finished:true,moves:['f2f3','e7e5','g2g4','d8h4']};const p=buildProfile([game,{...game,finished:false},{...game,moves:['a1a8']},{...game,moves:['f2f3']},{...game,startFen:'custom'}]);assert.equal(p.games,1);const s=parse(),m=move(s,'e2e4'),next=apply(s,m),reply=legal(next)[0];const profile={replies:{[positionKey(next)]:{[uci(reply)]:2}}};assert.equal(learnedPreference(s,m,profile),null);profile.replies[positionKey(next)][uci(reply)]=3;assert.equal(learnedPreference(s,m,profile).observations,3);
});
test('opponent adaptation cannot sacrifice more than 25 centipawns or alter forced mates',()=>{
  const s=parse(),moves=legal(s),best={move:moves[0],score:100},other={move:moves[1],score:74};const next=apply(s,other.move),reply=legal(next)[0],p={replies:{[positionKey(next)]:{[uci(reply)]:3}}};assert.equal(personalize(s,[best,other],p).chosen,best);other.score=75;const r=personalize(s,[best,other],p);assert.equal(r.chosen,other);assert.equal(r.adaptation.scoreGap,25);best.score=99995;assert.equal(personalize(s,[best,other],p).chosen,best);
});
