(() => {
"use strict";
const $ = id => document.getElementById(id);
const canvas = $("gameCanvas"), ctx = canvas.getContext("2d");
const screens = ["menuScreen","gameScreen","storyScreen","upgradeScreen","bioScreen"];
const modes = {
 pulse:{label:"Pulse Initiate",enemyHp:.78,enemySpeed:.78,damage:.7,heal:1.5,signals:1.45,spawn:1},
 crimson:{label:"Crimson Protocol",enemyHp:1,enemySpeed:1,damage:1,heal:1,signals:1,spawn:1.25},
 extinction:{label:"Extinction Protocol",enemyHp:1.3,enemySpeed:1.22,damage:1.35,heal:.65,signals:.8,spawn:1.55}
};
const stages = ["CAPILLARY RUN","VASCULAR PURSUIT","INFECTION JUNCTION","CRIMSON SURGE","BIOFILM FORTRESS","HEART OF THE INFECTION"];
const bossStories = {4:{chapter:"FIELD REPORT - CHAPTER 01",title:"The Capillary Holds.",body:"The infected cells stop surging. The flow begins to settle, and signals from nearby macrophages mark the remaining infection trail. This was not the source, only the first major breach.",quote:"Containment is not the end of the fight. It is the chance to prepare for the next one.",reward:"+5 IMMUNE SIGNALS"},8:{chapter:"FIELD REPORT - CHAPTER 02",title:"The Signal Spreads.",body:"The second elite threat collapses. Cytokine signals ripple through the vascular network, calling reinforcements toward the deeper infection. The pathogen has adapted, so your next upgrades and movement will matter.",quote:"The enemy is changing. So must the response.",reward:"+5 IMMUNE SIGNALS"},12:{chapter:"FIELD REPORT - FINAL CHAPTER",title:"A Heartbeat of Silence.",body:"The final elite threat breaks apart. The crimson haze thins and the host circulation steadies. Your cell has held the line long enough for the wider immune response to take control. This mission ends with a coordinated defence, one hard-won step at a time.",quote:"Host stability restored. Mission complete, defender.",reward:"+5 IMMUNE SIGNALS - FINAL CLEARANCE"}};const tips = [
"Neutrophils are rapid responders and often among the first immune cells at an infection site.",
"Macrophages engulf pathogens and cellular debris through phagocytosis.",
"Antibodies bind specific antigens; they do not simply destroy every pathogen by themselves.",
"Biofilms are microbial communities embedded in a protective matrix, which can make them harder to clear.",
"Cytokines are signalling molecules that help immune cells coordinate their responses.",
"Memory B cells can support a faster, stronger response when the same antigen is encountered again."
];
const questions = [
{q:"Which white blood cell is a rapid first responder and a major phagocyte?",o:["Neutrophil","Red blood cell","Platelet","Mature neuron"],a:0,why:"Neutrophils are rapid innate immune responders and can engulf microbes."},
{q:"What is phagocytosis?",o:["A pathogen making antibodies","A cell engulfing particles or microbes","DNA copying itself","Oxygen binding haemoglobin"],a:1,why:"Phagocytosis is the uptake and engulfment of particles by a cell."},
{q:"What is the main role of antibodies?",o:["Carry oxygen","Digest all cells indiscriminately","Bind specific antigens","Produce ATP in mitochondria"],a:2,why:"Antibodies recognise and bind particular antigens, helping neutralise or mark targets."},
{q:"A biofilm is best described as…",o:["One giant bacterial cell","A virus with a shell","A white blood cell cluster","A microbial community in a protective matrix"],a:3,why:"Biofilms are communities of microbes embedded in a matrix they produce."},
{q:"Cytokines mainly help immune cells by…",o:["Acting as signalling molecules","Replacing red blood cells","Turning bacteria into viruses","Building bone directly"],a:0,why:"Cytokines are communication signals that influence immune-cell behaviour."},
{q:"Which cells can support a faster response on later exposure to an antigen?",o:["Red blood cells","Memory B and T cells","Platelets only","Skin keratin only"],a:1,why:"Adaptive immune memory can make a later response faster and more effective."}
];
let mode="pulse", running=false, paused=false, ended=false, last=0, frame=0, elapsed=0;
let player, enemies=[], shots=[], enemyShots=[], pickups=[], particles=[], score=0, signals=0, wave=0, kills=0, bioDone=0, bioIndex=0, bioAnswered=false, chosenUpgrade=null, bossSpawned=false, lastUpgradeWave=0, keys={}, mouse={x:480,y:300,down:false}, sound=false, audioCtx=null;
let upgrades={damage:0,fire:0,health:0,speed:0,burst:0,magnet:0};
const upgradeDefs=[
{key:"damage",icon:"✦",title:"Cytotoxic Payload",desc:"Your immune burst hits harder, clearing tougher pathogens faster.",cost:5,apply:()=>{upgrades.damage++;}},
{key:"fire",icon:"»",title:"Rapid Degranulation",desc:"Shorten the delay between shots. More pressure, less waiting.",cost:5,apply:()=>{upgrades.fire++;}},
{key:"health",icon:"✚",title:"Membrane Repair",desc:"Increase maximum integrity and restore part of the lost health.",cost:6,apply:()=>{upgrades.health++;player.maxHp+=22;player.hp=Math.min(player.maxHp,player.hp+38);}},
{key:"speed",icon:"➤",title:"Chemotactic Drive",desc:"Improve movement speed to dodge incoming attacks and close gaps.",cost:4,apply:()=>{upgrades.speed++;}},
{key:"burst",icon:"◎",title:"Oxidative Burst",desc:"Boost the special burst ability's damage and reduce its cooldown.",cost:7,apply:()=>{upgrades.burst++;}},
{key:"magnet",icon:"⌁",title:"Signal Receptor",desc:"Collect immune signals from farther away and pull them toward you.",cost:4,apply:()=>{upgrades.magnet++;}}
];
function showScreen(id){screens.forEach(s=>$(s).classList.toggle("hidden",s!==id));}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add("hidden"),1800);}
function beep(freq=440,dur=.06,type="sine"){if(!sound)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=.035;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur);}catch(e){}}
function resetGame(){
 player={x:canvas.width/2,y:canvas.height/2,r:17,hp:100,maxHp:100,speed:220,shotCd:0,burstCd:0,invuln:0,face:0};
 enemies=[];shots=[];enemyShots=[];pickups=[];particles=[];score=0;signals=0;wave=0;kills=0;bioDone=0;elapsed=0;bossSpawned=false;lastUpgradeWave=0;ended=false;paused=false;running=true;last=performance.now();upgrades={damage:0,fire:0,health:0,speed:0,burst:0,magnet:0};
 for(let i=0;i<4;i++)spawnPickup(Math.random()*canvas.width,Math.random()*canvas.height,"signal");
 nextWave();updateHud();$("pauseOverlay").classList.add("hidden");$("endOverlay").classList.add("hidden");showScreen("gameScreen");requestAnimationFrame(loop);
}
function nextWave(){
 wave++;if(wave>12){finish(true);return;}bossSpawned=false;
 const count=Math.min(4+Math.floor(wave*1.55),18);
 for(let i=0;i<count;i++)spawnEnemy();
 if(wave%4===0){spawnEnemy("boss");bossSpawned=true;toast("ELITE THREAT DETECTED · BOSS WAVE");}
 $("waveText").textContent="WAVE "+String(wave).padStart(2,"0");
 $("stageText").textContent=stages[Math.min(stages.length-1,Math.floor((wave-1)/2))];
 $("tipText").textContent=tips[(wave-1)%tips.length];
}
function spawnEnemy(force){
 const edge=Math.floor(Math.random()*4),pad=28;let x=edge===0?pad:edge===1?canvas.width-pad:Math.random()*canvas.width,y=edge===2?pad:edge===3?canvas.height-pad:Math.random()*canvas.height;
 const types=["bacterium","virus","fungus","parasite"];
 let type=force||types[Math.floor(Math.random()*Math.min(types.length,1+Math.floor(wave/2)))];
 const m=modes[mode],boss=type==="boss";
 const base=boss?210: type==="virus"?22:type==="fungus"?45:type==="parasite"?37:30;
 enemies.push({x,y,r:boss?31:type==="fungus"?19:type==="parasite"?16:14,type,hp:base*(1+wave*.16)*m.enemyHp,maxHp:base*(1+wave*.16)*m.enemyHp,speed:(boss?35:type==="virus"?90:type==="parasite"?78:type==="fungus"?45:57)*m.enemySpeed*(1+wave*.035),damage:(boss?19: type==="parasite"?13:9)*m.damage,shot:1+Math.random()*2.5,phase:Math.random()*7,hit:0});
}
function spawnPickup(x,y,type){pickups.push({x,y,r:type==="heal"?8:7,type,life:13,phase:Math.random()*6});}
function burst(x,y,color,n=10){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=25+Math.random()*150;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.55,max:.8,color,r:1+Math.random()*3});}}
function fire(){
 if(!running||paused||ended||player.shotCd>0)return;
 const dx=mouse.x-player.x,dy=mouse.y-player.y,a=Math.atan2(dy,dx);player.face=a;
 const speed=470,damage=(13+upgrades.damage*5);
 shots.push({x:player.x+Math.cos(a)*20,y:player.y+Math.sin(a)*20,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:5,damage,life:1.1});
 player.shotCd=Math.max(.105,.24-upgrades.fire*.035);beep(520,.035,"triangle");
}
function specialBurst(){
 if(!running||paused||ended||player.burstCd>0){if(player.burstCd>0)toast("BURST RECHARGING");return;}
 const radius=125+upgrades.burst*18;burst(player.x,player.y,"#73f6c4",32);beep(160,.22,"sawtooth");
 enemies.forEach(e=>{const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<radius){e.hp-=42+upgrades.burst*22;e.hit=.15;burst(e.x,e.y,"#ff7b8b",6);}});
 player.burstCd=Math.max(3,8-upgrades.burst*1.15);player.invuln=.28;toast("OXIDATIVE BURST RELEASED");
}
function update(dt){
 elapsed+=dt;frame++;
 const speed=player.speed*(1+upgrades.speed*.12),dx=(keys["w"]?1:0)-(keys["q"]?1:0),dy=(keys["d"]?1:0)-(keys["e"]?1:0);
 const norm=Math.hypot(dx,dy)||1;player.x+=dx/norm*speed*dt;player.y+=dy/norm*speed*dt;
 player.x=Math.max(player.r+3,Math.min(canvas.width-player.r-3,player.x));player.y=Math.max(player.r+3,Math.min(canvas.height-player.r-3,player.y));
 player.shotCd=Math.max(0,player.shotCd-dt);player.burstCd=Math.max(0,player.burstCd-dt);player.invuln=Math.max(0,player.invuln-dt);
 if(mouse.down||keys["a"])fire();
 if(keys[" "]){keys[" "]=false;specialBurst();}
 for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0||s.x<0||s.x>canvas.width||s.y<0||s.y>canvas.height){shots.splice(i,1);continue;}
 let hit=false;for(const e of enemies){if(Math.hypot(e.x-s.x,e.y-s.y)<e.r+s.r){e.hp-=s.damage;e.hit=.1;burst(s.x,s.y,"#73f6c4",3);hit=true;if(e.hp<=0)defeatEnemy(e);}if(hit)break;}if(hit)shots.splice(i,1);
 }
 for(let i=enemyShots.length-1;i>=0;i--){const s=enemyShots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.life<=0||s.x<0||s.x>canvas.width||s.y<0||s.y>canvas.height){enemyShots.splice(i,1);continue;}if(Math.hypot(player.x-s.x,player.y-s.y)<player.r+s.r&&player.invuln<=0){hurt(s.damage);enemyShots.splice(i,1);}}
 for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];e.phase+=dt;e.hit=Math.max(0,e.hit-dt);const dxp=player.x-e.x,dyp=player.y-e.y,d=Math.hypot(dxp,dyp)||1;
 if(e.type==="virus"){e.x+=Math.cos(e.phase*3)*e.speed*.3*dt;e.y+=Math.sin(e.phase*2)*e.speed*.3*dt;}
 e.x+=dxp/d*e.speed*dt;e.y+=dyp/d*e.speed*dt;
 if(e.type==="boss"||e.type==="fungus"){e.shot-=dt;if(e.shot<=0&&d>80){const a=Math.atan2(dyp,dxp),v=e.type==="boss"?190:130;for(let k=-1;k<=1;k++){const aa=a+k*(e.type==="boss"?.24:.14);enemyShots.push({x:e.x,y:e.y,vx:Math.cos(aa)*v,vy:Math.sin(aa)*v,r:e.type==="boss"?6:4,damage:e.damage*.7,life:3});}e.shot=e.type==="boss"?1.15:2.5;}}
 if(d<player.r+e.r&&player.invuln<=0){hurt(e.damage*dt*2.6);e.x-=dxp/d*e.speed*dt*1.8;e.y-=dyp/d*e.speed*dt*1.8;}
 if(e.hp<=0)defeatEnemy(e);
 }
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.life-=dt;p.phase+=dt;if(p.life<=0){pickups.splice(i,1);continue;}const d=Math.hypot(player.x-p.x,player.y-p.y),magnet=upgrades.magnet*35;if(d<25+magnet){p.x+=(player.x-p.x)*Math.min(1,dt*(3+upgrades.magnet));p.y+=(player.y-p.y)*Math.min(1,dt*(3+upgrades.magnet));}if(d<player.r+p.r+3){if(p.type==="signal"){signals+=Math.round(1*modes[mode].signals);score+=25;}else{player.hp=Math.min(player.maxHp,player.hp+22*modes[mode].heal);toast("MEMBRANE REPAIRED");}burst(p.x,p.y,p.type==="signal"?"#73f6c4":"#ffcb72",8);pickups.splice(i,1);beep(700,.07);}}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
 if(enemies.length===0&&running&&!paused&&!ended){if(wave%2===0&&signals>=5&&lastUpgradeWave!==wave){showUpgrades();return;}nextWave();}
 updateHud();
 if(player.hp<=0)finish(false);
}
function defeatEnemy(e){const i=enemies.indexOf(e);if(i<0)return;enemies.splice(i,1);kills++;score+=e.type==="boss"?600:e.type==="parasite"?110:75;burst(e.x,e.y,e.type==="boss"?"#ffcb72":"#ff687a",e.type==="boss"?28:12);spawnPickup(e.x+(Math.random()-.5)*14,e.y+(Math.random()-.5)*14,Math.random()<(mode==="pulse"?.68:.45)?"signal":"heal");if(e.type==="boss"){signals+=5;toast("ELITE NEUTRALIZED · +5 SIGNALS");enemies=[];enemyShots=[];showBossStory(e);}if(kills%6===0)spawnPickup(Math.random()*canvas.width,Math.random()*canvas.height,"signal");beep(220,.07,"square");}
function showBossStory(e){paused=true;const story=bossStories[wave]||bossStories[4];$("storyChapter").textContent=story.chapter;$("storyTitle").textContent=story.title;$("storyBody").textContent=story.body;$("storyQuote").textContent=story.quote;$("storyReward").textContent=story.reward;showScreen("storyScreen");}function hurt(amount){player.hp-=amount;player.invuln=.3;burst(player.x,player.y,"#ff5d70",7);beep(100,.12,"sawtooth");if(player.hp<0)player.hp=0;updateHud();}
function updateHud(){$("healthBar").style.width=Math.max(0,player.hp/player.maxHp*100)+"%";$("healthText").textContent=Math.ceil(player.hp)+" / "+player.maxHp;$("signalText").textContent=signals;$("scoreText").textContent="SCORE "+String(score).padStart(4,"0");$("abilityText").textContent=player&&player.burstCd>0?"BURST "+player.burstCd.toFixed(1)+"s":"BURST READY";$("bioCount").textContent=bioDone+"/3";}
function draw(){
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 const grad=ctx.createRadialGradient(w*.5,h*.5,20,w*.5,h*.5,w*.72);grad.addColorStop(0,"#12313a");grad.addColorStop(1,"#06141e");ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.strokeStyle="#25414a";ctx.lineWidth=1;ctx.globalAlpha=.28;for(let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}ctx.restore();
 for(let i=0;i<12;i++){const x=(i*137+frame*.13)%(w+80)-40,y=(i*83+Math.sin(frame*.012+i)*22)%h;ctx.fillStyle="#a04e61";ctx.globalAlpha=.14;ctx.beginPath();ctx.ellipse(x,y,16,8,Math.sin(i),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 pickups.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.phase);ctx.shadowBlur=14;ctx.shadowColor=p.type==="signal"?"#73f6c4":"#ffcb72";ctx.fillStyle=p.type==="signal"?"#73f6c4":"#ffcb72";ctx.beginPath();ctx.moveTo(0,-p.r-3);ctx.lineTo(p.r+3,0);ctx.lineTo(0,p.r+3);ctx.lineTo(-p.r-3,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.restore();});
 enemies.forEach(e=>drawEnemy(e));
 shots.forEach(s=>{ctx.save();ctx.shadowBlur=13;ctx.shadowColor="#73f6c4";ctx.fillStyle="#b9ffe4";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();});
 enemyShots.forEach(s=>{ctx.save();ctx.shadowBlur=10;ctx.shadowColor="#ff5d70";ctx.fillStyle="#ff8290";ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();ctx.restore();});
 particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
 drawPlayer();
 ctx.fillStyle="#b2c9ce";ctx.font="10px monospace";ctx.fillText("HOST DEFENSE ACTIVE",14,20);ctx.fillStyle="#73f6c4";ctx.fillText("THREAT COUNT "+String(enemies.length).padStart(2,"0"),w-145,20);
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y);const r=e.r;ctx.shadowBlur=e.type==="boss"?24:9;ctx.shadowColor=e.type==="boss"?"#ffcb72":"#ff5d70";ctx.fillStyle=e.hit>0?"#fff0e8":e.type==="boss"?"#9b5b32":e.type==="virus"?"#6c4a92":e.type==="fungus"?"#a05d57":e.type==="parasite"?"#b28b49":"#a34256";
 if(e.type==="virus"){ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=i%2===0?r*1.25:r*.86;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.fillStyle="#e9b4ef";ctx.beginPath();ctx.arc(0,0,r*.48,0,Math.PI*2);ctx.fill();}
 else if(e.type==="fungus"){ctx.beginPath();ctx.arc(0,-r*.2,r*.72,Math.PI,Math.PI*2);ctx.lineTo(r*.55,r*.7);ctx.lineTo(-r*.55,r*.7);ctx.closePath();ctx.fill();ctx.strokeStyle="#dba29a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.35,r*.55);ctx.lineTo(-r*.6,r);ctx.moveTo(r*.25,r*.55);ctx.lineTo(r*.45,r);ctx.stroke();}
 else if(e.type==="parasite"){ctx.rotate(Math.sin(e.phase)*.3);ctx.beginPath();ctx.ellipse(0,0,r*.75,r*1.35,.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#f2d38d";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-r*.5,0);ctx.lineTo(r*.5,0);ctx.stroke();}
 else{ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();for(let i=0;i<(e.type==="boss"?12:5);i++){const a=i*Math.PI*2/(e.type==="boss"?12:5);ctx.beginPath();ctx.arc(Math.cos(a)*r*.7,Math.sin(a)*r*.7,2.5,0,Math.PI*2);ctx.fillStyle="#f4a5ac";ctx.fill();}}
 ctx.shadowBlur=0;ctx.fillStyle="#06131b";ctx.beginPath();ctx.arc(-r*.25,-r*.1,2.4,0,Math.PI*2);ctx.arc(r*.25,-r*.1,2.4,0,Math.PI*2);ctx.fill();
 if(e.type==="boss"){ctx.fillStyle="#301b1b";ctx.fillRect(-r,-r-12,r*2,4);ctx.fillStyle="#ffcb72";ctx.fillRect(-r,-r-12,r*2*Math.max(0,e.hp/e.maxHp),4);}
 ctx.restore();
}
function drawPlayer(){
 const p=player;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.face);ctx.globalAlpha=p.invuln>0&&Math.floor(frame/4)%2===0?.4:1;
 ctx.shadowBlur=22;ctx.shadowColor="#73f6c4";ctx.fillStyle="#5ed7b3";ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 ctx.fillStyle="#1c786d";ctx.beginPath();ctx.ellipse(-2,0,9,11,.3,0,Math.PI*2);ctx.fill();ctx.fillStyle="#a9ffe0";ctx.beginPath();ctx.arc(5,-5,3,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle="#b1ffe2";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(23,0);ctx.stroke();
 ctx.restore();
}
function loop(now){if(!running)return;const dt=Math.min(.033,(now-last)/1000||0);last=now;if(!paused&&!ended)update(dt);draw();if(running)requestAnimationFrame(loop);}
function showUpgrades(){paused=true;chosenUpgrade=null;lastUpgradeWave=wave;const cards=$("upgradeCards");cards.innerHTML="";const available=upgradeDefs.slice().sort(()=>Math.random()-.5).slice(0,3);available.forEach(u=>{const b=document.createElement("button");b.className="upgrade-card";b.innerHTML='<span class="u-icon">'+u.icon+'</span><h3>'+u.title+'</h3><p>'+u.desc+'</p><small>COST: '+u.cost+' SIGNALS</small>';b.addEventListener("click",()=>{if(signals<u.cost){toast("NOT ENOUGH IMMUNE SIGNALS");return;}signals-=u.cost;u.apply();chosenUpgrade=u.key;cards.querySelectorAll("button").forEach(x=>x.disabled=true);b.style.borderColor="#73f6c4";b.style.background="#10332e";$("continueBtn").textContent="UPGRADE INSTALLED ✓ · RETURN TO BATTLE";updateHud();});cards.appendChild(b);});$("continueBtn").textContent="SKIP UPGRADE · RETURN TO BATTLE";showScreen("upgradeScreen");}
function finish(win){running=false;ended=true;paused=false;$("endEyebrow").textContent=win?"HOST DEFENSE REPORT":"SIGNAL LOST";$("endTitle").textContent=win?"INFECTION CONTAINED":"WHITE CELL DOWN";$("endMessage").textContent=win?"You cleared the infection campaign. The host survives, and the immune system logs a very good shift.":"The pathogen load overwhelmed your cell. Learn the enemy patterns, upgrade your response, and deploy again."; $("finalScore").textContent=score;$("finalWave").textContent=Math.max(0,wave-1);$("finalSignals").textContent=signals; $("endOverlay").classList.remove("hidden");}
function pauseGame(){if(!running||ended)return;paused=!paused;$("pauseOverlay").classList.toggle("hidden",!paused);if(!paused){last=performance.now();requestAnimationFrame(loop);}}
function openBio(){if(!running||paused||ended)return;paused=true;bioIndex=(bioDone)%questions.length;bioAnswered=false;const q=questions[bioIndex];$("bioQuestion").textContent=q.q;$("bioSub").textContent="Correct answer earns +2 immune signals. A wrong answer still teaches you something."; $("bioFeedback").textContent="";$("bioContinue").classList.add("hidden");const opts=$("bioOptions");opts.innerHTML="";q.o.forEach((o,i)=>{const b=document.createElement("button");b.className="bio-option";b.textContent=String.fromCharCode(65+i)+". "+o;b.addEventListener("click",()=>answerBio(i,b));opts.appendChild(b);});showScreen("bioScreen");}
function answerBio(i,b){if(bioAnswered)return;bioAnswered=true;const q=questions[bioIndex];const buttons=[...$("bioOptions").children];buttons[q.a].classList.add("correct");if(i===q.a){signals+=2;score+=100;bioDone++;$("bioFeedback").textContent="CORRECT · +2 SIGNALS. "+q.why;beep(700,.1);}else{$("bioFeedback").textContent="NOT QUITE. "+q.why; b.classList.add("wrong");}updateHud();$("bioContinue").classList.remove("hidden");}
function quitToMenu(){running=false;paused=false;ended=false;showScreen("menuScreen");$("pauseOverlay").classList.add("hidden");$("endOverlay").classList.add("hidden");}
document.querySelectorAll(".difficulty").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".difficulty").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");mode=b.dataset.mode;}));
$("startBtn").addEventListener("click",resetGame);$("soundBtn").addEventListener("click",()=>{sound=!sound;$("soundBtn").textContent="♫ SOUND: "+(sound?"ON":"OFF");if(sound)beep(660,.08);});
$("resumeBtn").addEventListener("click",()=>{paused=false;$("pauseOverlay").classList.add("hidden");last=performance.now();});
$("quitBtn").addEventListener("click",quitToMenu);$("retryBtn").addEventListener("click",resetGame);$("menuBtn").addEventListener("click",quitToMenu);
$("continueBtn").addEventListener("click",()=>{if(chosenUpgrade===null){toast("UPGRADE SKIPPED");}paused=false;showScreen("gameScreen");last=performance.now();});
$("storyContinue").addEventListener("click",()=>{paused=false;showScreen("gameScreen");last=performance.now();});$("fullscreenBtn").addEventListener("click",async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else{await $("gameScreen").requestFullscreen();}}catch(e){toast("FULLSCREEN IS NOT AVAILABLE IN THIS WINDOW");}});document.addEventListener("fullscreenchange",()=>{$("fullscreenBtn").textContent=document.fullscreenElement?"⤢ EXIT FULLSCREEN":"⛶ FULLSCREEN";});
$("bioBtn").addEventListener("click",openBio);$("bioContinue").addEventListener("click",()=>{paused=false;showScreen("gameScreen");last=performance.now();});
canvas.addEventListener("mousemove",e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*canvas.width/r.width;mouse.y=(e.clientY-r.top)*canvas.height/r.height;if(player)player.face=Math.atan2(mouse.y-player.y,mouse.x-player.x);});
canvas.addEventListener("mousedown",e=>{mouse.down=true;const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*canvas.width/r.width;mouse.y=(e.clientY-r.top)*canvas.height/r.height;});window.addEventListener("mouseup",()=>mouse.down=false);
window.addEventListener("keydown",e=>{const k=e.key.toLowerCase();if(["q","w","e","d","a"," ","escape"].includes(k))e.preventDefault();keys[k]=true;if(k==="escape")pauseGame();if(k==="a"&&running&&!paused)fire();if(k===" "&&running&&!paused){keys[" "]=false;specialBurst();}if(k==="enter"&&$("menuScreen").classList.contains("hidden")===false)resetGame();});
window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
window.addEventListener("blur",()=>{keys={};mouse.down=false;});
$("tipText").textContent=tips[0];
drawMenuBackdrop();
function drawMenuBackdrop(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#07151e";ctx.fillRect(0,0,canvas.width,canvas.height);}
// Touch controls are an input layer only; they reuse the existing keyboard/game actions.
const bindHoldKey = (button, key) => {
  if (!button) return;
  const down = e => { e.preventDefault(); keys[key] = true; };
  const up = e => { e.preventDefault(); keys[key] = false; };
  button.addEventListener("pointerdown", down);
  ["pointerup","pointercancel","pointerleave"].forEach(type => button.addEventListener(type, up));
};
document.querySelectorAll("[data-key]").forEach(button => bindHoldKey(button, button.dataset.key));
bindHoldKey($("mobileFire"), "a");
$("mobileBurst")?.addEventListener("pointerdown", e => { e.preventDefault(); if (running && !paused) specialBurst(); });
$("mobilePause")?.addEventListener("click", () => { if (running) pauseGame(); });
const updateTouchAim = e => {
  if (e.pointerType !== "touch") return;
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX-r.left)*canvas.width/r.width;
  mouse.y = (e.clientY-r.top)*canvas.height/r.height;
  if (player) player.face = Math.atan2(mouse.y-player.y, mouse.x-player.x);
};
canvas.addEventListener("pointerdown", updateTouchAim, {passive:true});
canvas.addEventListener("pointermove", e => { if (e.buttons) updateTouchAim(e); }, {passive:true});

})();
