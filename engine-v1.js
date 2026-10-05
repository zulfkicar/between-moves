// Original small chess engine. Board: a8=0, h1=63. Scores are centipawns.
export const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const square=i=>'abcdefgh'[i%8]+(8-Math.floor(i/8));
export const index=s=>'abcdefgh'.indexOf(s[0])+(8-Number(s[1]))*8;
export const color=p=>!p?null:p===p.toUpperCase()?'w':'b';
export const other=c=>c==='w'?'b':'w';
export const values={p:100,n:320,b:335,r:500,q:900,k:0};
export function parse(fen=START){const [placement,turn,rights,ep,half,full]=fen.split(' '),board=[];for(const c of placement)if(c!=='/')if(/\d/.test(c))board.push(...Array(Number(c)).fill(null));else board.push(c);return {board,turn,rights,ep:ep==='-'?-1:index(ep),half:Number(half),full:Number(full)};}
export function fen(s){let rows=[];for(let r=0;r<8;r++){let row='',n=0;for(let c=0;c<8;c++){const p=s.board[r*8+c];if(!p)n++;else {if(n)row+=n;n=0;row+=p;}}if(n)row+=n;rows.push(row);}return `${rows.join('/')} ${s.turn} ${s.rights||'-'} ${s.ep<0?'-':square(s.ep)} ${s.half} ${s.full}`;}
export function positionKey(s){const parts=fen(s).split(' ').slice(0,4);if(s.ep>=0&&!legal(s).some(m=>m.ep))parts[3]='-';return parts.join(' ');}
const knight=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],king=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
export function attacked(s,target,by){const r=target>>3,c=target%8,b=s.board;const pawn=by==='w'?'P':'p',pr=r+(by==='w'?1:-1);for(const dc of [-1,1])if(inside(pr,c+dc)&&b[pr*8+c+dc]===pawn)return true;
 for(const [dr,dc] of knight)if(inside(r+dr,c+dc)&&b[(r+dr)*8+c+dc]===(by==='w'?'N':'n'))return true;
 for(const [dr,dc] of king){let nr=r+dr,nc=c+dc,d=1;while(inside(nr,nc)){const p=b[nr*8+nc];if(p){if(color(p)===by){const t=p.toLowerCase();if((d===1&&t==='k')||t==='q'||(dr&&dc?t==='b':t==='r'))return true;}break;}nr+=dr;nc+=dc;d++;}}
 return false;}
export const inCheck=(s,c=s.turn)=>attacked(s,s.board.indexOf(c==='w'?'K':'k'),other(c));
export function pseudo(s){const moves=[],b=s.board,side=s.turn;const add=(from,to,extras={})=>{if(b[to]?.toLowerCase()==='k')return;const p=b[from];if(p.toLowerCase()==='p'&&(to<8||to>=56))for(const promotion of ['q','r','b','n'])moves.push({from,to,...extras,promotion});else moves.push({from,to,...extras});};
 for(let from=0;from<64;from++){const p=b[from];if(color(p)!==side)continue;const r=from>>3,c=from%8,t=p.toLowerCase();
  if(t==='p'){const dr=side==='w'?-1:1,nr=r+dr;if(inside(nr,c)&&!b[nr*8+c]){add(from,nr*8+c);if(r===(side==='w'?6:1)&&!b[(r+dr*2)*8+c])add(from,(r+dr*2)*8+c);}
   for(const dc of [-1,1])if(inside(nr,c+dc)){const to=nr*8+c+dc;if(b[to]&&color(b[to])!==side)add(from,to);else if(to===s.ep&&b[to-dr*8]===(side==='w'?'p':'P'))add(from,to,{ep:true});}continue;}
  const dirs=t==='n'?knight:t==='b'?king.filter(([a,b])=>a&&b):t==='r'?king.filter(([a,b])=>!a||!b):king;
  for(const [dr,dc] of dirs){let nr=r+dr,nc=c+dc;while(inside(nr,nc)){const to=nr*8+nc;if(color(b[to])===side)break;add(from,to);if(b[to]||t==='n'||t==='k')break;nr+=dr;nc+=dc;}}
  if(t==='k'&&from===(side==='w'?60:4)&&!inCheck(s))for(const [right,rook,between,pass,to] of side==='w'?[['K',63,[61,62],61,62],['Q',56,[57,58,59],59,58]]:[['k',7,[5,6],5,6],['q',0,[1,2,3],3,2]])if(s.rights.includes(right)&&b[rook]===(side==='w'?'R':'r')&&between.every(i=>!b[i])&&!attacked(s,pass,other(side))&&!attacked(s,to,other(side)))add(from,to,{castle:rook});
 }
 return moves;}
export function apply(s,m){const n={...s,board:s.board.slice(),turn:other(s.turn),ep:-1,half:s.half+1,full:s.full+(s.turn==='b'?1:0)},p=s.board[m.from];if(p.toLowerCase()==='p'||s.board[m.to]||m.ep)n.half=0;n.board[m.from]=null;n.board[m.to]=m.promotion?(s.turn==='w'?m.promotion.toUpperCase():m.promotion):p;
 if(m.ep)n.board[m.to+(s.turn==='w'?8:-8)]=null;
 if(m.castle!==undefined){n.board[m.castle]=null;n.board[(m.from+m.to)/2]=s.turn==='w'?'R':'r';}
 if(p.toLowerCase()==='p'&&Math.abs(m.to-m.from)===16)n.ep=(m.to+m.from)/2;
 if(p==='K')n.rights=n.rights.replace(/[KQ]/g,'');if(p==='k')n.rights=n.rights.replace(/[kq]/g,'');
 for(const [i,right] of [[0,'q'],[7,'k'],[56,'Q'],[63,'K']])if(m.from===i||m.to===i)n.rights=n.rights.replace(right,'');return n;}
export const legal=s=>pseudo(s).filter(m=>!inCheck(apply(s,m),s.turn));
export function insufficient(s){const pieces=s.board.map((p,i)=>({p,i})).filter(x=>x.p&&x.p.toLowerCase()!=='k');if(!pieces.length)return true;if(pieces.length===1&&'bn'.includes(pieces[0].p.toLowerCase()))return true;return pieces.every(x=>x.p.toLowerCase()==='b')&&new Set(pieces.map(x=>((x.i>>3)+x.i%8)%2)).size===1;}
export function outcome(s,keys=[]){const moves=legal(s);if(!moves.length)return inCheck(s)?{over:true,text:`Checkmate · ${s.turn==='w'?'Black':'White'} wins`}:{over:true,text:'Draw · stalemate'};if(s.half>=100)return {over:true,text:'Draw · fifty-move rule'};if(keys.filter(k=>k===positionKey(s)).length>=3)return {over:true,text:'Draw · repetition'};if(insufficient(s))return {over:true,text:'Draw · insufficient material'};return {over:false,text:inCheck(s)?'Check':''};}
export function notation(s,m,moves=legal(s)){const p=s.board[m.from],t=p.toLowerCase();let text;if(m.castle!==undefined)text=m.to>m.from?'O-O':'O-O-O';else {const capture=s.board[m.to]||m.ep;let dis='';if(t!=='p'){const peers=moves.filter(x=>x.from!==m.from&&x.to===m.to&&s.board[x.from]===p);if(peers.length)dis=peers.every(x=>x.from%8!==m.from%8)?square(m.from)[0]:peers.every(x=>(x.from>>3)!==(m.from>>3))?square(m.from)[1]:square(m.from);}text=(t==='p'?(capture?square(m.from)[0]:''):t.toUpperCase()+dis)+(capture?'x':'')+square(m.to)+(m.promotion?'='+m.promotion.toUpperCase():'');}const next=apply(s,m);if(inCheck(next))text+=legal(next).length?'+':'#';return text;}
export function evaluate(s){let score=0;for(let i=0;i<64;i++){const p=s.board[i];if(!p)continue;const t=p.toLowerCase(),white=color(p)==='w',r=white?7-(i>>3):i>>3,c=i%8,center=3.5-Math.abs(c-3.5)+3.5-Math.abs(r-3.5);let bonus=0;if(t==='p')bonus=r*8+(3.5-Math.abs(c-3.5))*5;if(t==='n')bonus=center*13;if(t==='b')bonus=center*7;if(t==='r')bonus=r*2;if(t==='k')bonus=r<2?-center*6:-r*12;score+=(white?1:-1)*(values[t]+bonus);}return Math.round(score);}
export function perft(s,d){if(!d)return 1;let n=0;for(const m of legal(s))n+=perft(apply(s,m),d-1);return n;}
const same=(a,b)=>a&&b&&a.from===b.from&&a.to===b.to&&a.promotion===b.promotion;
// Iterative deepening reports completed iterations only. Each root move has an exact score at that depth.
export function search(s,{milliseconds=1000,maxDepth=5,onIteration=()=>{}}={}){const start=performance.now(),deadline=start+milliseconds;let nodes=0,last=null;const timeout={};
 const ordered=(state,moves,hint)=>moves.sort((a,b)=>{const rank=m=>(same(m,hint)?100000:0)+(m.promotion?900:0)+(state.board[m.to]?10*values[state.board[m.to].toLowerCase()]-values[state.board[m.from].toLowerCase()]:m.ep?900:0);return rank(b)-rank(a);});
 function negamax(state,depth,alpha,beta,ply){nodes++;if((nodes&127)===0&&performance.now()>deadline)throw timeout;const moves=legal(state);if(!moves.length)return {score:inCheck(state)?-100000+ply:0,pv:[]};if(state.half>=100||insufficient(state))return {score:0,pv:[]};if(!depth)return {score:(state.turn==='w'?1:-1)*evaluate(state),pv:[]};let best=-Infinity,pv=[];for(const m of ordered(state,moves)){const child=negamax(apply(state,m),depth-1,-beta,-alpha,ply+1),score=-child.score;if(score>best){best=score;pv=[m,...child.pv];}alpha=Math.max(alpha,score);if(alpha>=beta)break;}return {score:best,pv};}
 const root=legal(s);if(!root.length)return null;
 for(let depth=1;depth<=maxDepth;depth++){try{const candidates=[];for(const m of ordered(s,root.slice(),last?.move)){if(performance.now()>deadline&&last)throw timeout;const result=negamax(apply(s,m),depth-1,-Infinity,Infinity,1);candidates.push({move:m,score:-result.score,pv:[m,...result.pv]});}candidates.sort((a,b)=>b.score-a.score);last={...candidates[0],candidates:candidates.slice(0,4),depth,nodes,ms:Math.round(performance.now()-start)};onIteration(last);if(Math.abs(last.score)>99000)break;}catch(e){if(e!==timeout)throw e;break;}}
 return last?{...last,nodes,ms:Math.round(performance.now()-start)}:{move:root[0],score:0,pv:[root[0]],candidates:[],depth:0,nodes,ms:Math.round(performance.now()-start)};}
