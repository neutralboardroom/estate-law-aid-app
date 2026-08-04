(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ELA_V1159_LAUNCH_COMPLETION=api;
  if(root&&typeof root.dispatchEvent==='function'&&typeof root.CustomEvent==='function')root.dispatchEvent(new root.CustomEvent('ela:launch-completion-ready'));
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const KEY='ela:v1160:launch-completion';
  const ACTION_STATES=Object.freeze([
    'OWNER ACTION PREPARATION','OWNER ACTION REQUESTED','OWNER ACTION RECEIVED',
    'OWNER ACTION VERIFICATION FAILED','OWNER ACTION REVALIDATION REQUIRED',
    'OWNER ACTION VERIFIED','OWNER ACTION DECLINED','OWNER ACTION DEFERRED',
    'OWNER ACTION EXPIRED','OWNER ACTION SUPERSEDED','OWNER ACTION CANCELLED',
    'QUALIFIED REVIEWER REQUIRED','EXTERNAL VENDOR REQUIRED'
  ]);
  const CHECK_IDS=Object.freeze(['manual_keyboard_zoom','manual_screen_reader','physical_device']);
  function clean(value){return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
  function safeRead(storage){try{return clean(JSON.parse(storage&&storage.getItem?storage.getItem(KEY)||'{}':'{}'));}catch{return {};}}
  function safeWrite(storage,value){const next=clean(value);try{if(storage&&storage.setItem)storage.setItem(KEY,JSON.stringify(next));}catch{}return next;}
  function validId(id){return /^[A-Z0-9][A-Z0-9._:-]{4,160}$/i.test(String(id));}
  function setCheck(storage,id,passed){if(!CHECK_IDS.includes(String(id)))throw new Error('invalid check id');const state=safeRead(storage);state.checks=clean(state.checks);state.checks[id]=Boolean(passed);state.updatedAt=new Date().toISOString();return safeWrite(storage,state);}
  function setActionState(storage,id,stateName){if(!validId(id))throw new Error('invalid action id');if(!ACTION_STATES.includes(stateName))throw new Error('invalid action state');const state=safeRead(storage);state.actions=clean(state.actions);state.actions[id]=stateName;state.updatedAt=new Date().toISOString();return safeWrite(storage,state);}
  function clear(storage){try{if(storage&&storage.removeItem)storage.removeItem(KEY);}catch{}return {};}
  function assess(model,state){
    const local=clean(state),checks=clean(local.checks),actions=clean(local.actions);
    const capabilities=(Array.isArray(model&&model.launchCapabilityMatrix)?model.launchCapabilityMatrix:[]).map(row=>({
      capabilityId:row.capabilityId,tier:row.tier,capability:row.capability,packagedState:row.state,environment:row.environment,live:false,ownerActionId:row.ownerActionId||null,
      approvalState:row.approvalState,deploymentState:row.deploymentState,postDeploymentVerificationState:row.postDeploymentVerificationState,liveAcceptanceState:row.liveAcceptanceState,
      deviceEvidenceRecorded:row.capabilityId==='A-MANUAL-ACCESSIBILITY'?Boolean(checks.manual_keyboard_zoom||checks.manual_screen_reader||checks.physical_device):false,
      truth:row.truth||''
    }));
    const ownerActions=(Array.isArray(model&&model.ownerActions)?model.ownerActions:[]).map(row=>({requestId:row.requestId,packagedState:row.state,deviceState:actions[row.requestId]||row.state,priorityRank:row.priorityRank,launchImpact:row.launchImpact,ownerEffortClass:row.ownerEffortClass,readyForOwnerActionNow:Boolean(row.readyForOwnerActionNow),canonicalReceiptState:row.canonicalReceiptState,legacyAliases:row.legacyAliases||[]}));
    return {version:model.version,selectedScope:model.selectedScope,capabilities,integrationBoundaries:(model.integrationMaturity&&model.integrationMaturity.boundaries)||[],lifecycle:model.approvalDeploymentLiveLifecycle,ownerActions,ownerDecisionReceipts:[],checks,
      approvalReceipt:false,deployment:false,postDeploymentVerification:false,liveAcceptance:false,D4:false,D5:false,liveClaims:false,billing:false,opportunities:false,uploadsOCR:false,externalAI:false,filing:false,
      canonicalReceipt:'PENDING_CANONICAL_RECEIPT',truth:'Device-only entries are preparation notes. They cannot create an owner decision receipt, change packaged truth, mutate the canonical queue, deploy the portal, verify production, or open a live gate.'};
  }
  function exportPacket(model,state){return {schema:'estate-law-aid-launch-completion-export',version:'1.1.60',exportedAt:new Date().toISOString(),exportMode:'user-directed-device-download',modelVersion:model.version,releaseCandidateId:model.releaseBinding.releaseCandidateId,deviceState:clean(state),assessment:assess(model,state),decisionRegistry:model.ownerDecisionRegistry,continuationSnapshot:model.continuationSnapshot,canonicalCoordination:model.canonicalCoordination,boundaries:model.browserLocal};}
  return Object.freeze({KEY,ACTION_STATES,CHECK_IDS,safeRead,safeWrite,setCheck,setActionState,clear,assess,exportPacket});
});