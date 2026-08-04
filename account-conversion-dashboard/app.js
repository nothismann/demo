const fmt=new Intl.NumberFormat('zh-TW');
const n=v=>fmt.format(Math.round(v));
const pc=v=>`${(v*100).toFixed(1)}%`;
const pp=v=>`${v>=0?'+':''}${(v*100).toFixed(1)} pp`;
const pct=v=>`${v>=0?'+':''}${(v*100).toFixed(1)}%`;
const colors={navy:'#183b5b',blue:'#3978a8',teal:'#2c8c85',gold:'#d49632',red:'#bd5b59',green:'#24846f',grid:'#e4e8ee',text:'#69758a'};
const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs={},text='')=>{const x=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));if(text)x.textContent=text;return x};
const svgTitle=(node,text)=>node.appendChild(el('title',{},text));
let sortKey='period',sortAsc=true;

const rows=DATA.official.map((r,i)=>{
  const prev=DATA.official[i-1];
  return {...r,index:i,A_delta:prev?r.A/prev.A-1:null,B_delta:prev?r.B_rate-prev.B_rate:null,D_delta:prev?r.D_rate_C-prev.D_rate_C:null,E_delta:prev?r.E_rate_C-prev.E_rate_C:null};
});
const maxBy=k=>rows.reduce((a,b)=>b[k]>a[k]?b:a);
const minBy=k=>rows.reduce((a,b)=>b[k]<a[k]?b:a);

function deltaBadge(value,type='pp'){
  if(value===null||Number.isNaN(value))return '<span class="delta flat">起始期</span>';
  const cls=value>.00001?'up':value<-.00001?'down':'flat';
  const arrow=value>.00001?'↑':value<-.00001?'↓':'→';
  return `<span class="delta ${cls}">${arrow} ${type==='pct'?pct(value):pp(value)}</span>`;
}
function populateSelector(){
  const s=document.getElementById('periodSelect');
  s.innerHTML='<option value="all">整體累計</option>'+rows.map((r,i)=>`<option value="${i}">${r.period}</option>`).join('');
  s.value=String(rows.length-1);
  s.addEventListener('change',()=>{updateKpis();buildPrimaryCharts();});
}
function selected(){
  const v=periodSelect.value;
  if(v==='all'){
    const t=DATA.officialTotals;
    return {all:true,period:'整體累計',A:t.A,B_rate:t.B/t.A,D_rate_C:t.D/t.C,E_rate_C:t.E/t.C,A_delta:null,B_delta:null,D_delta:null,E_delta:null,index:null};
  }
  return {...rows[Number(v)],all:false};
}
function updateKpis(){
  const r=selected();
  kpiA.textContent=n(r.A);kpiBRate.textContent=pc(r.B_rate);kpiDRate.textContent=pc(r.D_rate_C);kpiERate.textContent=pc(r.E_rate_C);
  if(r.all){
    kpiANote.innerHTML='分析期間累計完成核印';kpiBNote.innerHTML='整體加權登入率';kpiDNote.innerHTML='整體加權兩月下單率';kpiENote.innerHTML='整體加權累計下單率';
  }else{
    kpiANote.innerHTML=`${deltaBadge(r.A_delta,'pct')}較前一期`;
    kpiBNote.innerHTML=`${deltaBadge(r.B_delta)}較前一期`;
    kpiDNote.innerHTML=`${deltaBadge(r.D_delta)}較前一期`;
    kpiENote.innerHTML=`${deltaBadge(r.E_delta)}較前一期${r.index===rows.length-1?'；觀察期較短':''}`;
  }
}
function lineChart(containerId,labels,series,opt={}){
  const box=document.getElementById(containerId);box.innerHTML='';
  const W=860,H=340,m={l:52,r:20,t:42,b:64},iw=W-m.l-m.r,ih=H-m.t-m.b,yMin=opt.yMin??0,yMax=opt.yMax??100;
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':opt.aria||'趨勢圖'});
  for(let i=0;i<=4;i++){
    const val=yMin+(yMax-yMin)*i/4,y=m.t+ih-((val-yMin)/(yMax-yMin))*ih;
    svg.appendChild(el('line',{x1:m.l,y1:y,x2:W-m.r,y2:y,stroke:colors.grid,'stroke-width':1}));
    svg.appendChild(el('text',{x:m.l-9,y:y+4,'text-anchor':'end','font-size':11,fill:colors.text},`${Math.round(val)}%`));
  }
  labels.forEach((lab,i)=>{const x=m.l+(labels.length===1?iw/2:i*iw/(labels.length-1));svg.appendChild(el('text',{x,y:H-22,'text-anchor':'middle','font-size':11,fill:colors.text},lab));});
  series.forEach((ser,si)=>{
    const pts=ser.data.map((v,i)=>[m.l+(labels.length===1?iw/2:i*iw/(labels.length-1)),m.t+ih-((v-yMin)/(yMax-yMin))*ih]);
    svg.appendChild(el('polyline',{points:pts.map(p=>p.join(',')).join(' '),fill:'none',stroke:ser.color,'stroke-width':3.2,'stroke-linejoin':'round','stroke-linecap':'round'}));
    pts.forEach((p,i)=>{
      const hi=opt.highlightIndex===i;
      const c=el('circle',{cx:p[0],cy:p[1],r:hi?7:5,fill:hi?ser.color:'#fff',stroke:ser.color,'stroke-width':3});svgTitle(c,`${labels[i]}｜${ser.label}：${ser.data[i].toFixed(1)}%`);svg.appendChild(c);
      if(opt.showValues||hi)svg.appendChild(el('text',{x:p[0],y:p[1]-11,'text-anchor':'middle','font-size':hi?12:10,'font-weight':hi?800:600,fill:ser.color},`${ser.data[i].toFixed(1)}%`));
    });
    const lx=m.l+si*210;svg.appendChild(el('line',{x1:lx,y1:17,x2:lx+24,y2:17,stroke:ser.color,'stroke-width':4,'stroke-linecap':'round'}));svg.appendChild(el('text',{x:lx+31,y:21,'font-size':12,fill:colors.text},ser.label));
  });
  box.appendChild(svg);
}
function accountBarChart(highlightIndex){
  const box=accountChart;box.innerHTML='';const labels=rows.map(r=>r.period),values=rows.map(r=>r.A);
  const W=760,H=355,m={l:50,r:16,t:42,b:66},iw=W-m.l-m.r,ih=H-m.t-m.b,max=Math.max(...values)*1.19;
  const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'完成核印戶數變化'});
  for(let i=0;i<=4;i++){const val=max*i/4,y=m.t+ih-(val/max)*ih;svg.appendChild(el('line',{x1:m.l,y1:y,x2:W-m.r,y2:y,stroke:colors.grid,'stroke-width':1}));svg.appendChild(el('text',{x:m.l-8,y:y+4,'text-anchor':'end','font-size':11,fill:colors.text},Math.round(val)));}
  const gap=14,bw=(iw-gap*(labels.length-1))/labels.length;
  labels.forEach((lab,i)=>{const h=(values[i]/max)*ih,x=m.l+i*(bw+gap),y=m.t+ih-h,hi=i===highlightIndex;const r=el('rect',{x,y,width:bw,height:h,rx:8,fill:hi?colors.navy:colors.blue,opacity:hi?1:.82});svgTitle(r,`${lab}｜完成核印 ${values[i]} 戶`);svg.appendChild(r);svg.appendChild(el('text',{x:x+bw/2,y:y-9,'text-anchor':'middle','font-size':12,'font-weight':800,fill:hi?colors.navy:colors.text},n(values[i])));if(i>0){const d=rows[i].A_delta;svg.appendChild(el('text',{x:x+bw/2,y:y+16,'text-anchor':'middle','font-size':10,'font-weight':800,fill:'#fff'},pct(d)));}svg.appendChild(el('text',{x:x+bw/2,y:H-25,'text-anchor':'middle','font-size':11,fill:colors.text},lab));});
  box.appendChild(svg);
}
function barChart(containerId,labels,values,color){
  const box=document.getElementById(containerId);box.innerHTML='';const W=760,H=270,m={l:48,r:14,t:18,b:58},iw=W-m.l-m.r,ih=H-m.t-m.b,max=Math.max(...values)*1.12;const svg=el('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':'分布長條圖'});
  for(let i=0;i<=4;i++){const val=max*i/4,y=m.t+ih-(val/max)*ih;svg.appendChild(el('line',{x1:m.l,y1:y,x2:W-m.r,y2:y,stroke:colors.grid,'stroke-width':1}));svg.appendChild(el('text',{x:m.l-9,y:y+4,'text-anchor':'end','font-size':11,fill:colors.text},Math.round(val)));}
  const gap=10,bw=(iw-gap*(labels.length-1))/labels.length;labels.forEach((lab,i)=>{const h=(values[i]/max)*ih,x=m.l+i*(bw+gap),y=m.t+ih-h;const r=el('rect',{x,y,width:bw,height:h,rx:7,fill:color});svgTitle(r,`${lab}：${values[i]} 戶`);svg.appendChild(r);svg.appendChild(el('text',{x:x+bw/2,y:H-22,'text-anchor':'middle','font-size':11,fill:colors.text},lab));});box.appendChild(svg);
}
function buildPrimaryCharts(){
  const r=selected(),hi=r.all?null:r.index,labels=rows.map(x=>x.period);
  accountBarChart(hi);
  lineChart('orderRateChart',labels,[{label:'兩月內下單 D/C',data:rows.map(x=>x.D_rate_C*100),color:colors.gold},{label:'至今下單 E/C',data:rows.map(x=>x.E_rate_C*100),color:colors.teal}],{yMin:20,yMax:52,highlightIndex:hi,showValues:true,aria:'下單率變化'});
  lineChart('loginRateChart',labels,[{label:'兩月內登入 B/A',data:rows.map(x=>x.B_rate*100),color:colors.blue},{label:'至今登入 C/A',data:rows.map(x=>x.C_rate*100),color:colors.teal}],{yMin:68,yMax:88,highlightIndex:hi,showValues:true,aria:'登入率變化'});
}
function populateSummary(){
  const latest=rows.at(-1),prev=rows.at(-2),peak=maxBy('A');
  latestAccountChange.innerHTML=deltaBadge(latest.A_delta,'pct');latestAccountSub.textContent=`${prev.A} → ${latest.A} 戶`;
  latestOrderChange.innerHTML=deltaBadge(latest.D_delta);latestOrderSub.textContent=`${pc(prev.D_rate_C)} → ${pc(latest.D_rate_C)}`;
  latestLoginChange.innerHTML=deltaBadge(latest.B_delta);latestLoginSub.textContent=`${pc(prev.B_rate)} → ${pc(latest.B_rate)}`;
  insightAccount.textContent=`${peak.period} 達 ${n(peak.A)} 戶高峰；最新一期 ${n(latest.A)} 戶，較高峰減少 ${Math.abs((latest.A/peak.A-1)*100).toFixed(1)}%。`;
  insightOrder.textContent=`兩個月內下單率由 ${pc(prev.D_rate_C)} 回升至 ${pc(latest.D_rate_C)}，增加 ${(latest.D_delta*100).toFixed(1)} 個百分點。`;
  insightMaturity.textContent=`最新一期至今下單率 ${pc(latest.E_rate_C)}，觀察時間最短；跨期判讀應優先看固定兩個月口徑 D/C。`;
}
function renderTable(){
  const data=[...rows].sort((a,b)=>{const av=a[sortKey],bv=b[sortKey];if(av===null)return 1;if(bv===null)return -1;if(typeof av==='string')return sortAsc?av.localeCompare(bv):bv.localeCompare(av);return sortAsc?av-bv:bv-av;});
  const bestA=maxBy('A').index,bestB=maxBy('B_rate').index,bestD=maxBy('D_rate_C').index,bestE=maxBy('E_rate_C').index;
  cohortTable.querySelector('tbody').innerHTML=data.map(r=>`<tr><td>${r.period}</td><td class="${r.index===bestA?'best':''}">${n(r.A)}</td><td>${r.A_delta===null?'–':pct(r.A_delta)}</td><td class="${r.index===bestB?'best':''}">${pc(r.B_rate)}</td><td>${r.B_delta===null?'–':pp(r.B_delta)}</td><td class="${r.index===bestD?'best':''}">${pc(r.D_rate_C)}</td><td>${r.D_delta===null?'–':pp(r.D_delta)}</td><td class="${r.index===bestE?'best':''}">${pc(r.E_rate_C)}</td><td>${r.E_delta===null?'–':pp(r.E_delta)}</td></tr>`).join('');
}
function bindTableSort(){document.querySelectorAll('#cohortTable th').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.key;if(sortKey===k)sortAsc=!sortAsc;else{sortKey=k;sortAsc=true}renderTable();}));}
function populateAudit(){const a=DATA.rawAudit,d=DATA.delayStats;rawRows.textContent=n(a.rawRows);loginMedian.textContent=`${d.login.median.toFixed(1)} 日`;orderMedian.textContent=`${d.order.median.toFixed(0)} 日`;anomalyCount.textContent=n(a.loginBeforeSeal+a.orderBeforeLogin);qDup.textContent=n(a.duplicateAccounts);qLoginBefore.textContent=n(a.loginBeforeSeal);qOrderBefore.textContent=n(a.orderBeforeLogin);qNoLogin.textContent=n(a.orderWithoutLogin);qLoginDiff.textContent=`${a.rawEverLogin-a.summaryEverLogin>=0?'+':''}${n(a.rawEverLogin-a.summaryEverLogin)}`;qOrderDiff.textContent=`${a.rawEverOrder-a.summaryEverOrder>=0?'+':''}${n(a.rawEverOrder-a.summaryEverOrder)}`;}
function buildAuditCharts(){barChart('loginDelayChart',DATA.loginBuckets.map(x=>x.label),DATA.loginBuckets.map(x=>x.count),colors.blue);barChart('orderDelayChart',DATA.orderBuckets.map(x=>x.label),DATA.orderBuckets.map(x=>x.count),colors.gold);lineChart('monthlyChart',DATA.monthly.map(x=>x.period),[{label:'原始登入率',data:DATA.monthly.map(x=>x.login_rate*100),color:colors.teal},{label:'原始下單率',data:DATA.monthly.map(x=>x.order_rate*100),color:colors.gold}],{yMin:0,yMax:100,showValues:false});}
function bindTabs(){document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.querySelectorAll('.overview,.audit').forEach(x=>x.classList.remove('active'));document.getElementById(btn.dataset.target).classList.add('active');}));}
function downloadCsv(){const h=['區間','完成核印戶數','較前期','兩月內登入率','登入率增減pp','兩月內下單率','下單率增減pp','至今下單率','至今下單增減pp'];const out=rows.map(r=>[r.period,r.A,r.A_delta===null?'':pct(r.A_delta),pc(r.B_rate),r.B_delta===null?'':pp(r.B_delta),pc(r.D_rate_C),r.D_delta===null?'':pp(r.D_delta),pc(r.E_rate_C),r.E_delta===null?'':pp(r.E_delta)]);const csv='\ufeff'+[h,...out].map(row=>row.join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='開戶與下單率_趨勢.csv';a.click();URL.revokeObjectURL(url);}
populateSelector();updateKpis();buildPrimaryCharts();populateSummary();renderTable();bindTableSort();populateAudit();buildAuditCharts();bindTabs();downloadCsvButton=document.getElementById('downloadCsv');downloadCsvButton.addEventListener('click',downloadCsv);
