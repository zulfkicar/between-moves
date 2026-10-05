import {readFileSync,writeFileSync} from 'node:fs';

export function performanceElo(anchor,score){
  if(score<=0||score>=1)return null;
  return Math.round(anchor+400*Math.log10(score/(1-score)));
}

export function fitAnchors(anchors,score){
  if(score<=0||score>=1||!anchors.length)return null;
  let low=Math.min(...anchors)-10000,high=Math.max(...anchors)+10000;
  for(let i=0;i<100;i++){const mid=(low+high)/2,expected=anchors.reduce((sum,anchor)=>sum+1/(1+10**((anchor-mid)/400)),0)/anchors.length;if(expected<score)low=mid;else high=mid;}
  return Math.round((low+high)/2);
}

export function summarizeAnchors(reports){
  const games=reports.flatMap(r=>r.results.map(g=>({...g,anchorElo:r.settings.anchorElo}))),resolved=games.filter(g=>g.score!==null),complete=reports.every(r=>r.status==='complete'&&r.results.length===r.plannedGames)&&resolved.length===games.length;
  const pairs=new Map();for(const g of resolved){const key=`${g.anchorElo}:${g.opening}`,p=pairs.get(key)||[];p.push(g);pairs.set(key,p);}
  const paired=[...pairs.values()].filter(p=>p.length===2&&new Set(p.map(g=>g.botColor)).size===2);
  const points=resolved.reduce((sum,g)=>sum+g.score,0),rate=resolved.length?points/resolved.length:null,anchors=games.map(g=>g.anchorElo);
  const margin=paired.length?Math.sqrt(Math.log(2/.05)/(2*paired.length)):null,low=rate===null?null:Math.max(0,rate-margin),high=rate===null?null:Math.min(1,rate+margin);
  return {status:complete?'provisional':'incomplete',scale:'Stockfish UCI_Elo, derived from CCRL calibration',anchorElos:[...new Set(anchors)].sort((a,b)=>a-b),games:games.length,wins:resolved.filter(g=>g.score===1).length,draws:resolved.filter(g=>g.score===.5).length,losses:resolved.filter(g=>g.score===0).length,unresolved:games.length-resolved.length,points,scoreRate:rate,estimate:complete?fitAnchors(anchors,rate):null,byAnchor:reports.map(r=>({anchorElo:r.settings.anchorElo,games:r.games,wins:r.wins,draws:r.draws,losses:r.losses,points:r.points,scoreRate:r.scoreRate})),scoreInterval:complete?{level:.95,low,high,pairs:paired.length,method:'Hoeffding bound on independent bounded color-pair scores, conditional on the selected openings. Calibration and hardware uncertainty excluded.'}:null,eloInterval:complete?{low:fitAnchors(anchors,low),high:fitAnchors(anchors,high),nullMeaning:'Unbounded, not zero'}:null,botBudgetMs:reports[0].settings.botBudgetMs,timeControl:'120s + 1s',report:'external-calibration.json',method:'Fit one Elo to the combined expected score across both anchors: mean(1/(1+10^((anchor-R)/400))) = observed score. Draws contribute half a point. Pilot excluded.',limitation:'Small, fixed-opening multi-anchor performance estimate, not a population rating. Stockfish calibration is approximate and engine-specific. Node and browser performance can differ. No FIDE, Chess.com or Lichess claim.'};
}

export function summarize(report){
  const resolved=report.results.filter(g=>g.score!==null),points=resolved.reduce((n,g)=>n+g.score,0);
  const complete=report.status==='complete'&&resolved.length===report.plannedGames;
  const score=resolved.length?points/resolved.length:null,anchor=report.settings.anchorElo;
  const pairs=new Map();
  for(const g of resolved){const group=pairs.get(g.opening)||[];group.push(g);pairs.set(g.opening,group);}
  const paired=[...pairs.values()].filter(g=>g.length===2&&new Set(g.map(v=>v.botColor)).size===2);
  // Distribution-free Hoeffding interval on bounded color-pair scores. It is
  // intentionally wide for a small experiment. It excludes calibration error.
  const alpha=.05,margin=paired.length?Math.sqrt(Math.log(2/alpha)/(2*paired.length)):null;
  const pairMean=paired.length?paired.reduce((n,g)=>n+(g[0].score+g[1].score)/2,0)/paired.length:null;
  const low=margin===null?null:Math.max(0,pairMean-margin),high=margin===null?null:Math.min(1,pairMean+margin);
  return {status:complete?'provisional':'incomplete',scale:'Stockfish UCI_Elo, derived from CCRL calibration',anchorElo:anchor,games:report.games,wins:report.wins,draws:report.draws,losses:report.losses,unresolved:report.unresolved,points,scoreRate:score,estimate:complete?performanceElo(anchor,score):null,scoreInterval:complete?{level:.95,low,high,pairs:paired.length,method:'Hoeffding bound on independent bounded color-pair scores. Conditional on the selected openings and assuming independent opponent randomization between pairs. Does not cover calibration or hardware uncertainty.'}:null,eloInterval:complete?{low:low===0?null:performanceElo(anchor,low),high:high===1?null:performanceElo(anchor,high),nullMeaning:'Unbounded, not zero'}:null,botBudgetMs:report.settings.botBudgetMs,timeControl:'120s + 1s',report:report.sourceFile,limitation:report.limitation};
}

if(process.argv[1]&&new URL(import.meta.url).pathname.replace(/^\//,'').toLowerCase()===process.argv[1].replaceAll('\\','/').toLowerCase()){
  const path=process.argv[2];if(!path)throw Error('Usage: node rating-summary.js REPORT.json');
  const report=JSON.parse(readFileSync(path,'utf8'));report.sourceFile=path.replaceAll('\\','/').split('/').at(-1);
  const summary=summarize(report);writeFileSync(new URL('./reports/rating.json',import.meta.url),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}
