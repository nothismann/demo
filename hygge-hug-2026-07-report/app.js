const money = new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:0});
const integer = new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0});
const pct = function(v,d){return (v*100).toFixed(d == null ? 1 : d)+'%'};
const modelCopy = [
{label:'點擊後 7 天營收',note:'只計入廣告點擊後 7 天內完成的購買，適合用來觀察最直接的轉換產出。',key:'strict_revenue'},
{label:'增幅歸因營收',note:'Meta 估算受到廣告增幅影響的轉換，適合評估預算增加後的成長價值。',key:'incremental_revenue'},
{label:'META 預設營收',note:'前期投放使用的較寬鬆設定，包含點擊後 7 天、瀏覽後 1 天與互動後 1 天。',key:'wide_revenue'}
];

function drawDaily(index){
const canvas=document.getElementById('dailyChart');
const rect=canvas.getBoundingClientRect();
const dpr=Math.min(window.devicePixelRatio||1,2);
canvas.width=Math.max(1,rect.width*dpr);canvas.height=Math.max(1,rect.height*dpr);
const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
const w=rect.width,h=rect.height,pad={l:12,r:12,t:18,b:26};
const values=REPORT.daily.map(function(d){return d[modelCopy[index].key]});
const max=Math.max.apply(null,values)*1.08;
ctx.clearRect(0,0,w,h);ctx.lineJoin='round';ctx.lineCap='round';
ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;
[0,.5,1].forEach(function(t){const y=pad.t+(h-pad.t-pad.b)*t;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke()});
const points=values.map(function(v,i){return {x:pad.l+i*(w-pad.l-pad.r)/(values.length-1),y:pad.t+(1-v/max)*(h-pad.t-pad.b)}});
const grad=ctx.createLinearGradient(0,pad.t,0,h-pad.b);grad.addColorStop(0,'rgba(213,95,77,.55)');grad.addColorStop(1,'rgba(213,95,77,0)');
ctx.beginPath();ctx.moveTo(points[0].x,h-pad.b);points.forEach(function(p){ctx.lineTo(p.x,p.y)});ctx.lineTo(points[points.length-1].x,h-pad.b);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
ctx.beginPath();points.forEach(function(p,i){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.strokeStyle='#f08b78';ctx.lineWidth=3;ctx.stroke();
const peak=points[values.indexOf(Math.max.apply(null,values))];ctx.beginPath();ctx.arc(peak.x,peak.y,5,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='11px sans-serif';ctx.fillText('7/01',pad.l,h-7);ctx.textAlign='right';ctx.fillText('7/28',w-pad.r,h-7);ctx.textAlign='left';
}

function selectModel(index){
const d=REPORT.attribution[index],c=modelCopy[index];
document.querySelectorAll('.model-tab').forEach(function(b,i){b.setAttribute('aria-selected',String(i===index))});
document.getElementById('modelLabel').textContent=c.label;
document.getElementById('modelRevenue').textContent=money.format(d.revenue);
document.getElementById('modelPurchases').textContent=integer.format(d.purchases);
document.getElementById('modelRoas').textContent=d.roas.toFixed(2);
document.getElementById('modelCpa').textContent=money.format(d.cpa);
document.getElementById('modelNote').textContent=c.note;
drawDaily(index);
}
document.querySelectorAll('.model-tab').forEach(function(b){b.addEventListener('click',function(){selectModel(Number(b.dataset.model))})});

const productMeta={roas:{label:'ROAS',format:function(v){return v.toFixed(2)},higher:true},revenue:{label:'營收',format:function(v){return money.format(v)},higher:true},cpa:{label:'CPA',format:function(v){return money.format(v)},higher:false}};
function renderProducts(metric){
const meta=productMeta[metric],items=REPORT.products.slice().sort(function(a,b){return meta.higher?b[metric]-a[metric]:a[metric]-b[metric]});
const max=Math.max.apply(null,items.map(function(x){return x[metric]}));
document.getElementById('productRanking').innerHTML=items.map(function(x){const width=metric==='cpa'?(Math.min.apply(null,items.map(function(i){return i[metric]}))/x[metric])*100:x[metric]/max*100;return '<div class="rank-row"><div class="rank-name"><b>'+x.adset+'</b><small>'+integer.format(x.purchases)+' 筆購買 · '+money.format(x.revenue)+'</small></div><div class="rank-track"><div class="rank-bar" style="width:'+width+'%"></div></div><div class="rank-value">'+meta.format(x[metric])+'</div></div>'}).join('');
}
document.querySelectorAll('[data-product-metric]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-product-metric]').forEach(function(x){x.classList.remove('active')});b.classList.add('active');renderProducts(b.dataset.productMetric)})});

function shortCreative(name){return name.replace(/^Reels-/,'').replace(/ \(優先投遞素材\)/,'').replace(/ \(備用測試素材\)/,'')}
const creativeMeta={revenue:{format:function(v){return money.format(v)}},roas:{format:function(v){return 'ROAS '+v.toFixed(2)}},purchases:{format:function(v){return integer.format(v)+' 筆'}}};
function renderCreatives(metric){
const items=REPORT.creatives.slice().sort(function(a,b){return b[metric]-a[metric]}).slice(0,8);
document.getElementById('creativeGrid').innerHTML=items.map(function(x,i){return '<article class="creative-card"><div class="rank">0'+(i+1)+'</div><div><b>'+shortCreative(x.ad)+'</b><small>'+x.adset+' · '+money.format(x.spend)+' 花費</small></div><strong>'+creativeMeta[metric].format(x[metric])+'</strong></article>'}).join('');
}
document.querySelectorAll('[data-creative-metric]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-creative-metric]').forEach(function(x){x.classList.remove('active')});b.classList.add('active');renderCreatives(b.dataset.creativeMetric)})});

function pageName(path){const map={'/':'首頁','/categories/bra-tops':'運動內衣分類頁','/categories/leggings':'瑜珈褲分類頁','/products/hygge-hug-myth':'Myth 商品頁','/products/elva':'Elva 商品頁','/categories/maillard':'Maillard 分類頁'};if(map[path])return map[path];if(path.indexOf('360')>-1)return '360° 防曬外套商品頁';if(path.indexOf('libre')>-1)return 'Libre Bootcut 商品頁';return path}
function renderLanding(){
const rows=REPORT.landingPages.slice(0,8).map(function(x){const warn=x.landing_page==='/categories/bra-tops'||x.landing_page==='/categories/leggings';return '<div class="page-row"><div class="page">'+pageName(x.landing_page)+'</div><div>'+integer.format(x.sessions)+'</div><div class="'+(warn?'warn':'')+'">'+pct(x.engagement_rate)+'</div><div>'+Math.round(x.avg_session_seconds)+' 秒</div><div class="'+(x.purchase_conversion_rate===0?'warn':'')+'">'+pct(x.purchase_conversion_rate,2)+'</div></div>'}).join('');
document.getElementById('landingTable').innerHTML='<div class="page-row header"><div>到達頁</div><div>工作階段</div><div>互動率</div><div>平均時間</div><div>購買轉換</div></div>'+rows;
}
function renderVisitor(){
const labels={new:'新訪客',returning:'回訪者'};const items=REPORT.visitor;
document.getElementById('visitorCompare').innerHTML=items.map(function(x){return '<article class="audience-block '+(x.newVsReturning==='returning'?'returning':'')+'"><h3>'+labels[x.newVsReturning]+'</h3><div class="audience-number">'+pct(x.purchaseConversionRate,2)+'</div><p>購買轉換率</p><dl><div><dt>工作階段</dt><dd>'+integer.format(x.sessions)+'</dd></div><div><dt>互動率</dt><dd>'+pct(x.engagementRate)+'</dd></div><div><dt>平均時間</dt><dd>'+Math.round(x.averageSessionDuration)+' 秒</dd></div><div><dt>加購率</dt><dd>'+pct(x.addToCartRate)+'</dd></div></dl></article>'}).join('');
}
function renderDevices(){
const total=REPORT.devices.reduce(function(s,x){return s+x.sessions},0);const labels={mobile:'行動裝置',desktop:'桌機',tablet:'平板'};
document.getElementById('deviceList').innerHTML=REPORT.devices.map(function(x){const share=x.sessions/total;return '<div class="device-line"><b>'+labels[x.deviceCategory]+'</b><div class="track"><div class="fill" style="width:'+Math.max(share*100,1)+'%"></div></div><strong>'+pct(share)+'</strong></div>'}).join('');
}
document.querySelectorAll('.ga-tab').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.ga-tab').forEach(function(x){x.classList.remove('active')});document.querySelectorAll('.ga-panel').forEach(function(x){x.classList.remove('active')});b.classList.add('active');document.getElementById('ga-'+b.dataset.ga).classList.add('active')})});

const weeks=[
{label:'WEEK 01',title:'先補齊兩大品類的內容供給',items:['瑜珈褲優先補充尺寸、無尷尬線、版型與實穿情境素材','運動內衣延伸挑選指南、支撐度與穿搭情境','每支素材建立單一溝通主題，方便後續判讀'],output:'素材與到達頁對應表'},
{label:'WEEK 02',title:'用一致條件完成首輪測試',items:['新素材先進入品項分類與新客輪播','控制測試條件，保留素材之間的可比較性','以點擊後 7 天觀察 ROAS、CPA 與購買量'],output:'首輪素材排序與去留清單'},
{label:'WEEK 03',title:'改善品類頁的選購體驗',items:['瑜珈褲頁增加版型與尺寸比較','運動內衣頁增加支撐度與情境分類','行動版首屏優先呈現主張、熱銷款與購買入口'],output:'改版前後的同口徑行為比較'},
{label:'WEEK 04',title:'依成效分階段增加預算',items:['保留外套與多款集合素材作為營收穩定來源','對表現較佳的素材逐步增加預算','每次調整後保留觀察期，確認效率變化'],output:'增幅歸因與點擊後 7 天的持續觀察紀錄'},
];
function selectWeek(index){const w=weeks[index];document.querySelectorAll('.week-btn').forEach(function(b,i){b.classList.toggle('active',i===index)});document.getElementById('weekStage').innerHTML='<div class="week-label">'+w.label+'</div><h3>'+w.title+'</h3><ul>'+w.items.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul><div class="week-output"><span>當週產出</span><strong>'+w.output+'</strong></div>'}
document.querySelectorAll('.week-btn').forEach(function(b){b.addEventListener('click',function(){selectWeek(Number(b.dataset.week))})});

const progress=document.getElementById('progressBar');
function updateProgress(){const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=(max>0?scrollY/max*100:0)+'%'}
addEventListener('scroll',updateProgress,{passive:true});updateProgress();
const sections=[].slice.call(document.querySelectorAll('[data-section]'));const navs=[].slice.call(document.querySelectorAll('.navlinks a'));
const observer=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){navs.forEach(function(a){a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id)})}})},{rootMargin:'-35% 0px -55% 0px'});sections.forEach(function(s){observer.observe(s)});
let resizeTimer;addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(function(){const active=Number(document.querySelector('.model-tab[aria-selected="true"]').dataset.model);drawDaily(active)},100)});
renderProducts('roas');renderCreatives('revenue');renderLanding();renderVisitor();renderDevices();selectWeek(0);selectModel(1);
