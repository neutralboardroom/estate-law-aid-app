(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ELA_V1166_COMMERCIAL_MANIFEST=api;if(root&&root.document)root.addEventListener('DOMContentLoaded',()=>api.bind(root.document));})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const VERSION='1.1.66';
const SCHEMA='smarter-justice-commercial-terms-entitlement-manifest';
const PRODUCT_RULES=Object.freeze({
  'covered-attorney-profile-monthly':1500,
  'claimed-firm-profile-monthly':1500,
  'firm-covered-attorney-seat-monthly':1500
});
const REQUIRED_FREE_RIGHTS=Object.freeze(['claim preparation','claimed basic factual control','factual correction','suppression','removal','approved factual editing']);
const PROHIBITED_PROMISES=Object.freeze(['clients','leads','matters','revenue','ranking','exclusivity','outcomes']);
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function arr(v){return Array.isArray(v)?v:[]}
function text(v){return String(v==null?'':v).trim()}
function bool(v){return v===true}
function date(v){return /^\d{4}-\d{2}-\d{2}$/.test(text(v))}
function lowerSet(v){return new Set(arr(v).map(x=>text(x).toLowerCase()).filter(Boolean))}
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value)}
function forbiddenKeys(value,path='',out=[]){if(Array.isArray(value)){value.forEach((v,i)=>forbiddenKeys(v,`${path}[${i}]`,out));return out}if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value)){if(/password|secret|api.?key|access.?token|private.?key|database.?url|webhook.?secret|card|bank|ssn|client.?data|matter.?facts/i.test(k))out.push(path?`${path}.${k}`:k);forbiddenKeys(v,path?`${path}.${k}`:k,out)}}return out}
function validate(input,projection){
 const m=obj(input),p=obj(projection),errors=[],warnings=[],checks=[];
 const add=(ok,id,message)=>{checks.push({id,ok:!!ok,message});if(!ok)errors.push(message)};
 add(m.schema===SCHEMA,'schema',`schema must be ${SCHEMA}`);
 add(!!text(m.manifestVersion),'manifestVersion','manifestVersion is required');
 add(text(m.authority)==='Smarter Justice','authority','authority must be Smarter Justice');
 add(text(m.currency)==='USD','currency','currency must be USD');
 add(text(m.billingCadence)==='month','billingCadence','billingCadence must be month');
 add(date(m.effectiveDate),'effectiveDate','effectiveDate must be YYYY-MM-DD');
 const products=arr(m.products),by=new Map();
 for(const row of products){const r=obj(row),key=text(r.productKey);if(key&&!by.has(key))by.set(key,r);else if(key)errors.push(`duplicate productKey: ${key}`)}
 for(const [key,price] of Object.entries(PRODUCT_RULES)){
   const r=by.get(key);add(!!r,`product:${key}`,`missing product ${key}`);
   if(r){add(!!text(r.productId),`productId:${key}`,`${key} requires a canonical productId`);add(Number(r.priceCents)===price,`price:${key}`,`${key} priceCents must be ${price}`);add(text(r.currency||m.currency)==='USD',`productCurrency:${key}`,`${key} currency must be USD`);add(text(r.billingCadence||m.billingCadence)==='month',`productCadence:${key}`,`${key} billing cadence must be month`);}
 }
 add(by.size===Object.keys(PRODUCT_RULES).length,'productSet','manifest must contain exactly the three approved pilot products');
 const free=lowerSet(m.freeFactualRights);for(const right of REQUIRED_FREE_RIGHTS)add(free.has(right),`free:${right}`,`freeFactualRights must include ${right}`);
 const states=obj(m.claimMemberSeparation||m.participationStates);
 add(bool(states.claimedBasicFactualControlIsFree||obj(states.claimedBasicFactualControl).free),'claimedFree','claimed basic factual control must remain free');
 add(bool(states.paidMembershipIsSeparate||states.memberActivePaidIsSeparate||obj(states.paidMembership).separate),'memberSeparate','paid membership must be separate from claiming');
 const seat=obj(m.seatRules);
 add(bool(seat.oneActivePayerPerAttorney),'onePayer','seatRules.oneActivePayerPerAttorney must be true');
 add(bool(seat.duplicateChargeProhibited),'noDuplicate','seatRules.duplicateChargeProhibited must be true');
 add(bool(seat.payerTransferSupported),'payerTransfer','seatRules.payerTransferSupported must be true');
 add(!!text(seat.prorationPolicy),'proration','seatRules.prorationPolicy is required');
 add(!!text(seat.delinquencyPolicy),'delinquency','seatRules.delinquencyPolicy is required');
 add(!!text(seat.cancellationPolicy),'seatCancellation','seatRules.cancellationPolicy is required');
 const terms=obj(m.terms);
 add(!!text(terms.taxes),'taxes','terms.taxes is required');add(!!text(terms.refunds),'refunds','terms.refunds is required');add(!!text(terms.cancellation),'cancellation','terms.cancellation is required');add(!!text(terms.autoRenewalDisclosure),'autoRenewal','terms.autoRenewalDisclosure is required');add(!!text(terms.support),'support','terms.support is required');
 const excluded=lowerSet(m.noGuarantees||m.exclusions);for(const item of PROHIBITED_PROMISES)add([...excluded].some(x=>x.includes(item)),`noGuarantee:${item}`,`noGuarantees/exclusions must cover ${item}`);
 const sensitive=forbiddenKeys(m);if(sensitive.length)errors.push(`forbidden sensitive fields: ${sensitive.join(', ')}`);
 const portalScopes=arr(m.portalScopes||m.productsSupported).map(x=>text(x).toLowerCase());if(portalScopes.length&&!portalScopes.some(x=>x==='estate-law-aid'||x==='estatelawaid.com'))errors.push('portalScopes must include estate-law-aid when portal scopes are supplied');
 if(m.live===true||m.liveActivationAuthorized===true||m.checkoutActive===true)warnings.push('Manifest contains a live/activation signal. Estate Law Aid still requires separate D4, Stripe, deployment, and owner receipts; this validator cannot activate anything.');
 if(p.currency&&p.currency!==m.currency)errors.push('manifest currency conflicts with portal projection');
 if(p.billingCadence&&p.billingCadence!==m.billingCadence)errors.push('manifest billing cadence conflicts with portal projection');
 const compatible=errors.length===0;
 return {schema:'estate-law-aid-commercial-manifest-compatibility-report',version:VERSION,compatible,checks,errors:[...new Set(errors)],warnings:[...new Set(warnings)],manifestSummary:{schema:text(m.schema),manifestVersion:text(m.manifestVersion),authority:text(m.authority),currency:text(m.currency),billingCadence:text(m.billingCadence),effectiveDate:text(m.effectiveDate),productIds:Object.fromEntries([...by].map(([k,v])=>[k,text(v.productId)]))},canonicalReceiptEligible:compatible,canonicalReceiptRecorded:false,portalBillingAuthority:false,checkoutActivationAllowed:false,billingActivationAllowed:false,entitlementMutationAllowed:false,D4Accepted:false,StripeAccepted:false,deploymentAccepted:false,liveAccepted:false,requiresCanonicalReceipt:true,requiresSeparateD4StripeDeploymentAndOwnerAcceptance:true,truth:'Compatibility means the manifest can proceed to scoped canonical-receipt review. It does not make the manifest authoritative in this repository and cannot activate billing, membership, entitlements, deployment, or live operation.'};
}
async function sha256Text(s){if(typeof crypto!=='undefined'&&crypto.subtle){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}return null}
function sample(){return {schema:SCHEMA,manifestVersion:'SJ-COMMERCIAL-TERMS-2026-08-03-V1',authority:'Smarter Justice',status:'APPROVED_FOR_TEST',currency:'USD',billingCadence:'month',effectiveDate:'2026-08-03',portalScopes:['estate-law-aid'],products:Object.entries(PRODUCT_RULES).map(([productKey,priceCents],i)=>({productKey,productId:`sj_test_${i+1}`,priceCents,currency:'USD',billingCadence:'month',active:false})),freeFactualRights:[...REQUIRED_FREE_RIGHTS],claimMemberSeparation:{claimedBasicFactualControlIsFree:true,paidMembershipIsSeparate:true},seatRules:{oneActivePayerPerAttorney:true,duplicateChargeProhibited:true,payerTransferSupported:true,prorationPolicy:'credit unused time and avoid overlap',delinquencyPolicy:'grace period then paid benefits pause; factual control remains',cancellationPolicy:'end paid benefits at the disclosed effective date without deleting factual control'},terms:{taxes:'calculated and disclosed before charge',refunds:'documented owner-approved pilot policy',cancellation:'clear self-service or support-assisted cancellation',autoRenewalDisclosure:'monthly auto-renewal disclosed before checkout',support:'central Smarter Justice billing support'},noGuarantees:['no guaranteed clients','no guaranteed leads','no guaranteed matters','no guaranteed revenue','no guaranteed ranking','no exclusivity','no guaranteed outcomes'],live:false,checkoutActive:false,liveActivationAuthorized:false}}
function download(name,textValue,type){if(typeof document==='undefined')return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([textValue],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},0)}
function bind(doc){const form=doc.getElementById('commercialManifestValidatorV1166');if(!form)return;const area=doc.getElementById('commercialManifestJsonV1166'),status=doc.getElementById('commercialManifestStatusV1166'),out=doc.getElementById('commercialManifestResultV1166'),file=doc.getElementById('commercialManifestFileV1166');let last=null;const render=r=>{last=r;status.textContent=r.compatible?'Compatible for scoped canonical-receipt review. No billing or live gate changed.':`Not compatible: ${r.errors.length} issue(s). No billing or live gate changed.`;out.textContent=JSON.stringify(r,null,2)};file.addEventListener('change',async()=>{const f=file.files&&file.files[0];if(f)area.value=await f.text()});form.addEventListener('click',async e=>{const a=e.target&&e.target.dataset&&e.target.dataset.manifestAction;if(!a)return;if(a==='sample'){area.value=JSON.stringify(sample(),null,2);status.textContent='Safe non-live sample loaded.';return}if(a==='clear'){area.value='';out.textContent='';last=null;file.value='';status.textContent='Cleared. No data was saved or sent.';return}if(a==='validate'){try{const raw=area.value;const manifest=JSON.parse(raw);const r=validate(manifest);r.inputSha256=await sha256Text(raw);r.validatedAt=new Date().toISOString();render(r)}catch(err){render({compatible:false,errors:[`Invalid JSON: ${err.message}`],warnings:[],checks:[],canonicalReceiptRecorded:false,portalBillingAuthority:false,billingActivationAllowed:false,liveAccepted:false})}return}if(a==='export'&&last)download('estate-law-aid-commercial-manifest-compatibility-v1.1.66.json',JSON.stringify(last,null,2),'application/json')})}
return Object.freeze({VERSION,SCHEMA,PRODUCT_RULES,REQUIRED_FREE_RIGHTS,PROHIBITED_PROMISES,stable,forbiddenKeys,validate,sha256Text,sample,bind});
});
