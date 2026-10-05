import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,legal,apply,notation,positionKey} from './engine.js';
import {buildProfile,personalize} from './opponent.js';
import {sampleProfileGames,decisionSummary} from './profile-panel.js';
import {uci} from './book.js';

const move=(s,code)=>legal(s).find(m=>uci(m)===code);
const game={human:'w',finished:true,moves:['f2f3','e7e5','g2g4','d8h4']};

test('profile details preserve engine observations and distinguish sides in opening frequencies',()=>{
  const games=sampleProfileGames(),simple=buildProfile(games),detailed=buildProfile(games,{details:true});
  const {patterns,openingPatterns,bySide,...core}=detailed;
  assert.deepEqual(core,simple);
  assert.equal(detailed.games,8);
  assert.deepEqual(bySide,{w:5,b:3});
  assert.deepEqual(openingPatterns.find(o=>o.side==='w'&&o.moves[0]==='e4'),{side:'w',moves:['e4','Qh5','Bc4'],count:3,total:5});
  assert.deepEqual(openingPatterns.find(o=>o.side==='b'),{side:'b',moves:['e5','Qh4#'],count:3,total:3});
  const root=patterns.find(p=>p.key===positionKey(parse()));
  assert.equal(root.observations,5);
  assert.deepEqual(root.responses.map(r=>[r.san,r.count]),[['e4',3],['f3',2]]);
});

test('three visits unlock a recorded position without inventing confidence or moves',()=>{
  for(const count of [2,3]){
    const p=buildProfile(Array(count).fill(game),{details:true});
    assert.equal(p.patterns.length,2);
    assert.ok(p.patterns.every(pattern=>pattern.ready===(count===3)));
    for(const pattern of p.patterns){
      assert.equal(pattern.history.at(-1),pattern.key);
      assert.equal(positionKey(pattern.state),pattern.key);
      assert.equal(pattern.responses.reduce((n,r)=>n+r.count,0),count);
      for(const reply of pattern.responses)assert.equal(notation(pattern.state,move(pattern.state,reply.code)),reply.san);
    }
    const second=p.patterns.find(pattern=>pattern.previous);
    assert.equal(second.previous.label,'1… e5');
    assert.equal(second.responses[0].san,'g4');
  }
});

test('invalid tails, unfinished games and nonstandard studies cannot leak observations',()=>{
  const invalid=[{...game,finished:false},{...game,moves:game.moves.slice(0,-1)},
    {...game,moves:['f2f3','e7e5','g2g4','e8e6']},
    {...game,moves:[...game.moves,'a2a3']},{...game,startFen:'custom'},
    {...game,human:'invalid'}];
  assert.deepEqual(buildProfile(invalid,{details:true}),buildProfile([],{details:true}));
  assert.deepEqual(buildProfile([...invalid,game],{details:true}),buildProfile([game],{details:true}));
});

test('detailed profile uses the same 30-game retention window as the engine',()=>{
  const p=buildProfile(Array.from({length:35},(_,i)=>({...game,id:String(i)})),{details:true});
  assert.equal(p.games,30);
  assert.equal(p.completed[0].id,'5');
  assert.equal(p.patterns.find(p=>p.key===positionKey(parse())).observations,30);
});

test('sample preview construction leaves real records and the engine profile untouched',()=>{
  const games=[game],real=buildProfile(games,{details:true}),snapshot=JSON.stringify({games,real});
  buildProfile(sampleProfileGames(),{details:true});
  assert.equal(JSON.stringify({games,real}),snapshot);
  assert.equal(real.games,1);
});

test('move explanation reflects the actual bounded memory choice and its recorded reply',()=>{
  const s=parse(),moves=legal(s),best={move:moves[0],score:100},other={move:moves[1],score:75};
  const next=apply(s,other.move),reply=legal(next)[0];
  const profile={replies:{[positionKey(next)]:{[uci(reply)]:3}}};
  const decision=personalize(s,[best,other],profile);
  const info=decisionSummary({move:decision.chosen.move,adaptation:decision.adaptation},s);
  assert.equal(info.used,true);
  assert.equal(info.title,'Memory changed the choice');
  assert.ok(info.text.includes(notation(next,reply)));
  assert.ok(info.text.includes('3 observations'));
  assert.ok(info.comparison.includes('0.25 pawns'));
  const unchanged=personalize(s,[other],profile);
  assert.equal(decisionSummary({move:other.move,adaptation:unchanged.adaptation},s).title,'Memory kept the best move');
});

test('book, tablebase and disabled-memory turns never claim a memory tie-break',()=>{
  assert.equal(decisionSummary({source:'book'},parse()).title,'Opening repertoire');
  assert.equal(decisionSummary({source:'tablebase'},parse()).title,'Exact endgame table');
  assert.equal(decisionSummary({},parse(),{enabled:false}).title,'Memory was off');
  assert.match(decisionSummary({},parse()).text,/can still affect search order/);
});
