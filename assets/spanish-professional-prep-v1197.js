(() => {
  "use strict";
  const VERSION = "1.1.97";
  const KEY = "estateLawAidSpanishProfessionalPrepV1197";
  const form = document.getElementById("elaSpanishProfessionalPrepForm");
  if (!form) return;
  const status = document.getElementById("esProStatus");
  const summary = document.getElementById("esProSummary");
  const fields = [...form.querySelectorAll("input,select,textarea")].filter(x => x.name);
  const clean = value => String(value ?? "").trim();
  function snapshot() {
    const data = {schema:"ela-spanish-professional-prep-v1",version:VERSION,savedAt:new Date().toISOString(),values:{}};
    for (const field of fields) data.values[field.name] = field.type === "checkbox" ? field.checked : clean(field.value);
    return data;
  }
  function apply(data) {
    if (!data || typeof data !== "object" || !data.values) return;
    for (const field of fields) {
      const value = data.values[field.name];
      if (field.type === "checkbox") field.checked = value === true;
      else if (typeof value === "string") field.value = value;
    }
  }
  function updateSummary() {
    const named = [1,2,3].filter(i => clean(form.elements.namedItem(`candidate${i}Name`)?.value)).length;
    const verified = [1,2,3].filter(i => form.elements.namedItem(`candidate${i}Credential`)?.checked).length;
    const conflicts = [1,2,3].filter(i => form.elements.namedItem(`candidate${i}Conflict`)?.checked).length;
    summary.textContent = `${named} profesional(es) anotado(s) • ${verified} verificación(es) de registro anotada(s) • ${conflicts} conflicto(s) consultado(s).`;
  }
  function setStatus(message,isError=false){status.textContent=message;status.dataset.state=isError?"error":"ok";updateSummary();}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(snapshot()));setStatus("Guardado solamente en este navegador. Nada fue enviado ni compartido.");}catch{setStatus("No se pudo guardar. Puedes imprimir o descargar una copia.",true);}}
  function download(){const data=snapshot();const blob=new Blob([JSON.stringify(data,null,2)+"\n"],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="estate-law-aid-comparacion-profesionales-espanol.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus("Copia descargada. Nada fue enviado.");}
  function clearAll(){if(!window.confirm("¿Borrar esta comparación guardada en este navegador?"))return;try{localStorage.removeItem(KEY);}catch{}form.reset();setStatus("Comparación borrada de este navegador.");}
  document.getElementById("esProSave").addEventListener("click",save);
  document.getElementById("esProDownload").addEventListener("click",download);
  document.getElementById("esProPrint").addEventListener("click",()=>{setStatus("Vista de impresión abierta. Nada fue enviado.");window.print();});
  document.getElementById("esProClear").addEventListener("click",clearAll);
  form.addEventListener("input",updateSummary);form.addEventListener("change",updateSummary);
  try{const saved=JSON.parse(localStorage.getItem(KEY)||"null");if(saved){apply(saved);setStatus("Se restauró una comparación guardada en este navegador.");}else updateSummary();}catch{setStatus("La copia guardada no pudo leerse. Empieza una comparación nueva.",true);}
  window.ELA_SPANISH_PROFESSIONAL_PREP_V1197=Object.freeze({version:VERSION,storageKey:KEY,networkTransmission:false,recommendationEngine:false,payment:false});
})();
