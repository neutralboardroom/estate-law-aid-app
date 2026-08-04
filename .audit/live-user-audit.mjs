import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE=(process.env.AUDIT_BASE_URL||'https://estatelawaid.com').replace(/\/$/,'');
const stamp=Date.now();
const out={base:BASE,startedAt:new Date().toISOString(),cacheBypass:String(stamp),health:null,pages:[],buttons:[],summary:{},writeRequestsBlocked:[]};
const addBust=(u)=>{const x=new URL(u,BASE);x.searchParams.set('__ela_audit',String(stamp));return x.href};
const clean=(s)=>String(s||'').replace(/\s+/g,' ').trim();
const sameOrigin=(u)=>{try{return new URL(u,BASE).origin===new URL(BASE).origin}catch{return false}};

async function safeFetch(url){
  try{const r=await fetch(addBust(url),{redirect:'follow',headers:{'cache-control':'no-cache, no-store, max-age=0','pragma':'no-cache','user-agent':'EstateLawAid-LiveAudit/1.0'}});return {ok:r.ok,status:r.status,url:r.url,text:await r.text(),headers:Object.fromEntries(r.headers)}}catch(e){return {ok:false,status:0,url:String(url),text:'',error:String(e)}}
}

out.health=await safeFetch(BASE+'/health');
const sitemap=await safeFetch(BASE+'/sitemap.xml');
let urls=[];
if(sitemap.ok){urls=[...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].trim()).filter(sameOrigin)}
if(!urls.length) urls=[BASE+'/',BASE+'/start/',BASE+'/document-help/',BASE+'/find-a-professional/',BASE+'/professionals-and-firms/',BASE+'/how-it-works/',BASE+'/account/'];
urls=[...new Set(urls)].sort();
out.summary.sitemapStatus=sitemap.status;out.summary.sitemapUrls=urls.length;

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
async function makeContext(viewport){
 const c=await browser.newContext({viewport,serviceWorkers:'block',acceptDownloads:true,extraHTTPHeaders:{'Cache-Control':'no-cache, no-store, max-age=0','Pragma':'no-cache'}});
 await c.route('**/*',async route=>{
   const req=route.request();
   if(!['GET','HEAD'].includes(req.method())){out.writeRequestsBlocked.push({url:req.url(),method:req.method()});return route.abort('blockedbyclient')}
   return route.continue({headers:{...req.headers(),'cache-control':'no-cache, no-store, max-age=0','pragma':'no-cache'}});
 });
 return c;
}

const desktop=await makeContext({width:1440,height:900});
const page=await desktop.newPage();
let currentErrors=[],currentFailed=[];
page.on('pageerror',e=>currentErrors.push(String(e)));
page.on('requestfailed',r=>currentFailed.push({url:r.url(),method:r.method(),failure:r.failure()?.errorText||''}));

for(let i=0;i<urls.length;i++){
 const url=urls[i];currentErrors=[];currentFailed=[];
 const rec={url,status:0,finalUrl:'',title:'',h1:[],headings:[],wordCount:0,links:0,buttons:0,forms:0,overflow:false,consoleErrors:[],failedRequests:[],menu:null};
 try{
  const r=await page.goto(addBust(url),{waitUntil:'networkidle',timeout:45000});
  rec.status=r?.status()||0;rec.finalUrl=page.url();
  await page.waitForTimeout(120);
  Object.assign(rec,await page.evaluate(()=>({
   title:document.title,
   h1:[...document.querySelectorAll('h1')].map(x=>x.innerText.trim()),
   headings:[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(x=>({level:Number(x.tagName[1]),text:x.innerText.trim()})),
   wordCount:(document.body?.innerText||'').trim().split(/\s+/).filter(Boolean).length,
   links:document.querySelectorAll('a').length,buttons:document.querySelectorAll('button').length,forms:document.forms.length,
   overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
  })));
  const menu=page.locator('.menu-toggle').first();
  if(await menu.count() && await menu.isVisible()){
   const before=await menu.getAttribute('aria-expanded');await menu.click({timeout:5000});await page.waitForTimeout(40);const after=await menu.getAttribute('aria-expanded');rec.menu={before,after,worked:before!==after};
  }
  rec.consoleErrors=currentErrors.filter(x=>!/favicon|ResizeObserver/i.test(x));rec.failedRequests=currentFailed;
 }catch(e){rec.error=String(e)}
 out.pages.push(rec);
 if((i+1)%100===0) console.log(`desktop ${i+1}/${urls.length}`);
}
await page.close();await desktop.close();

const mobile=await makeContext({width:390,height:844});
const mp=await mobile.newPage();
for(let i=0;i<urls.length;i++){
 const target=out.pages[i];
 try{const r=await mp.goto(addBust(urls[i]),{waitUntil:'domcontentloaded',timeout:35000});await mp.waitForTimeout(80);target.mobileStatus=r?.status()||0;target.mobileOverflow=await mp.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2)}catch(e){target.mobileError=String(e)}
 if((i+1)%100===0) console.log(`mobile ${i+1}/${urls.length}`);
}
await mp.close();await mobile.close();

// Test every non-menu button occurrence on a fresh uncached page. All write requests stay blocked.
const actionContext=await makeContext({width:1280,height:900});
for(let pi=0;pi<urls.length;pi++){
 const probe=await actionContext.newPage();
 try{
  await probe.goto(addBust(urls[pi]),{waitUntil:'domcontentloaded',timeout:35000});await probe.waitForTimeout(120);
  const count=await probe.locator('button:not(.menu-toggle)').count();
  await probe.close();
  for(let bi=0;bi<count;bi++){
   const p=await actionContext.newPage();let downloads=[],dialogs=[],popups=[];
   p.on('download',d=>downloads.push(d.suggestedFilename()));p.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});await d.dismiss()});p.on('popup',q=>popups.push(q.url()));
   const br={url:urls[pi],index:bi,label:'',outcome:'',effects:[],downloads,dialogs,popups};
   try{
    await p.goto(addBust(urls[pi]),{waitUntil:'domcontentloaded',timeout:35000});await p.waitForTimeout(100);
    const b=p.locator('button:not(.menu-toggle)').nth(bi);br.label=clean(await b.innerText().catch(()=>''))||clean(await b.getAttribute('aria-label'));
    if(!await b.isVisible()){br.outcome='not_visible';out.buttons.push(br);await p.close();continue}
    if(await b.isDisabled()){br.outcome='disabled_initially';out.buttons.push(br);await p.close();continue}
    const form=b.locator('xpath=ancestor::form[1]');
    if(await form.count()){
     const controls=form.locator('input,select,textarea');
     for(let ci=0;ci<await controls.count();ci++){
      const c=controls.nth(ci);try{
       if(!await c.isVisible()||await c.isDisabled())continue;const tag=await c.evaluate(e=>e.tagName.toLowerCase());const type=(await c.getAttribute('type')||'').toLowerCase();
       if(tag==='select'){const vals=await c.locator('option:not([disabled])').evaluateAll(os=>os.map(o=>o.value).filter(Boolean));if(vals.length)await c.selectOption(vals[0])}
       else if(type==='checkbox'||type==='radio'){if(!await c.isChecked())await c.check({force:true})}
       else if(!['submit','button','reset','hidden','image','file'].includes(type)){let v='Audit example';if(type==='email')v='audit@example.com';else if(type==='tel')v='2125550100';else if(type==='url')v='https://example.com';else if(type==='number')v='1';else if(type==='date')v='2026-08-04';await c.fill(v)}
      }catch{}
     }
    }
    const before=await p.evaluate(()=>({text:document.body.innerText,html:document.body.innerHTML,ls:JSON.stringify(localStorage),ss:JSON.stringify(sessionStorage),url:location.href}));
    const valid=await form.count()?await form.evaluate(f=>f.checkValidity()).catch(()=>true):true;
    try{await b.click({timeout:6000})}catch(e){if(!valid){br.outcome='blocked_by_validation';br.error=String(e);out.buttons.push(br);await p.close();continue}throw e}
    await p.waitForTimeout(650);
    const after=await p.evaluate(()=>({text:document.body.innerText,html:document.body.innerHTML,ls:JSON.stringify(localStorage),ss:JSON.stringify(sessionStorage),url:location.href}));
    if(before.text!==after.text)br.effects.push('visible_text_change');if(before.html!==after.html)br.effects.push('dom_change');if(before.ls!==after.ls)br.effects.push('local_storage');if(before.ss!==after.ss)br.effects.push('session_storage');if(before.url!==after.url)br.effects.push('navigation');if(downloads.length)br.effects.push('download');if(dialogs.length)br.effects.push('dialog');if(popups.length)br.effects.push('popup');
    br.outcome=br.effects.length?'effect':'no_observable_effect';
   }catch(e){br.outcome='error';br.error=String(e)}
   out.buttons.push(br);await p.close();
  }
 }catch(e){out.buttons.push({url:urls[pi],outcome:'page_error',error:String(e)});try{await probe.close()}catch{}}
 if((pi+1)%25===0)console.log(`button pages ${pi+1}/${urls.length}`);
}
await actionContext.close();await browser.close();

const pageCounts={};for(const p of out.pages){for(const k of ['status','mobileStatus']){const v=String(p[k]??'missing');pageCounts[`${k}:${v}`]=(pageCounts[`${k}:${v}`]||0)+1}}
const buttonCounts={};for(const b of out.buttons)buttonCounts[b.outcome]=(buttonCounts[b.outcome]||0)+1;
out.summary={...out.summary,totalPages:out.pages.length,pageCounts,desktopOverflow:out.pages.filter(x=>x.overflow).length,mobileOverflow:out.pages.filter(x=>x.mobileOverflow).length,pageErrors:out.pages.filter(x=>x.error||x.consoleErrors?.length||x.failedRequests?.length).length,badH1:out.pages.filter(x=>x.h1?.length!==1).length,menusFailed:out.pages.filter(x=>x.menu&&!x.menu.worked).length,totalButtons:out.buttons.length,buttonCounts,writesBlocked:out.writeRequestsBlocked.length,completedAt:new Date().toISOString()};
fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/live-user-audit.json',JSON.stringify(out,null,2));
const lines=['# Estate Law Aid live uncached user audit','',`Base: ${BASE}`,`Completed: ${out.summary.completedAt}`,'',`Pages from sitemap: ${out.summary.totalPages}`,`Desktop overflow: ${out.summary.desktopOverflow}`,`Mobile overflow: ${out.summary.mobileOverflow}`,`Bad H1 count: ${out.summary.badH1}`,`Menu failures: ${out.summary.menusFailed}`,`Buttons tested: ${out.summary.totalButtons}`,`Button outcomes: ${JSON.stringify(buttonCounts)}`,`Write requests blocked: ${out.summary.writesBlocked}`,'','## No-observable-effect buttons',...out.buttons.filter(x=>x.outcome==='no_observable_effect').map(x=>`- ${x.url} — ${x.label||'(unnamed)'}`),'','## Page errors',...out.pages.filter(x=>x.error||x.consoleErrors?.length||x.failedRequests?.length).map(x=>`- ${x.url} — ${x.error||JSON.stringify(x.consoleErrors||x.failedRequests)}`)];
fs.writeFileSync('audit-output/live-user-audit.md',lines.join('\n'));
console.log(JSON.stringify(out.summary,null,2));