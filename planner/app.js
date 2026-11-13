'use strict';
const CATS={spot:{n:'景點',c:'#F6D27A'},food:{n:'餐飲',c:'#F2A497'},stay:{n:'住宿',c:'#A8D3E6'},transport:{n:'交通／航班',c:'#B9DAA5'}};
const MODES={walk:{n:'步行',c:'#84909E',i:'🚶'},taxi:{n:'Grab／計程車',c:'#D77968',i:'🚕'},ferry:{n:'渡輪',c:'#3F8FB5',i:'⛴️'},car:{n:'用車（姐夫安排）',c:'#3A9B80',i:'🚗'},bus:{n:'公車',c:'#D8902C',i:'🚌'},subway:{n:'地鐵',c:'#9266C2',i:'🚇'}};
const PCOL={'證件與金錢':'#F6D27A','衣物':'#A8D3E6','盥洗與藥品':'#F2A497','電子用品':'#B9DAA5','孩童用品':'#DED2ED','其他':'#F4C7AA'};
const LS='tp-draft-v1',HH=56,WD=['日','一','二','三','四','五','六'];
const $=(s,e=document)=>e.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
let T,ui={page:'plan',mode:'week',date:null,prev:0,showCost:false,changed:false},undo=[],map=null,mapEl=null,mapLayer=null,tiles=null;
let nowTimer=null;

/* ---------- helpers ---------- */
const toMin=t=>{const[h,m]=t.split(':').map(Number);return h*60+m};
const fmt=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const fmtDur=m=>m<60?`${m}分鐘`:(m%60?`${Math.floor(m/60)}小時${m%60}分`:`${m/60}小時`);
const isoAdd=(iso,n)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
function days(){const out=[];for(let d=T.start;d<=T.end&&out.length<60;d=isoAdd(d,1))out.push(d);return out}
const wdOf=iso=>WD[new Date(iso+'T00:00:00Z').getUTCDay()];
const dlabel=iso=>`${+iso.slice(5,7)}/${+iso.slice(8)}（週${wdOf(iso)}）`;
const itemsOf=d=>T.items.filter(i=>i.date===d).sort((a,b)=>toMin(a.start)-toMin(b.start));
const pax=()=>T.travelers.adults+T.travelers.children.length;
const money=(n,c)=>({TWD:'NT$',SGD:'S$',MYR:'RM',IDR:'Rp'}[c]||c+' ')+Math.round(n).toLocaleString('en-US');
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),4000)}
function hav(a,b){const R=6371,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dg=r(b.lng-a.lng);const h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function nowLocal(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:T.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());return +p.find(x=>x.type==='hour').value*60+ +p.find(x=>x.type==='minute').value}

/* ---------- persistence ---------- */
function save(){try{localStorage.setItem(LS,JSON.stringify(T))}catch(e){}}
function commit(msg){/* call BEFORE mutation via snap() */save();render();if(msg)toast(msg)}
function snap(){undo.push(JSON.stringify(T));if(undo.length>60)undo.shift()}
function doUndo(){if(!undo.length)return;T=JSON.parse(undo.pop());save();render();toast('已復原')}
async function load(){
  const file=await (await fetch('data/trip.json',{cache:'no-store'})).json();
  let d=null;try{d=JSON.parse(localStorage.getItem(LS))}catch(e){}
  const seen=localStorage.getItem(LS+'-filerev');
  const fresh=String(file.rev??'')!==seen;/* trip.json 的 rev 變了（例如請 AI 改行程）→ 以檔案為準 */
  if(!d||fresh){d=file;localStorage.setItem(LS+'-filerev',String(file.rev??''));try{localStorage.setItem(LS,JSON.stringify(d))}catch(e){}
    if(seen!==null&&fresh)setTimeout(()=>toast('trip.json 有更新，已載入最新版（舊草稿請先匯出）'),300)}
  T=d;T.routes=T.routes||{};T.packing=T.packing||[];ui.date=days()[0];
}

/* ---------- routes / costs ---------- */
function routesOf(date){
  const it=itemsOf(date).filter(i=>i.lat!=null),out=[];
  for(let k=0;k<it.length-1;k++){
    const a=it[k],b=it[k+1],key=a.id+'>'+b.id,ov=T.routes[key];
    if(ov&&ov.hide)continue;
    const km=hav(a,b)*1.3;let r;
    if(km<0.3&&a.lat===b.lat&&a.lng===b.lng)r={mode:'walk',min:0,cost:0,est:true,same:true};
    else if(km<1)r={mode:'walk',min:Math.max(1,Math.ceil(km/0.075)),cost:0,est:true};
    else r={mode:'taxi',min:Math.ceil(km/0.6)+5,cost:0,est:true};/* 只估時間，不估費用 */
    if(ov)r={...r,...ov,est:!!ov.est&&ov.est};
    if(a.cat==='transport')r={...r,cost:0};/* 交通項目本身已含費用，避免重複計算 */
    const gap=toMin(b.start)-(toMin(a.start)+a.dur);
    let warn='';if(gap<0)warn='行程重疊';else if(gap<r.min)warn='可能遲到（空檔'+gap+'分，需約'+r.min+'分）';
    out.push({a,b,key,...r,warn,overridden:!!ov});
  }
  return out;
}
function costLines(){
  const L=[];
  T.items.forEach(i=>{if(!i.cost)return;const tot=i.cost.basis==='person'?i.cost.amount*pax():i.cost.amount;L.push({label:i.name,cat:i.cat,cur:i.cost.cur,total:tot,est:!!i.cost.est,basis:i.cost.basis,date:i.date})});
  days().forEach(d=>routesOf(d).forEach(r=>{if(r.cost>0)L.push({label:`${r.a.name}→${r.b.name}（${MODES[r.mode].n}）`,cat:'transport',cur:T.localCurrency,total:r.cost*pax(),est:r.est,basis:'person',date:d})}));
  return L;
}
const conv=(n,cur)=>n*(cur===T.settleCurrency?1:(T.rates[cur]??0));
function totals(){
  const L=costLines(),byCur={},byCat={};let est=0;
  L.forEach(l=>{byCur[l.cur]=(byCur[l.cur]||0)+l.total;byCat[l.cat]=(byCat[l.cat]||0)+conv(l.total,l.cur);if(l.est)est++});
  const sum=Math.round(Object.values(byCat).reduce((a,b)=>a+b,0));
  return {L,byCur,byCat,sum,est,missing:T.items.filter(i=>!i.cost).length};
}

/* ---------- render ---------- */
function render(){
  const keep={cal:$('.calendar')?.scrollTop||0};
  if(mapEl&&mapEl.parentNode)mapEl.parentNode.removeChild(mapEl);
  const tt=totals(),ds=days(),placeCount=T.items.length;
  $('#app').innerHTML=`
  <header class="hdr"><div class="brand">${BRAND}</div>
   <div class="hdr-main"><h1>${esc(T.name)}${T._sample?'<span class="sample-badge">範例資料</span>':''}</h1><p class="dest">${esc(T.destination)}</p>
    <div class="stats"><span class="stat">${ds.length} 天</span><span class="stat">${placeCount} 個地點</span>
    <span class="stat" id="costStat">${ui.showCost?'總花費 '+money(tt.sum,T.settleCurrency):'總花費 ＊＊＊＊'}</span>
    <button class="eye" id="eye" aria-pressed="${ui.showCost}" aria-label="顯示或隱藏總花費">${ui.showCost?'🙈 隱藏':'👁 顯示'}</button></div></div></header>
  <nav class="nav">${[['plan','行程規劃'],['expense','費用總覽'],['packing','攜帶用品']].map(([k,n])=>`<button data-page="${k}" class="${ui.page===k?'on':''}">${n}</button>`).join('')}</nav>
  <main>${ui.page==='plan'?planHTML():ui.page==='expense'?expenseHTML(tt):packingHTML()}</main>`;
  if(ui.page==='plan'){mountMap();postPlan(keep)}
  $('#fabmenu button[data-act=undo]')&&($('#fabmenu button[data-act=undo]').disabled=!undo.length);
}
function dateStrip(){
  const ds=days(),idx=Math.max(0,ds.indexOf(ui.date));
  const btns=ds.map(d=>`<button class="daybtn ${d===ui.date?'on'+(ui.changed?' pop':''):''}" data-date="${d}" aria-pressed="${d===ui.date}"><span class="dn">${+d.slice(8)}</span><span class="wd">${+d.slice(5,7)}月 週${wdOf(d)}</span></button>`).join('');
  return `<div class="timeline-dates">${btns}<div class="day-illus ${ui.changed?'hop':''}" style="left:${(ui.prev+.5)/ds.length*100}%" data-to="${(idx+.5)/ds.length*100}">${dayIllus(itemsOf(ui.date))}</div></div>`;
}
function planHTML(){
  const ds=days(),its=itemsOf(ui.date),rs=routesOf(ui.date);
  const ym=T.start.slice(0,4)+'年'+(+T.start.slice(5,7))+'月';
  const start=its.length?fmt(toMin(its[0].start)):'--',end=its.length?fmt(Math.max(...its.map(i=>toMin(i.start)+i.dur))):'--';
  return `<div class="workspace ${ui.mode==='day'?'timelinepreview':''}">
  <section><div class="mappanel" id="mappanel"><div class="mapheading"><h2>地圖</h2><button id="previewroute" class="previewroute">路徑預覽</button><button id="fit" class="fit on">整天概覽</button></div><div id="mapslot"></div></div>
   <details class="routepanel" open><summary>交通明細（${rs.length} 段）</summary>${rs.length?rs.map(r=>`<div class="rt"><span class="m" style="background:${MODES[r.mode].c}"></span>${MODES[r.mode].i} <span>${esc(r.a.name)} → ${esc(r.b.name)}</span><span>${r.min?r.min+' 分':'同地點'}${r.cost?' · '+money(r.cost,T.localCurrency):''}${r.est?' <span class="est">（估算）</span>':''}</span>${r.warn?`<span class="warn">⚠ ${r.warn}</span>`:''}<button data-edit-route="${r.key}">編輯</button></div>`).join(''):'<div class="rt">這天沒有可計算的路段</div>'}</details></section>
  <section class="calendarpanel"><div class="paneltoolbar"><h2>行事曆</h2><span class="ym">${ym}</span>
    <div class="calendar-viewtoggle" role="group"><button data-mode="week" class="${ui.mode==='week'?'on':''}">週</button><button data-mode="day" class="${ui.mode==='day'?'on':''}">單日</button></div>
    <div class="toolbarbuttons"><button id="undo" ${undo.length?'':'disabled'} aria-label="復原">↶ 復原</button><button id="addbtn" aria-label="新增行程">＋ 新增</button></div></div>
   ${dateStrip()}
   ${dayBanner(ui.date)}
   <div class="timeline-intro"><b>${dlabel(ui.date)}</b><span>${its.length} 個行程</span><span>${start}–${end}</span><span class="est">時區 ${esc(T.tz)}</span></div>
   ${ui.mode==='week'?weekHTML(ds):dayHTML(its,rs)}
  </section></div>`;
}
function dayBanner(d){
  const m=(T.days||{})[d];if(!m)return '';
  return `<div class="daybanner">${m.img?`<figure><img src="${esc(m.img)}" alt="${esc(m.alt||'')}" loading="lazy"><figcaption>${esc(m.alt||'')}　${esc(m.credit||'')}</figcaption></figure>`:''}<div class="dbtxt"><b>${esc(m.title)}</b><span>${esc(m.who||'')}</span>${(m.tips||[]).length?`<details><summary>💡 小提醒（${m.tips.length}）</summary><ul>${m.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`:''}</div></div>`;
}
function lanes(evs){
  const s=[...evs].sort((a,b)=>toMin(a.start)-toMin(b.start)||b.dur-a.dur),res=[];let grp=[],end=0;
  const flush=()=>{const L=[];grp.forEach(e=>{let k=0;while(L[k]&&L[k]>toMin(e.start))k++;L[k]=toMin(e.start)+e.dur;e._l=k});const n=L.length;grp.forEach(e=>{e._n=n;res.push(e)});grp=[];};
  s.forEach(e=>{if(grp.length&&toMin(e.start)>=end)flush();grp.push(e);end=Math.max(end,toMin(e.start)+e.dur)});flush();return res;
}
function weekRange(){const a=T.items;if(!a.length)return[7,22];return[Math.max(0,Math.min(7,Math.floor(Math.min(...a.map(i=>toMin(i.start)))/60))),Math.min(24,Math.max(22,Math.ceil(Math.max(...a.map(i=>toMin(i.start)+i.dur))/60)))]}
function weekHTML(ds){
  const[h0,h1]=weekRange(),H=(h1-h0)*HH;
  let h='<div class="calendar" id="calendar"><div class="wk" style="--n:'+ds.length+';--hh:'+HH+'px"><div class="hd"></div>';
  ds.forEach(d=>h+=`<div class="hd ${d===ui.date?'sel':''}" data-date="${d}">${dlabel(d)}</div>`);
  h+=`<div class="tcol" style="height:${H}px">${Array.from({length:h1-h0},(_,k)=>`<span style="top:${k*HH}px">${fmt((h0+k)*60)}</span>`).join('')}</div>`;
  ds.forEach(d=>{h+=`<div class="col" data-col="${d}" style="height:${H}px">`+lanes(itemsOf(d)).map(e=>{
    const top=(toMin(e.start)-h0*60)/60*HH,ht=Math.max(24,e.dur/60*HH-2);
    return `<div class="evt ${e.locked?'lock':''}" data-id="${e.id}" tabindex="0" style="top:${top}px;height:${ht}px;left:calc(${e._l/e._n*100}% + 1px);width:calc(${100/e._n}% - 3px);border-left-color:${CATS[e.cat].c};background:linear-gradient(90deg,${CATS[e.cat].c}33,#fff 40%)" title="${esc(e.name)}"><b>${fmt(toMin(e.start))} ${esc(e.name)}</b><span>${fmtDur(e.dur)}</span><i class="rz" data-rz="${e.id}"></i></div>`}).join('')+'</div>'});
  return h+'</div></div>';
}
function dayHTML(its,rs){
  if(!its.length)return '<div class="timeline-list"><p style="padding:16px">這天還沒有行程，按「＋ 新增」開始。</p></div>';
  let s0=Math.floor(Math.min(...its.map(i=>toMin(i.start)))/60)*60,s1=Math.ceil(Math.max(...its.map(i=>toMin(i.start)+i.dur))/60)*60;if(s1<=s0)s1=s0+60;
  const pct=m=>((m-s0)/(s1-s0)*100)+'%';
  let ticks='';for(let m=s0;m<=s1;m+=60)ticks+=`<span class="tk" style="top:${pct(m)}">${fmt(m)}</span>`;
  const bars=its.map(i=>`<i class="bar" style="top:${pct(toMin(i.start))};height:${(i.dur/(s1-s0)*100)}%;background:${CATS[i.cat].c}"></i>`).join('');
  let rows='';
  its.forEach((i,k)=>{
    const c=i.cost?(i.cost.basis==='person'?money(i.cost.amount,i.cost.cur)+'/人':money(i.cost.amount,i.cost.cur)+(i.cost.basis==='car'?'/車':'/團'))+(i.cost.est?' <span class="est">（估）</span>':''):'<span class="est">金額未填</span>';
    rows+=`<div class="timeline-time-row" data-id="${i.id}" data-s="${toMin(i.start)}" data-e="${toMin(i.start)+i.dur}"><div class="timeline-card" tabindex="0" style="border-left-color:${CATS[i.cat].c}"><div class="row-actions"><button data-edit="${i.id}">編輯</button></div>
     <div class="meta"><span class="tag" style="background:${CATS[i.cat].c}">${CATS[i.cat].n}</span>${fmt(toMin(i.start))}–${fmt(toMin(i.start)+i.dur)} · ${fmtDur(i.dur)}${i.locked?' · 🔒已鎖定':''}</div>
     <h3>${esc(i.name)}</h3><div class="meta">${esc(i.addr||'')} ${i.addr?'· ':''}${c}</div>${i.note?`<div class="meta">${/待確認|待查/.test(i.note)?'<span class="tbd">待確認</span> ':''}${esc(i.note)}</div>`:''}</div></div>`;
    const r=rs.find(x=>x.a.id===i.id);
    if(r&&!r.same)rows+=`<div class="timeline-time-row" data-route="1" data-s="${toMin(i.start)+i.dur}"><div class="timeline-card route ${r.mode==='walk'?'walk':''}" style="border-left-color:${MODES[r.mode].c}" data-edit-route="${r.key}" tabindex="0">${MODES[r.mode].i} ${MODES[r.mode].n} 約 ${r.min<60?r.min+'分鐘':fmtDur(r.min)}${r.cost?' · '+money(r.cost,T.localCurrency):''}${r.est?' <span class="est">（估）</span>':''}<div class="meta">${esc(r.a.name)} → ${esc(r.b.name)}</div>${r.warn?`<div class="warn">⚠ ${r.warn}</div>`:''}</div></div>`;
  });
  return `<div class="timeline-list" id="tl" data-s0="${s0}" data-s1="${s1}"><div class="day-time-scale"><div class="ln"></div>${bars}${ticks}<div class="dot"></div><div class="now" hidden><i></i></div></div><div class="timeline-cards">${rows}</div></div>`;
}
function expenseHTML(t){
  const cur=Object.entries(t.byCur),rate=c=>c===T.settleCurrency?'':`（匯率 ${T.rates[c]??'未設定'}）`;
  const cats=Object.keys(CATS),sum=Object.values(t.byCat).reduce((a,b)=>a+b,0)||1;
  let off=0;const arcs=cats.filter(k=>t.byCat[k]>0).map(k=>{const p=t.byCat[k]/sum*100,s=`<circle r="15.9155" cx="21" cy="21" fill="none" stroke="${CATS[k].c}" stroke-width="9" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${-off}" transform="rotate(-90 21 21)"/>`;off+=p;return s}).join('');
  const over=T.budget&&t.sum>T.budget;
  return `<div class="expensespage"><div class="card"><h2>費用合計</h2>
   ${cur.map(([c,v])=>`<div>${c} 合計：<b>${money(v,c)}</b> <span class="est">${rate(c)}</span></div>`).join('')||'<div>尚無費用</div>'}
   <hr><div>換算總額（${T.settleCurrency}）</div><div class="big">${money(t.sum,T.settleCurrency)}</div>
   ${t.est?`<div class="est">其中 ${t.est} 筆為估算（標「估」）</div>`:''}${t.missing?`<div class="est">${t.missing} 個行程金額未填，未計入</div>`:''}
   ${T.budget?`<div class="${over?'alert':'est'}">預算 ${money(T.budget,T.settleCurrency)}：${over?'已超出 '+money(t.sum-T.budget,T.settleCurrency):'尚餘 '+money(T.budget-t.sum,T.settleCurrency)}</div>`:''}
   <div class="est" style="margin-top:6px">費用皆為整團總價（每人金額先不顯示）；兒童票價請另行確認。</div>${T.rateNote?`<div class="est" style="margin-top:6px">${esc(T.rateNote)}</div>`:''}
   <table class="tbl"><tr><th>項目</th><th class="n">金額</th><th class="n">${T.settleCurrency}</th></tr>${t.L.map(l=>`<tr class="c-${l.cat}"><td>${esc(l.label)}${l.est?' <span class="est">估</span>':''}</td><td class="n">${money(l.total,l.cur)}</td><td class="n">${money(conv(l.total,l.cur),T.settleCurrency)}</td></tr>`).join('')}</table></div>
   <div class="card"><h2>支出組成</h2><svg class="pie" viewBox="0 0 42 42" role="img" aria-label="支出圓餅圖"><circle r="15.9155" cx="21" cy="21" fill="none" stroke="#eee" stroke-width="9"/>${arcs}</svg>
   <ul class="legend">${cats.map(k=>`<li><i style="background:${CATS[k].c}"></i>${CATS[k].n}　${money(t.byCat[k]||0,T.settleCurrency)}（${Math.round((t.byCat[k]||0)/sum*100)}%）</li>`).join('')}</ul></div></div>`;
}
let pk={q:'',only:'all'};
function packingHTML(){
  const P=T.packing,done=P.filter(p=>p.done).length,pct=P.length?Math.round(done/P.length*100):0;
  const match=p=>(!pk.q||(p.name+p.note).includes(pk.q))&&(pk.only==='all'||(pk.only==='done')===p.done);
  return `<div class="packingpage">${(T.general||[]).length?`<details class="card gen" open><summary><b>💡 出發前提醒（全程）</b></summary><ul>${T.general.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></details>`:''}<div class="tools"><input type="search" id="pq" placeholder="搜尋用品" value="${esc(pk.q)}"><select id="pf"><option value="all">全部</option><option value="todo" ${pk.only==='todo'?'selected':''}>未完成</option><option value="done" ${pk.only==='done'?'selected':''}>已完成</option></select><div class="progress"><i style="width:${pct}%"></i></div><b>${done}/${P.length}</b></div>
  <div class="pgrid">${Object.keys(PCOL).map(c=>`<section class="pcat"><h3 style="background:${PCOL[c]}">${c}</h3>${P.filter(p=>p.cat===c&&match(p)).map(p=>`<div class="pit ${p.done?'done':''}"><input type="checkbox" data-pk="${p.id}" ${p.done?'checked':''} aria-label="${esc(p.name)}"><span class="nm">${esc(p.name)} ${p.note?`<small>${esc(p.note)}</small>`:''}</span><span>×${p.qty}</span><button data-pdel="${p.id}" aria-label="刪除">✕</button></div>`).join('')}<form class="addp" data-padd="${c}"><input placeholder="新增項目" aria-label="新增${c}項目"><button>＋</button></form></section>`).join('')}</div></div>`;
}

/* ---------- map ---------- */
function mountMap(){
  const slot=$('#mapslot');
  if(!mapEl){mapEl=document.createElement('div');mapEl.id='mapbox';if(window.L){try{map=L.map(mapEl,{zoomControl:true});mapLayer=L.layerGroup().addTo(map)}catch(e){map=null}}}
  slot.appendChild(mapEl);
  if(map){map.invalidateSize();drawMap()}else drawFallback();
}
function drawMap(fitOnly){
  mapLayer.clearLayers();const its=itemsOf(ui.date).filter(i=>i.lat!=null),pts=[];
  its.forEach((i,k)=>{const ll=[i.lat,i.lng];pts.push(ll);L.marker(ll,{icon:L.divIcon({className:'',html:`<div class="mk" style="background:${CATS[i.cat].c}">${k+1}</div>`,iconSize:[26,26],iconAnchor:[13,13]}),title:i.name}).addTo(mapLayer).bindPopup(esc(i.name))});
  routesOf(ui.date).forEach(r=>{if(!r.same)L.polyline([[r.a.lat,r.a.lng],[r.b.lat,r.b.lng]],{color:MODES[r.mode].c,weight:5,opacity:.85,dashArray:r.mode==='walk'?'2 8':null}).addTo(mapLayer)});
  if(pts.length)map.fitBounds(pts,{padding:[30,30],maxZoom:15,animate:false});
  else if(!tiles)map.setView([1.35,103.85],9,{animate:false});
  if(!tiles)tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
}
function drawFallback(){
  const its=itemsOf(ui.date).filter(i=>i.lat!=null);if(!its.length){mapEl.innerHTML='<div class="map-fallback">這天沒有地點座標</div>';return}
  const lat=its.map(i=>i.lat),lng=its.map(i=>i.lng),pad=.02,bb=[Math.min(...lng)-pad,Math.min(...lat)-pad,Math.max(...lng)+pad,Math.max(...lat)+pad].join('%2C');
  const url=`https://www.google.com/maps/dir/${its.map(i=>i.lat+','+i.lng).join('/')}`;
  mapEl.innerHTML=`<div class="map-fallback"><iframe title="嵌入地圖" src="https://www.openstreetmap.org/export/embed.html?bbox=${bb}&layer=mapnik"></iframe><p><a href="${url}" target="_blank" rel="noopener">在 Google 地圖開啟整天路線</a></p></div>`;
}
function previewRoute(){
  if(!map)return toast('地圖不可用，請用外部連結');
  const rs=routesOf(ui.date).filter(r=>!r.same);if(!rs.length)return toast('這天沒有路段');
  let k=0;const tick=()=>{if(k>=rs.length){drawMap();return}const r=rs[k++];map.fitBounds([[r.a.lat,r.a.lng],[r.b.lat,r.b.lng]],{padding:[50,50],animate:!reduce});L.polyline([[r.a.lat,r.a.lng],[r.b.lat,r.b.lng]],{color:MODES[r.mode].c,weight:8}).addTo(mapLayer);setTimeout(tick,reduce?300:900)};tick();
}

/* ---------- post-render ---------- */
function postPlan(keep){
  const il=$('.day-illus');
  if(il){const to=il.dataset.to;if(reduce||!ui.changed)il.style.left=to+'%';else requestAnimationFrame(()=>requestAnimationFrame(()=>il.style.left=to+'%'))}
  ui.prev=Math.max(0,days().indexOf(ui.date));ui.changed=false;
  if(ui.mode==='week'){const c=$('.calendar');if(c)c.scrollTop=keep.cal}
  else setupTimeline();
}
function setupTimeline(){
  const sc=$('.timeline-cards');if(!sc)return;
  sc.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();const d=e.deltaMode===1?e.deltaY*16:e.deltaY;sc.scrollTop+=Math.max(-32,Math.min(32,d))},{passive:false});
  sc.addEventListener('scroll',focusUpdate,{passive:true});
  sc.scrollTop=0;focusUpdate();updateNow();
}
function focusUpdate(){
  const sc=$('.timeline-cards'),tl=$('#tl');if(!sc||!tl)return;
  const rows=[...sc.querySelectorAll('.timeline-time-row')],r0=sc.getBoundingClientRect(),cy=r0.top+r0.height/2,vh=r0.height*.55;
  const items=rows.filter(r=>!r.dataset.route);let cur=null,best=1e9;
  const atTop=sc.scrollTop<=1,atBot=sc.scrollTop+sc.clientHeight>=sc.scrollHeight-1;
  rows.forEach(r=>{const b=r.getBoundingClientRect(),c=b.top+b.height/2,d=Math.min(1,Math.abs(c-cy)/vh);r.style.setProperty('--d',d.toFixed(3));r.classList.toggle('below',c>cy);if(!r.dataset.route&&Math.abs(c-cy)<best){best=Math.abs(c-cy);cur=r}});
  if(atTop)cur=items[0];else if(atBot)cur=items[items.length-1];
  rows.forEach(r=>r.classList.toggle('timeline-current',r===cur));
  if(cur){rows.forEach(r=>{if(r===cur)r.style.setProperty('--d',0)});const s0=+tl.dataset.s0,s1=+tl.dataset.s1,mid=(+cur.dataset.s+ +cur.dataset.e)/2;
    const sc2=$('.day-time-scale');let m=atTop?+items[0].dataset.s:atBot?+items[items.length-1].dataset.e:mid;
    sc2.querySelector('.dot').style.top=((m-s0)/(s1-s0)*100)+'%'}
}
function updateNow(){
  const tl=$('#tl');if(!tl)return;const now=$('.now',tl);if(!now)return;
  const m=nowLocal(),s0=+tl.dataset.s0,s1=+tl.dataset.s1;
  if(m<s0||m>s1){now.hidden=true;return}now.hidden=false;now.style.top=((m-s0)/(s1-s0)*100)+'%';$('i',now).textContent=fmt(m);
}
setInterval(()=>{updateNow()},15000);

/* ---------- edit dialog ---------- */
function openEdit(id,presetDate){
  const it=id?T.items.find(i=>i.id===id):null,date=presetDate||ui.date;
  const last=itemsOf(date).slice(-1)[0],def=it||{id:'i'+Date.now().toString(36),date,start:last?fmt(Math.min(1380,toMin(last.start)+last.dur)):'09:00',dur:60,cat:'spot',name:'',addr:'',lat:null,lng:null,cost:null,note:'',locked:false};
  const c=def.cost||{},d=$('#dlg');
  d.innerHTML=`<form method="dialog" id="eform"><h2>${it?'編輯行程':'新增行程'}</h2><div class="fg">
   <label class="full">名稱<input name="name" required value="${esc(def.name)}"></label>
   <label>日期<input type="date" name="date" required min="${T.start}" max="${T.end}" value="${def.date}"></label>
   <label>類別<select name="cat">${Object.entries(CATS).map(([k,v])=>`<option value="${k}" ${def.cat===k?'selected':''}>${v.n}</option>`).join('')}</select></label>
   <label>開始時間<input type="time" name="start" required value="${def.start}"></label>
   <label>時長（分鐘）<input type="number" name="dur" min="5" step="5" required value="${def.dur}"></label>
   <label class="full">地址<input name="addr" value="${esc(def.addr)}"></label>
   <label>緯度<input name="lat" type="number" step="any" value="${def.lat??''}"></label><label>經度<input name="lng" type="number" step="any" value="${def.lng??''}"></label>
   <label>費用（留空＝未填）<input name="amount" type="number" min="0" step="any" value="${c.amount??''}"></label>
   <label>幣別<select name="cur">${[...new Set([T.localCurrency,T.settleCurrency,...Object.keys(T.rates)])].map(x=>`<option ${((c.cur||T.localCurrency)===x)?'selected':''}>${x}</option>`).join('')}</select></label>
   <label>計價方式<select name="basis"><option value="group" ${c.basis!=='person'&&c.basis!=='car'?'selected':''}>全團</option><option value="person" ${c.basis==='person'?'selected':''}>每人</option><option value="car" ${c.basis==='car'?'selected':''}>每車</option></select></label>
   <label><span>&nbsp;</span><span><input type="checkbox" name="est" ${c.est?'checked':''} style="width:auto"> 估算／待確認</span></label>
   <label class="full">備註<textarea name="note" rows="2">${esc(def.note)}</textarea></label>
   <label class="full"><span><input type="checkbox" name="locked" ${def.locked?'checked':''} style="width:auto"> 鎖定（已預約，不可拖移）</span></label></div>
   <div class="dacts">${it?'<button type="button" class="btn danger l" id="del">刪除</button>':''}<button type="button" class="btn ghost" id="cancel">取消</button><button class="btn" value="ok">儲存</button></div></form>`;
  d.showModal();
  $('#cancel').onclick=()=>d.close();
  if(it)$('#del').onclick=()=>{snap();T.items=T.items.filter(i=>i.id!==id);d.close();commit('已刪除（可復原）')};
  $('#eform').onsubmit=e=>{
    const f=new FormData(e.target),v=n=>f.get(n);
    if(!v('name').trim())return;
    const o={...def,name:v('name').trim(),date:v('date'),cat:v('cat'),start:v('start'),dur:Math.max(5,+v('dur')),addr:v('addr'),lat:v('lat')===''?null:+v('lat'),lng:v('lng')===''?null:+v('lng'),note:v('note'),locked:!!f.get('locked'),
      cost:v('amount')===''?null:{amount:+v('amount'),cur:v('cur'),basis:v('basis'),est:!!f.get('est')}};
    snap();if(it)Object.assign(it,o);else T.items.push(o);ui.date=o.date;d.close();commit(it?'已更新':'已新增');
  };
}
function openRoute(key){
  const rs=days().flatMap(routesOf),r=rs.find(x=>x.key===key);if(!r)return;const d=$('#dlg');
  d.innerHTML=`<form method="dialog" id="rform"><h2>編輯交通</h2><p>${esc(r.a.name)} → ${esc(r.b.name)}</p><div class="fg">
  <label>交通方式<select name="mode">${Object.entries(MODES).map(([k,v])=>`<option value="${k}" ${r.mode===k?'selected':''}>${v.n}</option>`).join('')}</select></label>
  <label>時長（分鐘）<input name="min" type="number" min="0" value="${r.min}"></label>
  <label>費用（整團，${T.localCurrency}）<input name="cost" type="number" min="0" value="${r.cost}"></label>
  <label><span>&nbsp;</span><span><input type="checkbox" name="est" ${r.est?'checked':''} style="width:auto"> 估算</span></label></div>
  <div class="dacts">${r.overridden?'<button type="button" class="btn danger l" id="auto">回復自動估算</button>':''}<button type="button" class="btn ghost" id="cancel">取消</button><button class="btn">儲存</button></div></form>`;
  d.showModal();$('#cancel').onclick=()=>d.close();
  if(r.overridden)$('#auto').onclick=()=>{snap();delete T.routes[key];d.close();commit('已回復自動估算')};
  $('#rform').onsubmit=e=>{const f=new FormData(e.target);snap();T.routes[key]={mode:f.get('mode'),min:+f.get('min'),cost:+f.get('cost'),est:!!f.get('est')};d.close();commit('交通已更新')};
}
function showPreview(id){
  const i=T.items.find(x=>x.id===id);if(!i)return;const p=$('#preview');
  p.hidden=false;p.innerHTML=`<h3>${esc(i.name)}</h3><div>${dlabel(i.date)} ${fmt(toMin(i.start))}–${fmt(toMin(i.start)+i.dur)}（${fmtDur(i.dur)}）${i.locked?'🔒':''}</div><div class="est">${esc(i.addr||'')} ${esc(i.note||'')}</div><div class="acts"><button class="btn" data-pedit="${id}">編輯</button><button class="btn ghost" data-pclose>關閉</button></div>`;
}

/* ---------- export / import ---------- */
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function offsetMin(tz,y,mo,d,h,mi){const t=Date.UTC(y,mo-1,d,h,mi);const p=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}).formatToParts(new Date(t));const g=k=>+p.find(x=>x.type===k).value;return (Date.UTC(g('year'),g('month')-1,g('day'),g('hour'),g('minute'))-t)/60000}
function toUTC(date,min){const[y,mo,d]=date.split('-').map(Number),h=Math.floor(min/60),mi=min%60;const off=offsetMin(T.tz,y,mo,d,h,mi);const t=new Date(Date.UTC(y,mo-1,d,h,mi)-off*60000);return t.toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'')}
function ics(){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//travel-planner//ZH//','CALSCALE:GREGORIAN','X-WR-CALNAME:'+T.name,'X-WR-TIMEZONE:'+T.tz];
  const e=s=>String(s||'').replace(/[\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n');
  T.items.forEach(i=>{const s=toMin(i.start);L.push('BEGIN:VEVENT','UID:'+i.id+'@travel-planner','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,''),'DTSTART:'+toUTC(i.date,s),'DTEND:'+toUTC(i.date,s+i.dur),'SUMMARY:'+e(i.name),'LOCATION:'+e(i.addr),'DESCRIPTION:'+e((CATS[i.cat].n)+(i.note?'｜'+i.note:'')),'END:VEVENT')});
  L.push('END:VCALENDAR');return L.join('\r\n');
}

/* ---------- events ---------- */
function setDate(d){if(d===ui.date)return;ui.prev=Math.max(0,days().indexOf(ui.date));ui.date=d;ui.changed=true;render()}
document.addEventListener('click',e=>{
  const t=e.target;if(drag.suppress){drag.suppress=false;return}
  let x;
  if(x=t.closest('[data-page]')){ui.page=x.dataset.page;render();return}
  if(t.closest('#eye')){ui.showCost=!ui.showCost;render();return}
  if(x=t.closest('[data-date]')){setDate(x.dataset.date);return}
  if(x=t.closest('[data-mode]')){ui.mode=x.dataset.mode;render();return}
  if(t.closest('#undo')){doUndo();return}
  if(t.closest('#addbtn')){openEdit();return}
  if(t.closest('#fit')){if(map)drawMap();return}
  if(t.closest('#previewroute')){previewRoute();return}
  if(x=t.closest('[data-edit]')){openEdit(x.dataset.edit);return}
  if(x=t.closest('[data-edit-route]')){openRoute(x.dataset.editRoute);return}
  if(x=t.closest('[data-pedit]')){$('#preview').hidden=true;openEdit(x.dataset.pedit);return}
  if(t.closest('[data-pclose]')){$('#preview').hidden=true;return}
  if(x=t.closest('.evt')){showPreview(x.dataset.id);return}
  if(x=t.closest('[data-pdel]')){snap();T.packing=T.packing.filter(p=>p.id!==x.dataset.pdel);save();render();return}
  if(t.closest('#fabbtn')){toggleFab();return}
  if(x=t.closest('#fabmenu button')){toggleFab(false);fabAct(x.dataset.act);return}
  if(!t.closest('#fab'))toggleFab(false);
});
document.addEventListener('dblclick',e=>{const x=e.target.closest('.evt');if(x)openEdit(x.dataset.id)});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset.pk){snap();T.packing.find(p=>p.id===t.dataset.pk).done=t.checked;save();render();return}
  if(t.id==='pf'){pk.only=t.value;render();return}
  if(t.id==='importfile'&&t.files[0]){t.files[0].text().then(txt=>{try{const d=JSON.parse(txt);if(!d.items||!d.start||!d.end)throw 0;snap();T=d;T.routes=T.routes||{};T.packing=T.packing||[];ui.date=days()[0];ui.prev=0;save();render();toast('已匯入')}catch(err){toast('匯入失敗：不是有效的旅程 JSON')}t.value=''})}
});
document.addEventListener('input',e=>{if(e.target.id==='pq'){pk.q=e.target.value;const pos=e.target.selectionStart;render();const q=$('#pq');q.focus();q.setSelectionRange(pos,pos)}});
document.addEventListener('submit',e=>{const f=e.target.closest('[data-padd]');if(!f)return;e.preventDefault();const v=f.querySelector('input').value.trim();if(!v)return;snap();T.packing.push({id:'p'+Date.now().toString(36),cat:f.dataset.padd,name:v,qty:1,note:'',done:false});save();render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleFab(false);$('#preview').hidden=true}if(e.key==='Enter'&&e.target.classList.contains('evt'))showPreview(e.target.dataset.id)});
function toggleFab(on){$('#preview').hidden=true;const b=$('#fabbtn'),m=$('#fabmenu');const open=on===undefined?m.hidden:on;m.hidden=!open;b.setAttribute('aria-expanded',open);if(open)buildFab()}
function buildFab(){$('#fabmenu').innerHTML=[['add','＋ 新增行程'],['undo','↶ 復原'],['json','⬇ 匯出 JSON'],['import','⬆ 匯入 JSON'],['ics','📅 匯出 ICS'],['reset','↺ 從 trip.json 重新載入']].map(([a,n])=>`<button data-act="${a}" ${a==='undo'&&!undo.length?'disabled':''}>${n}</button>`).join('')}
async function fabAct(a){
  if(a==='add')openEdit();else if(a==='undo')doUndo();
  else if(a==='json')download('trip.json',JSON.stringify(T,null,2),'application/json');
  else if(a==='import')$('#importfile').click();
  else if(a==='ics'){download('trip.ics',ics(),'text/calendar');toast('已匯出 ICS（時間已依 '+T.tz+' 換算）')}
  else if(a==='reset'){if(!confirm('丟棄本機草稿並重新載入 trip.json？'))return;localStorage.removeItem(LS);localStorage.removeItem(LS+'-filerev');undo=[];await load();render();toast('已重設')}
}

/* ---------- week drag / resize ---------- */
const drag={st:null,suppress:false};
const snapQ=m=>Math.round(m/15)*15;
document.addEventListener('pointerdown',e=>{
  const ev=e.target.closest('.evt');if(!ev||e.button>0)return;
  const it=T.items.find(i=>i.id===ev.dataset.id);if(!it)return;
  if(it.locked){ev.classList.remove('deny');void ev.offsetWidth;ev.classList.add('deny');return}
  const rz=e.target.closest('.rz');
  const st={it,ev,x:e.clientX,y:e.clientY,rz:!!rz,armed:false,cancel:false,id:e.pointerId,dur0:it.dur,start0:toMin(it.start),h0:ev.offsetHeight};
  drag.st=st;
  if(rz){st.armed=true;ev.setPointerCapture(e.pointerId)}
  else st.timer=setTimeout(()=>{if(st.cancel)return;st.armed=true;ev.classList.add('armed');try{ev.setPointerCapture(st.id)}catch(_){}toast('可以拖移了')},3000);
});
document.addEventListener('pointermove',e=>{
  const st=drag.st;if(!st)return;const dx=e.clientX-st.x,dy=e.clientY-st.y;
  if(!st.armed){if(Math.hypot(dx,dy)>8){st.cancel=true;clearTimeout(st.timer);drag.st=null}return}
  if(st.rz){st.ev.style.height=Math.max(24,st.h0+dy)+'px';st.moved=true}
  else{st.ev.style.transform=`translate(${dx}px,${dy}px)`;st.moved=true}
});
document.addEventListener('touchmove',e=>{if(drag.st&&drag.st.armed)e.preventDefault()},{passive:false});
document.addEventListener('pointerup',e=>{
  const st=drag.st;if(!st)return;clearTimeout(st.timer);drag.st=null;
  if(!st.armed){return}
  drag.suppress=true;setTimeout(()=>drag.suppress=false,0);
  st.ev.classList.remove('armed');st.ev.style.transform='';
  if(!st.moved)return;
  const dy=e.clientY-st.y;
  if(st.rz){snap();st.it.dur=Math.max(15,snapQ(st.dur0+dy/HH*60));commit('時長已調整為 '+fmtDur(st.it.dur));return}
  let date=st.it.date;
  for(const c of document.querySelectorAll('.col')){const r=c.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<r.right){date=c.dataset.col;break}}
  const ns=Math.max(0,Math.min(1440-st.it.dur,snapQ(st.start0+dy/HH*60)));
  snap();st.it.date=date;st.it.start=fmt(ns);commit('已移到 '+dlabel(date)+' '+fmt(ns));
});
document.addEventListener('pointercancel',()=>{if(drag.st){clearTimeout(drag.st.timer);drag.st.ev.classList.remove('armed');drag.st.ev.style.transform='';drag.st=null}});

load().then(()=>{render();window.__app={get T(){return T},ui,render}}).catch(e=>{document.body.textContent='載入失敗：'+e.message});
