(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ELAClaimPublicationOutreachV1143=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='1.1.43',KEY='estateLawAidClaimPublicationOutreachPreviewV1143';
const REQUIRED_CLAIM_STEPS=['accountEmailVerified','identityVerified','professionalStatusVerified','claimAuthorityVerified','portalSpecialtyVerified','staffApproved'];
function claimDecision(input={}){
 const checks=Object.fromEntries(REQUIRED_CLAIM_STEPS.map(k=>[k,input[k]===true]));
 checks.profileExists=input.profileExists===true;
 checks.signedProfileContextValid=input.signedProfileContextValid===true;
 if(input.entityType==='firm')checks.firmAuthorityVerified=input.firmAuthorityVerified===true;
 const status=String(input.professionalStatus||'').toLowerCase();
 const blockingStatus=['inactive','suspended','revoked','retired','deceased'].includes(status);
 const securityBlock=Boolean(input.contextExpired||input.contextReplayed||input.duplicateClaim||input.conflictingClaim||input.accountTakeoverRisk||input.disputed||input.impersonationRisk);
 const approved=Object.values(checks).every(Boolean)&&!blockingStatus&&!securityBlock;
 const reverify=Boolean(input.materialProtectedChange||input.evidenceExpired||input.professionalStatusChanged||input.firmAuthorityChanged);
 return {version:VERSION,checks,approved,controlGranted:approved,canonicalUrlPreserved:true,pendingCanSubmitEvidence:true,pendingCanPublishProtectedChanges:false,pendingCanDisplayClaimedOrVerified:false,pendingCanSuppressAnotherProfile:false,paymentConsidered:false,paidEntitlementActivated:false,reverificationRequired:reverify,controlRevocationRequired:Boolean(input.professionalStatusChanged&&blockingStatus),reason:approved?'all verification gates passed':'one or more verification or security gates remain closed'};
}
function publicationDecision(input={}){
 const checks={
  sourceClassApproved:input.sourceClassApproved===true,
  completeCanonicalRecord:input.completeCanonicalRecord===true,
  specialtySupported:input.specialtySupported===true,
  humanApproval:input.humanApproval===true,
  currentnessHandled:input.currentnessAccepted===true||input.staleLabeled===true,
  correctionSuppressionRemovalPaths:input.rightsPathsPresent===true,
  duplicateClear:input.duplicate!==true,
  safePublicContact:input.unsafeContact!==true,
  notSuppressedOrRemoved:input.suppressed!==true&&input.removed!==true
 };
 const approved=Object.values(checks).every(Boolean);
 return {version:VERSION,checks,approved,state:approved?'published_unclaimed':'private_or_held',automaticPublication:false,automaticPublicationGate:'closed',humanApprovalRequired:true,searchInclusion:approved,canonicalPage:approved,lastKnownGoodPreserved:true,rollbackAvailable:true,claimStateChanged:false,outreachTriggered:false};
}
function outreachDecision(input={}){
 const last=Number(input.lastContactDaysAgo),cap=Number(input.frequencyCapDays||30);
 const frequencyOk=!Number.isFinite(last)||last>=cap;
 const blocked=Boolean(input.suppressed||input.removed||input.optedOut||input.doNotContact||input.crossChannelOptOut||input.complaint||input.bounceThresholdExceeded||input.duplicateWithinBatch||input.unknownProfile||input.unresolvedIdentityRisk||input.unresolvedStatusRisk||input.unresolvedPrivacyRisk);
 const checks={manualBatchApproved:input.manualBatchApproved===true,ownerApproved:input.ownerApproved===true,legalPrivacyReviewApproved:input.legalPrivacyReviewApproved===true,professionalContactSourceApproved:input.professionalContactSourceApproved===true,templateApproved:input.templateApproved===true,optOutMechanismPresent:input.optOutMechanismPresent===true,supportAvailable:input.supportAvailable===true,deliveryConnectorReady:input.deliveryConnectorReady===true,frequencyOk,notBlocked:!blocked};
 const approved=Object.values(checks).every(Boolean);
 return {version:VERSION,checks,approvedForManualDelivery:approved,automaticSending:false,autonomousOutreachGate:'closed',claimControlGranted:false,identityVerified:false,professionalStatusVerified:false,paidEntitlementActivated:false,opportunityEntitlementActivated:false,pauseRequired:Boolean(input.complaint||input.bounceThresholdExceeded||input.optOutFailure||input.doNotContactFailure),optOutHonored:Boolean(input.optedOut||input.doNotContact||input.crossChannelOptOut),frequencyOk,publicationStateChanged:false};
}
function stateRegister(){return {version:VERSION,claim:['CLAIM_STARTED','CLAIM_UNDER_REVIEW','CLAIM_IDENTITY_VERIFIED','CLAIM_PROFESSIONAL_STATUS_VERIFIED','CLAIM_AUTHORITY_VERIFIED','CLAIM_APPROVED','REVERIFICATION_REQUIRED','CONTROL_REVOKED','DISPUTED'],publication:['PRIVATE_CANDIDATE','HUMAN_REVIEW_PENDING','PUBLISHED_UNCLAIMED','PUBLISHED_CLAIMED','TEMPORARILY_SUPPRESSED','REMOVED'],outreach:['NOT_CONTACTED','BATCH_DRAFT','BATCH_APPROVED','PREPARED_NOT_SENT','CONTACTED','BOUNCED','COMPLAINT','OPTED_OUT','DO_NOT_CONTACT','PAUSED']};}
function setup(){if(typeof document==='undefined')return;const el=document.getElementById('claimPublicationOutreachV1143');if(!el)return;const out=document.getElementById('cpoDecisionV1143');document.querySelectorAll('[data-cpo-demo]').forEach(b=>b.addEventListener('click',()=>{let result;if(b.dataset.cpoDemo==='claim')result=claimDecision({profileExists:true,signedProfileContextValid:true,accountEmailVerified:true,identityVerified:true,professionalStatusVerified:true,claimAuthorityVerified:false,portalSpecialtyVerified:true,staffApproved:false,professionalStatus:'active'});else if(b.dataset.cpoDemo==='publication')result=publicationDecision({sourceClassApproved:true,completeCanonicalRecord:true,specialtySupported:true,humanApproval:true,currentnessAccepted:true,rightsPathsPresent:true});else result=outreachDecision({manualBatchApproved:true,ownerApproved:true,legalPrivacyReviewApproved:false,professionalContactSourceApproved:true,templateApproved:true,optOutMechanismPresent:true,supportAvailable:true,deliveryConnectorReady:false});out.textContent=JSON.stringify(result,null,2);}));}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();}
return {VERSION,KEY,REQUIRED_CLAIM_STEPS,claimDecision,publicationDecision,outreachDecision,stateRegister,setup};});
