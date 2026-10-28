(() => {
'use strict';
const D=window.ATLAS_DATA, G=window.ATLAS_GEO;
const cats=['民间文学','传统音乐','传统舞蹈','传统戏剧','曲艺','传统体育、游艺与杂技','传统美术','传统技艺','传统医药','民俗'];
const years=[2006,2008,2011,2014,2021], $=id=>document.getElementById(id), fmt=n=>Number(n).toLocaleString('zh-CN');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=s=>s.replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g,'');
const state={mode:'count',category:'all',type:'all',batch:'all',cumulative:true,province:'浙江省',unknown:false,page:0,search:''};
let current, timer=null;
const originalCoverage=new Set(D.records.filter(r=>r.province).map(r=>r.province));
function entropy(counts){const n=counts.reduce((a,b)=>a+b,0);return n?Math.max(0,-counts.reduce((s,c)=>c?s+(c/n)*Math.log(c/n):s,0)/Math.log(10)):null;}
function compute(s){
 const base=D.records.filter(r=>(s.type==='all'||r.type===s.type)&&(s.batch==='all'||(s.cumulative?r.year<=+s.batch:r.year===+s.batch)));
 const located=base.filter(r=>r.province), totals=Object.fromEntries(cats.map(c=>[c,0]));
 const stats=Object.fromEntries(D.provinces.map(p=>[p,{name:p,n:0,counts:Object.fromEntries(cats.map(c=>[c,0]))}]));
 for(const r of located){stats[r.province].n++;stats[r.province].counts[r.cat]++;totals[r.cat]++;}
 for(const p of Object.values(stats)){
  p.h=entropy(cats.map(c=>p.counts[c]));p.lqs={};
  for(const c of cats)p.lqs[c]=p.n&&totals[c]?(p.counts[c]/p.n)/(totals[c]/located.length):null;
  p.count=s.category==='all'?p.n:p.counts[s.category];
  p.metric=s.mode==='count'?p.count:p.n<20?null:s.mode==='entropy'?p.h:p.lqs[s.category];
 }
 const filtered=base.filter(r=>s.category==='all'||r.cat===s.category), mapped=filtered.filter(r=>r.province);
 return {base,located,totals,stats,filtered,mapped};
}
$('category').innerHTML='<option value="all">全部十类</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join('');
$('province').innerHTML=D.provinces.map(p=>`<option>${esc(p)}</option>`).join('');
echarts.registerMap('heritageChina',G);
const map=echarts.init($('map')), scatter=echarts.init($('scatter'));
const animation=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function metricText(p){return p.metric===null?'—':state.mode==='count'?fmt(p.metric):p.metric.toFixed(state.mode==='lq'?2:3);}
function context(){return `${state.batch==='all'?'全部五批':(state.cumulative?'累计至':'仅')+state.batch+'年'} · ${state.type==='all'?'新增与扩展':state.type}`;}
function renderMap(){
 const rows=Object.values(current.stats),valid=rows.filter(p=>p.metric!==null),max=Math.max(1,...valid.map(p=>p.metric));
 const title=state.mode==='count'?'各地收录数量':state.mode==='lq'?`${state.category}的相对集中度`:'十类记录的分布均衡程度';
 $('mapTitle').textContent=title;
 $('mapSubtitle').textContent=context()+' · '+(state.mode==='entropy'?'全部十类':state.category==='all'?'全部十类':state.category);
 $('mapNote').textContent=state.mode==='count'?'按申报文字归省，不使用县级中心点堆叠；色阶随筛选调整。浅灰：原表未收录。':'灰色：原表未收录、没有符合条件的记录，或地区总记录少于20条；本规则不代表显著性检验。';
 const maxScale=state.mode==='entropy'?1:state.mode==='lq'?Math.ceil(max*2)/2:Math.ceil(max/10)*10;
 const data=rows.map(p=>({name:p.name,value:originalCoverage.has(p.name)&&p.metric!==null?p.metric:'-',selected:p.name===state.province,itemStyle:p.metric===null||!originalCoverage.has(p.name)?{areaColor:'#e1e2db'}:{}}));
 map.setOption({animation,animationDurationUpdate:500,tooltip:{trigger:'item',confine:true,backgroundColor:'#fffef9',borderColor:'#d5dbcd',textStyle:{color:'#29493b',fontSize:12},formatter:params=>{
  const p=current.stats[params.name];if(!p)return '';
  if(!originalCoverage.has(p.name))return `<b>${esc(p.name)}</b><br>原表未收录，不表示没有非遗`;
  let text=`<b>${esc(p.name)}</b><br>当前全部类别：${p.n} 条<br>当前所选类别：${p.count} 条`;
  if(state.mode==='lq')text+=`<br>区位商：${p.n>=20&&p.lqs[state.category]!==null?p.lqs[state.category].toFixed(2):'小样本或空分母，暂不比较'}`;
  if(state.mode==='entropy')text+=`<br>标准化信息熵：${p.n>=20?p.h.toFixed(3):'少于20条，暂不比较'}`;
  return text+'<br><span style="color:#82917e">点击查看地方类别结构</span>';
 }},visualMap:{type:'continuous',min:0,max:maxScale,left:8,bottom:8,itemWidth:9,itemHeight:100,text:[state.mode==='count'?fmt(maxScale)+'条':String(maxScale),'0'],textStyle:{fontSize:10,color:'#6b7a69'},calculable:false,inRange:{color:state.mode==='lq'?['#eee9da','#cfb280','#a66643','#713e2d']:['#e4edda','#9eb59a','#4e7e62','#1f4b3b']},outOfRange:{color:'#e1e2db'}},series:[{type:'map',map:'heritageChina',roam:true,scaleLimit:{min:1,max:6},selectedMode:'single',layoutCenter:['53%','47%'],layoutSize:'94%',label:{show:false},itemStyle:{borderColor:'#fbfcf7',borderWidth:.7,areaColor:'#e1e2db'},emphasis:{label:{show:true,color:'#203e31',fontSize:12},itemStyle:{areaColor:'#d2ac7a',borderColor:'#a15d3b',borderWidth:1.5}},select:{label:{show:true,color:'#203e31',fontSize:11},itemStyle:{areaColor:'#d8ae77',borderColor:'#ab613c',borderWidth:1.4}},data,regions:[{name:'',itemStyle:{areaColor:'transparent',borderColor:'#788c7c'},label:{show:false},emphasis:{disabled:true}}]}]},true);
}
function renderProfile(){
 const p=current.stats[state.province];$('province').value=p.name;
 const share=current.located.length?p.n/current.located.length*100:0;
 $('provinceSummary').textContent=originalCoverage.has(p.name)?`${context()}：${p.n}条，约占可归属记录的${share.toFixed(1)}%。`:'本地原表未收录该地区记录，不能据此判断现实中的非遗情况。';
 $('provinceCount').textContent=fmt(p.count);$('provinceCountLabel').textContent=state.category==='all'?'当前记录数':'所选类别记录数';
 const metric=state.mode==='lq'?p.lqs[state.category]:p.h;
 $('provinceMetric').textContent=p.n>=20&&metric!==null?metric.toFixed(state.mode==='lq'?2:3):'—';
 $('provinceMetricLabel').textContent=state.mode==='lq'?'所选类别区位商':'十类标准化信息熵';
 const max=Math.max(1,...Object.values(p.counts));
 $('structure').innerHTML=cats.map(c=>`<div class="catrow ${c===state.category?'on':''}"><label>${esc(c)}</label><div class="bartrack"><i style="width:${100*p.counts[c]/max}%"></i></div><span>${p.counts[c]}</span></div>`).join('');
 $('provinceCaution').textContent=p.n<20?'当前总记录少于20条，类别占比容易受个别记录影响，暂不展示比较指标。':'结构条形图始终显示当前批次与类型下的全部10类；不随单一类别过滤。';
}
function renderRanks(){
 const rows=Object.values(current.stats).filter(p=>originalCoverage.has(p.name)&&p.metric!==null&&(state.mode==='count'?p.metric>0:p.n>=20)).sort((a,b)=>b.metric-a.metric||b.n-a.n).slice(0,10);
 $('rankTitle').textContent=(state.mode==='count'?'收录数量':state.mode==='lq'?'相对特色 · LQ':'类别均衡 · H′')+' · 前十地区';
 $('rankHint').textContent=state.mode==='count'?'可点击查看地方切片':'仅比较地区总记录≥20条';
 const max=rows[0]?.metric||1;
 $('rankList').innerHTML=rows.length?rows.map((p,i)=>`<button class="rankrow ${p.name===state.province?'selected':''}" data-province="${esc(p.name)}" aria-label="查看${esc(p.name)}"><em>${String(i+1).padStart(2,'0')}</em><span>${esc(short(p.name))}</span><span class="bartrack"><i style="width:${Math.max(0,p.metric/max*100)}%"></i></span><strong>${metricText(p)}</strong></button>`).join(''):'<p class="empty">当前条件下暂无可比较记录。</p>';
}
function renderScatter(){
 const pts=Object.values(current.stats).filter(p=>p.n>0);
 scatter.setOption({animation,grid:{left:48,right:25,top:25,bottom:42},tooltip:{trigger:'item',confine:true,formatter:p=>`${esc(p.data.name)}<br>全部类别：${p.data.value[0]}条<br>H′ = ${p.data.value[1].toFixed(3)}${p.data.value[0]<20?'<br>小样本，谨慎比较':''}`},xAxis:{type:'value',name:'收录记录数',nameLocation:'middle',nameGap:26,axisLabel:{fontSize:10,color:'#72816d'},nameTextStyle:{fontSize:10,color:'#72816d'},splitLine:{lineStyle:{color:'#e4e8de'}}},yAxis:{type:'value',min:0,max:1,name:'H′',nameTextStyle:{fontSize:11,color:'#72816d'},axisLabel:{fontSize:10,color:'#72816d'},splitLine:{lineStyle:{color:'#e4e8de'}}},series:[{type:'scatter',data:pts.map(p=>({name:p.name,value:[p.n,p.h],itemStyle:{color:p.name===state.province?'#b96840':p.n<20?'#bfc3b8':'#517d65',opacity:.85},label:{show:p.name===state.province,formatter:short(p.name),position:'top',fontSize:10,color:'#b96840'}})),symbolSize:12,emphasis:{label:{show:true,formatter:p=>short(p.name),fontSize:11,position:'top'}}}]},true);
}
function renderInsights(){
 const eligible=Object.values(current.stats).filter(p=>p.n>=20),countLeader=[...eligible].sort((a,b)=>b.n-a.n)[0],hLeader=[...eligible].sort((a,b)=>b.h-a.h)[0];
 const combos=eligible.flatMap(p=>cats.filter(c=>p.counts[c]>=5&&p.lqs[c]!==null).map(c=>({p,c,lq:p.lqs[c]}))).sort((a,b)=>b.lq-a.lq);
 const example=state.mode==='lq'?combos.find(x=>x.c===state.category):combos.find(x=>x.p.name==='河北省'&&x.c==='传统体育、游艺与杂技')||combos[0];
 let one=countLeader?`${short(countLeader.name)}收录${countLeader.n}条，数量居首；${short(hLeader.name)}的H′为${hLeader.h.toFixed(3)}，类别结构最均衡。${countLeader.name===hLeader.name?'本次筛选中两者恰好重合，但含义不同。':'规模与均衡呈现出不同的地域格局。'}`:'当前筛选下没有总记录达到20条的地区，暂不比较类别结构。';
 let two=example?`${short(example.p.name)}的“${example.c}”有${example.p.counts[example.c]}条，占当地${(example.p.counts[example.c]/example.p.n*100).toFixed(1)}%；LQ为${example.lq.toFixed(2)}，即该类别在当地的占比约为总体的${example.lq.toFixed(1)}倍。`:'当前条件下没有满足地区总记录≥20、该类别≥5的例子。';
 const unknown=current.base.length-current.located.length;
 $('insights').innerHTML=`<article class="insight"><span class="num">01 / 规模与结构</span><h3>收录得多，未必更均衡</h3><p>${one}</p><p class="hint">这不是文化价值的高低：某些地方的名录可能更集中于特定实践传统。</p></article><article class="insight"><span class="num">02 / 地方的相对特色</span><h3>比较占比，才能看见侧重</h3><p>${two}</p><p class="hint">可追问地方文化实践和申报方式如何塑造这一结构；仅凭LQ不能判断其原因。</p></article><article class="insight"><span class="num">03 / 记录的边界</span><h3>名录也是一种选择</h3><p>当前批次与类型下，${current.base.length}条记录中有${unknown}条未归入省份。网页不把这些机构或兵团记录强行定位，也不把缺失当成文化空白。</p><p class="hint">应该讨论的是“这份名录如何呈现文化”，而不是“哪里更有文化”。</p></article>`;
}
function renderRecords(){
 let rs=current.filtered.filter(r=>state.unknown?!r.province:r.province===state.province);
 const q=state.search.trim().toLowerCase();if(q)rs=rs.filter(r=>(r.name+' '+r.place+' '+r.keeper).toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(rs.length/8));state.page=Math.min(state.page,pages-1);
 $('recordsTitle').textContent=state.unknown?'未归省记录 · 保留机构与兵团口径':`${state.province} · 从地图回到项目`;
 $('unknown').textContent=state.unknown?'返回所选地区':'查看未归省记录';
 $('recordsCount').textContent=`${rs.length}条符合当前筛选`;
 $('recordRows').innerHTML=rs.slice(state.page*8,state.page*8+8).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.cat)}</td><td>${r.year} · ${esc(r.batch)}</td><td>${esc(r.place)}</td><td>${esc(r.type)}</td><td><a href="${esc(r.url)}" target="_blank" rel="noopener">原始资料 ↗</a></td></tr>`).join('')||'<tr><td colspan="6" class="empty">没有符合当前条件的记录，请调整筛选或搜索词。</td></tr>';
 $('pageInfo').textContent=`${state.page+1} / ${pages}`;$('prev').disabled=state.page===0;$('next').disabled=state.page>=pages-1;
}
function render(){
 current=compute(state);$('category').value=state.category;$('category').disabled=state.mode==='entropy';$('type').value=state.type;$('batch').value=state.batch;$('cumulative').checked=state.cumulative;
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));});
 const nums=Object.values(current.stats).map(p=>p.count).sort((a,b)=>b-a);
 $('statTotal').textContent=fmt(current.filtered.length);$('statLocated').textContent=fmt(current.mapped.length);$('statUnknown').textContent=`另有${current.filtered.length-current.mapped.length}条未归省`;$('statProv').textContent=nums.filter(x=>x>0).length;
 $('statTop').textContent=current.mapped.length?(nums.slice(0,5).reduce((a,b)=>a+b,0)/current.mapped.length*100).toFixed(1)+'%':'—';
 renderMap();renderProfile();renderRanks();renderScatter();renderInsights();renderRecords();
}
function selectProvince(name){if(!current.stats[name])return;state.province=name;state.page=0;state.unknown=false;state.search='';$('search').value='';render();}
map.on('click',p=>selectProvince(p.name));scatter.on('click',p=>selectProvince(p.name));
$('rankList').addEventListener('click',e=>{const b=e.target.closest('[data-province]');if(b)selectProvince(b.dataset.province);});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;if(state.mode==='entropy')state.category='all';if(state.mode==='lq'&&state.category==='all')state.category='传统舞蹈';state.page=0;render();}));
for(const key of ['category','type','batch'])$(key).addEventListener('change',e=>{if(key==='batch')stopPlay();state[key]=e.target.value;if(state.mode==='lq'&&state.category==='all')state.mode='count';state.page=0;render();});
$('cumulative').addEventListener('change',e=>{state.cumulative=e.target.checked;state.page=0;render();});
$('province').addEventListener('change',e=>selectProvince(e.target.value));
$('reset').addEventListener('click',()=>{stopPlay();Object.assign(state,{mode:'count',category:'all',type:'all',batch:'all',cumulative:true,province:'浙江省',unknown:false,page:0,search:''});$('search').value='';render();});
$('mapReset').addEventListener('click',renderMap);
function stopPlay(){if(timer)clearInterval(timer);timer=null;$('play').textContent='▶ 播放批次';}
$('play').addEventListener('click',()=>{if(timer){stopPlay();return;}let i=0;state.cumulative=true;state.batch=String(years[0]);state.page=0;render();$('play').textContent='Ⅱ 暂停播放';timer=setInterval(()=>{i++;if(i>=years.length){stopPlay();return;}state.batch=String(years[i]);state.page=0;render();},1900);});
$('unknown').addEventListener('click',()=>{state.unknown=!state.unknown;state.page=0;state.search='';$('search').value='';renderRecords();});
$('search').addEventListener('input',e=>{state.search=e.target.value;state.page=0;renderRecords();});
$('prev').addEventListener('click',()=>{state.page--;renderRecords();});$('next').addEventListener('click',()=>{state.page++;renderRecords();});
$('csv').addEventListener('click',()=>{
 const headers=['省级地区','批次口径','项目类型','所选类别','全部类别记录数','所选类别记录数','标准化信息熵','所选类别区位商','总记录是否达到20条','原表是否收录',...cats];
 const rows=Object.values(current.stats).map(p=>[p.name,state.batch==='all'?'全部五批':(state.cumulative?'累计至':'仅')+state.batch,state.type,state.category,p.n,p.count,p.h??'',state.category==='all'?'':p.lqs[state.category]??'',p.n>=20?'是':'否',originalCoverage.has(p.name)?'是':'否',...cats.map(c=>p.counts[c])]);
 const csv='\ufeff'+[headers,...rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=`非遗分省统计_${state.mode}_${state.batch}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
new ResizeObserver(()=>{map.resize();scatter.resize();}).observe(document.querySelector('.map-layout'));window.addEventListener('resize',()=>{map.resize();scatter.resize();});
window.AtlasMath={compute,entropy,categories:cats};
render();
})();
