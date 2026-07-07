var LANG='zh', OID='', AT='', CODE='', codeOK=false, timer=null, ctmr=null;
var T={zh:{title:'卡密开通 ChatGPT Plus',lead:'先验证卡密,再粘贴账号的 access token,自动开通 Plus 首月。',clabel:'第一步 · 卡密',label:'第二步 · access token',btn:'开通 Plus',how:'如何获取 access token?',chip:'凭卡密自助开通',refresh:'刷新状态',back:'再开通一个',proc:'处理中',ok:'已开通',exp:'已过期',fail:'出码失败',
  procTip:'正在为你的账号开通,请稍候…(上游自动付款中)',okTip:'ChatGPT Plus 已开通!',expTip:'订单已过期,卡密已退回,请重试',failTip:'出码失败,卡密已退回,请重新提交开通',go:'去 chatgpt.com 使用',n1:'仅支持带免费试用资格的账号(没开过 Plus 的新号)',n2:'提交后自动处理,约 1–10 分钟',n3:'我们不保存你的 token,仅用于本次开通',syncNote:'开通成功后,OpenAI 同步状态通常还需 1–5 分钟。若你马上刷新 chatgpt.com 还没看到 Plus,请等几分钟再刷新',sub:'提交开通中…',email:'账号',order:'订单号',left:'订单剩余',cremain:'✓ 卡密有效,剩余 ',ctimes:' 次'},
  en:{title:'Redeem ChatGPT Plus',lead:'Verify your card code first, then paste your access token.',clabel:'Step 1 · Card code',label:'Step 2 · access token',btn:'Activate Plus',how:'How to get the access token?',chip:'Self-serve with a card code',refresh:'Refresh',back:'Activate another',proc:'Processing',ok:'Activated',exp:'Expired',fail:'Code failed',
  procTip:'Activating your account, please wait… (upstream is paying)',okTip:'ChatGPT Plus is active!',expTip:'Order expired, code refunded, please retry',failTip:'PIX code generation failed, code refunded, please resubmit',go:'Open chatgpt.com',n1:'Only accounts with a free trial eligibility (never subscribed)',n2:'Auto-processed, about 1–10 min',n3:'We never store your token, used only for this activation',syncNote:'After it shows activated, OpenAI usually needs 1–5 more minutes to sync. If Plus is not visible right after you refresh chatgpt.com, please wait a few minutes and refresh again',sub:'Submitting…',email:'Account',order:'Order',left:'Expires in',cremain:'✓ Valid, ',ctimes:' use(s) left'}};
function tr(){var t=T[LANG];
  document.getElementById('t-title').innerText=t.title;document.getElementById('t-lead').innerText=t.lead;
  document.getElementById('t-clabel').innerText=t.clabel;document.getElementById('t-label').innerText=t.label;
  document.getElementById('btn').innerText=t.btn;document.getElementById('t-how').innerText=t.how;
  document.getElementById('c-chip').innerText='🔑 '+t.chip;
  document.getElementById('st-refresh').innerText=t.refresh;document.getElementById('st-back').innerText=t.back;
  document.getElementById('lang').innerText=LANG=='zh'?'EN':'中';
  document.getElementById('s1').childNodes[1].nodeValue=LANG=='zh'?'已提交':'Submitted';
  document.getElementById('s2').childNodes[1].nodeValue=t.proc;document.getElementById('s3').childNodes[1].nodeValue=t.ok;
  var ns=document.getElementById('t-notes');ns.children[0].innerHTML='· <b>'+t.n1+'</b>';ns.children[1].innerHTML='· '+t.n2;ns.children[2].innerHTML='· '+t.n3;ns.children[3].innerHTML='· '+t.syncNote;}
function toggleLang(){LANG=LANG=='zh'?'en':'zh';tr();}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
function showErr(m){var e=document.getElementById('err');e.innerText=m;e.style.display='block';}
function setBtn(){document.getElementById('btn').disabled=!(codeOK && document.getElementById('at').value.trim().length>=30);}
document.addEventListener('input',function(e){if(e.target&&e.target.id=='at')setBtn();});
function onAt(){setBtn();}
function verifyCode(){var v=document.getElementById('code').value.trim().toUpperCase();CODE=v;
  var h=document.getElementById('chint');h.className='hint';
  if(v.length<5){h.className='hint bad';h.innerText=LANG=='zh'?'请输入卡密':'Enter a code';return;}
  var vb=document.getElementById('vbtn');vb.disabled=true;
  fetch('/api/code-info',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:v})}).then(r=>r.json()).then(d=>{vb.disabled=false;
    if(d.ok){codeOK=true;h.className='hint ok';h.innerText=T[LANG].cremain+d.remaining+T[LANG].ctimes;
      document.getElementById('at-section').style.display='block';document.getElementById('code').disabled=true;vb.style.display='none';document.getElementById('at').focus();}
    else{codeOK=false;h.className='hint bad';h.innerText='✗ '+d.msg;document.getElementById('at-section').style.display='none';}setBtn();}).catch(()=>{vb.disabled=false;h.className='hint bad';h.innerText=LANG=='zh'?'网络错误':'Network error';});}
function showQuery(){clearInterval(timer);document.getElementById('view-submit').style.display='none';document.getElementById('view-status').style.display='none';document.getElementById('view-query').style.display='block';}
function showSubmit(){document.getElementById('view-query').style.display='none';document.getElementById('view-status').style.display='none';document.getElementById('view-submit').style.display='block';}
function doQuery(){var v=document.getElementById('qcode').value.trim().toUpperCase();var box=document.getElementById('q-result');if(v.length<5){box.innerHTML='<div class="hint bad">请输入卡密</div>';return;}
  document.getElementById('qbtn').disabled=true;
  fetch('/api/query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:v})}).then(r=>r.json()).then(d=>{document.getElementById('qbtn').disabled=false;
    if(!d.ok){box.innerHTML='<div class="hint bad">✗ '+d.msg+'</div>';return;}
    var sm={paid:'已开通',processing:'处理中',expired:'已过期',refunded:'已退回'},smc={paid:'b-ok',processing:'b-proc',expired:'b-exp',refunded:'b-exp'};
    var h='<div class="kv"><span>卡密配额</span><b>已用 '+d.used+' / 共 '+d.total+'(剩 '+d.remaining+')</b></div>';
    if(!d.orders.length){h+='<div class="muted" style="padding:12px 0">该卡密还没有开通记录</div>';}
    else{d.orders.forEach(function(o){h+='<div style="border-bottom:1px dashed var(--line);padding:10px 0"><div style="display:flex;justify-content:space-between;align-items:center"><b>'+esc(o.email||"—")+'</b><span class="badge '+(smc[o.status]||"b-proc")+'">'+(sm[o.status]||esc(o.status))+'</span></div><div class="muted" style="font-size:12px">订单 '+esc(o.display_id||"—")+' · '+esc(o.created_at||"")+'</div>'+(o.error?'<div style="color:#b91c1c;font-size:12px;margin-top:4px;line-height:1.5">⚠ '+esc(o.error)+'</div>':'')+'</div>';});}
    box.innerHTML=h;}).catch(()=>{document.getElementById('qbtn').disabled=false;box.innerHTML='<div class="hint bad">网络错误</div>';});}
function setStep(s){var s2=document.getElementById('s2'),s3=document.getElementById('s3');
  if(s=='paid'){s2.className='step done';s2.querySelector('.dot').innerText='✓';s3.className='step done';s3.querySelector('.dot').innerText='✓';}
  else if(s=='expired'){s2.className='step';s2.querySelector('.dot').innerText='2';}
  else{s2.className='step on';s2.querySelector('.dot').innerText='2';s3.className='step';}}
async function submit(){var at=document.getElementById('at').value.trim();var t=T[LANG];
  document.getElementById('err').style.display='none';if(!codeOK){showErr(LANG=='zh'?'请输入有效卡密':'Enter a valid code');return;}
  if(at.length<30){showErr(LANG=='zh'?'请粘贴有效的 access token':'Please paste a valid access token');return;}
  var b=document.getElementById('btn');b.disabled=true;b.innerText=t.sub;AT=at;
  try{var r=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:CODE,at:at})});var d=await r.json();
    if(!d.ok){showErr(d.msg);b.disabled=false;b.innerText=t.btn;return;}
    OID=d.order_id;document.getElementById('view-submit').style.display='none';document.getElementById('view-status').style.display='block';
    render(d);poll();}catch(e){showErr(LANG=='zh'?'网络错误,请重试':'Network error');b.disabled=false;b.innerText=t.btn;}}
function fmtLeft(exp,now){if(!exp||!now)return'';var s=exp-now;if(s<=0)return'00:00';var m=Math.floor(s/60),ss=s%60;return(m<10?'0':'')+m+':'+(ss<10?'0':'')+ss;}
function render(d){var t=T[LANG];setStep(d.status);var body=document.getElementById('st-body');
  var badge=d.status=='paid'?'<span class="badge b-ok">'+t.ok+'</span>':d.status=='expired'?'<span class="badge b-exp">'+t.exp+'</span>':d.status=='failed'?'<span class="badge b-exp">'+t.fail+'</span>':'<span class="badge b-proc">'+t.proc+'</span>';
  var h='<div class="kv"><span>'+t.email+'</span><b>'+(d.email||'—')+'</b></div><div class="kv"><span>'+t.order+'</span><b>'+(d.display_id||d.order_id||'—')+'</b></div>';
  if(d.status=='paid'){h+='<div class="center"><div class="big">✅</div><div style="font-size:18px;font-weight:700">'+t.okTip+'</div><div class="muted">'+(d.email||'')+'</div></div><div class="muted" style="background:#fff7ed;color:#c2410c;border-radius:10px;padding:11px 12px;margin:12px 0;font-size:13px;line-height:1.65">⏳ '+t.syncNote+'</div><a href="https://chatgpt.com" target="_blank"><button class="btn" style="margin-top:8px">'+t.go+'</button></a>';
    clearInterval(timer);document.getElementById('st-refresh').style.display='none';document.getElementById('st-back').style.display='block';}
  else if(d.status=='expired'){h+='<div class="center"><div class="big">⏰</div><div class="muted">'+t.expTip+'</div></div>';
    clearInterval(timer);document.getElementById('st-refresh').style.display='none';document.getElementById('st-back').style.display='block';}
   else if(d.status=='failed'){h+='<div class="center"><div class="big">⚠️</div><div class="muted">'+esc(d.msg||t.failTip)+'</div></div>';
     clearInterval(timer);document.getElementById('st-refresh').style.display='none';document.getElementById('st-back').style.display='block';}
  else{h+='<div class="kv"><span>'+t.left+'</span><b id="left">'+fmtLeft(d.expires_at,d.server_now)+'</b></div><div class="spin"></div><div class="center muted">'+t.procTip+'</div>';}
  body.innerHTML='<div style="text-align:right;margin-bottom:6px">'+badge+'</div>'+h;}
async function refresh(){if(!OID&&!AT)return;try{var r=await fetch('/api/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(OID?{order_id:OID}:{at:AT})});var d=await r.json();if(d.ok)render(d);}catch(e){}}
function poll(){clearInterval(timer);timer=setInterval(refresh,5000);}
function reset(){clearInterval(timer);OID='';AT='';codeOK=false;document.getElementById('at').value='';document.getElementById('code').value='';document.getElementById('code').disabled=false;document.getElementById('chint').innerText='';document.getElementById('chint').className='hint';
  document.getElementById('at-section').style.display='none';var vb=document.getElementById('vbtn');vb.style.display='inline-block';vb.disabled=false;
  var b=document.getElementById('btn');b.disabled=true;b.innerText=T[LANG].btn;
  document.getElementById('view-status').style.display='none';document.getElementById('view-submit').style.display='block';document.getElementById('st-back').style.display='none';document.getElementById('st-refresh').style.display='block';}
tr();