import {legal,apply,inCheck,insufficient,evaluate,positionKey,values} from './engine-v2.js';

const same=(a,b)=>a&&b&&a.from===b.from&&a.to===b.to&&a.promotion===b.promotion;
const moveKey=m=>`${m.from}:${m.to}:${m.promotion||''}`;

/** Bounded trace: actual visited first/second-ply nodes, never an invented full tree. */
export function search(state,{milliseconds=1200,maxDepth=6,onIteration=()=>{},history=[],trace=true}={}) {
  const start=performance.now(),deadline=start+milliseconds,timeout={};
  let nodes=0,qnodes=0,cutoffs=0,last=null;
  const killers=new Map(),quietHistory=new Map(),counts=new Map();
  for(const key of history)counts.set(key,(counts.get(key)||0)+1);
  const rootKey=positionKey(state);
  if(!counts.has(rootKey))counts.set(rootKey,1);
  const visit=()=>{nodes++;if((nodes&63)===0&&performance.now()>deadline)throw timeout;};
  const capture=(s,m)=>Boolean(s.board[m.to]||m.ep||m.promotion);
  function ordered(s,moves,ply,hint){
    const rank=m=>(same(m,hint)?1e7:0)+(capture(s,m)?100000+(m.promotion?values[m.promotion]*10:0)+(s.board[m.to]?values[s.board[m.to].toLowerCase()]*10:100)-values[s.board[m.from].toLowerCase()]:same(m,killers.get(ply))?90000:quietHistory.get(moveKey(m))||0);
    return moves.sort((a,b)=>rank(b)-rank(a));
  }
  function descend(s,m,fn){const next=apply(s,m),key=positionKey(next);counts.set(key,(counts.get(key)||0)+1);try{return fn(next,key);}finally{const n=counts.get(key)-1;if(n)counts.set(key,n);else counts.delete(key);}}
  function terminal(s,moves,ply,key){if(!moves.length)return inCheck(s)?-100000+ply:0;if(s.half>=100||insufficient(s)||(counts.get(key)||0)>=3)return 0;return null;}
  function quiet(s,alpha,beta,ply,qdepth,key){
    visit();qnodes++;
    const moves=legal(s),end=terminal(s,moves,ply,key);
    if(end!==null)return {score:end,pv:[]};
    const check=inCheck(s),stand=(s.turn==='w'?1:-1)*evaluate(s);
    // Hard cap bounds pathological checking/capture sequences, not an exact leaf proof.
    if(qdepth>=12)return {score:stand,pv:[]};
    if(!check){if(stand>=beta)return {score:stand,pv:[]};alpha=Math.max(alpha,stand);}
    let best=check?-Infinity:stand,pv=[];
    for(const move of ordered(s,check?moves:moves.filter(m=>capture(s,m)),ply)){
      const child=descend(s,move,(next,k)=>quiet(next,-beta,-alpha,ply+1,qdepth+1,k)),score=-child.score;
      if(score>best){best=score;pv=[move,...child.pv];}alpha=Math.max(alpha,score);
      if(alpha>=beta){cutoffs++;break;}
    }
    return {score:best,pv};
  }
  function negamax(s,depth,alpha,beta,ply,key,branch){
    if(depth<=0)return quiet(s,alpha,beta,ply,0,key);
    visit();const moves=legal(s),end=terminal(s,moves,ply,key);
    if(end!==null)return {score:end,pv:[]};
    let best=-Infinity,pv=[];
    const sorted=ordered(s,moves,ply);
    for(let i=0;i<sorted.length;i++){
      const move=sorted[i],before=nodes;
      const child=descend(s,move,(next,k)=>negamax(next,depth-1,-beta,-alpha,ply+1,k,null)),score=-child.score;
      if(branch&&branch.replies.length<6)branch.replies.push({move,score,nodes:nodes-before,bound:score>=beta?'lower':score<=alpha?'upper':'exact',pv:[move,...child.pv]});
      if(score>best){best=score;pv=[move,...child.pv];}alpha=Math.max(alpha,score);
      if(alpha>=beta){cutoffs++;if(!capture(s,move)){killers.set(ply,move);quietHistory.set(moveKey(move),Math.min(80000,(quietHistory.get(moveKey(move))||0)+depth*depth));}if(branch)branch.skipped=sorted.length-i-1;break;}
    }
    if(branch)branch.replyCount=moves.length;
    return {score:best,pv};
  }
  const rootMoves=legal(state);if(!rootMoves.length)return null;
  for(let depth=1;depth<=maxDepth;depth++){
    const candidates=[],branches=[];
    try{
      for(const move of ordered(state,rootMoves.slice(),0,last?.move)){
        if(performance.now()>deadline&&last)throw timeout;
        const before=nodes,branch=trace?{move,replies:[],skipped:0,replyCount:0}:null;
        const result=descend(state,move,(next,key)=>negamax(next,depth-1,-Infinity,Infinity,1,key,branch));
        const candidate={move,score:-result.score,pv:[move,...result.pv],nodes:nodes-before};
        candidates.push(candidate);if(branch)branches.push({...branch,score:candidate.score,nodes:candidate.nodes});
      }
      candidates.sort((a,b)=>b.score-a.score);
      last={...candidates[0],candidates:candidates.slice(0,4),depth,nodes,qnodes,cutoffs,ms:Math.round(performance.now()-start),tree:branches,traceDepth:2};
      onIteration(last);if(Math.abs(last.score)>99000)break;
    }catch(error){if(error!==timeout)throw error;break;}
  }
  return last?{...last,nodes,qnodes,cutoffs,ms:Math.round(performance.now()-start)}:{move:rootMoves[0],score:null,pv:[rootMoves[0]],candidates:[],tree:[],depth:0,nodes,qnodes,cutoffs,ms:Math.round(performance.now()-start)};
}

