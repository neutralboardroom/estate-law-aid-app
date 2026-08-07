(()=>{
 const form=document.getElementById('selectionReadinessForm'); if(!form)return;
 const lang=form.dataset.lang==='es'?'es':'en'; const key='ela_v1200_professional_selection_readiness_'+lang;
 const status=document.getElementById('selectionStatus'),confirm=document.getElementById('selectionConfirmClear'),clear=document.getElementById('selectionClear');
 const msg={en:{saved:'Saved only in this browser. Nothing was sent.',restored:'Restored the browser-local copy. Nothing was sent.',download:'Downloaded a local JSON copy. Nothing was sent.',printed:'Opened the browser print dialog. Nothing was sent.',cleared:'Cleared the browser-local copy.',empty:'There is no browser-local copy to restore.'},es:{saved:'Guardado solamente en este navegador. Nada fue enviado.',restored:'Se restauró la copia local del navegador. Nada fue enviado.',download:'Se descargó una copia JSON local. Nada fue enviado.',printed:'Se abrió el diálogo de impresión. Nada fue enviado.',cleared:'Se borró la copia local del navegador.',empty:'No hay una copia local para restaurar.'}}[lang];
 const fields=()=>[...form.elements].filter(x=>x.name); const payload=()=>Object.fromEntries(fields().map(x=>[x.name,x.value]));
 const apply=d=>fields().forEach(x=>{if(Object.prototype.hasOwnProperty.call(d,x.name))x.value=d[x.name]||''}); const say=t=>status.textContent=t;
 try{const raw=localStorage.getItem(key);if(raw){apply(JSON.parse(raw).data||{});say(msg.restored)}}catch(e){}
 document.getElementById('selectionSave').addEventListener('click',()=>{localStorage.setItem(key,JSON.stringify({schema:'ela-professional-selection-readiness-v1200',language:lang,savedAt:new Date().toISOString(),data:payload()}));say(msg.saved)});
 document.getElementById('selectionDownload').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({schema:'ela-professional-selection-readiness-v1200',language:lang,exportedAt:new Date().toISOString(),data:payload()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=lang==='es'?'preparacion-eleccion-profesional.json':'professional-selection-readiness.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);say(msg.download)});
 document.getElementById('selectionPrint').addEventListener('click',()=>{window.print();say(msg.printed)});
 confirm.addEventListener('change',()=>clear.disabled=!confirm.checked);
 clear.addEventListener('click',()=>{if(!confirm.checked)return;localStorage.removeItem(key);form.reset();clear.disabled=true;say(msg.cleared)});
})();