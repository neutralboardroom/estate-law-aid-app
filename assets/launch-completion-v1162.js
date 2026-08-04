(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ELA_V1162_LAUNCH_COMPLETION=api;
  if(root&&typeof root.dispatchEvent==='function'&&typeof root.CustomEvent==='function')root.dispatchEvent(new root.CustomEvent('ela:v1162-launch-ready'));
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const KEY='ela:v1162:launch-completion';
const ACTION_STATES=Object.freeze(['OWNER ACTION PREPARATION','OWNER ACTION REQUESTED','OWNER ACTION RECEIVED','OWNER ACTION VERIFICATION FAILED','OWNER ACTION REVALIDATION REQUIRED','OWNER ACTION VERIFIED','OWNER ACTION DECLINED','OWNER ACTION DEFERRED','OWNER ACTION EXPIRED','OWNER ACTION SUPERSEDED','OWNER ACTION CANCELLED','QUALIFIED REVIEWER REQUIRED','EXTERNAL VENDOR REQUIRED']);
const CHECK_IDS=Object.freeze(['demo_rehearsal','manual_keyboard_zoom','manual_screen_reader','physical_device']);
function clean(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function safeRead(storage){try{return clean(JSON.parse(storage&&storage.getItem?storage.getItem(KEY)||'{}':'{}'))}catch{return {}}}
function safeWrite(storage,value){const next=clean(value);try{if(storage&&storage.setItem)storage.setItem(KEY,JSON.stringify(next))}catch{}return next}
function setCheck(storage,id,passed){if(!CHECK_IDS.includes(String(id)))throw new Error('invalid check id');const s=safeRead(storage);s.checks=clean(s.checks);s.checks[id]=Boolean(passed);s.updatedAt=new Date().toISOString();return safeWrite(storage,s)}
function setActionState(storage,id,state){if(!ACTION_STATES.includes(state))throw new Error('invalid action state');const s=safeRead(storage);s.actions=clean(s.actions);s.actions[String(id)]=state;s.updatedAt=new Date().toISOString();return safeWrite(storage,s)}
function clear(storage){try{if(storage&&storage.removeItem)storage.removeItem(KEY)}catch{}return {}}
function assess(model,state){const s=clean(state),checks=clean(s.checks),actions=clean(s.actions);return {version:model.version,capabilities:model.launchCapabilityMatrix.map(x=>({...x,deviceEvidenceRecorded:x.capabilityId==='A-ATTORNEY-DEMO'?Boolean(checks.demo_rehearsal):x.capabilityId==='A-MANUAL-ACCESSIBILITY'?Boolean(checks.manual_keyboard_zoom||checks.manual_screen_reader||checks.physical_device):false,live:false})),ownerActions:model.ownerActions.map(x=>({...x,deviceState:actions[x.requestId]||x.state})),checks,approvalReceipt:false,deployment:false,postDeploymentVerification:false,continuedLiveOperationAcceptance:false,liveAcceptance:false,D4:false,D5:false,billing:false,opportunities:false,externalAI:false,truth:'Device-only notes cannot approve, deploy, charge, send, verify production, create a receipt, or open a live gate.'}}
function exportPacket(model,state){return {schema:'estate-law-aid-v1162-launch-local-export',version:'1.1.62',exportedAt:new Date().toISOString(),userDirected:true,modelVersion:model.version,releaseCandidateId:model.releaseBinding.releaseCandidateId,deviceState:clean(state),assessment:assess(model,state),membership:model.professionalMembership,commercialTerms:model.commercialTerms,participationStates:model.participationStates,publicFreemium:model.publicFreemium,mondayDemonstration:model.mondayDemonstration,humanDemonstration:model.humanDemonstration,boundaries:model.browserLocal}}
return Object.freeze({KEY,ACTION_STATES,CHECK_IDS,safeRead,safeWrite,setCheck,setActionState,clear,assess,exportPacket});
});
