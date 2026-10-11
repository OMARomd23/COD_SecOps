/* =====================================================================
   CALL OF DUTY: SEC OPS — motion graphics film
   Deterministic, clock-driven. seek(t) fully defines the frame so the
   same engine drives live playback AND frame-accurate offline rendering.
   ===================================================================== */
'use strict';

const W = 1920, H = 1080, FPS = 30;
const DUR = 28.5;                 // seconds
const stage = document.getElementById('stage');
const bg = document.getElementById('bg');
const bx = bg.getContext('2d');
const fx = document.getElementById('fx');
const fxx = fx.getContext('2d');
[bg, fx].forEach(c => { c.width = W; c.height = H; });

/* ---------- tiny helpers ---------- */
const clamp = (v, a=0, b=1) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const ease  = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;      // inOutCubic
const outQ  = t => 1-Math.pow(1-t,4);
const outExpo = t => t>=1?1:1-Math.pow(2,-10*t);
const inExpo  = t => t<=0?0:Math.pow(2,10*t-10);
// window in seconds -> local 0..1 progress (clamped)
const win = (t, a, b) => clamp((t-a)/(b-a));
// deterministic pseudo-random (no Math.random, so renders are stable)
function hash(n){ let x = Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); }
function noise(n){ const i=Math.floor(n), f=n-i; const u=f*f*(3-2*f); return lerp(hash(i),hash(i+1),u); }

/* ---------- DOM layer (typography / cards) ---------- */
const dom = document.getElementById('dom');
function el(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
function clearDom(){ dom.textContent=''; }

/* =====================================================================
   SCENE TABLE  (absolute seconds)
   ===================================================================== */
const S = {
  coldOpen:   [0.0,  3.3],
  cGerman:    [3.3,  6.1],
  cRussian:   [6.1,  8.9],
  cAmerican:  [8.9, 11.7],
  cJapanese:  [11.7,14.5],
  cHacker:    [14.5,17.5],
  hack:       [17.5,22.8],
  chaos:      [22.8,25.4],
  title:      [25.4,28.5],
};

/* character data -------------------------------------------------------*/
const CHARS = {
  german: {
    key:'german', role:'THE ARCHITECT', name:'DR. KLAUS REINHOLT',
    native:'DER ARCHITEKT', sub:'Квантовая физика · Wunderwaffe Division',
    tag:'BUILT THE MACHINE THAT SHOULD NOT EXIST',
    accent:'#49e2ff', accent2:'#0a2b33', flag:['#000','#d00','#ffce00'],
    font:'SpecialElite', stats:[['INTELLECT',98],['SANITY',22],['ÆTHER CTRL',91]],
    stamp:'STRENG GEHEIM', num:'№ 001',
  },
  russian: {
    key:'russian', role:'THE HAMMER', name:'VIKTOR MOROZOV',
    native:'МОЛОТ', sub:'44-я ударная · Red Vanguard',
    tag:'DOES NOT FEEL THE COLD. OR FEAR.',
    accent:'#ff3b2f', accent2:'#330604', flag:['#fff','#0039a6','#d52b1e'],
    font:'Russo', stats:[['POWER',97],['ARMOR',88],['MERCY',4]],
    stamp:'СЕКРЕТНО', num:'№ 002',
  },
  american: {
    key:'american', role:'THE STORM', name:'SGT. RAY CALLAHAN',
    native:'OVERWATCH', sub:'101st Airborne · Spec Recon',
    tag:'BRINGS THE THUNDER. LEAVES THE RUIN.',
    accent:'#ffb400', accent2:'#2b2206', flag:['#b22234','#fff','#3c3b6e'],
    font:'Anton', stats:[['FIREPOWER',94],['GRIT',96],['SUBTLETY',12]],
    stamp:'TOP SECRET', num:'№ 003',
  },
  japanese: {
    key:'japanese', role:'THE BLADE', name:'KENJI TAKANASHI',
    native:'嵐の武士', sub:'影 Division · Bushidō Protocol',
    tag:'ONE CUT. NO SECOND CUT NEEDED.',
    accent:'#ff2d55', accent2:'#2b0510', flag:['#fff','#bc002d','#fff'],
    font:'DelaJP', stats:[['PRECISION',99],['SPEED',95],['HONOR',100]],
    stamp:'極秘', num:'№ 004',
  },
  hacker: {
    key:'hacker', role:'THE GHOST', name:'AMINE "Z3RO" EL FASSI',
    native:'الشبح', sub:'Casablanca · Zero-Day Cell  ·  ⵣ',
    tag:'WHY FIGHT THE MACHINE WHEN YOU CAN OWN IT?',
    accent:'#39ff8b', accent2:'#03260f', flag:['#c1272d','#006233','#006233'],
    font:'ReemKufi', stats:[['EXPLOIT',99],['STEALTH',97],['PATIENCE',93]],
    stamp:'عملية سرية', num:'№ 005',
  },
};

/* =====================================================================
   BACKGROUND ENGINE (canvas) — persistent bunker ambience + per scene
   ===================================================================== */
function drawVignette(ctx, strength=0.9){
  const g = ctx.createRadialGradient(W/2,H/2,H*0.25, W/2,H*0.62,H*0.95);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(1,`rgba(0,0,0,${strength})`);
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}
function scanlines(ctx, t, alpha=0.16, gap=3){
  ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle='#000';
  const off = Math.floor((t*30)%gap);
  for(let y=-off; y<H; y+=gap) ctx.fillRect(0,y,W,1);
  ctx.restore();
  // rolling bright bar
  const by = ((t*120)%(H+300))-150;
  const gb = ctx.createLinearGradient(0,by-120,0,by+120);
  gb.addColorStop(0,'rgba(255,255,255,0)');
  gb.addColorStop(.5,'rgba(255,255,255,0.035)');
  gb.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gb; ctx.fillRect(0,by-120,W,240);
}
function grain(ctx, t, amount=0.06){
  const n=140; ctx.save();
  for(let i=0;i<n;i++){
    const s=hash(i+Math.floor(t*22)*7.3);
    const x=hash(i*1.7+Math.floor(t*22))*W, y=hash(i*3.1+Math.floor(t*22)*2.2)*H;
    ctx.globalAlpha=amount*(0.3+s*0.7);
    ctx.fillStyle=s>.5?'#fff':'#000';
    ctx.fillRect(x,y,2,2);
  }
  ctx.restore();
}
// faint blueprint grid used across the film
function grid(ctx,t,col,alpha){
  ctx.save(); ctx.globalAlpha=alpha; ctx.strokeStyle=col; ctx.lineWidth=1;
  const sp=64, ox=(t*8)%sp, oy=(t*5)%sp;
  ctx.beginPath();
  for(let x=-ox;x<W;x+=sp){ctx.moveTo(x,0);ctx.lineTo(x,H);}
  for(let y=-oy;y<H;y+=sp){ctx.moveTo(0,y);ctx.lineTo(W,y);}
  ctx.stroke(); ctx.restore();
}

/* floating dust motes for the bunker */
function motes(ctx,t,col='#ffce00'){
  ctx.save();
  for(let i=0;i<60;i++){
    const sp=0.3+hash(i)*0.6;
    const x=(hash(i*2.1)*W + t*20*sp)%W;
    const y=(hash(i*4.7)*H - t*14*sp%H + H)%H;
    const a=0.04+0.08*noise(t*0.7+i);
    ctx.globalAlpha=a; ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(x,y,0.8+hash(i*9)*1.6,0,7); ctx.fill();
  }
  ctx.restore();
}

/* =====================================================================
   SCENE RENDERERS
   Each returns nothing; they paint bg canvas + push DOM.
   DOM is rebuilt every seek so it's deterministic.
   ===================================================================== */

/* -- reusable corner HUD frame drawn in DOM -- */
function hudFrame(accent, label, num, shutter=0){
  const f=el('div','hud');
  f.innerHTML=`
    <div class="hud-corner tl"></div><div class="hud-corner tr"></div>
    <div class="hud-corner bl"></div><div class="hud-corner br"></div>
    <div class="hud-top"><span class="rec">● REC</span>
      <span class="hud-label">${label}</span>
      <span class="hud-num">${num}</span></div>
    <div class="hud-bot"><span>RICHDALE // DEFENSE INITIATIVE</span>
      <span class="ticker"></span>
      <span>SUBLEVEL 7 · −112 m</span></div>`;
  f.style.setProperty('--ac',accent);
  f.style.setProperty('--shutter',shutter);
  return f;
}

/* ----- SCENE 0 : COLD OPEN ----- */
function sceneColdOpen(t){
  const [a,b]=S.coldOpen; const p=win(t,a,b);
  bx.fillStyle='#000'; bx.fillRect(0,0,W,H);

  // power-up flash lines
  const boot = win(t,0.1,0.55);
  if(boot>0 && boot<1){
    bx.save(); bx.globalAlpha=1-boot; bx.fillStyle='#0a0f0a';
    bx.fillRect(0, H/2-(1-boot)*H/2, W, (1-boot)*H);
    bx.restore();
  }
  grid(bx,t,'#123', 0.5*clamp(win(t,0.3,1.2)));
  drawVignette(bx,0.95);

  // red alert sweep after 1.4s
  const al=win(t,1.3,3.3);
  if(al>0){
    const sweep=(t*0.8)%1;
    const g=bx.createRadialGradient(W/2,H*0.4,0,W/2,H*0.4,W*0.8);
    const puls=0.12+0.12*Math.abs(Math.sin(t*6));
    g.addColorStop(0,`rgba(255,20,10,${puls*al})`);
    g.addColorStop(1,'rgba(255,20,10,0)');
    bx.fillStyle=g; bx.fillRect(0,0,W,H);
  }
  scanlines(bx,t,0.18);
  grain(bx,t,0.07);

  clearDom();
  // boot console text
  const c=el('div','cold');
  const lines=[
    '> RICHDALE DEFENSE INITIATIVE — SUBLEVEL 7',
    '> cold-start sequence .......... OK',
    '> aether core ................. ONLINE',
    '> containment field ........... <span class="warn">DEGRADED</span>',
    '> perimeter lock .............. <span class="warn">FAILING</span>',
    '> unauthorised signature ...... <span class="bad">DETECTED</span>',
  ];
  const showN = Math.floor(win(t,0.2,1.9)*lines.length+0.001);
  let htmlL='';
  for(let i=0;i<Math.min(showN,lines.length);i++){
    let ln=lines[i];
    if(i===showN-1){ // typing last line
      const lp=((win(t,0.2,1.9)*lines.length)%1);
      const plain=ln.replace(/<[^>]+>/g,'');
      const n=Math.floor(lp*plain.length);
      ln = plain.slice(0,n)+'<span class="cur">_</span>';
    }
    htmlL+=`<div>${ln}</div>`;
  }
  c.innerHTML=htmlL;
  c.style.opacity=clamp(win(t,0.1,0.4));
  dom.appendChild(c);

  // big CLASSIFIED stamp slams in ~1.9
  const st=win(t,1.9,2.25);
  if(st>0){
    const s=el('div','classified');
    s.textContent='// CLASSIFIED //';
    const sc=lerp(2.4,1,outExpo(st));
    s.style.transform=`translate(-50%,-50%) rotate(-7deg) scale(${sc})`;
    s.style.opacity=clamp(st*3);
    // jitter after landing
    if(st>=1){ const j=()=>{ return (noise(t*40)-0.5)*3; }; s.style.left=`calc(50% + ${j()}px)`; }
    dom.appendChild(s);
  }
  // alarm label flashing
  if(al>0){
    const w=el('div','alarmbar');
    w.innerHTML=`<span>⚠ SECURITY BREACH</span><span>⚠ SUBLEVEL 7</span><span>⚠ ALL UNITS</span>`;
    w.style.opacity=(Math.sin(t*9)>0?1:0.25)*al;
    dom.appendChild(w);
  }
  // flash transition out
  if(p>0.92){ flash(1-(1-p)/0.08); }
}

/* ----- shared character-card renderer ----- */
function characterCard(t, win01, c){
  const p = win01;                         // 0..1 over the card
  const inP = outExpo(clamp(p/0.28));
  const outP = clamp((p-0.86)/0.14);
  const hold = clamp((p-0.28)/0.5);

  /* ---- background canvas per archetype ---- */
  bx.fillStyle='#05060a'; bx.fillRect(0,0,W,H);
  const tl = t;                             // absolute for continuity

  // accent gradient wash from one side
  const dir = c.key==='hacker'?-1:1;
  const g=bx.createLinearGradient(dir>0?0:W,0,dir>0?W:0,H);
  g.addColorStop(0, c.accent2);
  g.addColorStop(0.5,'#05060a');
  g.addColorStop(1,'#000');
  bx.fillStyle=g; bx.fillRect(0,0,W,H);

  grid(bx,tl,c.accent,0.05+0.03*hold);

  // archetype signature background
  bgSignature(c, tl, inP, hold);

  // big ghost number
  bx.save();
  bx.globalAlpha=0.06+0.02*Math.sin(tl*3);
  bx.fillStyle=c.accent; bx.font=`900 760px Anton, sans-serif`;
  bx.textAlign='center'; bx.textBaseline='middle';
  bx.fillText(c.num.replace(/\D/g,''), W*0.72, H*0.52);
  bx.restore();

  drawVignette(bx,0.92);
  scanlines(bx,tl,0.12);
  motes(bx,tl,c.accent);
  grain(bx,tl,0.06);

  /* ---- DOM card ---- */
  clearDom();
  dom.appendChild(hudFrame(c.accent, c.role+' // DOSSIER', c.num));

  const card=el('div','card');
  card.style.setProperty('--ac',c.accent);
  card.style.setProperty('--ac2',c.accent2);
  // entrance transform
  const slideX = lerp(-140*dir,0,inP);
  const exitX  = lerp(0, 60*dir, ease(outP));
  const exitSkew = lerp(0,-12,ease(outP));
  card.style.transform=`translate(${slideX+exitX}px,0) skewX(${exitSkew}deg)`;
  card.style.opacity=clamp(inP*1.2)*(1-outP);

  // left accent bar w/ flag stripes
  const bar=el('div','accentbar');
  c.flag.forEach(col=>{ const s=el('div','stripe'); s.style.background=col; bar.appendChild(s); });
  card.appendChild(bar);

  // native big word (localised font), draws with a reveal clip
  const nat=el('div','native');
  nat.style.fontFamily=`'${c.font}', 'Anton', sans-serif`;
  nat.textContent=c.native;
  nat.style.clipPath=`inset(0 ${100-clamp(win01/0.42)*100}% 0 0)`;
  card.appendChild(nat);

  // role / name block
  const info=el('div','info');
  const roleSplit = splitReveal(c.role, clamp((p-0.12)/0.3));
  info.innerHTML=`
    <div class="role">${roleSplit}</div>
    <div class="name">${c.name}</div>
    <div class="sub">${c.sub}</div>
    <div class="tag">“${c.tag}”</div>`;
  card.appendChild(info);

  // stat bars
  const stats=el('div','stats');
  c.stats.forEach((s,i)=>{
    const sp=clamp((p-0.3-i*0.05)/0.3);
    stats.innerHTML+=`
      <div class="stat">
        <span class="sl">${s[0]}</span>
        <span class="track"><span class="fill" style="width:${(s[1]*sp).toFixed(0)}%"></span></span>
        <span class="sv">${Math.round(s[1]*sp).toString().padStart(2,'0')}</span>
      </div>`;
  });
  card.appendChild(stats);

  // silhouette portrait
  const port=el('div','port');
  port.innerHTML=silhouette(c.key, c.accent);
  port.style.opacity=clamp((p-0.15)/0.25)*(1-outP);
  port.style.transform=`translateY(${lerp(40,0,outExpo(clamp(p/0.3)))}px) scale(${lerp(1.08,1,inP)})`;
  card.appendChild(port);

  // classified stamp
  const st=el('div','cardstamp');
  st.textContent=c.stamp;
  st.style.opacity=(p>0.42?1:0)*(1-outP)*(0.6+0.4*Math.abs(Math.sin(tl*4)));
  card.appendChild(st);

  dom.appendChild(card);

  // index pips bottom
  const pips=el('div','pips');
  const order=['german','russian','american','japanese','hacker'];
  pips.innerHTML=order.map(k=>`<span class="${k===c.key?'on':''}"></span>`).join('');
  pips.style.setProperty('--ac',c.accent);
  dom.appendChild(pips);

  if(p>0.92) flash((p-0.92)/0.08*0.8);
}

/* split-letters reveal for a word */
function splitReveal(txt, p){
  const n=txt.length; let out='';
  for(let i=0;i<n;i++){
    const lp=clamp(p*n-i);
    const ch=txt[i]===' '?'&nbsp;':txt[i];
    out+=`<span style="opacity:${lp};transform:translateY(${(1-lp)*18}px);display:inline-block">${ch}</span>`;
  }
  return out;
}

/* archetype background signatures on bg canvas */
function bgSignature(c, t, inP, hold){
  bx.save();
  if(c.key==='german'){
    // assembling schematic circles + gears + formulae lines
    bx.strokeStyle=c.accent; bx.lineWidth=1.4; bx.globalAlpha=0.5;
    const cx=W*0.3, cy=H*0.42;
    for(let r=60;r<520;r+=70){
      const a=clamp((t-S.cGerman[0]-r*0.0007)/0.5);
      bx.globalAlpha=0.3*a;
      bx.beginPath(); bx.arc(cx,cy,r, -1.2+t*0.3, -1.2+t*0.3+a*5); bx.stroke();
    }
    bx.globalAlpha=0.25;
    for(let i=0;i<8;i++){ const a=t*0.2+i; bx.beginPath();
      bx.moveTo(cx,cy); bx.lineTo(cx+Math.cos(a)*500,cy+Math.sin(a)*500); bx.stroke(); }
  } else if(c.key==='russian'){
    // heavy diagonal hazard slabs + falling snow
    bx.globalAlpha=0.14; bx.fillStyle=c.accent;
    for(let i=-2;i<12;i++){ const x=i*220 - (t*40)%440; bx.save();
      bx.translate(x,0); bx.rotate(0.35); bx.fillRect(0,-200,70,H+600); bx.restore(); }
    bx.globalAlpha=0.9; bx.fillStyle='#cfe8ff';
    for(let i=0;i<120;i++){ const x=(hash(i)*W+t*30*(0.5+hash(i*3)))%W;
      const y=(hash(i*7)*H+t*120*(0.4+hash(i*2)))%H; bx.globalAlpha=0.15+0.2*hash(i*5);
      bx.fillRect(x,y,2,2); }
  } else if(c.key==='american'){
    // searchlights + chopper rotor strobe + stencil star
    const n=4; for(let i=0;i<n;i++){ const a=Math.sin(t*0.7+i*1.7)*0.5-1.1;
      const g=bx.createLinearGradient(W*0.5,0, W*0.5+Math.cos(a)*1400, Math.sin(a)*1400+900);
      g.addColorStop(0,`rgba(255,180,0,0.0)`); g.addColorStop(0.1,`rgba(255,180,0,0.10)`); g.addColorStop(1,'rgba(255,180,0,0)');
      bx.save(); bx.translate(W*0.5,-60); bx.rotate(a+1.57);
      bx.fillStyle=g; bx.fillRect(-70,0,140,1500); bx.restore(); }
    // rotor strobe
    bx.globalAlpha=0.06+0.06*(Math.sin(t*40)>0?1:0); bx.fillStyle='#000'; bx.fillRect(0,0,W,H);
  } else if(c.key==='japanese'){
    // red sun + ink splatter + vertical kanji columns
    const sg=bx.createRadialGradient(W*0.3,H*0.42,10,W*0.3,H*0.42,420);
    sg.addColorStop(0,'rgba(188,0,45,0.55)'); sg.addColorStop(0.7,'rgba(188,0,45,0.25)'); sg.addColorStop(1,'rgba(188,0,45,0)');
    bx.fillStyle=sg; bx.beginPath(); bx.arc(W*0.3,H*0.42,420,0,7); bx.fill();
    // ink brush slash reveal
    const sp=clamp((t-S.cJapanese[0])/0.5);
    bx.strokeStyle='#0a0a0a'; bx.globalAlpha=0.9; bx.lineWidth=46; bx.lineCap='round';
    bx.beginPath(); bx.moveTo(-50, H*0.2); bx.lineTo(lerp(-50,W+80,sp), H*0.2+sp*260); bx.stroke();
    // vertical kana
    bx.globalAlpha=0.22; bx.fillStyle='#fff'; bx.font="46px DelaJP, serif";
    const col='刃一閃無二';
    for(let k=0;k<4;k++){ for(let j=0;j<8;j++){ bx.fillText(col[(k+j)%col.length], W*0.08+k*64, 120+j*70 - (t*20)%70); } }
  } else if(c.key==='hacker'){
    // MATRIX rain in Tifinagh + Arabic numerals + green
    bx.font="34px Tifinagh, monospace";
    const cols=Math.floor(W/30); const glyphs='ⵣⴰⵎⵓⵔⵖⵉⴷⵜⵙⵍⴽ0123456789٠١٢٣٤٥';
    for(let i=0;i<cols;i++){
      const speed=80+hash(i)*220; const head=((t*speed + hash(i*3)*H)%(H+400));
      for(let j=0;j<14;j++){ const y=head-j*34; if(y<0||y>H)continue;
        const gi=Math.floor(hash(i*7+j+Math.floor(t*8))*glyphs.length);
        bx.globalAlpha=j===0?0.95:clamp(0.5-j*0.04);
        bx.fillStyle=j===0?'#d9ffe9':c.accent;
        bx.fillText(glyphs[gi], i*30, y);
      }
    }
  }
  bx.restore();
}

/* iconic, copyright-safe SVG silhouettes */
function silhouette(key, ac){
  const common=`viewBox="0 0 200 260" fill="none" stroke="${ac}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
  const fillShade=`<defs><linearGradient id="g${key}" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0" stop-color="${ac}" stop-opacity=".30"/>
     <stop offset="1" stop-color="${ac}" stop-opacity=".02"/></linearGradient></defs>`;
  const P=d=>`<path d="${d}" fill="url(#g${key})"/>`;
  if(key==='german') // scientist w/ round goggles + lab collar
    return `<svg ${common}>${fillShade}${P('M60 250 Q60 150 100 150 Q140 150 140 250 Z')}
      <circle cx="100" cy="92" r="46" fill="url(#g${key})"/>
      <circle cx="84" cy="90" r="15"/><circle cx="116" cy="90" r="15"/><path d="M99 90h2"/>
      <path d="M70 120 l-14 40 M130 120 l14 40"/><path d="M78 150 h44"/></svg>`;
  if(key==='russian') // ushanka + heavy coat + ammo
    return `<svg ${common}>${fillShade}${P('M54 250 Q54 150 100 150 Q146 150 146 250 Z')}
      <path d="M62 86 a38 38 0 0 1 76 0 v10 a10 10 0 0 1 -10 10 h-56 a10 10 0 0 1 -10 -10 Z" fill="url(#g${key})"/>
      <path d="M62 70 q38 -30 76 0"/><circle cx="86" cy="104" r="5"/><circle cx="114" cy="104" r="5"/>
      <path d="M70 170 l60 20 M70 190 l60 20"/></svg>`;
  if(key==='american') // helmet + straps + mic
    return `<svg ${common}>${fillShade}${P('M56 250 Q56 150 100 150 Q144 150 144 250 Z')}
      <path d="M60 96 a40 34 0 0 1 80 0 q0 8 -8 8 h-64 q-8 0 -8 -8 Z" fill="url(#g${key})"/>
      <path d="M70 104 v24 M130 104 v24"/><rect x="82" y="104" width="36" height="30" rx="6"/>
      <path d="M118 120 q20 4 16 26"/></svg>`;
  if(key==='japanese') // kabuto crest + mempo mask
    return `<svg ${common}>${fillShade}${P('M58 250 Q58 150 100 150 Q142 150 142 250 Z')}
      <path d="M64 92 a36 36 0 0 1 72 0 q0 10 -10 14 h-52 q-10 -4 -10 -14 Z" fill="url(#g${key})"/>
      <path d="M100 40 v34 M86 60 l14 14 l14 -14"/><path d="M80 110 h40 M86 124 q14 10 28 0"/></svg>`;
  // hacker: hood + mask + headset
  return `<svg ${common}>${fillShade}${P('M50 250 Q50 150 100 146 Q150 150 150 250 Z')}
      <path d="M58 120 Q54 60 100 52 Q146 60 142 120 q-42 -26 -84 0 Z" fill="url(#g${key})"/>
      <path d="M78 98 h16 M106 98 h16"/><path d="M94 98 h12"/>
      <path d="M60 104 q-16 6 -14 30" /><circle cx="48" cy="134" r="6"/></svg>`;
}

/* ----- SCENE 2 : THE HACK ----- */
const NODES=[
  {n:'TELEPORTER ARRAY',  id:'TPX-9',   cve:'CVE-1945-0007', sev:'CRITICAL'},
  {n:'ÆTHER WEAPON CORE',  id:'WND-77',  cve:'CVE-1945-0042', sev:'CRITICAL'},
  {n:'SECURITY MAINFRAME', id:'SEC-01',  cve:'CVE-1945-0113', sev:'HIGH'},
  {n:'BLAST DOORS',        id:'DR-SL7',  cve:'CVE-1945-0200', sev:'HIGH'},
  {n:'CRYO CONTAINMENT',   id:'CRY-13',  cve:'CVE-1945-0256', sev:'CRITICAL'},
  {n:'POWER GRID',         id:'PWR-Δ',   cve:'CVE-1945-0404', sev:'MEDIUM'},
];
function sceneHack(t){
  const [a,b]=S.hack; const p=win(t,a,b);
  bx.fillStyle='#02150c'; bx.fillRect(0,0,W,H);
  // deep green gradient
  const g=bx.createRadialGradient(W*0.5,H*0.5,60,W*0.5,H*0.5,W*0.7);
  g.addColorStop(0,'#063019'); g.addColorStop(1,'#010a05'); bx.fillStyle=g; bx.fillRect(0,0,W,H);
  grid(bx,t,'#0f6b38',0.12);

  // ---- network diagram (canvas) ----
  const cx=W*0.5, cy=H*0.46, R=330;
  const pts=NODES.map((nd,i)=>{ const ang=-Math.PI/2+i/NODES.length*Math.PI*2;
    return {x:cx+Math.cos(ang)*R, y:cy+Math.sin(ang)*R*0.82, nd}; });
  // links pulse
  bx.lineWidth=2;
  pts.forEach((pt,i)=>{
    const owned = p > (0.2 + i*0.1);
    bx.strokeStyle = owned? 'rgba(255,45,45,0.8)' : 'rgba(57,255,139,0.5)';
    const pulse = (t*2 + i)%1;
    bx.beginPath(); bx.moveTo(cx,cy); bx.lineTo(pt.x,pt.y); bx.stroke();
    // data packet
    bx.fillStyle=owned?'#ff4d4d':'#aaffcc';
    const px=lerp(cx,pt.x,pulse), py=lerp(cy,pt.y,pulse);
    bx.beginPath(); bx.arc(px,py,4,0,7); bx.fill();
  });
  // center core
  const corePuls=1+0.08*Math.sin(t*8);
  bx.save(); bx.translate(cx,cy); bx.scale(corePuls,corePuls);
  bx.strokeStyle='#39ff8b'; bx.lineWidth=3; bx.beginPath(); bx.arc(0,0,46,0,7); bx.stroke();
  bx.rotate(t); bx.strokeStyle='rgba(57,255,139,.6)';
  bx.beginPath(); bx.arc(0,0,64, t, t+2); bx.stroke(); bx.restore();
  // nodes
  pts.forEach((pt,i)=>{
    const owned = p > (0.2 + i*0.1);
    bx.save(); bx.translate(pt.x,pt.y);
    bx.strokeStyle=owned?'#ff2d2d':'#39ff8b'; bx.lineWidth=2.5;
    bx.fillStyle=owned?'rgba(255,45,45,0.18)':'rgba(57,255,139,0.12)';
    bx.beginPath(); bx.rect(-16,-16,32,32); bx.fill(); bx.stroke();
    if(owned){ bx.fillStyle='#ff5555'; bx.font='bold 16px JBMono'; bx.textAlign='center';
      bx.fillText('✕',0,6); }
    bx.restore();
  });

  drawVignette(bx,0.9);
  scanlines(bx,t,0.13);
  grain(bx,t,0.05);
  // periodic glitch slices
  glitchSlices(t, p>0.5?0.5:0.2);

  // ---- DOM: terminal + cve cards + banner ----
  clearDom();
  dom.appendChild(hudFrame('#39ff8b','LIVE INTRUSION // Z3RO','ROOT@SL7'));

  // left terminal
  const term=el('div','terminal');
  const log=[
    '$ ./ghostshell --target sublevel7 --quiet',
    '[*] fingerprinting aether-core v1.945 ...',
    '[+] stack canary: ABSENT',
    '[+] ASLR: DISABLED  (it is 1945, lol)',
    '[*] mapping trust boundaries ...........',
    '[!] teleporter array speaks cleartext',
    '[+] forging operator token ... done',
    '[*] pivot -> WND-77 (weapon core)',
    '[!] firmware signature check: /dev/null',
    '[+] uploading payload 0x5EC0.bin .......',
    '[+] 6/6 subsystems answering to me',
    '[#] root@sublevel7:~# whoami',
    '[#] >>> EVERYONE.',
  ];
  const shown=Math.floor(win(t,a+0.1,a+3.6)*log.length);
  let lh='';
  for(let i=0;i<Math.min(shown,log.length);i++){
    let cls=''; const L=log[i];
    if(L.startsWith('[!]'))cls='warn'; else if(L.startsWith('[+]'))cls='ok';
    else if(L.startsWith('[#]'))cls='root';
    if(i===shown-1 && shown<=log.length){ const lp=(win(t,a+0.1,a+3.6)*log.length)%1;
      lh+=`<div class="${cls}">${L.slice(0,Math.floor(lp*L.length))}<span class="cur">▋</span></div>`;
    } else lh+=`<div class="${cls}">${L}</div>`;
  }
  term.innerHTML=lh;
  dom.appendChild(term);

  // right CVE stack
  const stack=el('div','cvestack');
  NODES.forEach((nd,i)=>{
    const sp=win(t,a+0.4+i*0.28, a+0.7+i*0.28);
    if(sp<=0)return;
    const owned = p > (0.2 + i*0.1);
    const card=el('div','cve '+(owned?'owned':''));
    card.style.opacity=sp; card.style.transform=`translateX(${(1-outExpo(sp))*120}px)`;
    card.innerHTML=`
      <div class="cve-top"><span class="sev ${nd.sev.toLowerCase()}">${nd.sev}</span>
        <span class="cid">${nd.cve}</span></div>
      <div class="cve-name">${nd.n}</div>
      <div class="cve-id">${nd.id}  ·  <span class="st">${owned?'OWNED':'PROBING…'}</span></div>
      <div class="cve-bar"><span style="width:${owned?100:Math.round(clamp((p-0.1-i*0.08)/0.2)*100)}%"></span></div>`;
    stack.appendChild(card);
  });
  dom.appendChild(stack);

  // escalating banner
  if(p>0.62){
    const vb=el('div','vulnbanner');
    vb.innerHTML=`ENTIRE FACILITY COMPROMISED`;
    const bp=win(t,a+3.4,a+3.9);
    vb.style.transform=`translate(-50%,-50%) scale(${lerp(1.3,1,outExpo(bp))})`;
    vb.style.opacity=clamp(bp*2)*(Math.sin(t*10)>-.3?1:0.4);
    dom.appendChild(vb);
  }
  if(p>0.9) flash((p-0.9)/0.1);
}

/* ----- SCENE 3 : CHAOS (split screen) ----- */
function sceneChaos(t){
  const [a,b]=S.chaos; const p=win(t,a,b);
  bx.fillStyle='#000'; bx.fillRect(0,0,W,H);

  // LEFT: the others fight (abstract red warzone)
  bx.save(); bx.beginPath(); bx.rect(0,0,W*0.62,H); bx.clip();
  const rg=bx.createRadialGradient(W*0.3,H*0.6,40,W*0.3,H*0.6,900);
  rg.addColorStop(0,'#3a0a04'); rg.addColorStop(1,'#0a0200'); bx.fillStyle=rg; bx.fillRect(0,0,W,H);
  // muzzle flashes / sparks
  for(let i=0;i<9;i++){
    const ft=(t*3+i*0.9); const on=noise(ft)>0.55;
    if(!on)continue;
    const x=W*0.1+hash(i)*W*0.45, y=H*0.3+hash(i*3)*H*0.5;
    const r=20+hash(i*7)*80;
    const fg=bx.createRadialGradient(x,y,0,x,y,r);
    fg.addColorStop(0,'rgba(255,220,150,0.9)'); fg.addColorStop(0.4,'rgba(255,90,20,0.5)'); fg.addColorStop(1,'rgba(255,40,0,0)');
    bx.fillStyle=fg; bx.beginPath(); bx.arc(x,y,r,0,7); bx.fill();
  }
  // fighting silhouettes (abstract slashes + figures)
  bx.globalAlpha=0.9; bx.fillStyle='#120302';
  for(let i=0;i<5;i++){ const x=W*0.08+i*W*0.11+Math.sin(t*4+i)*8; const h=180+hash(i)*80;
    bx.fillRect(x, H-120-h, 40, h); bx.beginPath(); bx.arc(x+20,H-120-h,26,0,7); bx.fill(); }
  // sword arc for the warrior
  const sa=(t*5)%2; bx.strokeStyle='rgba(255,70,90,0.8)'; bx.lineWidth=6;
  bx.beginPath(); bx.arc(W*0.4,H*0.55, 120, -2+sa, -2+sa+1.2); bx.stroke();
  bx.restore();

  // RIGHT: the hacker, calm green
  bx.save(); bx.beginPath(); bx.rect(W*0.62,0,W*0.38,H); bx.clip();
  bx.fillStyle='#02160c'; bx.fillRect(W*0.62,0,W*0.38,H);
  grid(bx,t,'#0f6b38',0.18);
  bx.font="26px JBMono"; bx.fillStyle='rgba(57,255,139,0.8)';
  const code=['while(chaos){','  for(sys of facility){','    sys.owner = "Z3RO";','  }','  sleep(0);','}'];
  code.forEach((l,i)=>bx.fillText(l, W*0.64, 300+i*44));
  bx.restore();

  // diagonal divider with energy
  bx.save(); bx.strokeStyle='#39ff8b'; bx.lineWidth=5; bx.shadowColor='#39ff8b'; bx.shadowBlur=30;
  bx.beginPath(); bx.moveTo(W*0.62+80,0); bx.lineTo(W*0.62-80,H); bx.stroke(); bx.restore();

  drawVignette(bx,0.9); scanlines(bx,t,0.14); grain(bx,t,0.06); glitchSlices(t,0.6);

  clearDom();
  const l=el('div','chaosL'); l.innerHTML=`<span>THEY FIGHT</span><small>the horror comes through the gate</small>`;
  const r=el('div','chaosR'); r.innerHTML=`<span>HE HACKS</span><small>access · everything · granted</small>`;
  l.style.opacity=clamp(win(t,a+0.1,a+0.5)); r.style.opacity=clamp(win(t,a+0.3,a+0.7));
  dom.appendChild(l); dom.appendChild(r);

  // ACCESS GRANTED slam
  if(p>0.55){ const ag=win(t,a+1.45,a+1.8);
    const s=el('div','granted'); s.textContent='ACCESS GRANTED';
    s.style.transform=`translate(-50%,-50%) scale(${lerp(2.2,1,outExpo(ag))})`;
    s.style.opacity=clamp(ag*3)*(Math.sin(t*20)>-.5?1:0.5);
    dom.appendChild(s);
  }
  if(p>0.88) flash((p-0.88)/0.12);
}

/* ----- SCENE 4 : TITLE ----- */
function sceneTitle(t){
  const [a,b]=S.title; const p=win(t,a,b);
  bx.fillStyle='#000'; bx.fillRect(0,0,W,H);
  // slow push gradient
  const g=bx.createRadialGradient(W/2,H*0.5,50,W/2,H*0.5,W*0.75);
  g.addColorStop(0,'#0b0b0b'); g.addColorStop(1,'#000'); bx.fillStyle=g; bx.fillRect(0,0,W,H);
  grid(bx,t,'#222',0.1*clamp(win(t,a,a+1)));

  // ember particles rising
  for(let i=0;i<70;i++){ const life=(t*0.3+hash(i))%1; const x=W*hash(i*3)+Math.sin(t+i)*20;
    const y=H-life*H*1.1; bx.globalAlpha=0.5*(1-life); bx.fillStyle=i%7?'#ff7a1a':'#39ff8b';
    bx.fillRect(x,y,2.4,2.4); }
  bx.globalAlpha=1;
  drawVignette(bx,0.96); scanlines(bx,t,0.1); grain(bx,t,0.05);

  clearDom();
  const wrap=el('div','titlewrap');
  const cod=win(t,a+0.15,a+0.7), sec=win(t,a+0.55,a+1.15);
  const codScale=lerp(1.25,1,outExpo(cod));
  wrap.innerHTML=`
    <div class="t-cod" style="opacity:${clamp(cod*1.5)};transform:scale(${codScale});letter-spacing:${lerp(40,12,outExpo(cod))}px">CALL <span class="ampx">OF</span> DUTY</div>
    <div class="t-rule" style="transform:scaleX(${outExpo(clamp((p-0.2)/0.3))})"></div>
    <div class="t-sec" style="opacity:${clamp(sec*1.5)};transform:translateY(${(1-outExpo(sec))*40}px)">SEC OPS</div>
    <div class="t-sub" style="opacity:${clamp(win(t,a+1.3,a+1.8))}">CLASSIFIED // SUBLEVEL 7 — THE MACHINE ANSWERS TO HIM NOW</div>
    <div class="t-press" style="opacity:${0.4+0.6*Math.abs(Math.sin(t*3))}">▸ PRESS ANY KEY TO BREACH</div>`;
  // glitch the SEC OPS occasionally
  dom.appendChild(wrap);
  if(win(t,a+1.1,a+1.2)>0 && win(t,a+1.1,a+1.2)<1) flash(0.6*(1-win(t,a+1.1,a+1.2)));
  // entrance flash
  if(p<0.06) flash(1-p/0.06);
  // studio tag
  const tag=el('div','studio');
  tag.innerHTML=`A <b>RICHDALE</b> FAN FILM · NON-COMMERCIAL · MOTION GRAPHICS`;
  tag.style.opacity=clamp(win(t,a+1.6,a+2.1));
  dom.appendChild(tag);
}

/* ---------- global glitch slice overlay on fx canvas ---------- */
function glitchSlices(t, intensity){
  const trig = noise(t*6);
  if(trig < 1-0.12*intensity) return;
  const n=3+Math.floor(hash(Math.floor(t*30))*5);
  for(let i=0;i<n;i++){
    const y=hash(i+Math.floor(t*30)*3)*H; const h=6+hash(i*7)*50;
    const dx=(hash(i*3+Math.floor(t*30))-0.5)*80;
    fxx.drawImage(bg, 0,y,W,h, dx,y,W,h);
    fxx.save(); fxx.globalCompositeOperation='screen';
    fxx.fillStyle=i%2?'rgba(255,0,60,0.25)':'rgba(0,255,180,0.2)';
    fxx.fillRect(dx,y,W,h); fxx.restore();
  }
}

/* ---------- full-frame white/colour flash on fx ---------- */
let _flash=0;
function flash(v){ _flash=Math.max(_flash,clamp(v)); }

/* chromatic aberration + flash composited on fx each frame */
function postFx(t){
  fxx.clearRect(0,0,W,H);
  // subtle chromatic shift by copying bg channels — cheap: draw tinted offsets
  // (kept light for perf; glitchSlices already added punch)
  if(_flash>0.001){
    fxx.save(); fxx.globalAlpha=_flash; fxx.fillStyle='#fff'; fxx.fillRect(0,0,W,H); fxx.restore();
  }
}

/* =====================================================================
   MASTER SEEK
   ===================================================================== */
function seek(t){
  t=clamp(t,0,DUR);
  _flash = 0;
  // decay-ish flash handled per-scene via flash()
  bx.clearRect(0,0,W,H);
  fxx.clearRect(0,0,W,H);

  if(t<S.coldOpen[1]) sceneColdOpen(t);
  else if(t<S.cGerman[1]) characterCard(t, win(t,...S.cGerman), CHARS.german);
  else if(t<S.cRussian[1]) characterCard(t, win(t,...S.cRussian), CHARS.russian);
  else if(t<S.cAmerican[1]) characterCard(t, win(t,...S.cAmerican), CHARS.american);
  else if(t<S.cJapanese[1]) characterCard(t, win(t,...S.cJapanese), CHARS.japanese);
  else if(t<S.cHacker[1]) characterCard(t, win(t,...S.cHacker), CHARS.hacker);
  else if(t<S.hack[1]) sceneHack(t);
  else if(t<S.chaos[1]) sceneChaos(t);
  else sceneTitle(t);

  // glitch overlay reads bg -> fx
  glitchSlices(t, t<S.coldOpen[1]?0.25:0.4);
  postFx(t);
}

/* =====================================================================
   PLAYBACK  +  RENDER HOOK
   ===================================================================== */
let playing=false, startWall=0, pausedAt=0;
function loop(now){
  if(!playing)return;
  let t=(now-startWall)/1000;
  if(t>=DUR){ t=DUR; seek(t); playing=false; return; }
  seek(t); requestAnimationFrame(loop);
}
window.__seek=seek; window.__DUR=DUR; window.__FPS=FPS; window.__W=W; window.__H=H;
window.__play=()=>{ playing=true; startWall=performance.now()-pausedAt*1000; requestAnimationFrame(loop); };

// autoplay for live viewing
window.addEventListener('load',()=>{ document.fonts.ready.then(()=>{ seek(0);
  if(!window.__RENDER){ setTimeout(()=>window.__play(),250); } }); });
// click to replay
stage.addEventListener('click',()=>{ pausedAt=0; window.__play(); });
