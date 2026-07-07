var GEN=[];
function api(p,b){return fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());}
function login(){api('/api/admin/login',{password:document.getElementById('pw').value}).then(d=>{if(d.ok){document.getElementById('login').style.display='none';document.getElementById('app').style.display='block';boot();}else document.getElementById('lerr').innerText=d.msg||'失败';}).catch(()=>document.getElementById('lerr').innerText='网络错误');}
function tab(t){document.getElementById('tab-c').className='tab'+(t=='c'?' on':'');document.getElementById('tab-o').className='tab'+(t=='o'?' on':'');document.getElementById('pane-c').style.display=t=='c'?'block':'none';document.getElementById('pane-o').style.display=t=='o'?'block':'none';if(t=='o')loadOrders();}
function boot(){loadStats();loadCodes();}
function loadStats(){api('/api/admin/stats').then(d=>{if(!d.ok)return;var c=d.codes||{},o={};(d.orders||[]).forEach(x=>o[x.status]=x.c);
  document.getElementById('stats').innerHTML=
   '<div class="stat"><div class="n">'+(c.c||0)+'</div><div class="l">卡密总数</div></div>'+
   '<div class="stat"><div class="n">'+(c.uq||0)+' / '+(c.tq||0)+'</div><div class="l">已用 / 总配额</div></div>'+
   '<div class="stat"><div class="n">'+(o.paid||0)+'</div><div class="l">已开通</div></div>'+
   '<div class="stat"><div class="n">'+(o.processing||0)+'</div><div class="l">处理中</div></div>';});}
function loadCodes(){api('/api/admin/codes',{kw:document.getElementById('kw').value}).then(d=>{if(!d.ok)return;
  document.getElementById('codes').innerHTML=(d.rows||[]).map(r=>{var rem=r.total_quota-r.used_quota;
   return '<tr><td class="mono">'+r.code+'</td><td>'+r.total_quota+'</td><td>'+r.used_quota+'</td><td>'+rem+'</td>'+
   '<td><span class="tag t-'+r.status+'">'+r.status+'</span></td><td>'+(r.note||'')+'</td><td>'+r.created_at.slice(0,16)+'</td>'+
   '<td>'+(r.status=='active'?'<button class="btn sm gray" onclick="act(\''+r.code+'\',\'disable\')">停用</button>':'<button class="btn sm gray" onclick="act(\''+r.code+'\',\'enable\')">启用</button>')+
   ' <button class="btn sm red" onclick="act(\''+r.code+'\',\'delete\')">删</button></td></tr>';}).join('');});}
function loadOrders(){api('/api/admin/orders').then(d=>{if(!d.ok)return;var of=document.getElementById('onlyfail').checked;
  var rows=(d.rows||[]).filter(r=>!of||r.status=='failed');
  document.getElementById('orders').innerHTML=rows.map(r=>'<tr><td>'+(+r.id)+'</td><td class="mono">'+esc(r.code||'')+'</td><td>'+esc(r.email||'—')+'</td><td class="mono">'+esc(r.display_id||r.pix_order_id||'—')+'</td><td><span class="tag t-'+esc(r.status)+'">'+esc(r.status)+'</span></td><td>'+esc((r.created_at||'').slice(0,16))+'</td><td>'+esc((r.paid_at||'').slice(0,16)||'—')+'</td><td style="color:#fca5a5;max-width:280px">'+esc(r.error||'')+'</td></tr>').join('');
  var t=document.getElementById('o-time');if(t)t.innerText='已更新 '+new Date().toLocaleTimeString();});}
function act(code,a){if(a=='delete'&&!confirm('删除 '+code+'?'))return;api('/api/admin/code-action',{code:code,action:a}).then(()=>{loadCodes();loadStats();});}
function gen(){api('/api/admin/gen',{count:document.getElementById('g-count').value,quota:document.getElementById('g-quota').value,note:document.getElementById('g-note').value,channel:document.getElementById('g-channel').value}).then(d=>{if(!d.ok){alert(d.msg||'失败');return;}GEN=d.codes;document.getElementById('gen-out').style.display='block';document.getElementById('gen-out').innerText=d.codes.join('\n');document.getElementById('gen-actions').style.display='block';loadCodes();loadStats();});}
function copyGen(){navigator.clipboard.writeText(GEN.join('\n'));}
function dlGen(){var b=new Blob([GEN.join('\n')],{type:'text/plain'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='baxi_codes.txt';a.click();}
// 自动尝试(已登录 cookie)
api('/api/admin/stats').then(d=>{if(d.ok){document.getElementById('login').style.display='none';document.getElementById('app').style.display='block';boot();}});