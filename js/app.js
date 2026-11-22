'use strict';
// Intro timing starts on actual playback, rather than file-open or buffering time.
// Browsers may reject audible autoplay; the first gesture then starts the intro.
// A subsequent gesture fades picture and audio together before unloading them.
let introState='starting';
const INTRO_FADE_MS=3000;
let introFadeFrame=null,introFadeTimer=null;
const introScreen=document.getElementById('intro');
const introVideo=document.getElementById('intro-video');
const introStartButton=document.getElementById('intro-start');
function dismissIntro(){
 if(introState==='closed'||introState==='fading')return;
 introState='fading';introStartButton.hidden=true;
 const started=performance.now(),initialVolume=introVideo.volume;
 // One shared progress value synchronizes a black overlay and the audio fade.
 function fadeFrame(now){
  if(introState!=='fading')return;
  const progress=Math.min(1,Math.max(0,(now-started)/INTRO_FADE_MS));
  const eased=progress*progress*(3-2*progress);
  introScreen.style.setProperty('--intro-darkness',String(eased));
  introVideo.volume=Math.max(0,initialVolume*(1-eased));
  if(progress<1)introFadeFrame=requestAnimationFrame(fadeFrame);
  else completeIntroDismissal();
 }
 introFadeFrame=requestAnimationFrame(fadeFrame);
 // Complete even if the tab becomes hidden and animation frames are suspended.
 introFadeTimer=setTimeout(completeIntroDismissal,INTRO_FADE_MS);
}
function completeIntroDismissal(){
 if(introState==='closed')return;
 if(introFadeFrame!==null)cancelAnimationFrame(introFadeFrame);
 if(introFadeTimer!==null)clearTimeout(introFadeTimer);
 introFadeFrame=null;introFadeTimer=null;
 introScreen.style.setProperty('--intro-darkness','1');introVideo.volume=0;
 introState='closed';introVideo.pause();introVideo.removeAttribute('src');introVideo.load();
 introScreen.hidden=true;introScreen.setAttribute('aria-hidden','true');
 const simulator=document.getElementById('simulator');simulator.inert=false;simulator.removeAttribute('aria-hidden');
 document.body.classList.remove('intro-open');
 document.removeEventListener('keydown',handleIntroInput,true);
 introScreen.removeEventListener('pointerdown',handleIntroInput);
 introStartButton.removeEventListener('click',handleIntroClick);
 document.getElementById('find').focus();
 startSimulatorMusic();
}
async function playIntro(){
 if(introState==='closed'||introState==='fading')return;
 introState='starting';introStartButton.hidden=true;
 introVideo.muted=false;introVideo.volume=1;
 try{await introVideo.play();}
 catch(error){
  if(introState==='closed'||introState==='fading')return;
  if(introState==='playing'||introState==='error')return;
  introState='awaiting';introStartButton.hidden=false;
  introStartButton.textContent='Start intro · sound on';
 }
}
function handleIntroInput(event){
 if(introState==='closed')return;
 event.preventDefault();event.stopPropagation();
 if(introState==='fading')return;
 // A held key cannot start and immediately skip the same intro.
 if(event.repeat)return;
 if(introState==='awaiting'){playIntro();return;}
 dismissIntro();
}
introVideo.addEventListener('playing',()=>{
 if(introState==='closed'||introState==='fading')return;
 introState='playing';introStartButton.hidden=true;introScreen.classList.add('is-playing');
});
introVideo.addEventListener('error',()=>{
 if(introState==='closed'||introState==='fading')return;
 introState='error';introStartButton.textContent='Video unavailable · continue to simulator';introStartButton.hidden=false;
});
document.addEventListener('keydown',handleIntroInput,true);
introScreen.addEventListener('pointerdown',handleIntroInput);
function handleIntroClick(event){
 // Pointer input is handled on pointerdown; click handles keyboard/AT activation.
 if(event.detail===0)handleIntroInput(event);
}
introStartButton.addEventListener('click',handleIntroClick);

// Only one audio element exists: changing tracks never layers multiple songs.
// Track URLs resolve relative to index.html for local use and GitHub Pages.
const musicTracks=[{"id":"night","name":"The Day of Night","src":"assets/audio/the-day-of-night.mp3"},{"id":"save","name":"Save Theme","src":"assets/audio/save-theme.mp3"},{"id":"piano","name":"Save Theme(piano)","src":"assets/audio/save-theme-piano.mp3"},{"id":"serenity","name":"Serenity","src":"assets/audio/serenity.mp3"}];
const musicAudio=document.getElementById('music-audio');
const musicDock=document.getElementById('music-dock');
let musicEnabled=true,musicStarted=false,selectedMusic='serenity';
let musicPlayback='paused',musicPlayRequest=0;
const musicTrackButtons=[];
function renderMusic(){
 const current=musicTracks.find(track=>track.id===selectedMusic);
 const soundButton=document.getElementById('music-sound');
 soundButton.setAttribute('aria-pressed',String(musicEnabled));
 soundButton.setAttribute('aria-label',musicEnabled?'Turn sound off':'Turn sound on');
 soundButton.title=musicEnabled?'Turn sound off':'Turn sound on';
 soundButton.classList.toggle('off',!musicEnabled);
 document.getElementById('music-sound-label').textContent=musicEnabled?'SOUND ON':'SOUND OFF';
 musicDock.classList.toggle('is-playing',musicEnabled&&musicPlayback==='playing');
 for(const button of musicTrackButtons){
  const selected=button.dataset.track===selectedMusic;
  button.setAttribute('aria-pressed',String(selected));
  button.firstChild.textContent=selected&&musicEnabled&&musicPlayback==='playing'?'▶':selected?'●':'♪';
 }
 const prefix=!musicEnabled?'Sound off':musicPlayback==='blocked'?'Click a song to start':musicPlayback==='error'?'Cannot play; try another song':musicPlayback==='playing'?'Playing':musicPlayback==='loading'?'Loading':'Ready';
 document.getElementById('music-now').textContent=prefix+' · '+current.name;
}
async function playSelectedMusic(){
 if(!musicStarted||!musicEnabled)return;
 const request=++musicPlayRequest;musicPlayback='loading';renderMusic();
 try{await musicAudio.play();}
 catch(error){if(request!==musicPlayRequest||!musicEnabled)return;musicPlayback='blocked';renderMusic();}
}
function selectMusic(id){
 const track=musicTracks.find(item=>item.id===id);if(!track)return;
 if(id!==selectedMusic||!musicAudio.src){
  musicPlayRequest++;musicAudio.pause();selectedMusic=id;
  musicAudio.src=track.src;musicAudio.load();musicPlayback='paused';
 }
 musicAudio.muted=!musicEnabled;renderMusic();
 if(musicEnabled)playSelectedMusic();
}
function startSimulatorMusic(){
 if(musicStarted)return;
 musicStarted=true;musicDock.hidden=false;
 musicAudio.loop=true;musicAudio.volume=.35;
 selectMusic(selectedMusic);
}
function setMusicMenu(open){
 document.getElementById('music-menu').hidden=!open;
 document.getElementById('music-toggle').setAttribute('aria-expanded',String(open));
}
function initMusic(){
 const list=document.getElementById('music-list');
 for(const track of musicTracks){
  const button=document.createElement('button');button.type='button';button.className='music-track';button.dataset.track=track.id;
  const marker=document.createElement('span');marker.className='track-mark';marker.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.textContent=track.name;button.append(marker,label);
  button.onclick=()=>selectMusic(track.id);list.append(button);musicTrackButtons.push(button);
 }
 document.getElementById('music-toggle').onclick=()=>setMusicMenu(document.getElementById('music-menu').hidden);
 document.getElementById('music-sound').onclick=()=>{
  musicEnabled=!musicEnabled;musicAudio.muted=!musicEnabled;
  if(musicEnabled)playSelectedMusic();else{musicPlayRequest++;musicAudio.pause();musicPlayback='paused';}
  renderMusic();
 };
 musicDock.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setMusicMenu(false);document.getElementById('music-toggle').focus();}});
 document.addEventListener('pointerdown',event=>{if(!musicDock.contains(event.target))setMusicMenu(false);});
 musicAudio.addEventListener('playing',()=>{if(!musicStarted||!musicEnabled)return;musicPlayback='playing';renderMusic();});
 musicAudio.addEventListener('pause',()=>{musicPlayback='paused';renderMusic();});
 musicAudio.addEventListener('error',()=>{musicPlayback='error';renderMusic();});
 renderMusic();
}
// Model: terrain is independent of the two unique characters. All indices are 0–99.
const SIZE = 10, $ = id => document.getElementById(id);
// Four alpha-transparent character PNGs are stored in assets/images.
const characterArt = {"L":"assets/images/leon.png","A":"assets/images/ashley.png","G":"assets/images/ganado.png","C":"assets/images/chainsaw-ganado.png"};
function characterImage(type) {
 const image=document.createElement('img');
 image.src=characterArt[type];image.alt='';image.className='character-sprite';
 image.draggable=false;image.setAttribute('aria-hidden','true');
 return image;
}
const names = {G:'Ganado', C:'Chainsaw Ganado'};
const enemySettings = {G:{p:.9,reward:8,penalty:10,effort:2},C:{p:.4,reward:30,penalty:20,effort:3}};
let terrain = Array(100).fill('.'), leon = null, ashley = null, tool = 'L';
let phase = 'idle', session = false, snapshot = null, timer = null, plan = null;
let stats = {moves:0,fights:0,wins:0,gross:0,effort:0};
const fmt = n => Number.isInteger(n) ? String(n) : Number(n.toFixed(3)).toString();
const signed = n => (n > 0 ? '+' : '') + fmt(n);
const coord = i => `(${Math.floor(i / SIZE)+1}, ${i % SIZE+1})`;
const manhattan = (a,b) => Math.abs(Math.floor(a/SIZE)-Math.floor(b/SIZE)) + Math.abs(a%SIZE-b%SIZE);

// Genuine one-step MDP: explicitly enumerate transition probabilities and rewards.
// Avoid is a local no-combat action; routing, rather than a permanent enemy ban,
// accounts for its opportunity cost. Loss penalty is a POSITIVE input magnitude.
function evaluateMDP(settings) {
 const {p,reward,penalty,effort} = settings;
 const transitions = {
  Fight:[{state:'Enemy Defeated',probability:p,reward:reward-effort},
         {state:'Leon Defeated',probability:1-p,reward:-penalty-effort}],
  Avoid:[{state:'Enemy Active',probability:1,reward:0}]
 };
 const fight = transitions.Fight.reduce((sum,t)=>sum+t.probability*t.reward,0);
 const avoid = 0;
 return {fight,avoid,preference:Math.abs(fight)<1e-9?'INDIFFERENT':fight>avoid?'FIGHT':'AVOID',
  tileCost:1+Math.max(0,-fight),transitions};
}
function evaluations(){ return {G:evaluateMDP(enemySettings.G),C:evaluateMDP(enemySettings.C)}; }

// A* is separate from the MDP. No randomized or scenario-specific search logic.
// Each destination tile charges 1 walking unit plus a nonnegative enemy surcharge.
function findPath(map,start,goal,mdp) {
 if(start===null||goal===null) return null;
 const open = new Set([start]), closed = new Set(), explored = [];
 const g = Array(100).fill(Infinity), f = Array(100).fill(Infinity), parent = Array(100).fill(-1);
 g[start]=0; f[start]=manhattan(start,goal);
 while(open.size) {
  let current = -1;
  for(const node of open) if(current===-1 || f[node]<f[current]-1e-9 ||
   (Math.abs(f[node]-f[current])<1e-9 && manhattan(node,goal)<manhattan(current,goal))) current=node;
  open.delete(current); closed.add(current); explored.push(current);
  if(current===goal) {
   const path=[goal]; while(path[0]!==start) path.unshift(parent[path[0]]);
   const walking=path.length-1, encounters=path.slice(1).filter(i=>mdp[map[i]]);
   return {path,cost:g[goal],walking,extra:g[goal]-walking,encounters,explored};
  }
  const row=Math.floor(current/SIZE), col=current%SIZE;
  const neighbors=[];
  if(row>0) neighbors.push(current-SIZE); if(col<SIZE-1) neighbors.push(current+1);
  if(row<SIZE-1) neighbors.push(current+SIZE); if(col>0) neighbors.push(current-1);
  for(const next of neighbors) {
   if(map[next]==='#'||closed.has(next)) continue;
   const tentative=g[current]+(mdp[map[next]] ? mdp[map[next]].tileCost : 1);
   if(tentative<g[next]-1e-9) {
    parent[next]=current; g[next]=tentative; f[next]=tentative+manhattan(next,goal); open.add(next);
   }
  }
 }
 return {path:[],cost:Infinity,walking:0,extra:0,encounters:[],explored};
}
function log(message,kind='') {
 const row=document.createElement('div'); row.className='log-entry';
 const time=document.createElement('time'); time.textContent=new Date().toLocaleTimeString([], {hour12:false});
 const text=document.createElement('span'); text.textContent=message; text.className=kind;
 row.append(time,text); $('log').append(row);
 while($('log').children.length>300) $('log').firstChild.remove();
 $('log').scrollTop=$('log').scrollHeight;
}
function setStatus(message){ $('status').textContent=message; $('status').className='status '+phase; }
function stopTimer(){ if(timer!==null) clearTimeout(timer); timer=null; }
// Exactly one timeout is outstanding. Pause/reset/finish always cancel it.
function schedule(){ stopTimer(); if(phase==='running') timer=setTimeout(()=>{timer=null; advance(); schedule();},Number($('speed').value)); }
function refreshPlan(announce=false) {
 plan=findPath(terrain,leon,ashley,evaluations());
 renderAnalysis(); renderGrid();
 if(announce) {
  if(!plan) {setStatus('Place one Leon and one Ashley to calculate a route.'); log('Planning requires Leon and Ashley.','bad');}
  else if(!plan.path.length) {setStatus('No valid path to Ashley.');log('No valid path to Ashley.','bad');}
  else {setStatus(`Route ready: ${plan.walking} moves, estimated cost ${fmt(plan.cost)}.`);log(`A* found a path with cost ${fmt(plan.cost)} (${plan.walking} walking + ${fmt(plan.extra)} encounter surcharge).`,'info');}
 }
 return !!(plan&&plan.path.length);
}
function renderAnalysis() {
 const mdp=evaluations();
 $('nodes').textContent=plan?plan.explored.length:0;
 const valid=plan&&plan.path.length;
 $('steps').textContent=valid?plan.walking:'—'; $('cost').textContent=valid?fmt(plan.cost):'—';
 $('walking').textContent=valid?plan.walking:'—'; $('encounter').textContent=valid?fmt(plan.extra):'—';
 $('route-line').textContent=valid?plan.path.map(coord).join(' → '):'No route available.';
 $('route-reason').textContent=!plan?'Place Leon and Ashley to plan a rescue.':!valid?'No valid path to Ashley. Remove a wall or reposition a character.':
  `Lowest estimated cost under current settings: ${plan.walking} walking + ${fmt(plan.extra)} encounter surcharge. `+
  (plan.encounters.length?`${plan.encounters.length} encounter(s) selected; each requires a fight. Enemies outside this route are avoided.`:'No combat needed on this route.')+
  ' Equal-cost routes may have different encounter risks.';
 $('mdp-cards').innerHTML=['G','C'].map(type=>{
  const s=enemySettings[type], m=mdp[type];
  return `<article class="mdp-card"><div class="mdp-top"><h3 class="${type.toLowerCase()}">${names[type]}</h3><span class="decision ${m.preference==='AVOID'?'avoid':''}">LOCAL: ${m.preference}</span></div>
   <div class="formula">Q(Fight) = ${fmt(s.p)} × ${fmt(s.reward)} − ${fmt(1-s.p)} × ${fmt(s.penalty)} − ${fmt(s.effort)} = <strong>${signed(m.fight)}</strong><br>Tile cost = 1 + max(0, ${fmt(-m.fight)}) = <strong>${fmt(m.tileCost)}</strong></div>
   <div class="mdp-foot"><span>Q(Avoid) = 0</span><span>Win ${fmt(s.p*100)}% · Reward +${fmt(s.reward)} · Loss −${fmt(s.penalty)} · Effort ${fmt(s.effort)}</span></div></article>`;
 }).join('');
 $('transitions').innerHTML=['G','C'].map(type=>`<h3 class="${type.toLowerCase()}" style="margin-top:10px">${names[type]} · from Enemy Active</h3><table><thead><tr><th>Action</th><th>Next state</th><th>Probability</th><th>Net reward</th></tr></thead><tbody>${Object.entries(mdp[type].transitions).map(([action,ts])=>ts.map(t=>`<tr><td>${action}</td><td>${t.state}</td><td>${fmt(t.probability*100)}%</td><td>${signed(t.reward)}</td></tr>`).join('')).join('')}</tbody></table>`).join('');
}
const cells=[];
for(let i=0;i<100;i++) {
 const cell=document.createElement('button');cell.className='cell';cell.type='button';cell.dataset.index=i;
 cell.addEventListener('click',()=>editCell(i));
 cell.addEventListener('keydown',e=>{
  const r=Math.floor(i/10),c=i%10; let target=i;
  if(e.key==='ArrowUp'&&r>0) target-=10; if(e.key==='ArrowDown'&&r<9) target+=10;
  if(e.key==='ArrowLeft'&&c>0) target--; if(e.key==='ArrowRight'&&c<9) target++;
  if(e.key.startsWith('Arrow')){e.preventDefault();cells[target].focus();}
 });
 cells.push(cell);$('grid').append(cell);
}
function renderGrid() {
 const pathSet=new Set(plan?plan.path:[]), explored=new Set(plan?plan.explored:[]);
 cells.forEach((cell,i)=>{
  const t=terrain[i],isLeon=i===leon,isAshley=i===ashley;
  cell.className='cell'+(t==='#'?' wall':'')+($('show-explored').checked&&explored.has(i)?' explored':'')+
   (pathSet.has(i)?' path':'')+(t==='G'?' enemy-g':'')+(t==='C'?' enemy-c':'')+(isAshley?' ashley':'')+(isLeon?' leon':'');
  cell.replaceChildren();
  const character=isLeon?'L':isAshley?'A':names[t]?t:null;
  if(character)cell.append(characterImage(character));
  if(i%10===0){const row=document.createElement('span');row.className='row-num';row.textContent=Math.floor(i/10)+1;row.setAttribute('aria-hidden','true');cell.append(row);}
  const label=isLeon?(isAshley?'Leon with rescued Ashley':'Leon'):isAshley?'Ashley':names[t]||(t==='#'?'Wall':'Empty ground');
  cell.setAttribute('aria-label',`Row ${Math.floor(i/10)+1}, column ${i%10+1}: ${label}${pathSet.has(i)?', planned route':''}`);
  cell.title=coord(i)+' '+label; cell.disabled=session||phase==='running';
 });
}
function renderControls() {
 const running=phase==='running',finished=['success','failure'].includes(phase),missing=leon===null||ashley===null;
 $('start').disabled=running||finished||missing; $('start').textContent=phase==='paused'?'▶ Resume Simulation':'▶ Start Simulation';
 $('pause').disabled=!session||finished||phase==='unreachable';$('pause').textContent=running?'Pause':'Resume';
 $('step').disabled=running||finished||missing; $('find').disabled=running||finished||missing;
 $('load').disabled=running; $('scenario').disabled=running; $('clear').disabled=running;
 document.querySelectorAll('[data-tool]').forEach(b=>b.disabled=session);
 document.querySelectorAll('#scenario-actions button').forEach(b=>b.disabled=session);
 $('edit-help').textContent=session?'Map locked for this mission. Reset Simulation restores the starting map and enables editing.':'Select a tool, then click a cell. Arrow keys navigate the grid; Enter places an object.';
 const labels={idle:'READY TO PLAN',running:'MISSION ACTIVE',paused:'PAUSED / STEP MODE',success:'ASHLEY RESCUED',failure:'MISSION FAILED',unreachable:'ROUTE BLOCKED'};
 $('phase').textContent=labels[phase];
 $('stat-moves').textContent=stats.moves; $('stat-fights').textContent=stats.fights;$('stat-wins').textContent=stats.wins+' victories';
 $('stat-gross').textContent=signed(stats.gross);$('stat-effort').textContent=fmt(stats.effort)+' effort spent';$('stat-net').textContent=signed(stats.gross-stats.effort);
 renderGrid();
}
function editCell(i) {
 if(session||phase==='running') return;
 // Replace the occupant first. Moving a character clears its former location.
 if(leon===i) leon=null; if(ashley===i) ashley=null;terrain[i]='.';
 if(tool==='L') leon=i; else if(tool==='A') ashley=i; else terrain[i]=tool;
 phase='idle';refreshPlan();renderControls();
 setStatus(leon===null||ashley===null?'Place one Leon and one Ashley to calculate a route.':plan.path.length?'Map updated. Route recalculated.':'No valid path to Ashley.');
}
function beginSession(){
 if(!refreshPlan(true)) return false;
 if(!session){snapshot={terrain:terrain.slice(),leon,ashley};session=true;stats={moves:0,fights:0,wins:0,gross:0,effort:0};log('Mission initialized. MDP evaluations converted to nonnegative A* traversal costs.');}
 return true;
}
function finish(result,message){stopTimer();phase=result;setStatus(message);log(message,result==='success'?'good':'bad');renderControls();if(result==='success')showHillClimbing();}
function start(){
 if(phase==='running'||['success','failure'].includes(phase))return;
 if(!beginSession())return;
 if(leon===ashley){finish('success','Ashley rescued!');return;}
 phase='running';setStatus('Mission active. Following the lowest-cost route.');renderControls();schedule();
}
function pauseResume(){
 if(phase==='running'){stopTimer();phase='paused';setStatus('Simulation paused. Resume or advance one step.');log('Simulation paused.');renderControls();}
 else if(phase==='paused')start();
}
function advance(){
 if(!session||!['running','paused'].includes(phase))return;
 if(leon===ashley){finish('success','Ashley rescued!');return;}
 // Replanning also removes the surcharge of enemies defeated on earlier steps.
 if(!refreshPlan()) {finish('unreachable','No valid path to Ashley.');return;}
 const next=plan.path[1],type=terrain[next];
 if(names[type]) {
  const s={...enemySettings[type]},m=evaluateMDP(s);
  log(`Leon encountered a ${names[type]} at ${coord(next)}.`);
  log(`MDP evaluation: Q(Fight) ${signed(m.fight)}, Q(Avoid) 0. Local preference: ${m.preference}. A* selected this encounter in the global route.`,'info');
  const demo=$('demo').value; let win;
  if(demo==='random'){const roll=Math.random();win=roll<s.p;log(`Random draw ${roll.toFixed(6)} < win probability ${fmt(s.p)}: ${win?'true':'false'}.`);}
  else {win=demo==='win';$('demo').value='random';log(`DEMO OVERRIDE: forced ${win?'victory':'defeat'} for this encounter only.`,'info');}
  stats.fights++;stats.effort+=s.effort;
  if(win) {
   terrain[next]='.';stats.wins++;stats.gross+=s.reward;
   log(`Combat result: Victory! Leon earned ${fmt(s.reward)} reward points; ${fmt(s.effort)} effort spent. Enemy removed.`,'good');
   refreshPlan();setStatus('Victory! Enemy cleared. The next movement step enters the route.');renderControls();
  } else {
   stats.gross-=s.penalty;log(`Combat result: Defeat. Penalty ${fmt(s.penalty)}; effort ${fmt(s.effort)}. Leon did not enter the enemy tile.`,'bad');
   finish('failure','Mission failed. Leon was defeated in combat. Reset Simulation to try again.');
  }
  return; // A fight is one manual/animation step; movement is another.
 }
 leon=next;stats.moves++;log(`Leon moved to tile ${coord(leon)}.`);refreshPlan();
 if(leon===ashley)finish('success','Ashley rescued!');
 else {setStatus(`Moving toward Ashley. ${plan.walking} moves remaining; estimated cost ${fmt(plan.cost)}.`);renderControls();}
}
function nextStep(){
 if(phase==='running'||['success','failure'].includes(phase))return;
 if(!session&&!beginSession())return;
 phase='paused';advance();renderControls();
}
function resetSimulation(){
 resetHillClimbing();stopTimer();if(snapshot){terrain=snapshot.terrain.slice();leon=snapshot.leon;ashley=snapshot.ashley;}
 snapshot=null;session=false;phase='idle';stats={moves:0,fights:0,wins:0,gross:0,effort:0};
 refreshPlan();renderControls();setStatus('Simulation reset. Starting positions and enemies restored; current enemy settings retained.');log('Simulation reset: original map restored, realized rewards cleared.');
}
function loadScenario(which){
 resetHillClimbing();stopTimer();session=false;snapshot=null;phase='idle';terrain=Array(100).fill('.');stats={moves:0,fights:0,wins:0,gross:0,effort:0};
 // Examples are maps only; A* computes every route from scratch.
 if(which==='A'){
  leon=81;ashley=18;[23,24,25,53,54,55,56,73].forEach(i=>terrain[i]='#');terrain[91]='G';terrain[9]='C';
  $('scenario-note').textContent='A / Open ground, a few ruins. A shortest route reaches Ashley without an encounter.';
 }else if(which==='B'){
  terrain.fill('#');for(let c=1;c<=8;c++){terrain[40+c]='.';terrain[10+c]='.';}
  for(let r=1;r<=4;r++){terrain[r*10+1]='.';terrain[r*10+8]='.';}
  leon=41;ashley=48;terrain[44]='C';enemySettings.C={p:.4,reward:10,penalty:20,effort:3};syncSettings();
  $('scenario-note').textContent='B / A 7-move shortcut crosses a Chainsaw Ganado; a safe detour takes 13. Loaded at 40% win chance and reward 10. Compare low and high rewards below.';
 }else{
  leon=41;ashley=48;for(let r=0;r<10;r++)terrain[r*10+5]='#';terrain[85]='.';
  $('scenario-note').textContent='C / A wall divides the map. The opening at (9, 6) allows a detour. Seal it below to make Ashley unreachable.';
 }
 $('scenario').value=which;renderScenarioActions(which);refreshPlan();renderControls();
 setStatus('Example map loaded. Edit the grid, preview the route, or start the rescue.');log(`Loaded scenario ${which}.`,'info');
}
function renderScenarioActions(which){
 $('scenario-actions').replaceChildren();
 function action(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;$('scenario-actions').append(b);}
 if(which==='B'){
  for(const [label,reward] of [['Low reward · 10',10],['High reward · 50',50]]) action(label,()=>{
   if(session)return;enemySettings.C.reward=reward;syncSettings();settingsChanged();
  });
 }else if(which==='C')action('Seal / open corridor at (9, 6)',()=>{if(session)return;terrain[85]=terrain[85]==='#'?'.':'#';refreshPlan(true);renderControls();});
}
const fieldDefinitions=[['p','Win probability','%',100],['reward','Victory reward','pts',1000],['penalty','Loss penalty','pts',1000],['effort','Combat effort','pts',1000]];
function buildSettings(){
 $('enemy-settings').innerHTML=['G','C'].map(type=>`<div class="enemy-form"><div class="enemy-title"><span class="enemy-icon ${type.toLowerCase()}" data-character="${type}"></span><h3>${names[type]}</h3></div>${fieldDefinitions.map(([key,label,unit,max])=>`<div class="field"><label for="${type}-${key}">${label}</label><span class="input-wrap"><input id="${type}-${key}" data-type="${type}" data-key="${key}" type="number" min="0" max="${max}" step="any" required aria-label="${names[type]} ${label}"><span>${unit}</span></span></div>`).join('')}</div>`).join('');
 syncSettings();
 document.querySelectorAll('#enemy-settings input').forEach(input=>{
  input.addEventListener('input',()=>{
   if(!input.checkValidity())return;const value=Number(input.value);
   enemySettings[input.dataset.type][input.dataset.key]=input.dataset.key==='p'?value/100:value;
   settingsChanged();
  });
  input.addEventListener('change',()=>{if(!input.checkValidity()){syncSettings();setStatus('Invalid input restored. Use a probability from 0 to 100 and nonnegative rewards/costs up to 1,000.');}});
 });
}
function syncSettings(){for(const type of ['G','C'])for(const [key] of fieldDefinitions)if($(type+'-'+key))$(type+'-'+key).value=fmt(enemySettings[type][key]*(key==='p'?100:1));}
function settingsChanged(){
 refreshPlan();
 if(!['success','failure'].includes(phase))setStatus(plan&&plan.path.length?'Enemy settings updated. A* recalculated the remaining route.':'No valid path to Ashley.');
 log('Enemy settings changed; MDP and A* recalculated.','info');renderControls();
}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{
 if(session)return;tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(other=>{const active=other===b;other.classList.toggle('active',active);other.setAttribute('aria-pressed',active);});
});
$('find').onclick=()=>{refreshPlan(true);renderControls();};$('start').onclick=start;$('pause').onclick=pauseResume;$('step').onclick=nextStep;$('reset').onclick=resetSimulation;
$('load').onclick=()=>loadScenario($('scenario').value);
$('clear').onclick=()=>{if(phase==='running')return;resetHillClimbing();stopTimer();terrain.fill('.');leon=null;ashley=null;snapshot=null;session=false;phase='idle';stats={moves:0,fights:0,wins:0,gross:0,effort:0};$('scenario-note').textContent='Custom map / Place Leon, Ashley, enemies and walls. Every edit recalculates the route.';$('scenario-actions').replaceChildren();refreshPlan();renderControls();setStatus('Grid cleared. Place Leon and Ashley to begin.');log('Grid cleared.');};
$('speed').oninput=()=>{$('speed-label').textContent=$('speed').value+' ms';if(phase==='running')schedule();};
$('show-explored').onchange=renderGrid;$('clear-log').onclick=()=>$('log').replaceChildren();

// Hill Climbing maximizes safety (-danger) using ONLY immediate left/right doors.
// Strict improvements prevent cycles. A local minimum is a valid stopping point;
// the search never inspects a distant door or jumps over a higher-danger barrier.
function hillClimbStep(dangers,current){
 let best=current;const comparisons=[];
 const neighbors=[current-1,current+1].filter(index=>index>=0&&index<dangers.length);
 for(const candidate of neighbors){
  const previousBest=best;
  if(-dangers[candidate]>-dangers[best])best=candidate;
  comparisons.push({candidate,previousBest,best});
 }
 return {next:best,improved:best!==current,neighbors,comparisons};
}
let hillDangers=[],hillCurrent=null,hillRunning=false,hillTimer=null,hillRestarts=0;
let hillScanned=new Set(),hillInspecting=null,hillWinner=null,hillHistory=[];
const hillDoorButtons=[];
function stopHillTimer(){if(hillTimer!==null)clearTimeout(hillTimer);hillTimer=null;hillRunning=false;}
function resetHillClimbing(){
 stopHillTimer();$('hill-panel').hidden=true;hillDangers=[];hillCurrent=null;
 hillScanned=new Set();hillInspecting=null;hillWinner=null;hillHistory=[];hillRestarts=0;
 $('hill-run').disabled=true;$('hill-restart').disabled=true;
}
function renderHillClimbing(){
 if(hillDangers.length!==5)return;
 hillDoorButtons.forEach((button,index)=>{
  button.className='hill-door'+(index===hillCurrent?' current':'')+(index===hillInspecting?' scanning':'')+(index===hillWinner?' chosen':'');
  button.disabled=hillRunning;
  button.setAttribute('aria-label','Door '+(index+1)+', danger '+hillDangers[index]+(index===hillCurrent?', current state':'')+(index===hillWinner?', local minimum':''));
  button.setAttribute('aria-pressed',String(index===hillCurrent));
  button.danger.textContent=hillDangers[index];
  button.state.textContent=index===hillWinner?'LOCAL MIN':index===hillInspecting?'CHECKING':index===hillCurrent?'CURRENT':hillScanned.has(index)?'CHECKED':'';
 });
 $('hill-run').disabled=hillRunning;$('hill-restart').disabled=false;
 $('hill-history').textContent=hillHistory.join('\n');$('hill-history').scrollTop=$('hill-history').scrollHeight;
}
function chooseHillStart(index){
 if(hillRunning||$('hill-panel').hidden)return;
 hillCurrent=index;hillWinner=null;hillScanned=new Set();hillInspecting=null;
 hillHistory=['Start: Door '+(index+1)+' · danger '+hillDangers[index]+' · safety '+(-hillDangers[index])];
 $('hill-result').textContent='Starting at Door '+(index+1)+'. Press Run to compare only the adjacent doors. Random restarts: '+hillRestarts+'.';
 renderHillClimbing();
}
function showHillClimbing(){
 if(!$('hill-panel').hidden)return;
 stopHillTimer();hillRestarts=0;
 // Sample without replacement: finite even with a deterministic demo RNG.
 const values=Array.from({length:99},(_,i)=>i+1);
 for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}
 hillDangers=values.slice(0,5);$('hill-panel').hidden=false;
 chooseHillStart(Math.floor(Math.random()*5));
 log('Hill Climbing unlocked: five doors generated. Compare safety = −danger.','info');
 $('hill-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function runHillClimbing(){
 if(hillRunning||$('hill-panel').hidden||hillCurrent===null)return;
 hillRunning=true;hillWinner=null;hillScanned=new Set();hillInspecting=null;
 const start=hillCurrent;let step=null,cursor=0,round=0,moves=0,checks=0;
 hillHistory=['Run from Door '+(start+1)+' (danger '+hillDangers[start]+', safety '+(-hillDangers[start])+')'];
 function beginRound(){
  hillTimer=null;if(!hillRunning)return;
  round++;step=hillClimbStep(hillDangers,hillCurrent);cursor=0;hillInspecting=null;
  hillHistory.push('Round '+round+': at Door '+(hillCurrent+1)+'; adjacent doors '+step.neighbors.map(index=>index+1).join(', ')+'.');
  $('hill-result').textContent='At Door '+(hillCurrent+1)+'. Comparing only its '+step.neighbors.length+' adjacent neighbor(s).';
  renderHillClimbing();hillTimer=setTimeout(inspect,300);
 }
 function inspect(){
  hillTimer=null;
  if(!hillRunning)return;
  if(cursor<step.comparisons.length){
   const comparison=step.comparisons[cursor++],candidate=comparison.candidate;
   hillInspecting=candidate;hillScanned.add(candidate);checks++;
   const improved=comparison.best!==comparison.previousBest;
   hillHistory.push('Door '+(candidate+1)+': danger '+hillDangers[candidate]+' → safety '+(-hillDangers[candidate])+(improved?' · better candidate':' · no improvement'));
   $('hill-result').textContent='Round '+round+': checked '+cursor+'/'+step.neighbors.length+' adjacent neighbors. Best nearby: Door '+(comparison.best+1)+' · danger '+hillDangers[comparison.best]+'.';
   renderHillClimbing();hillTimer=setTimeout(inspect,450);return;
  }
  hillInspecting=null;
  if(step.improved){
   const previous=hillCurrent;hillCurrent=step.next;moves++;
   hillHistory.push('Move: Door '+(previous+1)+' → Door '+(hillCurrent+1)+'; safety improves from '+(-hillDangers[previous])+' to '+(-hillDangers[hillCurrent])+'.');
   $('hill-result').textContent='Moved to adjacent Door '+(hillCurrent+1)+' · danger '+hillDangers[hillCurrent]+'. Now inspect its neighbors.';
   renderHillClimbing();hillTimer=setTimeout(beginRound,500);return;
  }
  hillRunning=false;hillWinner=hillCurrent;
  hillHistory.push('Stop at local minimum: neither adjacent door has strictly lower danger.');
  $('hill-result').textContent='Stopped at Door '+(hillWinner+1)+' · danger '+hillDangers[hillWinner]+'. Local minimum: no adjacent door is safer. '+moves+' move(s), '+checks+' neighbor checks. Random restarts: '+hillRestarts+'. Try Random Restart to search from another position.';
  log('Hill Climbing stopped at Door '+(hillWinner+1)+' with danger '+hillDangers[hillWinner]+' (local minimum; a safer distant door may exist).','info');
  renderHillClimbing();
 }
 beginRound();
}
function randomRestartHillClimbing(){
 if($('hill-panel').hidden)return;
 stopHillTimer();hillRestarts++;
 const alternatives=[0,1,2,3,4].filter(index=>index!==hillCurrent);
 chooseHillStart(alternatives[Math.floor(Math.random()*alternatives.length)]);
 runHillClimbing();
}
function initHillClimbing(){
 for(let index=0;index<5;index++){
  const button=document.createElement('button');button.type='button';button.className='hill-door';
  const danger=document.createElement('span');danger.className='hill-danger';button.danger=danger;
  const art=document.createElement('span');art.className='fantasy-door';art.setAttribute('aria-hidden','true');
  const wood=document.createElement('span');wood.className='door-wood';const ring=document.createElement('span');ring.className='door-ring';wood.append(ring);
  const keystone=document.createElement('span');keystone.className='door-keystone';art.append(wood,keystone);
  const label=document.createElement('span');label.className='hill-door-label';label.textContent='DOOR '+(index+1);
  const state=document.createElement('span');state.className='hill-door-state';button.state=state;
  button.append(danger,art,label,state);button.onclick=()=>chooseHillStart(index);
  hillDoorButtons.push(button);$('hill-doors').append(button);
 }
 $('hill-run').onclick=runHillClimbing;$('hill-restart').onclick=randomRestartHillClimbing;
 resetHillClimbing();
}

initHillClimbing();
buildSettings();
document.querySelectorAll('[data-character]').forEach(holder=>holder.replaceChildren(characterImage(holder.dataset.character)));
loadScenario('A');
initMusic();
playIntro();
