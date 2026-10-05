import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {parse,legal,apply,outcome,positionKey,notation,fen,square,search} from './engine-v2.js';

// The only external engine is the benchmark opponent. The browser bot is unchanged.
const executable=process.argv[2];
const anchor=Number(process.argv[3]||1320),budget=Number(process.argv[4]||1200);
const pairs=Number(process.argv[5]||6),stem=process.argv[6]||`external-${anchor}-${budget}`,offset=Number(process.argv[7]||0);
if(!executable||!Number.isInteger(anchor)||anchor<1320||anchor>3190||!Number.isInteger(budget)||budget<1||!Number.isInteger(pairs)||pairs<1||pairs>6||!Number.isInteger(offset)||offset<0||offset+pairs>6||!/^[a-z0-9-]+$/.test(stem))throw Error('Usage: node external-benchmark.js STOCKFISH_PATH [ELO=1320] [MS=1200] [PAIRS=6] [REPORT_STEM] [OPENING_OFFSET=0]');
const startMs=120000,incrementMs=1000,maxPlies=400;
const openings=[[],['e2e4','e7e5','g1f3','b8c6'],['d2d4','d7d5','c2c4'],['e2e4','c7c5'],['g1f3','d7d5','g2g3'],['d2d4','g8f6','c2c4','e7e6']].slice(offset,offset+pairs);
const uci=m=>square(m.from)+square(m.to)+(m.promotion||'');
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const commands=[],received=[];
let pending=null,failure=null,closed=false;
const child=spawn(executable,[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
function fail(error){failure=error;if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}}
child.on('error',fail);child.on('exit',(code)=>{closed=true;if(pending)fail(Error(`Stockfish exited (${code})`));});
child.stderr.on('data',data=>{received.push({stderr:String(data)});});
createInterface({input:child.stdout}).on('line',line=>{received.push(line);if(/Unknown command|ERROR|Error loading/i.test(line))fail(Error(line));if(pending?.predicate(line)){const done=pending;pending=null;clearTimeout(done.timer);done.resolve(line);}});
function send(command){if(failure)throw failure;commands.push(command);child.stdin.write(command+'\n');}
function request(command,predicate,timeout=30000){if(pending)throw Error('Overlapping UCI requests');return new Promise((resolve,reject)=>{pending={predicate,resolve,reject,timer:setTimeout(()=>fail(Error(`UCI timeout: ${command}`)),timeout)};send(command);});}
const started=new Date().toISOString(),games=[];
let identity,options;
mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});
const reportPath=new URL(`./reports/${stem}.json`,import.meta.url);
const settings={anchorElo:anchor,botBudgetMs:budget,botMaxDepth:7,botTrace:true,startMs,incrementMs,maxPlies,stockfish:{Threads:1,Hash:16,Ponder:false,UCI_LimitStrength:true,UCI_Elo:anchor,MultiPV:1},clockPolicy:'Both engines start at 120s with 1s increment. Bot uses its normal fixed per-move budget, clipped to remaining time. Stockfish uses UCI clock management. Opening moves are uncharged.'};
function save(status,error){const finished=games.filter(g=>g.score!==null),points=finished.reduce((n,g)=>n+g.score,0),rate=finished.length?points/finished.length:null;
  const estimate=rate>0&&rate<1?Math.round(anchor+400*Math.log10(rate/(1-rate))):null;
  const report={started,updated:new Date().toISOString(),status,error,opponent:identity,settings,hardware:os.cpus()[0]?.model,node:process.version,hashes:{...Object.fromEntries(['engine-v2.js','search-v2.js','external-benchmark.js'].map(f=>[f,hash(new URL(f,import.meta.url))])),stockfish:hash(executable)},source:'https://github.com/official-stockfish/Stockfish/releases/tag/sf_19',calibrationSource:'https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html',uciOptions:options,plannedGames:pairs*2,games:games.length,wins:finished.filter(g=>g.score===1).length,draws:finished.filter(g=>g.score===.5).length,losses:finished.filter(g=>g.score===0).length,unresolved:games.length-finished.length,points,scoreRate:rate,anchoredEstimate:estimate,absoluteElo:null,limitation:'Provisional performance on the Stockfish UCI_Elo / CCRL-derived scale under this match protocol, not FIDE, Chess.com or Lichess Elo. Few fixed opening pairs and one randomized opponent. No calibration-systematic uncertainty quantified. Unresolved games are not draws and cannot be omitted for a definitive estimate.',results:games};
  writeFileSync(reportPath,JSON.stringify(report,null,2));
  writeFileSync(new URL(`./reports/${stem}.pgn`,import.meta.url),games.map((g,i)=>{const result=g.score===null?'*':g.score===.5?'1/2-1/2':(g.score===1)===(g.botColor==='w')?'1-0':'0-1';return `[Event "Between Moves external match ${i+1}"]\n[White "${g.botColor==='w'?'Between Moves v2':identity+' UCI_Elo '+anchor}"]\n[Black "${g.botColor==='b'?'Between Moves v2':identity+' UCI_Elo '+anchor}"]\n[Result "${result}"]\n[TimeControl "120+1"]\n[Termination "${g.termination}"]\n\n${g.moves.map((m,j)=>(j%2===0?`${j/2+1}. `:'')+m).join(' ')} ${result}`;}).join('\n\n'));
  return report;
}
try{
  await request('uci',line=>line==='uciok');identity=received.find(l=>typeof l==='string'&&l.startsWith('id name '))?.slice(8);options=received.filter(l=>typeof l==='string'&&l.startsWith('option '));
  if(!identity||!options.includes('option name UCI_Elo type spin default 1320 min 1320 max 3190'))throw Error('Unexpected calibration option range');
  for(const [name,value] of Object.entries(settings.stockfish))send(`setoption name ${name} value ${value}`);
  await request('isready',line=>line==='readyok');save('running');
  for(let opening=0;opening<openings.length;opening++)for(const botColor of ['w','b']){
    send('ucinewgame');await request('isready',line=>line==='readyok');
    let state=parse(),history=[positionKey(state)],moves=[],uciMoves=[],telemetry=[],clock={w:startMs,b:startMs};
    for(const text of openings[opening]){const m=legal(state).find(m=>uci(m)===text);if(!m)throw Error('Invalid opening');moves.push(notation(state,m));uciMoves.push(text);state=apply(state,m);history.push(positionKey(state));}
    let end=outcome(state,history),plies=0,timeoutColor=null;
    console.log(`Starting game ${games.length+1}/${pairs*2}: bot ${botColor}, opening ${opening}`);
    while(!end.over&&plies<maxPlies){
      const turn=state.turn,before=performance.now();let move,stats={};
      if(turn===botColor){const result=search(state,{milliseconds:Math.min(budget,Math.max(1,clock[turn]-25)),maxDepth:7,history,trace:true});move=result.move;stats={depth:result.depth,nodes:result.nodes,searchMs:result.ms};}
      else{send('position startpos'+(uciMoves.length?' moves '+uciMoves.join(' '):''));const line=await request(`go wtime ${Math.floor(clock.w)} btime ${Math.floor(clock.b)} winc ${incrementMs} binc ${incrementMs}`,l=>l.startsWith('bestmove '),Math.ceil(clock[turn]+10000));const text=line.split(' ')[1];move=legal(state).find(m=>uci(m)===text);stats={uci:text};}
      const elapsed=performance.now()-before;clock[turn]-=elapsed;
      if(!move||!legal(state).some(m=>uci(m)===uci(move)))throw Error(`Illegal move from ${turn===botColor?'bot':'Stockfish'} at ${fen(state)}`);
      if(clock[turn]<0){timeoutColor=turn;end={over:true,text:`${turn==='w'?'Black':'White'} wins on time`};break;}
      clock[turn]+=incrementMs;telemetry.push({ply:uciMoves.length+1,side:turn,elapsedMs:Math.round(elapsed),...stats});
      moves.push(notation(state,move));uciMoves.push(uci(move));state=apply(state,move);history.push(positionKey(state));end=outcome(state,history);plies++;
      if(plies%40===0)console.log(`  Game ${games.length+1}: ${plies} played plies, clocks ${Math.round(clock.w/1000)}/${Math.round(clock.b/1000)}s`);
    }
    let score=null;if(end.over)score=end.text.includes('wins')?(end.text.includes(botColor==='w'?'White wins':'Black wins')?1:0):.5;
    // Independent terminal-board check using Stockfish's own legal move generator.
    send('position startpos'+(uciMoves.length?' moves '+uciMoves.join(' '):''));const terminalStart=received.length;
    const terminalLine=await request('go perft 1',l=>/^Nodes searched:/.test(l));const terminalLegal=Number(terminalLine.split(':')[1]);
    if(terminalLegal!==legal(state).length)throw Error('Referee disagreement on terminal legal move count');
    const game={opening:opening+offset,openingMoves:openings[opening],botColor,score,termination:end.over?end.text:'Unresolved: ply cap',timeoutColor,plies,clocksMs:clock,finalFen:fen(state),moves,uciMoves,telemetry,referee:{stockfishLegalMoves:terminalLegal,lines:received.slice(terminalStart)}};games.push(game);save('running');
    console.log(`Finished game ${games.length}/${pairs*2}: ${game.termination}, bot score ${score}`);
  }
  console.log(JSON.stringify({...save('complete'),results:undefined,uciOptions:undefined,hashes:undefined}));
}catch(error){save('failed',error.message);throw error;}
finally{writeFileSync(new URL(`./reports/${stem}-protocol.json`,import.meta.url),JSON.stringify({commands,received},null,2));if(!closed){child.stdin.end('quit\n');setTimeout(()=>{if(!closed)child.kill();},1000).unref();}}
