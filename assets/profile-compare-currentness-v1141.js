(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.ELAProfileCompareV1141=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='estateLawAidProfileComparisonV1141';
  const MAX=3;
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function daysBetween(reviewed,now){
    const a=Date.parse(String(reviewed||'')); const b=Date.parse(String(now||new Date().toISOString()));
    if(!Number.isFinite(a)||!Number.isFinite(b)) return null;
    return Math.max(0,Math.floor((b-a)/86400000));
  }
  function reviewState(reviewed,now){
    const age=daysBetween(reviewed,now);
    if(age===null) return {code:'unknown',label:'Review date unavailable',ageDays:null};
    if(age<=30) return {code:'recent',label:'Source reviewed within 30 days',ageDays:age};
    if(age<=90) return {code:'watch',label:'Source review is 31–90 days old',ageDays:age};
    return {code:'refresh',label:'Source review is more than 90 days old',ageDays:age};
  }
  function relationshipLabel(p){
    if(p.type==='attorney') return p.linkedFirmSlug?'Firm relationship shown from reviewed source':'No firm relationship is currently shown';
    const n=(p.linkedProfessionalSlugs||[]).length;
    return n?`${n} individually supported attorney${n===1?'':'s'} linked`:'No individually supported attorney roster is currently shown';
  }
  function comparisonRecord(p,now){
    const state=reviewState(p.lastMaterialSourceReview||p.retrieved,now);
    return {slug:p.slug,name:p.name,type:p.type==='attorney'?'Attorney':'Firm',location:[p.city,p.state].filter(Boolean).join(', '),practiceAreas:(p.practiceAreas||[]).slice(0,8),sourceReviewed:p.lastMaterialSourceReview||p.retrieved||'',reviewState:state.label,claimState:p.profileStatus||'unclaimed',verification:p.credentialVerificationStatus||'not independently verified',relationship:relationshipLabel(p)};
  }
  function read(storage){try{const x=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(x)?x.filter(Boolean).slice(0,MAX):[];}catch(e){return [];}}
  function write(storage,slugs){storage.setItem(KEY,JSON.stringify(Array.from(new Set(slugs)).slice(0,MAX)));return read(storage);}
  function toggle(storage,slug){const current=read(storage);const at=current.indexOf(slug);if(at>=0){current.splice(at,1);return {ok:true,selected:write(storage,current),action:'removed'};}if(current.length>=MAX)return {ok:false,selected:current,action:'limit'};current.push(slug);return {ok:true,selected:write(storage,current),action:'added'};}
  function setup(){
    if(typeof document==='undefined'||typeof ELA_V1112_PROFILES==='undefined')return;
    let storage;try{storage=localStorage;}catch(e){const mem={};storage={getItem:k=>mem[k]||null,setItem:(k,v)=>{mem[k]=String(v);}};}
    const bySlug=new Map(ELA_V1112_PROFILES.map(p=>[p.slug,p]));
    function slugFromHref(h){const m=String(h||'').match(/\/profiles\/([^/?#]+)\/?/);return m?decodeURIComponent(m[1]):'';}
    function currentSlug(){return slugFromHref(location.pathname)||slugFromHref(document.querySelector('link[rel="canonical"]')?.href||'');}
    function statusText(){let n=document.getElementById('elaV1141CompareStatus');if(!n){n=document.createElement('p');n.id='elaV1141CompareStatus';n.className='ela-v1141-compare-status';n.setAttribute('aria-live','polite');document.body.appendChild(n);}return n;}
    function isSelected(slug){return read(storage).includes(slug);}
    function button(slug){const b=document.createElement('button');b.type='button';b.className='btn light small ela-v1141-compare-button';b.dataset.compareSlug=slug;b.setAttribute('aria-pressed',String(isSelected(slug)));b.textContent=isSelected(slug)?'Remove from comparison':'Compare profile';b.addEventListener('click',()=>{const result=toggle(storage,slug);if(!result.ok){statusText().textContent='You can compare up to three profiles. Remove one before adding another.';}else{statusText().textContent=result.action==='added'?'Profile added to a neutral comparison.':'Profile removed from comparison.';}refresh();});return b;}
    function enhanceCard(card){if(card.dataset.v1141Compare==='true')return;const link=card.querySelector('a[href*="/profiles/"]');const slug=slugFromHref(link&&link.getAttribute('href'));const p=bySlug.get(slug);if(!p)return;card.dataset.v1141Compare='true';const state=reviewState(p.lastMaterialSourceReview||p.retrieved);const evidence=document.createElement('small');evidence.className='ela-v1141-currentness '+state.code;evidence.textContent=`Source last reviewed ${p.lastMaterialSourceReview||p.retrieved||'date unavailable'} · ${state.label}. This is source currentness, not credential verification.`;card.appendChild(evidence);let actions=card.querySelector('.page-actions');if(!actions){actions=document.createElement('div');actions.className='page-actions';card.appendChild(actions);}actions.appendChild(button(slug));}
    function enhanceProfilePage(){const slug=currentSlug(),p=bySlug.get(slug);if(!p||document.querySelector('[data-v1141-profile-evidence]'))return;const card=document.querySelector('main .content-card');if(!card)return;const state=reviewState(p.lastMaterialSourceReview||p.retrieved);const box=document.createElement('section');box.className='ela-v1141-profile-evidence';box.dataset.v1141ProfileEvidence='true';box.setAttribute('aria-labelledby','ela-v1141-evidence-title');box.innerHTML=`<h2 id="ela-v1141-evidence-title">Profile evidence and currentness</h2><dl><div><dt>Source last reviewed</dt><dd>${esc(p.lastMaterialSourceReview||p.retrieved||'Not recorded')}</dd></div><div><dt>Currentness signal</dt><dd>${esc(state.label)}. This does not verify credentials or availability.</dd></div><div><dt>Source type</dt><dd>${esc(p.sourceType||'Public professional source')}</dd></div><div><dt>Relationship evidence</dt><dd>${esc(relationshipLabel(p))}</dd></div><div><dt>Profile control</dt><dd>Unclaimed. Basic claiming, correction, and approved editing are free through Smarter Justice; paid growth is separate.</dd></div></dl>`;
      const actions=card.querySelector('.page-actions');if(actions)card.insertBefore(box,actions);else card.appendChild(box);
      const act=actions||card;act.appendChild(button(slug));
    }
    function renderTray(){
      let tray=document.getElementById('elaV1141ComparisonTray');const selected=read(storage).map(s=>bySlug.get(s)).filter(Boolean);
      if(!selected.length){if(tray)tray.remove();return;}
      if(!tray){tray=document.createElement('aside');tray.id='elaV1141ComparisonTray';tray.className='ela-v1141-comparison-tray';tray.setAttribute('aria-labelledby','ela-v1141-compare-title');const footer=document.querySelector('footer');(footer?.parentNode||document.body).insertBefore(tray,footer||null);}
      const rows=selected.map(p=>comparisonRecord(p)).map(r=>`<tr><th scope="row"><a href="/profiles/${esc(r.slug)}/">${esc(r.name)}</a></th><td>${esc(r.type)}</td><td>${esc(r.location||'Not stated')}</td><td>${esc(r.practiceAreas.join(', ')||'Not stated')}</td><td>${esc(r.sourceReviewed||'Not recorded')}<br><small>${esc(r.reviewState)}</small></td><td>${esc(r.relationship)}</td><td><button class="btn light small" type="button" data-remove-compare="${esc(r.slug)}">Remove</button></td></tr>`).join('');
      tray.innerHTML=`<div class="content-card"><p class="eyebrow">Neutral browser-local comparison</p><h2 id="ela-v1141-compare-title">Compare source-supported profile facts</h2><p>No profile is ranked or endorsed. Confirm credentials, services, fees, conflicts, availability, and engagement directly.</p><div class="table-scroll"><table><thead><tr><th>Profile</th><th>Type</th><th>Location</th><th>Source-supported areas</th><th>Source review</th><th>Relationship evidence</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div><div class="page-actions"><button class="btn light small" type="button" id="elaV1141ClearCompare">Clear comparison</button></div></div>`;
      tray.querySelectorAll('[data-remove-compare]').forEach(b=>b.addEventListener('click',()=>{toggle(storage,b.dataset.removeCompare);refresh();}));tray.querySelector('#elaV1141ClearCompare').addEventListener('click',()=>{write(storage,[]);refresh();});
    }
    function refresh(){document.querySelectorAll('.ela-v1141-compare-button').forEach(b=>{const on=isSelected(b.dataset.compareSlug);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Remove from comparison':'Compare profile';});renderTray();}
    function enhance(){document.querySelectorAll('.ela-profile-card').forEach(enhanceCard);enhanceProfilePage();refresh();}
    enhance();const root=document.querySelector('[data-profile-directory]');if(root)new MutationObserver(enhance).observe(root,{childList:true,subtree:true});
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();}
  return {KEY,MAX,daysBetween,reviewState,relationshipLabel,comparisonRecord,read,write,toggle,setup};
});
