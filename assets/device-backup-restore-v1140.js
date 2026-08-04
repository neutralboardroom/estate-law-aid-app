(function(global){
"use strict";
const RELEASE_VERSION="1.1.40";
const MAX_BACKUP_BYTES=5*1024*1024;
const MAX_RECORDS=5000;
const MAX_RECORD_BYTES=1024*1024;
const MANAGED=/^(estateLawAid|estateHelpDesk|ela_|elaForm|elaLast|elaSource)/i;
const SECRET=/(password|passcode|\bpin\b|private\s*key|secret\s*key|seed\s*phrase|recovery\s*phrase|authentication\s*code|one[- ]?time\s*(?:password|code)|recovery\s*code|full\s*account\s*number|social\s*security\s*number|\bssn\b)/i;
const COMPACT=/(Compact|Summary|Counts|Workbook|Handoff)/i;
const SCOPES=["localStorage","sessionStorage"];
function bytes(value){const text=String(value??"");if(typeof Buffer!=="undefined"&&Buffer.byteLength)return Buffer.byteLength(text,"utf8");if(typeof TextEncoder!=="undefined")return new TextEncoder().encode(text).length;return unescape(encodeURIComponent(text)).length;}
function cleanName(value){return String(value||"").replace(/[^a-zA-Z0-9._ -]/g,"_").slice(0,120);}
function parse(input){
  if(typeof input==="string"){
    if(bytes(input)>MAX_BACKUP_BYTES)return {ok:false,error:`Backup exceeds the ${Math.round(MAX_BACKUP_BYTES/1024/1024)} MB review limit.`};
    try{return {ok:true,value:JSON.parse(input),sourceBytes:bytes(input)}}catch(_){return {ok:false,error:"Backup is not valid JSON."}};
  }
  if(input&&typeof input==="object"&&!Array.isArray(input))return {ok:true,value:input,sourceBytes:bytes(JSON.stringify(input))};
  return {ok:false,error:"Backup must be a JSON object."};
}
function validateShape(snapshot){
  if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))return {ok:false,error:"Backup root must be a JSON object."};
  const present=SCOPES.filter(scope=>Object.prototype.hasOwnProperty.call(snapshot,scope));
  if(!present.length)return {ok:false,error:"Backup does not contain localStorage or sessionStorage records."};
  for(const scope of present)if(!Array.isArray(snapshot[scope]))return {ok:false,error:`${scope} must be an array.`};
  const total=SCOPES.reduce((n,scope)=>n+(Array.isArray(snapshot[scope])?snapshot[scope].length:0),0);
  if(total>MAX_RECORDS)return {ok:false,error:`Backup contains more than ${MAX_RECORDS} records.`};
  return {ok:true,total};
}
function entries(snapshot){const out=[];for(const scope of SCOPES){const list=Array.isArray(snapshot&&snapshot[scope])?snapshot[scope]:[];for(const row of list)out.push({...row,scope});}return out;}
function summarize(records){const counts={safe_addition:0,exact_duplicate:0,conflict:0,prohibited:0,invalid:0};for(const r of records)counts[r.status]=(counts[r.status]||0)+1;return counts;}
function classify(snapshot,current={localStorage:{},sessionStorage:{}},source={}){
  const parsed=parse(snapshot);if(!parsed.ok)return {ok:false,error:parsed.error,records:[]};
  const shape=validateShape(parsed.value);if(!shape.ok)return {ok:false,error:shape.error,records:[]};
  const seen=new Set(),records=[];
  for(const row of entries(parsed.value)){
    const key=String(row&&row.key||""),value=String((row&&row.value)??""),scope=row.scope,id=scope+":"+key,recordBytes=bytes(value);
    const base={id,key,scope,bytes:recordBytes,compactOnly:COMPACT.test(key)};
    if(!key||!MANAGED.test(key)||!SCOPES.includes(scope)){records.push({...base,status:"invalid",reason:"Unsupported key or storage scope."});continue;}
    if(seen.has(id)){records.push({...base,status:"invalid",reason:"Duplicate key inside backup."});continue;}seen.add(id);
    if(recordBytes>MAX_RECORD_BYTES){records.push({...base,status:"invalid",reason:`Record exceeds the ${Math.round(MAX_RECORD_BYTES/1024)} KB per-record limit.`});continue;}
    if(SECRET.test(key+" "+value)){records.push({...base,status:"prohibited",reason:"Possible credential or highly sensitive secret language detected."});continue;}
    const existing=Object.prototype.hasOwnProperty.call(current[scope]||{},key)?String(current[scope][key]??""):null;
    if(existing===null)records.push({...base,value,status:"safe_addition",reason:"Key is not present in this browser."});
    else if(existing===value)records.push({...base,status:"exact_duplicate",reason:"Same key and value already exist."});
    else records.push({...base,status:"conflict",reason:"Same key exists with a different value; no overwrite is allowed."});
  }
  const counts=summarize(records);
  return {ok:true,releaseVersion:RELEASE_VERSION,version:String(parsed.value.version||""),exportedAt:String(parsed.value.exportedAt||""),storageScope:String(parsed.value.storageScope||""),sourceFileName:cleanName(source.fileName),sourceBytes:Number(source.size||parsed.sourceBytes||0),records,counts,recordCount:records.length,automaticOverwrite:false,serverTransmission:false,compactDetailRecovery:false};
}
function selectedSafeIds(review,selected){const chosen=new Set(selected||[]);return (review.records||[]).filter(r=>r.status==="safe_addition"&&chosen.has(r.id)).map(r=>r.id);}
function buildReviewReport(review,selected=[],generatedAt=new Date().toISOString()){
  if(!review||!review.ok)return {ok:false,error:"A valid review is required."};
  const chosen=new Set(selectedSafeIds(review,selected));
  return {
    ok:true,
    reportType:"Estate Law Aid workspace restore review",
    reportVersion:RELEASE_VERSION,
    generatedAt,
    backup:{version:review.version||"not provided",exportedAt:review.exportedAt||"not provided",storageScope:review.storageScope||"not provided",sourceFileName:review.sourceFileName||"not provided",sourceBytes:review.sourceBytes||0,recordCount:review.recordCount},
    safeguards:{reviewOnly:true,automaticOverwrite:false,serverTransmission:false,credentialBearingRecordsRejected:true,compactSummaryDetailRecovery:false,valuesExcludedFromReport:true},
    counts:{...review.counts,selectedSafeAdditions:chosen.size},
    records:(review.records||[]).map(r=>({id:r.id,key:r.key,scope:r.scope,status:r.status,bytes:r.bytes,compactOnly:Boolean(r.compactOnly),selected:chosen.has(r.id),reason:r.reason}))
  };
}
function apply(review,stores,selected){
  const chosen=new Set(selected||[]),result={releaseVersion:RELEASE_VERSION,appliedAt:new Date().toISOString(),added:[],skipped:[],undoRecords:[],automaticOverwrite:false};
  for(const r of review&&review.records||[]){
    if(r.status!=="safe_addition"||!chosen.has(r.id)){result.skipped.push({id:r.id,status:r.status});continue;}
    try{
      const store=stores[r.scope];
      if(!store||typeof store.setItem!=="function")throw new Error("storage unavailable");
      if(typeof store.getItem==="function"&&store.getItem(r.key)!==null){result.skipped.push({id:r.id,status:"changed_since_review"});continue;}
      store.setItem(r.key,r.value);result.added.push(r.id);result.undoRecords.push({id:r.id,scope:r.scope,key:r.key,value:r.value});
    }catch(_){result.skipped.push({id:r.id,status:"storage_denied"});}
  }
  return result;
}
function undo(result,stores){
  const out={releaseVersion:RELEASE_VERSION,removed:[],preserved:[],automaticOverwrite:false};
  for(const r of result&&result.undoRecords||[]){
    try{
      const store=stores[r.scope];
      if(!store||typeof store.getItem!=="function"||typeof store.removeItem!=="function")throw new Error("storage unavailable");
      if(store.getItem(r.key)===r.value){store.removeItem(r.key);out.removed.push(r.id);}else out.preserved.push({id:r.id,status:"changed_after_restore"});
    }catch(_){out.preserved.push({id:r.id,status:"storage_denied"});}
  }
  return out;
}
function validateFile(file){
  if(!file)return {ok:false,error:"Choose a JSON backup file."};
  if(Number(file.size||0)>MAX_BACKUP_BYTES)return {ok:false,error:`Backup exceeds the ${Math.round(MAX_BACKUP_BYTES/1024/1024)} MB review limit.`};
  const name=String(file.name||""),type=String(file.type||"").toLowerCase();
  if(name&&!/\.json$/i.test(name))return {ok:false,error:"Backup filename must end in .json."};
  if(type&&!/^(application\/json|text\/json|text\/plain)$/.test(type))return {ok:false,error:"Backup file type is not supported."};
  return {ok:true,fileName:cleanName(name),size:Number(file.size||0)};
}
const api={RELEASE_VERSION,MAX_BACKUP_BYTES,MAX_RECORDS,MAX_RECORD_BYTES,parseBackup:parse,validateBackupShape:validateShape,classifyBackup:classify,buildReviewReport,applyReviewedRestore:apply,undoReviewedRestore:undo,validateBackupFile:validateFile,isManagedKey:k=>MANAGED.test(String(k||"")),hasSecretLanguage:v=>SECRET.test(String(v||"")),compactSummaryOnly:k=>COMPACT.test(String(k||""))};
if(typeof module!=="undefined"&&module.exports)module.exports=api;global.ElaDeviceRestore=api;
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
function downloadJson(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function setup(){
  const root=document.getElementById("deviceRestoreCenter");if(!root)return;
  const input=document.getElementById("deviceRestoreJson"),file=document.getElementById("deviceRestoreFile"),preview=document.getElementById("deviceRestorePreview"),status=document.getElementById("deviceRestoreStatus"),reportButton=document.getElementById("deviceRestoreReport"),undoButton=document.getElementById("deviceRestoreUndo");
  let review=null,lastApply=null,source={};
  function current(){const result={localStorage:{},sessionStorage:{}};for(const [name,store] of [["localStorage",localStorage],["sessionStorage",sessionStorage]])try{Object.keys(store).filter(api.isManagedKey).forEach(k=>result[name][k]=store.getItem(k)||"");}catch(_){}return result;}
  function selected(){return [...preview.querySelectorAll("[data-restore-id]:checked")].map(x=>x.dataset.restoreId);}
  function syncButtons(){if(reportButton)reportButton.disabled=!(review&&review.ok);if(undoButton)undoButton.disabled=!(lastApply&&lastApply.added&&lastApply.added.length);}
  function render(){
    if(!review||!review.ok){preview.innerHTML="";syncButtons();return;}
    preview.innerHTML=review.records.map(r=>`<label class="device-restore-row"><input type="checkbox" data-restore-id="${esc(r.id)}" ${r.status==="safe_addition"?"":"disabled"}><span><strong>${esc(r.key||"Unnamed record")}</strong><small>${esc(r.scope)} · ${esc(r.status.replaceAll("_"," "))}${r.compactOnly?" · compact summary only":""} · ${r.bytes} bytes</small><small>${esc(r.reason)}</small></span></label>`).join("")||"<p>No restorable managed records were found.</p>";
    syncButtons();
  }
  function inspect(){
    review=api.classifyBackup(input.value,current(),source);lastApply=null;
    if(!review.ok){status.textContent=review.error;preview.innerHTML="";syncButtons();return;}
    render();const c=review.counts;
    status.textContent=`Review ready: ${c.safe_addition||0} safe additions, ${c.exact_duplicate||0} duplicates, ${c.conflict||0} conflicts, ${c.prohibited||0} prohibited, ${c.invalid||0} invalid. Nothing has been restored.`;
  }
  file?.addEventListener("change",()=>{
    const f=file.files&&file.files[0];if(!f)return;
    const valid=api.validateBackupFile(f);if(!valid.ok){status.textContent=valid.error;file.value="";return;}
    source=valid;const reader=new FileReader();
    reader.onload=()=>{input.value=String(reader.result||"");inspect();};
    reader.onerror=()=>status.textContent="The selected file could not be read on this device.";
    reader.readAsText(f);
  });
  document.getElementById("deviceRestoreInspect")?.addEventListener("click",()=>{source={};inspect();});
  reportButton?.addEventListener("click",()=>{
    if(!review||!review.ok){status.textContent="Inspect a valid backup first.";return;}
    const report=api.buildReviewReport(review,selected());
    downloadJson(`estate-law-aid-restore-review-${new Date().toISOString().slice(0,10)}.json`,report);
    status.textContent=`Review report downloaded. It lists ${report.counts.selectedSafeAdditions} selected safe addition${report.counts.selectedSafeAdditions===1?"":"s"} and excludes stored values.`;
  });
  document.getElementById("deviceRestoreApply")?.addEventListener("click",()=>{
    if(!review||!review.ok){status.textContent="Inspect a valid backup first.";return;}
    lastApply=api.applyReviewedRestore(review,{localStorage,sessionStorage},selected());syncButtons();
    const denied=lastApply.skipped.filter(x=>x.status==="storage_denied").length,changed=lastApply.skipped.filter(x=>x.status==="changed_since_review").length;
    status.textContent=`Restored ${lastApply.added.length} reviewed addition${lastApply.added.length===1?"":"s"}. Existing keys were not overwritten.${changed?` ${changed} record${changed===1?"":"s"} changed after review and were skipped.`:""}${denied?` ${denied} selected record${denied===1?"":"s"} could not be saved because browser storage was unavailable.`:""}`;
  });
  undoButton?.addEventListener("click",()=>{
    if(!lastApply||!lastApply.added.length){status.textContent="No restore from this page session is available to undo.";return;}
    const result=api.undoReviewedRestore(lastApply,{localStorage,sessionStorage});lastApply=null;syncButtons();
    status.textContent=`Undid ${result.removed.length} restored addition${result.removed.length===1?"":"s"}. ${result.preserved.length?`${result.preserved.length} record${result.preserved.length===1?" was":"s were"} preserved because browser data changed or storage was unavailable.`:""}`;
    review=api.classifyBackup(input.value,current(),source);render();
  });
  document.getElementById("deviceRestoreClear")?.addEventListener("click",()=>{input.value="";file.value="";preview.innerHTML="";review=null;lastApply=null;source={};status.textContent="Restore review cleared. Browser data was not changed.";syncButtons();});
  syncButtons();
}
if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",setup);
})(typeof window!=="undefined"?window:globalThis);
