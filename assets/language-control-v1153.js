(function(global){
"use strict";
const VERSION="1.1.53";
const PHASE="ENGLISH_BUILD";
const ACTIVE_LANGUAGE="en";
const FLAGS=Object.freeze({en:true,es:false,additional:false});
const FUTURE_ROUTE_STRATEGY=Object.freeze({spanishPrefix:"/es/",additionalPrefix:"/lang/{code}/",publicActivation:false});
function languageState(){return {version:VERSION,phase:PHASE,activePublicLanguage:ACTIVE_LANGUAGE,activePublicLanguages:[ACTIVE_LANGUAGE],featureFlags:{...FLAGS},publicSwitcherRendered:false,alternateLanguageRoutesActive:false,hreflangActive:false,englishOperationIndependent:true,spanishState:"SPANISH_DEFERRED",additionalLanguageState:"ADDITIONAL_LANGUAGE_DEFERRED",futureRouteStrategy:{...FUTURE_ROUTE_STRATEGY}};}
function isAlternateLanguagePath(path){const p=String(path||"").toLowerCase();return p==="/es"||p.startsWith("/es/")||p.startsWith("/spanish/")||p.startsWith("/lang/");}
function activationGate(input={}){const required=["ownerAuthorized","englishLaunchAccepted","completeJourneysTranslated","qualifiedReviewComplete","officialSourcesReverified","errorAndRecoveryTranslationComplete","versionAlignmentComplete","mixedLanguageFailuresZero","accessibilityAcceptanceComplete","supportReady","seoGraphCorrect","exactArtifactAcceptanceComplete","rollbackVerified"];const checks={};for(const k of required)checks[k]=input[k]===true;return {version:VERSION,phase:PHASE,eligible:required.every(k=>checks[k]),checks,publicActivation:false,reason:required.every(k=>checks[k])?"Owner authorization is still separately required for activation.":"Spanish and additional languages remain inactive until every gate is complete."};}
function enforceEnglishDocument(doc){if(!doc||!doc.documentElement)return languageState();doc.documentElement.setAttribute("lang","en");doc.documentElement.dataset.languagePhase=PHASE;doc.documentElement.dataset.activeLanguage=ACTIVE_LANGUAGE;doc.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el=>el.remove());doc.querySelectorAll('[data-language-option]').forEach(el=>{const code=(el.getAttribute('data-language-option')||'').toLowerCase();if(code&&code!=="en"){el.setAttribute("hidden","");el.setAttribute("aria-hidden","true");if("disabled" in el)el.disabled=true;el.removeAttribute("href");}});return languageState();}
function init(){if(typeof document!=="undefined"){enforceEnglishDocument(document);try{document.dispatchEvent(new CustomEvent("estate-language-control-ready",{detail:languageState()}));}catch(_error){}}}
if(typeof module!=="undefined"&&module.exports)module.exports={VERSION,PHASE,ACTIVE_LANGUAGE,FLAGS,FUTURE_ROUTE_STRATEGY,languageState,isAlternateLanguagePath,activationGate,enforceEnglishDocument};
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();}
global.EstateLawAidLanguageControlV1153={VERSION,PHASE,ACTIVE_LANGUAGE,languageState,activationGate};
})(typeof window!=="undefined"?window:globalThis);
