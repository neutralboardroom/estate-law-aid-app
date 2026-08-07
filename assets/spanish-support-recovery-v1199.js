(()=>{"use strict";
const KEY="ela_v1199_spanish_support_workspace";
const form=document.querySelector("#esSupportForm");if(!form)return;
const status=document.querySelector("#esSupportStatus");
const save=document.querySelector("#esSupportSave"),download=document.querySelector("#esSupportDownload"),print=document.querySelector("#esSupportPrint"),clear=document.querySelector("#esSupportClear"),confirmClear=document.querySelector("#esSupportConfirmClear");
const names=["issueType","route","when","device","observed","expected","steps","errorText"];
const setStatus=(message)=>{status.textContent=message;};
const collect=()=>Object.fromEntries(names.map(name=>[name,String(form.elements[name]?.value||"").trim()]));
const apply=(record)=>names.forEach(name=>{if(form.elements[name])form.elements[name].value=record?.[name]||"";});
const envelope=()=>({schema:"ela-spanish-support-local-v1199",version:"1.1.99",savedAt:new Date().toISOString(),transmitted:false,record:collect()});
try{const saved=localStorage.getItem(KEY);if(saved){const parsed=JSON.parse(saved);apply(parsed.record||{});setStatus("Se restauró una copia guardada en este navegador. No fue enviada.");}}catch(_){setStatus("No se pudo leer una copia anterior. Nada fue enviado.");}
save.addEventListener("click",()=>{try{localStorage.setItem(KEY,JSON.stringify(envelope()));setStatus("Copia guardada en este navegador. Nada fue enviado.");}catch(_){setStatus("No se pudo guardar. Descarga o imprime una copia si el navegador lo permite.");}});
download.addEventListener("click",()=>{const blob=new Blob([JSON.stringify(envelope(),null,2)+"\n"],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="estate-law-aid-ayuda-local-v1.1.99.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);setStatus("Se preparó una descarga local. Nada fue enviado.");});
print.addEventListener("click",()=>{setStatus("Se abrió la función de impresión del navegador. Nada fue enviado.");window.print();});
confirmClear.addEventListener("change",()=>{clear.disabled=!confirmClear.checked;});
clear.addEventListener("click",()=>{if(!confirmClear.checked)return;try{localStorage.removeItem(KEY);}catch(_){}form.reset();clear.disabled=true;setStatus("La copia local fue borrada de este navegador. Nada fue enviado.");});
})();
