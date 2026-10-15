/* Otoko · I'm Alive — moteur de jeu (canvas 2D, 4 pistes, portrait) */
(()=>{
'use strict';
/* ---------- constantes ---------- */
// palette de la pochette d'I'm Alive
const INK='#1c2a3a',CREAM='#f6e6bd',TEAL='#1d7470',RED='#d8372a',ORANGE='#ef8a25',PINK='#e2577d',MUSTARD='#f5b830';
const LANE=['#1fa39a','#e23b2e','#f5b830','#3a7fd0'];
const MULTC={1:'#e6d6aa',2:ORANGE,3:'#1fa39a',4:PINK};
const DROP='#ff5fa8',DROP_RGB='255,95,168',CY=DROP,MAG=CREAM;
const SP_NAME='MODE DROP';
const LOOK=[1.6,1.3,1.05,0.82];   // secondes de manche visibles, par difficulté
const WIN=0.11;                   // fenêtre de frappe (± s)
const LEAD_IN=2.2;                // délai mini avant la 1re note
const STAR_T=[0.12,0.28,0.45,0.62,0.8];
const DIFF_NAMES=['Facile','Moyen','Difficile','Expert'];
const store={get(k,d){try{const v=localStorage.getItem('otoko.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('otoko.'+k,JSON.stringify(v))}catch(e){}}};
const $=id=>document.getElementById(id);
const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};

/* ---------- morceaux ---------- */
// Les titres de l'album s'ajoutent ici : {id, title, src:'audio/xx.mp3', chart:'charts/xx.json'}
const ALBUM=Object.assign({artist:'Otoko',title:"I'm Alive",releaseDate:'',release:'début décembre 2026',instagram:'',soundcloud:''},window.OTOKO_ALBUM||{});
// pochette de l'album (écran de scène, image story)
const coverImg=new Image(),coverBig=new Image();coverImg.onload=()=>{if(W)buildStatic()};coverImg.src='img/cover-256.jpg';coverBig.src='img/cover.jpg';
const IG_URL=ALBUM.instagram?'https://instagram.com/'+ALBUM.instagram:'';
const PREVIEW=/[?&]preview\b/.test(location.search);           // ?preview : tous les titres débloqués (tests)
const dayStart=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d).getTime()};
const isLocked=s=>!PREVIEW&&s.unlock&&Date.now()<dayStart(s.unlock);
const unlockLabel=s=>new Date(dayStart(s.unlock)).toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
const daysLeft=()=>ALBUM.releaseDate?Math.ceil((dayStart(ALBUM.releaseDate)-Date.now())/864e5):null;
const SONGS=(window.OTOKO_SONGS||[]).slice();
const DEMO={id:'demo',title:'Minuit Électrique',sub:'Démo · morceau généré',demo:true,bpm:132};
SONGS.forEach(s=>s.album=true);
// textes et liens de promo de l'album
function syncPromo(){const d=daysLeft();
  $('mDate').textContent=ALBUM.title+' · '+ALBUM.release;
  if(d==null)$('mCd').textContent='';
  else if(d>0)$('mCd').innerHTML='J-'+d+'<small>AVANT LA SORTIE</small>';
  else{$('mRelease').textContent='NOUVEL ALBUM DISPO';$('mCd').innerHTML='OUT<small>SUR SOUNDCLOUD</small>'}}
syncPromo();
$('pTitle').textContent=ALBUM.artist+' · '+ALBUM.title;
for(const id of['mSc','rSc'])if(ALBUM.soundcloud)$(id).href=ALBUM.soundcloud;else $(id).hidden=true;
for(const id of['mIg','rIg'])if(IG_URL)$(id).href=IG_URL;else $(id).hidden=true;
$('share').onclick=shareStory;
// page d'accueil
function syncHome(){
  const ms=ALBUM.releaseDate?dayStart(ALBUM.releaseDate)-Date.now():0;
  if(ms>0){const d=Math.floor(ms/864e5),h=Math.floor(ms/36e5)%24,m=Math.floor(ms/6e4)%60;
    $('hCount').innerHTML=[[d,'jours'],[h,'heures'],[m,'min']].map(([v,l])=>'<div><b>'+v+'</b><span>'+l+'</span></div>').join('');
    $('hDate').textContent='Sortie '+ALBUM.release+' sur SoundCloud'}
  else{$('hCount').innerHTML='<div style="min-width:220px"><b>DISPO</b><span>sur SoundCloud</span></div>';$('hDate').textContent='L\'album est sorti, et il se joue ici.'}
  const list=$('hTracks');list.innerHTML='';let n=0;
  const row=(cls,num,title,sub,go)=>{const b=document.createElement(go?'button':'div');b.className='trow'+cls;b.innerHTML='<span class="n"></span><span class="tt"><b></b><small></small></span><span class="go"></span>';b.querySelector('.n').textContent=num;b.querySelector('b').textContent=title;b.querySelector('small').textContent=sub;b.querySelector('.go').textContent=go?'Jouer ▶':cls?'':'';list.appendChild(b);return b};
  const fmtD=d=>new Date(dayStart(d)).toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
  for(const t of ALBUM.tracklist||[]){n++;const s=t.id&&SONGS.find(x=>x.id===t.id);
    if(s&&!isLocked(s)){const r=row('',n,t.title,'Jouable maintenant',true);r.onclick=()=>{song=s;syncMenu();show('menu')}}
    else{const r=row(' lock',n,t.title,s?'Jouable le '+unlockLabel(s):t.date?'Jouable le '+fmtD(t.date):'Bientôt jouable',false);r.querySelector('.go').textContent='🔒'}}
  $('hDefiSec').hidden=!ALBUM.challenge;$('hDefi').textContent=ALBUM.challenge||'';
}
if(IG_URL){$('hIg').href=$('hIg2').href=IG_URL;$('hIg').textContent='@'+ALBUM.instagram}else{$('hIg').hidden=$('hIg2').hidden=true}
if(ALBUM.soundcloud)$('hSc').href=ALBUM.soundcloud;else $('hSc').hidden=true;
if(ALBUM.instagram)$('hStep2').textContent='À la fin, partage ton image en story Instagram et tague @'+ALBUM.instagram+'. Je repartage les meilleurs scores.';
$('hPlay').onclick=()=>{syncMenu();show('menu')};
$('menuBack').onclick=()=>{syncHome();show('home')};
syncHome();setInterval(()=>{if(!$('home').hidden)syncHome()},30000);
let song=SONGS.find(s=>!isLocked(s))||SONGS[0];

/* ---------- réglages ---------- */
let diff=store.get('diff',1),focusMode=store.get('focus2',false);
function syncMenu(){
  document.querySelectorAll('#difRow .opt').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.d===diff)));
  $('focus').setAttribute('aria-checked',String(focusMode));
  const L=lvlOf(store.get('xp',0));$('mRank').textContent='NIVEAU '+L.lvl+' · '+L.title;
  const list=$('songs');list.innerHTML='';
  for(const s of SONGS){
    const best=store.get('best.'+s.id+'.'+diff,null);
    const b=document.createElement('button');b.className='songrow';b.setAttribute('aria-pressed',String(s===song));
    b.innerHTML='<span class="sn"><b></b><small></small></span><span class="sb"><span class="stars"></span><em></em></span>';
    b.querySelector('b').textContent=s.title;b.querySelector('small').textContent=s.sub||'Otoko · I’m Alive';
    b.querySelector('.stars').textContent=best?'★'.repeat(best.stars)+'☆'.repeat(5-best.stars):'☆☆☆☆☆';
    b.querySelector('em').textContent=best?best.score.toLocaleString('fr-FR'):'';
    if(isLocked(s)){b.classList.add('locked');b.querySelector('.stars').textContent='🔒';b.querySelector('em').textContent='Jouable le '+unlockLabel(s);b.onclick=null;b.setAttribute('aria-disabled','true')}
    else b.onclick=()=>{song=s;syncMenu()};
    list.appendChild(b);
  }
}
document.querySelectorAll('#difRow .opt').forEach(b=>b.onclick=()=>{diff=+b.dataset.d;store.set('diff',diff);syncMenu()});
$('focus').onclick=()=>{focusMode=!focusMode;store.set('focus2',focusMode);syncMenu()};
const RANKS=[[1,'Rookie du club'],[5,'Héros du dancefloor'],[10,'Tête d\'affiche'],[15,'Star des festivals'],[20,'Légende']];
function lvlOf(xp){const lvl=Math.floor(Math.sqrt(xp/15000))+1;const a=(lvl-1)**2*15000,b=lvl**2*15000;let t=RANKS[0][1];for(const[r,n]of RANKS)if(lvl>=r)t=n;return{lvl,title:t,frac:(xp-a)/(b-a)}}


/* ---------- partition démo ---------- */
const DBPM=132,DSPB=60/DBPM,D_END_BEAT=37*4,D_BARS=38;
const PROG=[[40,'m'],[43,'M'],[36,'M'],[38,'M']];
function tones(bar){const[r,q]=PROG[((bar%4)+4)%4];return[r+24,r+24+(q==='m'?3:4),r+31,r+36]}
function demoChart(d){
  const N=[];let chain=0,phrase=0;
  const add=(b,lane,type,lvl,x)=>N.push(Object.assign({b,lane,type,lvl},x||{}));
  const PAT=[[0,1,2,1],[0,2,3,2],[1,2,3,1],[3,2,1,0]];
  const verse=(bar,k,dense)=>{const p=PAT[k%4],b0=bar*4;
    if(k%4===3){add(b0,p[0],'tap',0);add(b0+1,p[1],'tap',1);if(dense)add(b0+1.5,p[2],'tap',2);add(b0+2,p[2],'hold',0,{len:1.5});return}
    for(let i=0;i<4;i++){add(b0+i,p[i],'tap',i%2?1:0);if(i<3||dense){add(b0+i+0.5,(p[i]+(k%2?1:3))%4,'tap',dense?2:3)}}};
  const strum=(bar,L)=>{const b0=bar*4;for(let i=0;i<8;i++){const dir=i%2?-1:1;add(b0+i*0.5,dir>0?L:L+1,'strum',i%2?2:(i%4===0?0:1),{dir})}};
  const slide=(bar,up)=>{const b0=bar*4;for(let gI=0;gI<2;gI++){chain++;const ls=(up^gI)?[0,1,2,3]:[3,2,1,0];ls.forEach((l,j)=>add(b0+gI*2+j*0.5,l,'tap',j===0?0:(j===2?1:2),{chain,ci:j}))}};
  const bars=(bar)=>{for(let i=0;i<4;i++)add(bar*4+i,-1,'bar',i%2?1:0)};
  for(let k=0;k<8;k++)verse(2+k,k,false);
  strum(10,1);strum(11,2);strum(12,0);strum(13,1);slide(14,1);slide(15,0);bars(16);verse(17,3,false);
  for(let k=0;k<8;k++)verse(18+k,k,true);
  strum(26,2);slide(27,1);strum(28,0);slide(29,0);slide(30,1);slide(31,0);
  bars(32);strum(33,1);verse(34,2,true);verse(35,3,true);
  add(36*4,-1,'bar',0);add(36*4+1,0,'hold',0,{len:2.5});
  for(const[a,z]of[[4,5],[11,11],[15,15],[21,22],[27,27],[33,33]]){phrase++;for(const n of N){const bar=Math.floor(n.b/4);if(bar>=a&&bar<=z)n.sp=phrase}}
  const seen=new Set();
  return N.filter(n=>n.lvl<=d).sort((a,b)=>a.b-b.b).map(n=>{const r={t:n.b*DSPB,lane:n.lane,type:n.type,bar:Math.floor(n.b/4)};
    if(n.len)r.len=n.len*DSPB;if(n.dir)r.dir=n.dir;if(n.sp)r.sp=n.sp;if(n.chain){r.chain=n.chain;r.linked=seen.has(n.chain);seen.add(n.chain)}return r});
}

/* ---------- audio ---------- */
let ac=null,master,bus,musicIn,djFilter,noiseBuf,curve,srcNode=null;
function initAudio(){
  if(ac)return;
  ac=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=3;
  master=ac.createGain();master.gain.value=0.9;master.connect(comp);comp.connect(ac.destination);
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  curve=new Float32Array(2048);for(let i=0;i<2048;i++){const x=i/1024-1;curve[i]=Math.tanh(x*4)}
}
const mf=m=>440*Math.pow(2,(m-69)/12);
function newBus(){
  if(bus){const old=bus;old.gain.setTargetAtTime(0,ac.currentTime,0.02);setTimeout(()=>old.disconnect(),300)}
  if(srcNode){try{srcNode.stop()}catch(e){}srcNode=null}
  bus=ac.createGain();bus.connect(master);
  // chaîne « musique » : filtre DJ qui étouffe le son quand on rate
  djFilter=ac.createBiquadFilter();djFilter.type='lowpass';djFilter.frequency.value=20000;djFilter.Q.value=0.7;
  musicIn=ac.createGain();musicIn.connect(djFilter);djFilter.connect(bus);
}
// note ratée : la musique est juste un peu feutrée (filtre doux, volume intact) et revient seule en moins d'une seconde
function djMiss(){const t=ac.currentTime;djFilter.frequency.cancelScheduledValues(t);djFilter.frequency.setValueAtTime(Math.max(2000,djFilter.frequency.value),t);djFilter.frequency.exponentialRampToValueAtTime(2000,t+0.06);djFilter.frequency.setTargetAtTime(20000,t+0.45,0.2)}
function djHit(){const t=ac.currentTime;if(djFilter.frequency.value<15000){djFilter.frequency.cancelScheduledValues(t);djFilter.frequency.setValueAtTime(djFilter.frequency.value,t);djFilter.frequency.exponentialRampToValueAtTime(20000,t+0.25)}}
function guitar(midis,when,dur,vol){
  const out=ac.createGain(),pre=ac.createGain(),ws=ac.createWaveShaper(),lp=ac.createBiquadFilter();
  pre.gain.value=0.5;ws.curve=curve;ws.oversample='2x';lp.type='lowpass';lp.frequency.value=3000;lp.Q.value=0.9;
  pre.connect(ws);ws.connect(lp);lp.connect(out);out.connect(bus);
  const oscs=[];
  for(const m of midis)for(const dt of[-9,9]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=mf(m);o.detune.value=dt;o.connect(pre);o.start(when);oscs.push(o)}
  const g=out.gain;g.setValueAtTime(0,when);g.linearRampToValueAtTime(vol,when+0.006);g.exponentialRampToValueAtTime(vol*0.5,when+0.2);
  const stopAt=when+Math.max(dur,0.22);g.setValueAtTime(vol*0.5,stopAt);g.exponentialRampToValueAtTime(0.0005,stopAt+0.18);
  oscs.forEach(o=>o.stop(stopAt+0.25));
  return{stop(t){try{g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.setTargetAtTime(0.0001,t,0.03);oscs.forEach(o=>o.stop(t+0.25))}catch(e){}}};
}
function noise(when,dur,type,freq,vol,q,dest){const s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type=type;f.frequency.value=freq;if(q)f.Q.value=q;const g=ac.createGain();g.gain.setValueAtTime(vol,when);g.gain.exponentialRampToValueAtTime(0.0008,when+dur);s.connect(f);f.connect(g);g.connect(dest||musicIn);s.start(when,Math.random()*0.5);s.stop(when+dur+0.05)}
function tone(type,f0,f1,t,dur,vol,dest){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur*0.4);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);g.connect(dest||musicIn);o.start(t);o.stop(t+dur+0.02)}
const kick=t=>tone('sine',150,42,t,0.32,0.95);
const snare=t=>{noise(t,0.18,'highpass',1300,0.55);tone('triangle',190,0,t,0.1,0.35)};
const hat=(t,open,acc)=>noise(t,open?0.25:0.045,'highpass',7500,acc?0.16:0.09);
const crash=t=>noise(t,1.4,'highpass',4500,0.22);
const stick=(t,acc)=>tone('sine',acc?2100:1700,0,t,0.04,0.3,bus);
function bass(t,m,dur){const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type='sawtooth';o.frequency.value=mf(m);f.type='lowpass';f.frequency.value=420;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.32,t+0.01);g.gain.exponentialRampToValueAtTime(0.05,t+dur);o.connect(f);f.connect(g);g.connect(musicIn);o.start(t);o.stop(t+dur+0.02)}
function missSound(){const t=ac.currentTime;noise(t,0.12,'bandpass',420,0.4,2,bus);tone('square',110,70,t,0.14,0.06,bus)}
function spSound(){const t=ac.currentTime;tone('sawtooth',300,1800,t,0.6,0.12,bus);noise(t,0.6,'bandpass',3000,0.2,1,bus)}
const CRASH_BARS=new Set([2,10,14,16,18,26,30,32,36]);
function demoStep(s){
  const t=t0+s*DSPB/2,beat=s/2,bar=Math.floor(beat/4),bib=beat%4;
  if(bar<2){if(bib%1===0)stick(t,bib===0);return}
  if(bar===36){if(bib===0){kick(t);crash(t)}return}
  if(bar>36)return;
  const busy=(bar>=10&&bar<=15)||(bar>=26&&bar<=33);
  if(bib===0&&CRASH_BARS.has(bar))crash(t);
  if(bib===0||bib===2||(busy&&bib===2.5)||(bar>=18&&bib===3.5&&bar%2))kick(t);
  if(bib===1||bib===3)snare(t);
  if(bar%4===3&&bib>=3)snare(t+DSPB/4);
  hat(t,busy&&bib===3.5,bib%1===0);
  const r=PROG[bar%4][0];bass(t,(busy&&bib%1!==0)?r+12:r,DSPB/2*0.9);
}

/* ---------- état de partie ---------- */
let notes=[],state='menu',t0=0,lat=0,nextStep=0,pump=null,songDur=60,spb=0.5,beatGrid=null;
let score=0,streak=0,bestStreak=0,hits=0,misses=0,spMeter=0,spActive=false,spReadyShown=false,maxBase=1,cursor=0;
let spLeft={},spFail=new Set(),toasts=[],parts=[],missFlash=[0,0,0,0];
const ptrs=new Map();
// ?capture : horloge pilotée image par image (vidéos promo)
const CAP=/[?&]capture/.test(location.search);let capT=null,capStep=false,songShift=0;
const st=()=>capT!=null?capT:ac?ac.currentTime-t0-lat:0;
const mult=()=>{const b=Math.min(4,1+Math.floor(streak/10));return spActive?b*2:b};
const look=()=>LOOK[diff];

function computeMax(){let s=0,k=0;for(const n of notes){k++;const m=Math.min(4,1+Math.floor(k/10));s+=50*m+(n.type==='hold'?(n.end-n.t)*50*m:0)}return s||1}
function prepNotes(raw,shift){
  return raw.map(n=>{const r=Object.assign({},n);r.t+=shift;r.end=r.len?r.t+r.len:r.t;r.judged=false;r.hit=false;if(r.bar==null)r.bar=Math.floor((r.t-shift)/(spb*4));return r});
}
async function startGame(){
  initAudio();await ac.resume();
  newBus();
  let shift=0;
  if(song.demo){spb=DSPB;beatGrid=null;notes=prepNotes(demoChart(diff),0);songDur=D_END_BEAT*DSPB+2}
  else{
    if(!song.buffer){$('playBtn').textContent='CHARGEMENT…';try{const r=await fetch(song.src);song.buffer=await ac.decodeAudioData(await r.arrayBuffer())}catch(e){$('playBtn').textContent='JOUER ▶';$('fileMsg').textContent='Impossible de charger ce morceau.';return}$('playBtn').textContent='JOUER ▶'}
    let ch=null;
    if(song.chart){if(!song.chartData){try{song.chartData=await(await fetch(song.chart)).json()}catch(e){}}
      if(song.chartData)ch={bpm:song.chartData.bpm,beats:song.chartData.beats,notes:song.chartData.charts[diff]}}
    if(!ch){if(!song.analysis){const chs=[];for(let c=0;c<Math.min(2,song.buffer.numberOfChannels);c++)chs.push(song.buffer.getChannelData(c));song.analysis=Charter.analyze(chs,song.buffer.sampleRate)}ch=Charter.build(song.analysis,diff)}
    spb=60/ch.bpm;
    const first=ch.notes.length?ch.notes[0].t:LEAD_IN;shift=Math.max(0,LEAD_IN-first);
    notes=prepNotes(ch.notes,shift);songDur=song.buffer.duration+shift;beatGrid=ch.beats?ch.beats.map(b=>b+shift):null;
  }
  songShift=shift;maxBase=computeMax();
  spLeft={};for(const n of notes)if(n.sp)spLeft[n.sp]=(spLeft[n.sp]||0)+1;
  spFail=new Set();score=0;streak=0;bestStreak=0;hits=0;misses=0;spMeter=0;spActive=false;spReadyShown=false;cursor=0;toasts=[];parts=[];ptrs.clear();tutoOn=!store.get('tuto',false);
  lat=(ac.outputLatency||0)+(ac.baseLatency||0);
  t0=ac.currentTime+0.3;nextStep=0;
  clearInterval(pump);
  if(song.demo){pump=setInterval(()=>{if(state!=='play')return;while(nextStep<D_BARS*8&&t0+nextStep*DSPB/2<ac.currentTime+0.15)demoStep(nextStep++)},25)}
  else{srcNode=ac.createBufferSource();srcNode.buffer=song.buffer;srcNode.connect(musicIn);srcNode.start(t0+shift)}
  show(null);state='play';
  try{if(document.fullscreenElement==null&&document.documentElement.requestFullscreen&&!matchMedia('(display-mode: fullscreen)').matches)document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{})}catch(e){}
  try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('portrait').catch(()=>{})}catch(e){}
  try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
}
function show(id){for(const k of['home','menu','pause','results'])$(k).hidden=k!==id}
function pauseGame(){if(state!=='play')return;state='pause';ac.suspend();for(const n of notes)if(n.holding)release(n);ptrs.clear();show('pause')}
$('resume').onclick=()=>{show(null);ac.resume();state='play'};
$('restart').onclick=startGame;$('again').onclick=startGame;
$('quit').onclick=$('toMenu').onclick=()=>{state='menu';if(bus)bus.gain.setTargetAtTime(0,ac.currentTime,0.02);if(srcNode){try{srcNode.stop()}catch(e){}srcNode=null}ac.resume();syncMenu();show('menu')};
$('playBtn').onclick=startGame;

/* ---------- jugement ---------- */
function hit(n,id){
  n.judged=n.hit=true;streak++;bestStreak=Math.max(bestStreak,streak);hits++;
  score+=50*mult();djHit();
  if(n.type==='bar'){for(let l=0;l<4;l++)burst(l,spActive?CY:'#ffb12b',22)}
  else if(n.type==='strum'){burst(n.lane,col(n),16);burst(n.lane+n.dir,col(n),10)}
  else burst(n.lane,col(n),24);
  if(song.demo){const tn=tones(n.bar),now=ac.currentTime;
    if(n.type==='bar')guitar([tn[0],tn[2],tn[3]],now,0.35,0.13);
    else if(n.type==='strum')guitar([tn[0],tn[2]],now,0.18,0.16);
    else{const v=guitar([tn[n.lane]],now,n.type==='hold'?n.end-n.t:0.3,0.16);if(n.type==='hold')n.voice=v}}
  if(n.type==='hold'){n.holding=true;n.ptr=id}
  if(n.sp&&!spFail.has(n.sp)&&--spLeft[n.sp]===0){spMeter=Math.min(1,spMeter+0.25);toast('★ PHRASE DROP',CY)}
  if(streak%50===0)toast('SÉRIE DE '+streak+' !',MUSTARD);
}
function miss(n){n.judged=true;n.missed=true;if(n.sp)spFail.add(n.sp);if(streak>=10)toast('SÉRIE PERDUE',RED);streak=0;misses++;missSound();djMiss();if(n.lane>=0)missFlash[n.lane]=1;else missFlash.fill(1)}
function release(n){n.holding=false;if(n.voice)n.voice.stop(ac.currentTime)}
function tryTap(lane,id){
  const now=st();let best=null,bd=1e9;
  for(let i=cursor;i<notes.length;i++){const n=notes[i];if(n.t-now>WIN)break;if(n.judged||n.type==='strum')continue;
    if(n.type==='bar'||n.lane===lane){const dd=Math.abs(n.t-now);if(dd<=WIN&&dd<bd){bd=dd;best=n}}}
  if(best)hit(best,id);
}
function tryStrum(dir,id){
  const now=st();
  for(let i=cursor;i<notes.length;i++){const n=notes[i];if(n.t-now>WIN)break;if(!n.judged&&n.type==='strum'&&n.dir===dir&&Math.abs(n.t-now)<=WIN){hit(n,id);return true}}
  return false;
}
function activateSP(){if(spActive||spMeter<0.5)return;spActive=true;spReadyShown=false;spSound();toast(SP_NAME+' !',CY)}
function toast(txt,c){toasts.push({txt,c,t:performance.now()})}

/* ---------- géométrie ---------- */
const cv=$('c');let g=cv.getContext('2d',{alpha:false});
let ledCv=null,ledBox=null,W,H,dpr,cx,hitY,farY,vy,hw,laneW,safeTop=0,safeBot=0,hudX,hudW,quality=CAP?3:2,statCv=null,crowdCv=null,bgGrad=null,fogGrad=null,skyCv=null,smokeCv=[],skyH=0,sunY=0,sunR=0,haloCv=null;
const P=1.25;
function resize(){
  // résolution plafonnée (et abaissée automatiquement si le téléphone peine)
  dpr=Math.min(window.devicePixelRatio||1,quality);W=innerWidth;H=innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);g.setTransform(dpr,0,0,dpr,0,0);
  const pr0=document.createElement('div');pr0.style.cssText='position:fixed;top:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';document.body.appendChild(pr0);const cs=getComputedStyle(pr0);safeTop=parseFloat(cs.paddingTop)||0;safeBot=parseFloat(cs.paddingBottom)||0;pr0.remove();
  cx=W/2;hw=Math.min(W*0.40,H*0.24);laneW=hw*0.5;
  // barre de frappe en bas de l'écran : juste la place des pastilles sous la ligne
  hitY=H-Math.max(laneW*0.41*0.56*2+30,H*0.075)-safeBot;
  farY=Math.max(H*0.22,safeTop+120);vy=((1+P)*farY-hitY)/P;
  hudW=Math.min(W,520);hudX=(W-hudW)/2;
  for(const k in puckCache)delete puckCache[k];for(const k in beamCache)delete beamCache[k];
  bgGrad=g.createLinearGradient(0,0,0,H);bgGrad.addColorStop(0,'#0b0618');bgGrad.addColorStop(.6,'#140b28');bgGrad.addColorStop(1,'#05040a');
  buildStatic();
}
// dessine une fois dans un calque hors écran ce qui ne bouge pas
function offscreen(w,h,draw){const c=document.createElement('canvas');c.width=Math.ceil(w*dpr);c.height=Math.ceil(h*dpr);const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);const g0=g;g=x;try{draw()}finally{g=g0}return c}
function buildStatic(){
  crowdCv=offscreen(W,H*0.62+40,crowd);
  skyH=H*0.62+40;sunR=Math.min(W*0.3,hw*0.75);sunY=farY+sunR*0.35;haloCv=null;
  skyCv=offscreen(W,skyH,sky);smokeCv=[offscreen(W*1.3,skyH,()=>smoke(0)),offscreen(W*1.3,skyH,()=>smoke(1))];
  ledCv=null;const ly0=safeTop+98,ly1=pr(0,1.02).y-10;if(ly1-ly0>=46){ledBox={x:cx-hw*1.2,y:ly0,w:hw*2.4,h:ly1-ly0};ledCv=offscreen(ledBox.w,ledBox.h,ledScreen)}
  statCv=offscreen(W,H,()=>{highwayStatic();padStatic();railTube(-1,0.52,0.08);railTube(1,0.62,0.08);bubbleStatic();hudStatic()});
  const a=pr(0,1.02),c=pr(0,-0.03),fh=(c.y-a.y)*0.28;fogGrad={y:a.y,h:fh};
}
addEventListener('resize',resize);
const pr=(xn,d)=>{const s=1/(1+P*Math.max(d,-0.3));return{x:cx+xn*hw*s,y:vy+(hitY-vy)*s,s}};
const LX=l=>-0.75+l*0.5;
const spBandY=()=>hitY-laneW*0.62;
const laneAt=x=>Math.max(0,Math.min(3,Math.floor(((x-cx)/hw+1)*2)));

/* ---------- entrées ---------- */
const pauseHit=(x,y)=>x>hudX+8&&x<hudX+68&&y<safeTop+56;
cv.addEventListener('pointerdown',e=>{
  if(state!=='play')return;e.preventDefault();
  const x=e.clientX,y=e.clientY;
  if(pauseHit(x,y)){pauseGame();return}
  if(y<safeTop+96)return;
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const lane=laneAt(x);
  ptrs.set(e.pointerId,{x,y,x0:x,lane,prev:lane});
  if(spMeter>=0.5&&!spActive&&Math.abs(y-spBandY())<laneW*0.32)activateSP();
  tryTap(lane,e.pointerId);
});
cv.addEventListener('pointermove',e=>{
  const p=ptrs.get(e.pointerId);if(!p||state!=='play')return;
  p.x=e.clientX;p.y=e.clientY;p.lane=laneAt(p.x);
  const dx=p.x-p.x0;
  if(Math.abs(dx)>laneW*0.4){tryStrum(Math.sign(dx),e.pointerId);p.x0=p.x}
});
const up=e=>{ptrs.delete(e.pointerId);for(const n of notes)if(n.holding&&n.ptr===e.pointerId)release(n)};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
const KEYS={KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
addEventListener('keydown',e=>{
  if(state==='play'&&(e.code==='Escape'||e.code==='KeyP')){pauseGame();return}
  if(state!=='play'||e.repeat)return;
  if(e.code in KEYS){const l=KEYS[e.code],id='k'+l;ptrs.set(id,{x:cx+LX(l)*hw,lane:l,prev:l,x0:0});tryTap(l,id);e.preventDefault()}
  else if(e.code==='ArrowLeft'||e.code==='ArrowRight'){tryStrum(e.code==='ArrowRight'?1:-1,'arrow');e.preventDefault()}
  else if(e.code==='Space'){activateSP();e.preventDefault()}
});
addEventListener('keyup',e=>{if(e.code in KEYS)up({pointerId:'k'+KEYS[e.code]})});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()});

/* ---------- mise à jour ---------- */
function update(dt){
  const now=st();
  for(const p of ptrs.values()){
    const lo=Math.min(p.prev,p.lane),hi=Math.max(p.prev,p.lane);
    for(let i=cursor;i<notes.length;i++){const n=notes[i];if(n.t-now>WIN)break;
      if(!n.judged&&n.linked&&n.lane>=lo&&n.lane<=hi&&Math.abs(n.t-now)<=WIN)hit(n,null)}
    p.prev=p.lane;
  }
  for(let i=Math.max(0,cursor-40);i<notes.length;i++){const n=notes[i];if(n.t>now)break;
    if(n.holding){if(now>=n.end){n.holding=false;n.done=true}else if(!ptrs.has(n.ptr))release(n);else score+=dt*50*mult()}}
  while(cursor<notes.length&&notes[cursor].judged&&!notes[cursor].holding&&notes[cursor].end<now-0.5)cursor++;
  for(let i=cursor;i<notes.length;i++){const n=notes[i];if(n.t>now)break;if(!n.judged&&now-n.t>WIN)miss(n)}
  if(spActive){spMeter-=dt/(32*spb);if(spMeter<=0){spMeter=0;spActive=false}}
  else if(spMeter>=0.5&&!spReadyShown){spReadyShown=true;toast(SP_NAME+' PRÊT',CY)}
  for(let l=0;l<4;l++)missFlash[l]=Math.max(0,missFlash[l]-dt*3);
  for(const q of parts){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy-=q.up*dt}
  parts=parts.filter(q=>q.life>0);
  if(now>songDur+0.8&&state==='play')finish();
}
function finish(){
  state='results';clearInterval(pump);
  const stars=starCount(),acc=accuracy(),key='best.'+song.id+'.'+diff,prev=store.get(key,null),sc=Math.floor(score);
  const rec=!prev||sc>prev.score;if(rec)store.set(key,{score:sc,stars:Math.max(stars,prev?prev.stars:0)});
  const xp=store.get('xp',0)+sc;store.set('xp',xp);const L=lvlOf(xp);
  $('rStars').innerHTML='<b>'+'★'.repeat(stars)+'</b><span>'+'★'.repeat(5-stars)+'</span>';
  $('rSong').textContent=song.title+' · '+DIFF_NAMES[diff];
  const dl=daysLeft();$('pSub').textContent=(song.album?'Ce titre est sur le nouvel album, ':'Nouvel album, ')+(dl!=null&&dl<=0?'disponible sur SoundCloud':'sortie '+ALBUM.release);$('shareMsg').textContent='';
  $('rScore').textContent=sc.toLocaleString('fr-FR');$('rAcc').textContent=acc+' %';
  $('rNotes').textContent=hits+' / '+notes.length;$('rStreak').textContent=bestStreak;$('rRec').hidden=!rec;
  $('rLvl').textContent=L.lvl;$('rNext').textContent=L.lvl+1;$('rTitle').textContent=L.title;$('rXp').style.width='0';
  show('results');requestAnimationFrame(()=>{$('rXp').style.width=Math.round(L.frac*100)+'%'});heroArt();
}
const accuracy=()=>hits+misses?Math.floor(hits/(hits+misses)*100):100;
function starVal(){const s=score/maxBase;let v=0;for(let i=0;i<5;i++){const a=i?STAR_T[i-1]:0,b=STAR_T[i];if(s>=b)v=i+1;else{v=i+Math.max(0,(s-a)/(b-a));break}}return v}
const starCount=()=>Math.floor(starVal());

/* ---------- dessin ---------- */
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);const f=v=>Math.round(amt<0?v*(1+amt):v+(255-v)*amt);return'#'+[n>>16,n>>8&255,n&255].map(v=>f(v).toString(16).padStart(2,'0')).join('')}
const col=n=>spActive?CY:(n.lane>=0?LANE[n.lane]:'#ffb22b');
const sprites={};
function sprite(c){if(sprites[c])return sprites[c];const s=document.createElement('canvas');s.width=s.height=64;const x=s.getContext('2d');const rg=x.createRadialGradient(32,32,0,32,32,32);rg.addColorStop(0,'rgba(255,255,255,0.95)');rg.addColorStop(.3,c+'dd');rg.addColorStop(1,c+'00');x.fillStyle=rg;x.fillRect(0,0,64,64);return sprites[c]=s}
function burst(l,c,n){const x=cx+LX(l)*hw;for(let i=0;i<n;i++){const life=0.25+Math.random()*0.35;parts.push({x:x+(Math.random()-.5)*laneW*0.6,y:hitY-Math.random()*8,vx:(Math.random()-.5)*60,vy:-(160+Math.random()*320)*(H/900),up:-200,life,max:life,r:(8+Math.random()*16)*(laneW/90),c})}}

const beamCache={};
function beam(c){if(beamCache[c])return beamCache[c];return beamCache[c]=offscreen(140,H*0.9,()=>{const lg=g.createLinearGradient(0,0,0,H*0.9);lg.addColorStop(0,c+'cc');lg.addColorStop(1,c+'00');g.fillStyle=lg;g.beginPath();g.moveTo(64,0);g.lineTo(76,0);g.lineTo(140,H*0.9);g.lineTo(0,H*0.9);g.fill()})}
// écran géant de la scène : l'album en vitrine
function ledScreen(){const w=ledBox.w,h=ledBox.h;
  g.fillStyle=INK;rr(4,4,w-4,h-4,10);g.fill();
  g.fillStyle=CREAM;rr(0,0,w-4,h-4,10);g.fill();g.strokeStyle=INK;g.lineWidth=2.5;g.stroke();
  let tx=(w-4)/2,tw=w-4;if(coverImg.complete&&coverImg.naturalWidth){const cs=h-16;g.save();rr(7,6,cs,cs,6);g.clip();g.drawImage(coverImg,7,6,cs,cs);g.restore();g.strokeStyle=INK;g.lineWidth=2;rr(7,6,cs,cs,6);g.stroke();tx=(cs+14+w-4)/2;tw=w-4-cs-18}
  const fs=Math.min(h*0.44,tw*0.17);g.textAlign='center';g.textBaseline='middle';
  g.font='700 '+Math.round(Math.max(9,fs*0.34))+'px "Chakra Petch",sans-serif';g.fillStyle=TEAL;g.fillText('OTOKO · NOUVEL ALBUM',tx,h*0.18);
  g.font='400 '+Math.round(fs)+'px Shrikhand,Bungee,sans-serif';g.fillStyle=INK;g.fillText(ALBUM.title,tx+2,h*0.5+2);g.fillStyle=RED;g.fillText(ALBUM.title,tx,h*0.5);
  g.font='700 '+Math.round(Math.max(9,fs*0.3))+'px "Chakra Petch",sans-serif';g.fillStyle=INK;g.fillText('SORTIE '+ALBUM.release.replace(/^le /,'').toUpperCase(),tx,h*0.82)}
function crowd(){g.fillStyle=INK;let sd=11;const r2=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
  for(let i=0;i<26;i++){const x=i/25*W,hh=H*0.06+r2()*H*0.04;g.beginPath();g.arc(x,H*0.62-hh+12,10+r2()*5,0,7);g.fill();g.fillRect(x-14,H*0.62-hh+18,28,hh+40);
    if(r2()<0.35){g.save();g.lineCap='round';g.strokeStyle=INK;g.lineWidth=7;g.beginPath();g.moveTo(x+(i%2?9:-9),H*0.62-hh+24);g.lineTo(x+(i%2?18:-18),H*0.62-hh-14-r2()*14);g.stroke();g.restore()}}}
// ciel crème, soleil et grain d'impression (fixe)
function sky(){const gr=g.createLinearGradient(0,0,0,skyH);gr.addColorStop(0,'#f6e6bd');gr.addColorStop(.55,'#f7d9a4');gr.addColorStop(1,'#f4c08c');g.fillStyle=gr;g.fillRect(0,0,W,skyH);
  g.fillStyle='#f9d56e';g.beginPath();g.arc(cx,sunY,sunR,0,7);g.fill();g.strokeStyle=ORANGE;g.lineWidth=3;g.stroke();
  g.fillStyle='rgba(239,138,37,0.35)';for(let i=1;i<4;i++){g.fillRect(cx-sunR,sunY+sunR*(0.25+i*0.18),sunR*2,sunR*0.06)}
  let sd=3;const r2=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};for(let i=0;i<2600;i++){g.fillStyle=r2()<0.5?'rgba(28,42,58,0.06)':'rgba(255,255,255,0.18)';g.fillRect(r2()*W,r2()*skyH,1.4,1.4)}}
// fumées colorées qui partent du centre vers les coins, comme sur la pochette
function smoke(layer){const Wc=W*1.3,c0=Wc/2,cols=layer?[PINK,'#3a7fd0',MUSTARD,TEAL]:[TEAL,RED,ORANGE,PINK,'#2f6fb5'];const bw=Math.max(10,W*(layer?0.03:0.036));
  g.globalAlpha=layer?0.55:1;g.lineCap='round';g.lineJoin='round';
  for(const sd of[-1,1])cols.forEach((c,i)=>{const n=cols.length,k=(i+0.5)/n,pts=[];
    const y0=sunY-sunR*0.1,y1=farY-10+(skyH*0.8-farY)*k*(layer?0.85:1)+(layer?bw:0),reach=W*(0.44+0.06*layer)+sd*0;
    for(let t=0;t<=1.0001;t+=0.02){const e=t*t*(3-2*t),x=c0+sd*(sunR*0.35+t*reach)+sd*Math.sin(t*8+i*1.7+layer)*bw*0.7,
      y=y0+(y1-y0)*e-Math.sin(t*Math.PI)*sunR*(0.9-0.5*k)+Math.sin(t*9+i*2.1+layer*2)*bw*1.3;pts.push([x,y])}
    const path=()=>{g.beginPath();pts.forEach(([x,y],j)=>j?g.lineTo(x,y):g.moveTo(x,y))};
    path();g.strokeStyle=INK;g.lineWidth=bw+5;g.stroke();path();g.strokeStyle=c;g.lineWidth=bw;g.stroke();
    path();g.strokeStyle='rgba(255,255,255,0.25)';g.lineWidth=bw*0.25;g.stroke();
    // volute au bout
    const[ex,ey]=pts[pts.length-1];g.beginPath();for(let a=0;a<Math.PI*3;a+=0.15){const r=bw*1.6*(1-a/(Math.PI*3.4));g.lineTo(ex+sd*Math.cos(a)*r,ey-Math.sin(a)*r)}g.strokeStyle=INK;g.lineWidth=bw*0.5+4;g.stroke();g.strokeStyle=c;g.lineWidth=bw*0.5;g.stroke()});
  g.globalAlpha=1}
function halo(){if(haloCv)return haloCv;return haloCv=offscreen(200,200,()=>{const rg=g.createRadialGradient(100,100,30,100,100,100);rg.addColorStop(0,'rgba(255,236,170,0.9)');rg.addColorStop(1,'rgba(255,236,170,0)');g.fillStyle=rg;g.fillRect(0,0,200,200)})}
function stage(now){
  const beat=beatPos(now),pulse=Math.pow(1-((beat%1)+1)%1,3);
  g.drawImage(skyCv,0,0,W,skyH);
  // halo du soleil qui bat au tempo
  const sr=sunR*(1.25+0.12*pulse+(spActive?0.15:0));g.save();g.globalAlpha=0.35+0.35*pulse;g.drawImage(halo(),cx-sr*1.6,sunY-sr*1.6,sr*3.2,sr*3.2);g.restore();
  // fumées psychédéliques : deux couches qui ondulent doucement
  const sw=Math.sin(now*0.35)*W*0.03,sw2=Math.sin(now*0.27+1.3)*W*0.04,bob=Math.sin(now*0.5)*6;
  g.drawImage(smokeCv[1],-W*0.15+sw2,bob*0.6,W*1.3,skyH);
  g.drawImage(smokeCv[0],-W*0.15+sw,-bob,W*1.3,skyH);
  g.drawImage(crowdCv,0,0,W,H*0.62+40);
}
function highwayStatic(){
  const D0=-0.03,D1=1.02;
  // tranche de la piste
  for(const sd of[-1,1]){g.beginPath();for(let k=0;k<=12;k++){const p=pr(sd*1.06,D1+(D0-D1)*k/12);k?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)}
    for(let k=12;k>=0;k--){const p=pr(sd*1.16,D1+(D0-D1)*k/12);g.lineTo(p.x,p.y+26*p.s)}g.fillStyle='#0f1824';g.fill()}
  const a=pr(-1.06,D1),b=pr(1.06,D1),c=pr(1.06,D0),d=pr(-1.06,D0);
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();const gr=g.createLinearGradient(0,a.y,0,c.y);gr.addColorStop(0,'#24364a');gr.addColorStop(1,'#1c2a3a');g.fillStyle=gr;g.fill();
  // grain d'impression
  g.save();g.clip();let sd0=7;const r2=()=>{sd0=(sd0*16807)%2147483647;return sd0/2147483647};g.fillStyle='rgba(246,230,189,0.05)';for(let i=0;i<900;i++){g.fillRect(a.x+r2()*(b.x-a.x+ (c.x-b.x)*2)-(c.x-b.x),a.y+r2()*(c.y-a.y),1.5,1.5)}g.restore();
  for(let l=0;l<4;l++){if(l%2)continue;const x0=-1+l*0.5,x1=x0+0.5,p1=pr(x0,D1),p2=pr(x1,D1),p3=pr(x1,D0),p4=pr(x0,D0);g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.lineTo(p3.x,p3.y);g.lineTo(p4.x,p4.y);g.fillStyle='rgba(246,230,189,0.035)';g.fill()}
  for(let i=1;i<4;i++){const xn=-1+i*0.5,p1=pr(xn,D1),p2=pr(xn,D0);g.lineWidth=1.5;g.strokeStyle='rgba(246,230,189,0.22)';g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke()}
  // rails crème cerclés d'encre
  for(const sd of[-1,1]){const p1=pr(sd*1.07,D1),p2=pr(sd*1.07,D0);
    for(const[w,cc]of[[10,INK],[6,CREAM]]){g.strokeStyle=cc;g.lineWidth=w;g.lineCap='round';g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke()}
    g.strokeStyle=sd<0?TEAL:ORANGE;g.lineWidth=2;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke()}
}
function highway(now){
  const py=padGeom().y0,ps=(py-vy)/(hitY-vy),D0=(1/ps-1)/P,D1=1.02,sp=spActive;
  g.drawImage(statCv,0,0,W,H);
  for(let l=0;l<4;l++)if(missFlash[l]>0){const x0=-1+l*0.5,x1=x0+0.5,p1=pr(x0,D1),p2=pr(x1,D1),p3=pr(x1,D0),p4=pr(x0,D0);g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.lineTo(p3.x,p3.y);g.lineTo(p4.x,p4.y);g.fillStyle='rgba(226,59,46,'+(missFlash[l]*0.22)+')';g.fill()}
  if(sp){const a=pr(-1.06,D1),b=pr(1.06,D1),c=pr(1.06,D0),d=pr(-1.06,D0);g.save();g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();g.fillStyle='rgba('+DROP_RGB+',0.13)';g.fill();
    g.lineCap='round';for(const sd of[-1,1]){const p1=pr(sd*1.07,D1),p2=pr(sd*1.07,D0);for(const[w,al]of[[20,0.2],[10,0.45],[4,1]]){g.strokeStyle='rgba('+DROP_RGB+','+al+')';g.lineWidth=w;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke()}}g.restore()}
  const L=look();let bt=beatGrid?Math.max(0,lowerBeat(now-0.1)):Math.ceil((now-0.1)/spb);
  for(;;bt++){const tb=beatGrid?beatGrid[bt]:bt*spb;if(tb==null)break;const dd=(tb-now)/L;if(dd>D1)break;if(dd<D0)continue;const p1=pr(-1,dd),p2=pr(1,dd),major=((bt%4)+4)%4===0,w=(major?3.5:2)*p1.s;
    g.strokeStyle=CREAM;g.globalAlpha=major?0.6:0.22;g.lineWidth=w;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();g.globalAlpha=1}
  const fg=g.createLinearGradient(0,fogGrad.y-4,0,fogGrad.y+fogGrad.h);fg.addColorStop(0,focusMode?'rgba(28,42,58,1)':'rgba(244,196,140,1)');fg.addColorStop(1,'rgba(28,42,58,0)');
  const a=pr(-1.2,D1),b=pr(1.2,D1),c=pr(1.2,D1-0.25),d=pr(-1.2,D1-0.25);g.fillStyle=fg;g.beginPath();g.moveTo(a.x,fogGrad.y-6);g.lineTo(b.x,fogGrad.y-6);g.lineTo(c.x,fogGrad.y+fogGrad.h);g.lineTo(d.x,fogGrad.y+fogGrad.h);g.fill();
}
function beatPos(t){if(!beatGrid)return t/spb;const i=Math.max(1,Math.min(beatGrid.length-1,lowerBeat(t)));const a=beatGrid[i-1],b=beatGrid[i];return i-1+Math.max(0,Math.min(1,(t-a)/(b-a)))}
function lowerBeat(t){let lo=0,hi=beatGrid.length-1;while(lo<hi){const m=(lo+hi)>>1;if(beatGrid[m]<t)lo=m+1;else hi=m}return lo}
function star(x,y,r,f,s){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*0.45:r;g.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}g.closePath();g.fillStyle=f;g.fill();if(s){g.strokeStyle=s;g.lineWidth=1.5;g.stroke()}}
const puckCache={};
function puck(l,d,c,isSp,alpha){const p=pr(LX(l),d),key=c+(isSp?'*':'');let sp=puckCache[key];
  if(!sp){const rx=laneW*0.40,w=rx*2.4,h=rx*1.9;sp=puckCache[key]={w,h,ox:rx*1.2,oy:rx*0.6,cv:offscreen(w,h,()=>puckAt({x:rx*1.2,y:rx*0.6},rx,c,isSp))}}
  g.globalAlpha=alpha;g.drawImage(sp.cv,p.x-sp.ox*p.s,p.y-sp.oy*p.s,sp.w*p.s,sp.h*p.s);g.globalAlpha=1}
function puckAt(p,rx,c,isSp){const ry=rx*0.5,t=ry*0.85;
  g.fillStyle='rgba(10,16,24,0.55)';g.beginPath();g.ellipse(p.x+rx*0.1,p.y+t+ry*0.4,rx*1.02,ry*0.85,0,0,7);g.fill();
  // côté du jeton, contour d'encre
  g.fillStyle=shade(c,-0.42);g.beginPath();g.ellipse(p.x,p.y+t,rx,ry,0,0,Math.PI);g.lineTo(p.x-rx,p.y);g.ellipse(p.x,p.y,rx,ry,0,Math.PI,0,true);g.closePath();g.fill();g.strokeStyle=INK;g.lineWidth=2.4;g.stroke();
  g.fillStyle=c;g.beginPath();g.ellipse(p.x,p.y,rx,ry,0,0,7);g.fill();g.stroke();
  g.fillStyle='rgba(255,255,255,0.28)';g.beginPath();g.ellipse(p.x-rx*0.2,p.y-ry*0.3,rx*0.62,ry*0.42,0,0,7);g.fill();
  if(isSp){g.save();g.translate(p.x,p.y-ry*0.05);g.scale(1,0.55);star(0,0,rx*0.55,CREAM,INK);g.restore()}
  else{g.fillStyle=CREAM;g.beginPath();g.ellipse(p.x,p.y-ry*0.05,rx*0.34,ry*0.5,0,0,7);g.fill();g.lineWidth=2;g.stroke()}}
function tail(l,d0,d1,c,held,alpha){if(d1<d0)return;const a=pr(LX(l),d0),b=pr(LX(l),Math.min(d1,1.02));
  g.save();g.lineCap='round';g.globalAlpha=alpha;
  if(held){g.strokeStyle=c+'55';g.lineWidth=16;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.strokeStyle=CREAM;g.lineWidth=4;g.beginPath();g.moveTo(a.x,a.y);const n=14;for(let i=1;i<=n;i++){const t=i/n;g.lineTo(a.x+(b.x-a.x)*t+(i<n?Math.sin(i*1.7+performance.now()*0.03)*6*(1-t*.6):0),a.y+(b.y-a.y)*t)}g.stroke();g.lineWidth=1.6;g.strokeStyle=c;g.stroke()}
  else{g.strokeStyle=INK;g.lineWidth=9*a.s;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
    g.strokeStyle=c;g.lineWidth=5.5*a.s;g.stroke();
    g.lineWidth=1.6*a.s;g.strokeStyle='rgba(255,255,255,0.55)';g.beginPath();g.moveTo(a.x-1.4*a.s,a.y);g.lineTo(b.x-0.8*b.s,b.y);g.stroke()}
  g.restore()}
function link(l0,d0,l1,d1){const a=pr(LX(l0),d0),b=pr(LX(l1),d1);g.save();g.lineCap='round';g.strokeStyle=INK;g.lineWidth=13*a.s;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.strokeStyle=CREAM;g.lineWidth=8*a.s;g.stroke();g.lineWidth=2.5*a.s;g.strokeStyle=PINK;g.stroke();g.restore()}
function chevP(){g.beginPath();g.moveTo(-14,-14);g.lineTo(-2,-14);g.lineTo(12,0);g.lineTo(-2,14);g.lineTo(-14,14);g.lineTo(0,0);g.closePath()}
function chev(x,y,s,dir,c,alpha){g.save();g.translate(x,y);g.scale(dir*s,s*0.55);g.globalAlpha*=alpha;g.fillStyle=c;chevP();g.fill();g.restore()}
function chev3d(x,y,s,dir,c){for(let i=6;i>0;i-=2){g.save();g.translate(x,y+i*s*0.9);g.scale(dir*s,s*0.55);chevP();g.fillStyle=i===6?'rgba(10,16,24,0.6)':shade(c,-0.45);g.fill();g.restore()}
  g.save();g.translate(x,y);g.scale(dir*s,s*0.55);chevP();g.fillStyle=c;g.fill();g.lineWidth=2.2/s;g.strokeStyle=INK;g.stroke();g.restore()}
function arrow(l,dir,d,c){const p0=pr(LX(l),d),p1=pr(LX(l+dir),d);const s=p0.s*laneW/36;
  for(let i=0;i<3;i++){const t=0.35+i*0.25;chev(p0.x+(p1.x-p0.x)*t,p0.y,s*(1-i*0.08),dir,CREAM,0.8-i*0.22)}
  chev3d(p0.x-dir*5*s,p0.y-3*s,s*1.1,dir,c);chev3d(p0.x+dir*8*s,p0.y-3*s,s*0.95,dir,shade(c,0.15))}
function goldBar(d,c){const a=pr(-0.96,d),b=pr(0.96,d);const h=12*a.s;
  g.fillStyle='rgba(10,16,24,0.55)';rr(a.x+3,a.y-h/2+h*0.9,b.x-a.x,h,h/2);g.fill();
  g.fillStyle=shade(c,-0.45);rr(a.x,a.y-h/2+h*0.45,b.x-a.x,h,h/2);g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();
  g.fillStyle=c;rr(a.x,a.y-h/2,b.x-a.x,h,h/2);g.fill();g.stroke();
  g.strokeStyle='rgba(255,255,255,0.5)';g.lineWidth=1.4*a.s;g.beginPath();g.moveTo(a.x+h*0.6,a.y-h*0.2);g.lineTo(b.x-h*0.6,a.y-h*0.2);g.stroke();
  for(const x of[a.x+h*0.55,b.x-h*0.55]){g.fillStyle=CREAM;g.beginPath();g.arc(x,a.y,h*0.32,0,7);g.fill();g.lineWidth=1.5;g.strokeStyle=INK;g.stroke()}}
function padGeom(){const rx=laneW*0.41,ry=rx*0.56;return{rx,ry,x0:cx-hw*1.12,x1:cx+hw*1.12,y0:hitY-ry*1.9,y1:hitY+ry*2.0,th:16}}
function padStatic(){
  const{rx,ry,x0,x1,y0,y1,th}=padGeom();
  g.fillStyle='#0f1824';rr(x0+4,y1-6,x1-x0-8,th+6,8);g.fill();
  g.fillStyle=INK;rr(x0,y0,x1-x0,y1-y0,12);g.fill();g.strokeStyle=CREAM;g.lineWidth=2.5;rr(x0+3,y0+3,x1-x0-6,y1-y0-6,10);g.stroke();
  for(const sx of[x0+11,x1-11])for(const sy of[y0+11,y1-11]){g.fillStyle=CREAM;g.beginPath();g.arc(sx,sy,2.6,0,7);g.fill()}
  for(let l=0;l<4;l++){const x=cx+LX(l)*hw;
    g.fillStyle='#0b121b';g.beginPath();g.ellipse(x,hitY+2,rx*1.06,ry*1.1,0,0,7);g.fill();
    g.fillStyle=CREAM;g.beginPath();g.ellipse(x,hitY,rx,ry,0,0,7);g.fill();
    g.fillStyle='#24364a';g.beginPath();g.ellipse(x,hitY+1,rx*0.8,ry*0.78,0,0,7);g.fill();
    g.strokeStyle=LANE[l]+'aa';g.lineWidth=2;g.beginPath();g.ellipse(x,hitY+1,rx*0.62,ry*0.6,0,0,7);g.stroke();
    g.fillStyle=LANE[l]+'66';g.beginPath();g.ellipse(x,hitY+1,rx*0.24,ry*0.24,0,0,7);g.fill()}
  g.fillStyle=ORANGE;for(const sd of[-1,1]){const x=cx+sd*hw*1.075;g.beginPath();g.moveTo(x,hitY-7);g.lineTo(x+sd*-7,hitY);g.lineTo(x,hitY+7);g.fill()}
}
function padRow(){
  const{rx,ry,y0,y1}=padGeom();
  const pressed=new Set();for(const p of ptrs.values())pressed.add(p.lane);
  for(let l=0;l<4;l++){const x=cx+LX(l)*hw,c=spActive?DROP:LANE[l];
    g.fillStyle=c;g.fillRect(x-laneW*0.4,y0+7,laneW*0.8,3.5);g.fillRect(x-laneW*0.4,y1-10.5,laneW*0.8,3.5);
    if(pressed.has(l)){g.fillStyle=c;g.beginPath();g.ellipse(x,hitY+1,rx*0.8,ry*0.78,0,0,7);g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();g.fillStyle=CREAM;g.beginPath();g.ellipse(x,hitY,rx*0.3,ry*0.3,0,0,7);g.fill()}}
}
function spButton(t){const y=spBandY(),pulse=0.75+0.25*Math.sin(t*8);g.save();g.globalAlpha=pulse*0.35;g.fillStyle=DROP;rr(cx-hw*1.06,y-15,hw*2.12,30,15);g.fill();g.globalAlpha=1;
  g.fillStyle=DROP;rr(cx-hw*1.02,y-10,hw*2.04,20,10);g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();g.restore();
  g.fillStyle=CREAM;g.font='700 11px "Chakra Petch",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('TOUCHE POUR LE '+SP_NAME,cx,y+1)}
// jauges accrochées le long des rails, dans la perspective du manche
function railTube(sd,dTop,dBot,draw){const xn=sd*1.2,a=pr(xn,dTop),b=pr(xn,dBot);if(draw){draw(xn);return}
  g.save();g.lineCap='round';
  g.strokeStyle=INK;g.lineWidth=20*b.s;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
  g.strokeStyle=CREAM;g.lineWidth=15*b.s;g.stroke();g.strokeStyle='#24364a';g.lineWidth=11*b.s;g.stroke();
  for(const d of[dTop+0.03,dBot-0.03]){const r1=pr(sd*1.07,d),r2=pr(xn,d);g.strokeStyle=INK;g.lineWidth=4*r2.s;g.beginPath();g.moveTo(r1.x,r1.y);g.lineTo(r2.x,r2.y);g.stroke()}
  g.restore()}
function multBubble(){const m=mult(),c=spActive?DROP:MULTC[Math.min(m,4)];
  const base=Math.min(4,1+Math.floor(streak/10)),fill=base>=4?10:streak%10,next=spActive?DROP:MULTC[Math.min(base+1,4)];
  const dTop=0.52,dBot=0.08;
  railTube(-1,dTop,dBot,xn=>{for(let i=0;i<10;i++){const p0=pr(xn,dBot+(dTop-dBot)*(i+0.12)/10),p1=pr(xn,dBot+(dTop-dBot)*(i+0.88)/10);
    if(i>=fill)continue;g.save();g.lineCap='butt';g.strokeStyle=next;g.lineWidth=7*p0.s;g.beginPath();g.moveTo(p0.x,p0.y);g.lineTo(p1.x,p1.y);g.stroke();g.restore()}});
  const p=pr(-1.2,dTop+0.1),x=p.x,y=p.y;
  g.fillStyle=c;g.beginPath();g.arc(x,y,19,0,7);g.fill();g.lineWidth=2.5;g.strokeStyle=INK;g.stroke();
  g.fillStyle=m>1||spActive?CREAM:INK;g.font='400 22px Bungee,Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(m,x-4,y+1);g.font='700 11px "Chakra Petch",sans-serif';g.fillText('x',x+11,y+4);
  if(streak>=10){g.fillStyle=CREAM;rr(x-19,y-47,38,20,6);g.fill();g.strokeStyle=INK;g.lineWidth=2;g.stroke();g.fillStyle=INK;g.font='700 14px "Chakra Petch",sans-serif';g.fillText(streak,x,y-36)}}
function bubbleStatic(){const p=pr(-1.2,0.62),x=p.x,y=p.y;
  for(let i=0;i<10;i++){const xn=-1.2,p0=pr(xn,0.08+0.44*(i+0.12)/10),p1=pr(xn,0.08+0.44*(i+0.88)/10);g.lineCap='butt';g.strokeStyle='#2f4560';g.lineWidth=7*p0.s;g.beginPath();g.moveTo(p0.x,p0.y);g.lineTo(p1.x,p1.y);g.stroke()}
  g.fillStyle=INK;g.beginPath();g.arc(x+2,y+3,24,0,7);g.fill();g.fillStyle=CREAM;g.beginPath();g.arc(x,y,24,0,7);g.fill();g.lineWidth=2.5;g.strokeStyle=INK;g.stroke()}
function spTube(){const dTop=0.62,dBot=0.08;
  railTube(1,dTop,dBot,xn=>{if(spMeter>0.01){const p0=pr(xn,dBot+0.01),p1=pr(xn,dBot+(dTop-dBot)*spMeter);
    g.save();g.lineCap='round';g.strokeStyle=DROP;g.lineWidth=9*p0.s;g.beginPath();g.moveTo(p0.x,p0.y);g.lineTo(p1.x,p1.y);g.stroke();g.strokeStyle='rgba(255,255,255,0.6)';g.lineWidth=2.5*p0.s;g.stroke();g.restore()}
    const m=pr(xn,dBot+(dTop-dBot)*0.5);g.strokeStyle=CREAM;g.lineWidth=2;g.beginPath();g.moveTo(m.x-10*m.s,m.y);g.lineTo(m.x+10*m.s,m.y);g.stroke()})}
function hudStatic(){const top=safeTop+8,X=hudX+10,Wd=hudW-20;
  g.fillStyle=INK;rr(X+4,top+4,Wd,82,14);g.fill();
  g.fillStyle=CREAM;rr(X,top,Wd,82,14);g.fill();g.strokeStyle=INK;g.lineWidth=2.5;g.stroke();
  g.fillStyle=RED;rr(X+8,top+8,40,36,9);g.fill();g.stroke();g.fillStyle=CREAM;g.fillRect(X+21,top+16,5,20);g.fillRect(X+31,top+16,5,20);
  const sw=Math.min(30,(Wd-190)/5);for(let i=0;i<5;i++)star(X+68+i*sw,top+26,sw*0.4,'#e6d6aa','#b9a77a');
  g.fillStyle=INK;rr(X+Wd-118,top+8,110,36,9);g.fill();
  const bx=X+62,bw=Wd-62-60;g.fillStyle='#e6d6aa';rr(bx,top+58,bw,12,6);g.fill();g.strokeStyle=INK;g.lineWidth=1.5;g.stroke()}
function hud(now){const top=safeTop+8,X=hudX+10,Wd=hudW-20;
  const sv=starVal(),sw=Math.min(30,(Wd-190)/5);
  for(let i=0;i<5;i++){const sx=X+68+i*sw,sy=top+26;const f=Math.max(0,Math.min(1,sv-i));if(f>0){g.save();g.beginPath();g.rect(sx-sw/2,sy+sw*0.43-sw*0.86*f,sw,sw*0.86*f);g.clip();star(sx,sy,sw*0.4,MUSTARD,INK);g.restore()}}
  g.fillStyle=CREAM;g.font='700 24px "Chakra Petch",sans-serif';g.textAlign='right';g.textBaseline='middle';g.fillText(Math.floor(score).toLocaleString('fr-FR'),X+Wd-18,top+27);
  g.fillStyle=INK;g.font='700 15px "Chakra Petch",sans-serif';g.textAlign='left';g.fillText(accuracy()+'%',X+10,top+64);
  const prog=Math.max(0,Math.min(1,now/songDur)),bx=X+62,bw=Wd-62-60;
  if(prog>0.01){g.fillStyle=ORANGE;rr(bx+2,top+60,(bw-4)*prog,8,4);g.fill()}
  const tx=bx+2+(bw-4)*prog;g.fillStyle=INK;g.beginPath();g.moveTo(tx-5,top+53);g.lineTo(tx+5,top+53);g.lineTo(tx,top+60);g.fill();
  g.textAlign='right';g.fillText('-'+fmt(songDur-now),X+Wd-10,top+64)}
// carte de titre au lancement d'un morceau de l'album
function introCard(now){if(state!=='play'||!song.album||now>3.2)return;const a=Math.max(0,Math.min(1,(now+0.3)*3,(3.2-now)*1.5));if(a<=0)return;
  const y=H*0.4,w=Math.min(W-32,380),h=128;g.save();g.globalAlpha=a;g.fillStyle=INK;rr(cx-w/2+6,y-h/2+6,w,h,16);g.fill();g.fillStyle=CREAM;rr(cx-w/2,y-h/2,w,h,16);g.fill();g.strokeStyle=INK;g.lineWidth=3;g.stroke();
  g.textAlign='center';g.textBaseline='middle';g.font='700 14px "Chakra Petch",sans-serif';g.fillStyle=TEAL;g.fillText(ALBUM.artist.toUpperCase()+' · '+ALBUM.title.toUpperCase(),cx,y-38);
  let fs=34;g.font='400 '+fs+'px Shrikhand,Bungee,sans-serif';while(g.measureText(song.title).width>w-30&&fs>14){fs-=2;g.font='400 '+fs+'px Shrikhand,Bungee,sans-serif'}g.fillStyle=INK;g.fillText(song.title,cx+2,y+2);g.fillStyle=RED;g.fillText(song.title,cx,y-1);
  g.font='600 13px "Chakra Petch",sans-serif';g.fillStyle=INK;g.fillText('Album '+ALBUM.title+' · sortie '+ALBUM.release,cx,y+36);g.restore()}
// mini démo guidée : première partie seulement, jusqu'à 3 notes réussies
let tutoOn=false;
function tuto(now){if(!tutoOn||state!=='play'||now<3.2)return;
  if(hits>=3||now>16){tutoOn=false;store.set('tuto',true);toast('BIEN JOUÉ !',MUSTARD);return}
  let n=null;for(let i=cursor;i<notes.length;i++){const q=notes[i];if(!q.judged&&q.lane>=0){n=q;break}}
  const a=Math.min(1,(now-3.2)*3),pulse=0.5+0.5*Math.sin(now*8);g.save();g.globalAlpha=a;
  if(n){const d=Math.max(0,(n.t-now)/look()),p=pr(LX(n.lane),0),r=laneW*0.42*(1.05+0.12*pulse);
    g.strokeStyle=CREAM;g.lineWidth=3.5;g.globalAlpha=a*(0.45+0.55*(1-Math.min(1,d)));g.beginPath();g.ellipse(p.x,p.y,r,r*0.56,0,0,Math.PI*2);g.stroke();g.globalAlpha=a}
  const y=hitY-laneW*0.9-56,w=Math.min(W-32,340),h=62;g.fillStyle=INK;rr(cx-w/2+5,y-h/2+5,w,h,14);g.fill();g.fillStyle=CREAM;rr(cx-w/2,y-h/2,w,h,14);g.fill();g.strokeStyle=INK;g.lineWidth=2.5;g.stroke();
  g.textAlign='center';g.textBaseline='middle';g.font='400 15px Bungee,Impact,sans-serif';g.fillStyle=RED;g.fillText('TAPE LA PASTILLE',cx,y-11);
  g.font='600 13px "Chakra Petch",sans-serif';g.fillStyle=INK;g.fillText('quand la note arrive dessus ('+Math.min(hits,3)+'/3)',cx,y+12);g.restore()}
function drawToasts(){const t=performance.now();toasts=toasts.filter(q=>t-q.t<1400);let y=farY-30;
  for(const q of toasts){const a=1-(t-q.t)/1400,s=1+Math.max(0,0.25-(t-q.t)/800);g.save();g.globalAlpha=Math.min(1,a*1.5);g.translate(cx,y);g.scale(s,s);g.font='400 22px Bungee,Impact,sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=6;g.strokeStyle=INK;g.strokeText(q.txt,0,0);g.fillStyle=q.c;g.fillText(q.txt,0,0);g.restore();y+=30}}
function drawNotes(now){
  const L=look(),vis=[];
  for(let i=Math.max(0,cursor-30);i<notes.length;i++){const n=notes[i];const d=(n.t-now)/L;if(d>1.05)break;const de=(n.end-now)/L;if(de<-0.2&&d<-0.2)continue;vis.push([n,i])}
  for(const[n,i]of vis){if(!n.linked)continue;const pv=notes[i-1];if(!pv||pv.chain!==n.chain||(n.judged&&pv.judged))continue;
    const d1=(n.t-now)/L;if(d1<-0.03)continue;const d0=Math.max(-0.03,(pv.t-now)/L);link(pv.judged?n.lane:pv.lane,d0,n.lane,d1)}
  for(let k=vis.length-1;k>=0;k--){const n=vis[k][0],d=(n.t-now)/L,c=col(n),alpha=n.missed?0.35:1,isSp=n.sp&&!spFail.has(n.sp)&&!spActive;
    if(n.type==='hold'){const de=(n.end-now)/L;if(n.hit){if(n.holding)tail(n.lane,0,de,c,true,1);else if(!n.done)tail(n.lane,Math.max(d,0),de,c,false,0.35)}else tail(n.lane,d,de,c,false,alpha)}
    if(n.hit||d<-0.2)continue;
    if(n.type==='bar')goldBar(d,spActive?CY:(n.missed?'#6b5a3a':'#ffb22b'));
    else if(n.type==='strum'){g.globalAlpha=alpha;arrow(n.lane,n.dir,d,c);g.globalAlpha=1}
    else puck(n.lane,d,c,isSp,alpha);
  }
}
function drawParts(){g.save();g.globalCompositeOperation='lighter';for(const q of parts){const k=q.life/q.max,r=q.r*(0.4+k);g.globalAlpha=Math.min(1,k*1.6);g.drawImage(sprite(q.c),q.x-r,q.y-r,r*2,r*2)}g.restore()}

let last=performance.now(),slowAcc=0,slowN=0,menuDrawn=false;
function frame(t){
  if(CAP&&capT!=null){if(!capStep){requestAnimationFrame(frame);return}capStep=false;t=last+1000/30}
  const raw=(t-last)/1000,dt=Math.min(0.05,raw);last=t;
  if(state==='play'){update(dt);
    // qualité adaptative : si les images prennent trop de temps, on baisse la résolution
    if(!CAP){slowN++;slowAcc+=raw}if(slowN>=90){if(slowAcc/slowN>0.021&&quality>1){quality=Math.max(1,quality-0.25);resize()}slowN=0;slowAcc=0}}
  if(state==='menu'){if(!menuDrawn){g.fillStyle=INK;g.fillRect(0,0,W,H);menuDrawn=true}requestAnimationFrame(frame);return}
  menuDrawn=false;
  const now=st();
  if(focusMode){g.fillStyle=INK;g.fillRect(0,0,W,H)}else stage(now);
  if(ledCv){const pulse=Math.pow(1-((beatPos(now)%1)+1)%1,3);g.globalAlpha=1;g.drawImage(ledCv,ledBox.x,ledBox.y,ledBox.w,ledBox.h);g.globalAlpha=1}
  highway(now);drawNotes(now);
  if(spMeter>=0.5&&!spActive)spButton(t/1000);
  padRow();drawParts();multBubble();spTube();hud(now);drawToasts();introCard(now);tuto(now);
  requestAnimationFrame(frame);
}

/* ---------- image story Instagram (1080×1920) ---------- */
function storyCanvas(){const c=document.createElement('canvas');c.width=1080;c.height=1920;const h=c.getContext('2d'),W2=1080,H2=1920,X=W2/2;
  const rnd=(x,y,w,hh,r)=>{h.beginPath();h.roundRect?h.roundRect(x,y,w,hh,r):h.rect(x,y,w,hh)};
  h.fillStyle=CREAM;h.fillRect(0,0,W2,H2);
  for(const[x,y,r,col]of[[0,260,700,'rgba(29,116,112,0.30)'],[W2,520,640,'rgba(239,138,37,0.30)'],[X,H2,900,'rgba(226,87,125,0.22)']]){const rg=h.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,col);rg.addColorStop(1,'rgba(246,230,189,0)');h.fillStyle=rg;h.fillRect(0,0,W2,H2)}
  // rayons de soleil derrière la pochette
  h.save();h.translate(X,520);for(let i=0;i<32;i++){h.rotate(Math.PI*2/32);h.fillStyle=i%2?'rgba(239,138,37,0.16)':'rgba(226,87,125,0.10)';h.beginPath();h.moveTo(0,0);h.lineTo(-80,-1300);h.lineTo(80,-1300);h.fill()}h.restore();
  h.textAlign='center';h.textBaseline='middle';
  h.font='400 50px Bungee,Impact,sans-serif';h.fillStyle=INK;h.fillText('OTOKO LIVE',X,140);
  const cs=520,cy=240;h.fillStyle=RED;rnd(X-cs/2+22,cy+22,cs,cs,30);h.fill();h.fillStyle=INK;rnd(X-cs/2-6,cy-6,cs+12,cs+12,34);h.fill();
  if(coverBig.complete&&coverBig.naturalWidth){h.save();rnd(X-cs/2,cy,cs,cs,28);h.clip();h.drawImage(coverBig,X-cs/2,cy,cs,cs);h.restore()}
  else{h.fillStyle=ORANGE;rnd(X-cs/2,cy,cs,cs,28);h.fill()}
  let fs=96;h.font='400 '+fs+'px Shrikhand,Bungee,sans-serif';while(h.measureText(song.title).width>960&&fs>48){fs-=4;h.font='400 '+fs+'px Shrikhand,Bungee,sans-serif'}
  h.fillStyle=INK;h.fillText(song.title,X+6,880+6);h.fillStyle=RED;h.fillText(song.title,X,880);
  h.font='700 40px "Chakra Petch",sans-serif';h.fillStyle=TEAL;h.fillText(DIFF_NAMES[diff].toUpperCase()+' · '+accuracy()+' % DE PRÉCISION',X,965);
  const st=starCount();for(let i=0;i<5;i++){const sx=X+(i-2)*120,sy=1080;h.save();h.translate(sx,sy);h.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,q=k%2?22:50;h.lineTo(Math.cos(a)*q,Math.sin(a)*q)}h.closePath();h.fillStyle=i<st?MUSTARD:'#e6d6aa';h.fill();h.lineWidth=6;h.lineJoin='round';h.strokeStyle=INK;h.stroke();h.restore()}
  const sc=Math.floor(score).toLocaleString('fr-FR');h.font='400 170px Bungee,Impact,sans-serif';h.fillStyle=ORANGE;h.fillText(sc,X+9,1250+9);h.fillStyle=INK;h.fillText(sc,X,1250);
  h.font='700 44px "Chakra Petch",sans-serif';h.fillStyle=INK;h.fillText('POINTS · SÉRIE DE '+bestStreak,X,1365);
  h.font='400 64px Bungee,Impact,sans-serif';const bw=h.measureText('BATS MON SCORE !').width+90;h.fillStyle=INK;rnd(X-bw/2+10,1440+10,bw,120,60);h.fill();h.fillStyle=PINK;rnd(X-bw/2,1440,bw,120,60);h.fill();h.lineWidth=6;h.strokeStyle=INK;h.stroke();h.fillStyle=CREAM;h.fillText('BATS MON SCORE !',X,1503);
  if(ALBUM.instagram){h.font='700 56px "Chakra Petch",sans-serif';h.fillStyle=INK;h.fillText('@'+ALBUM.instagram,X,1650)}
  h.font='600 40px "Chakra Petch",sans-serif';h.fillStyle='#5d5a52';const dl=daysLeft();
  h.fillText('Album '+ALBUM.title+(dl!=null&&dl<=0?' · dispo sur SoundCloud':' · sortie '+ALBUM.release),X,1730);
  let sd=5;const r2=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};for(let i=0;i<9000;i++){h.fillStyle=r2()<0.5?'rgba(28,42,58,0.05)':'rgba(255,255,255,0.2)';h.fillRect(r2()*W2,r2()*H2,2,2)}
  return c}
async function shareStory(){const msg=$('shareMsg');
  const c=storyCanvas(),blob=await new Promise(r=>c.toBlob(r,'image/png'));
  const file=new File([blob],'otoko-live-score.png',{type:'image/png'});
  const txt='J\'ai fait '+Math.floor(score).toLocaleString('fr-FR')+' points sur « '+song.title+' » dans Otoko Live 🎸'+(ALBUM.instagram?' @'+ALBUM.instagram:'')+' #ImAlive';
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:txt});msg.textContent='Pense à taguer @'+ALBUM.instagram+' dans ta story !';return}}catch(e){if(e&&e.name==='AbortError')return}
  // sinon : téléchargement de l'image
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='otoko-live-score.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  msg.textContent='Image enregistrée : poste-la en story et tague @'+ALBUM.instagram+' !'}

/* ---------- écran de résultats ---------- */
function heroArt(){const c=$('hc'),h=c.getContext('2d');const w=c.clientWidth,hh=c.clientHeight;c.width=w*dpr;c.height=hh*dpr;h.setTransform(dpr,0,0,dpr,0,0);
  h.save();h.translate(w/2,hh*0.62);for(let i=0;i<30;i++){h.rotate(Math.PI*2/30);h.fillStyle=i%2?'rgba(239,138,37,0.22)':'rgba(226,87,125,0.14)';h.beginPath();h.moveTo(0,0);h.lineTo(-34,-w);h.lineTo(34,-w);h.fill()}h.restore();
  h.save();h.translate(w/2,hh*0.62);h.rotate(-0.05);h.textAlign='center';h.textBaseline='middle';
  h.font='400 '+Math.min(70,w*0.16)+'px Shrikhand,Bungee,sans-serif';h.fillStyle=INK;h.fillText("I'm Alive",4,4);h.fillStyle=RED;h.fillText("I'm Alive",0,0);
  h.font='700 '+Math.min(20,w*0.05)+'px "Chakra Petch",sans-serif';h.fillStyle=TEAL;h.fillText('OTOKO · NOUVEL ALBUM',0,-54);h.restore()}

resize();syncMenu();
Promise.all(['400 22px Bungee','700 14px "Chakra Petch"','400 30px Shrikhand'].map(f=>document.fonts.load(f).catch(()=>{}))).finally(()=>{buildStatic();requestAnimationFrame(frame)});
if('serviceWorker'in navigator&&location.protocol==='https:'&&!/claude/.test(location.host)){navigator.serviceWorker.register('sw.js').catch(()=>{})}
window.__og={story:()=>storyCanvas().toDataURL(),get state(){return state},get notes(){return notes},st,get score(){return score},tryTap,tryStrum,activateSP,get spMeter(){return spMeter},finish,startGame,setSong:s=>{song=s},SONGS,
  // capture : place l'horloge, compte les notes d'avant comme réussies, avance d'une image
  capAt:T=>{capT=T;for(const n of notes)if(n.t<T-0.05&&!n.judged){n.judged=n.hit=true;n.done=true;streak++;hits++;score+=50*mult();spMeter=Math.min(1,spMeter+(n.sp?0.02:0))}tutoOn=false;if(srcNode){try{srcNode.stop()}catch(e){}srcNode=null}},
  capStep:T=>new Promise(r=>{capT=T;capStep=true;requestAnimationFrame(()=>requestAnimationFrame(r))}),get shift(){return songShift}};
})();
