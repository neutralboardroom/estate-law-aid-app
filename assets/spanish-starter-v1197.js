(() => {
  "use strict";
  const VERSION = "1.1.97";
  const KEY = "estateLawAidSpanishStarterV1196";
  const form = document.getElementById("elaSpanishStarterForm");
  if (!form) return;
  const status = document.getElementById("esStatus");
  const clean = value => String(value ?? "").trim();
  const controls = ["matterName","matterType","jurisdiction","reviewDate","people","assets","documents","questions"];
  function setStatus(message, isError=false) {
    status.textContent = message;
    status.dataset.state = isError ? "error" : "ok";
  }
  function snapshot() {
    const data = {schema:"ela-spanish-starter-v1",version:VERSION,savedAt:new Date().toISOString(),topics:[]};
    for (const name of controls) data[name] = clean(form.elements.namedItem(name)?.value);
    data.topics = [...form.querySelectorAll('input[name="topics"]:checked')].map(x => x.value);
    return data;
  }
  function apply(data) {
    if (!data || typeof data !== "object") return;
    for (const name of controls) if (form.elements.namedItem(name) && typeof data[name] === "string") form.elements.namedItem(name).value = data[name];
    const selected = new Set(Array.isArray(data.topics) ? data.topics : []);
    form.querySelectorAll('input[name="topics"]').forEach(x => { x.checked = selected.has(x.value); });
  }
  function save() {
    try { const data=snapshot(); localStorage.setItem(KEY, JSON.stringify(data)); setStatus("Guardado solamente en este navegador. Nada fue enviado."); }
    catch { setStatus("No se pudo guardar en este navegador. Puedes imprimir o descargar una copia.", true); }
  }
  function download() {
    const data=snapshot();
    const blob=new Blob([JSON.stringify(data,null,2)+"\n"],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="estate-law-aid-preparacion-espanol.json"; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    setStatus("Copia descargada. Nada fue enviado.");
  }
  function clearAll() {
    if (!window.confirm("¿Borrar la hoja guardada en este navegador?")) return;
    try { localStorage.removeItem(KEY); } catch {}
    form.reset(); setStatus("Hoja borrada de este navegador.");
  }
  document.getElementById("esSave").addEventListener("click", save);
  document.getElementById("esDownload").addEventListener("click", download);
  document.getElementById("esPrint").addEventListener("click", () => { setStatus("Vista de impresión abierta. Nada fue enviado."); window.print(); });
  document.getElementById("esClear").addEventListener("click", clearAll);
  document.querySelectorAll("[data-es-path]").forEach(link => link.addEventListener("click", () => { const select=document.getElementById("esMatterType"); select.value=link.dataset.esPath || ""; }));
  try { const saved=JSON.parse(localStorage.getItem(KEY)||"null"); if(saved){ apply(saved); setStatus("Se restauró una hoja guardada en este navegador."); } } catch { setStatus("La copia guardada no pudo leerse. Empieza una hoja nueva.", true); }
  window.ELA_SPANISH_STARTER_V1197 = Object.freeze({version:VERSION,storageKey:KEY,networkTransmission:false});
})();
