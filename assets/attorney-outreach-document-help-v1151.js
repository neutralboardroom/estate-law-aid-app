(function(global){
"use strict";
const VERSION="1.1.51";
const ALLOWED_BOOTH_STATUSES=new Set(["PLANNED","SCHEDULED","ACTIVE","COMPLETED","VERIFIED LOCATION"]);
const DEMO_STEPS=Object.freeze([
 {order:1,label:"Specialty homepage",path:"/",status:"public"},
 {order:2,label:"Professional search",path:"/nearby-estate-professional-search/",status:"public"},
 {order:3,label:"Real source-supported profile",path:"/profiles/nathaniel-w-birdsall/",status:"public_unclaimed"},
 {order:4,label:"Document comparison",path:"/estate-document-compare/?demo=1",status:"browser_local"},
 {order:5,label:"Professional value",path:"/professionals-and-firms/",status:"public"},
 {order:6,label:"Claim or create through Smarter Justice",path:"/attorney-profile-claim/",status:"central_handoff_preparation"}
]);
const DOCUMENT_HELP=Object.freeze([
 {id:"review",label:"Review preparation",path:"/document-review-preparation/",maturity:"metadata_only",liveUpload:false},
 {id:"compare",label:"Compare two text versions",path:"/estate-document-compare/",maturity:"browser_verified",liveUpload:false},
 {id:"draft-will",label:"Will draft preparation",path:"/will-draft-preparation/",maturity:"preparation_only",safeToSign:false},
 {id:"draft-trust",label:"Trust draft preparation",path:"/trust-draft-preparation/",maturity:"preparation_only",safeToSign:false},
 {id:"official-forms",label:"Official form sources",path:"/official-form-source-navigator/",maturity:"source_navigation",filing:false},
 {id:"guided",label:"Guided preparation",path:"/guided-forms-center/",maturity:"browser_local_versioned",filing:false},
 {id:"attorney-package",label:"Attorney-review package preparation",path:"/attorney-review-package-preparation/",maturity:"prepared_not_sent",confidentialRelease:false}
]);
function demonstrationReadiness(input={}){
 const routes=new Set(Array.isArray(input.routes)?input.routes:DEMO_STEPS.map(x=>x.path.split('?')[0]));
 const checks={homepage:routes.has('/'),search:routes.has('/nearby-estate-professional-search/'),profile:routes.has('/profiles/nathaniel-w-birdsall/'),tool:routes.has('/estate-document-compare/'),professionalValue:routes.has('/professionals-and-firms/'),continuation:routes.has('/attorney-tour/')};
 return {ok:Object.values(checks).every(Boolean),version:VERSION,checks,steps:DEMO_STEPS,privateDataRequired:false,liveOpportunityRequired:false,syntheticProfileUsed:false};
}
function documentHelpMap(){return {ok:true,version:VERSION,entryPath:"/document-help/",workflows:DOCUMENT_HELP,electronicFiling:false,liveUpload:false,externalAI:false,attorneyReview:false,advancedBuilderAccess:"not_publicly_active"};}
function justiceBoothTruth(record){
 if(!record||!record.status||!ALLOWED_BOOTH_STATUSES.has(String(record.status).toUpperCase())||record.ownerApproved!==true||!record.source||!record.effectiveDate){return {display:false,reason:"No complete owner-approved current central status record.",allowedStatuses:[...ALLOWED_BOOTH_STATUSES]};}
 return {display:true,status:String(record.status).toUpperCase(),location:record.location||null,effectiveDate:record.effectiveDate,source:record.source,expires:record.expires||null,newYorkCityOnly:true};
}
function professionalValue(){return {version:VERSION,centralAuthority:"Smarter Justice",basicClaimCorrectionFree:true,pricingDuplicatedLocally:false,paymentBuysVerification:false,paymentBuysOrganicRank:false,noLeadClientRevenueOrRoiPromise:true,qualifiedConcepts:["Membership may cost less than what some firms pay for one purchased lead or advertising response.","One suitable retained matter may cover a year or more of membership depending on the practice, matter, fee arrangement, and actual outcome.","Setup and ordinary administration are intended to be minimal, not literally zero."]};}
const SAMPLE={earlierLabel:"Synthetic earlier draft",laterLabel:"Synthetic later draft",earlierText:"ARTICLE ONE — FAMILY\nI am married to Alex Example.\n\nARTICLE TWO — PERSONAL REPRESENTATIVE\nI nominate Jordan Example.\n\nARTICLE THREE — RESIDUE\nI leave the residue equally to Casey Example and Morgan Example.",laterText:"ARTICLE ONE — FAMILY\nI am married to Alex Example.\n\nARTICLE TWO — PERSONAL REPRESENTATIVE\nI nominate Taylor Example.\n\nARTICLE THREE — RESIDUE\nI leave 60% of the residue to Casey Example and 40% to Morgan Example.\n\nARTICLE FOUR — DIGITAL PROPERTY\nMy fiduciary may manage digital-property records as permitted by law.",notes:"Synthetic demonstration text only. No real person, client, matter, or legal document is represented."};
function loadCompareSample(){const f=document.getElementById('estateDocumentCompareForm');if(!f)return false;for(const [k,v] of Object.entries(SAMPLE))if(f.elements[k])f.elements[k].value=v;const s=document.getElementById('estateDocumentCompareStatus');if(s)s.textContent='Synthetic demonstration text loaded. No real client or legal document is represented.';return true;}
function copyTourLink(){const text='https://estatelawaid.com/attorney-tour/';if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false);return Promise.resolve(false);}
function init(){
 document.querySelectorAll('[data-outreach-action="copy-tour-link"]').forEach(b=>b.addEventListener('click',async()=>{const ok=await copyTourLink();const s=document.getElementById('attorneyTourCopyStatus');if(s)s.textContent=ok?'Attorney tour link copied.':'Copy was unavailable. Use https://estatelawaid.com/attorney-tour/';}));
 document.querySelectorAll('[data-demo-action="load-compare-sample"]').forEach(b=>b.addEventListener('click',()=>{if(loadCompareSample()){document.getElementById('estateDocumentCompareForm')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}}));
 if(typeof location!=='undefined'&&location.pathname==='/estate-document-compare/'&&new URLSearchParams(location.search).get('demo')==='1')loadCompareSample();
}
if(typeof module!=='undefined'&&module.exports)module.exports={DEMO_STEPS,DOCUMENT_HELP,demonstrationReadiness,documentHelpMap,justiceBoothTruth,professionalValue,SAMPLE};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();}
global.EstateLawAidOutreachDocumentHelpV1151={DEMO_STEPS,DOCUMENT_HELP,demonstrationReadiness,documentHelpMap,justiceBoothTruth,professionalValue,SAMPLE};
})(typeof window!=="undefined"?window:globalThis);
