import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {summarizeAnchors} from './rating-summary.js';
const files=process.argv.slice(2);if(files.length<2)throw Error('Usage: node combine-ratings.js REPORT1.json REPORT2.json');
const reports=files.map(file=>JSON.parse(readFileSync(file,'utf8')));
const protocol=r=>{const settings=structuredClone(r.settings);delete settings.anchorElo;delete settings.stockfish.UCI_Elo;return JSON.stringify(settings);};
for(const report of reports){
  if(report.status!=='complete')throw Error('Incomplete report');
  if(report.hardware!==reports[0].hardware||JSON.stringify(report.hashes)!==JSON.stringify(reports[0].hashes))throw Error('Mismatched engine sources or hardware');
  if(report.node!==reports[0].node||report.opponent!==reports[0].opponent||protocol(report)!==protocol(reports[0]))throw Error('Mismatched reference engine or search/clock settings');
  // Match JSON order to the PGN's paired white-then-black schedule.
  report.results.sort((a,b)=>a.opening-b.opening||(a.botColor==='w'?-1:1));
}
const summary=summarizeAnchors(reports);
summary.studyDesign='Exploratory: reference settings were added after earlier results. The nominal independence interval does not account for adaptive reference-setting selection.';
summary.method='Fit one Elo to the mean expected score across reference settings, weighting games equally. Draws contribute half a point. The two setup pilot games are excluded.';
const combined={status:'complete',started:reports.map(r=>r.started).sort()[0],updated:new Date().toISOString(),opponent:reports[0].opponent,hardware:reports[0].hardware,node:reports[0].node,hashes:reports[0].hashes,summary,settings:reports.map(r=>r.settings),sourceReports:files.map(f=>f.replaceAll('\\','/').split('/').at(-1)),maxConcurrentGames:7,pilotExcluded:true,results:reports.flatMap(r=>r.results.map(g=>({...g,anchorElo:r.settings.anchorElo}))),calculationHashes:Object.fromEntries(['rating-summary.js','combine-ratings.js'].map(file=>[file,createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex')]))};
for(let i=0;i<files.length;i++)writeFileSync(files[i],JSON.stringify(reports[i],null,2));
writeFileSync(new URL('./reports/external-calibration.json',import.meta.url),JSON.stringify(combined,null,2));
writeFileSync(new URL('./reports/external-calibration.pgn',import.meta.url),files.map(file=>readFileSync(file.replace(/\.json$/,'.pgn'),'utf8')).join('\n\n'));
writeFileSync(new URL('./reports/rating.json',import.meta.url),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
