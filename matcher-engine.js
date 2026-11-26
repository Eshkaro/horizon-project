(function(root){
 'use strict';
 const ROLES={
  urban:{label:'Urban planning & local pilots',terms:['urban','city','cities','municipal','municipalities','planning','spatial','neighbourhood','neighborhood']},
  environment:{label:'Environment & biodiversity',terms:['environment','environmental','biodiversity','ecosystem','ecosystems','nature','ecological','restoration','green']},
  energy:{label:'Energy & climate technology',terms:['energy','renewable','renewables','climate','carbon','decarbonisation','decarbonization','emissions','electricity']},
  policy:{label:'Policy & social inclusion',terms:['policy','policies','governance','inclusion','inequality','inequalities','gender','welfare','social','equity']},
  survey:{label:'Surveys & behavioural research',terms:['survey','surveys','behaviour','behavioural','behavior','behavioral','experiment','experiments','perception','perceptions','citizen','citizens']},
  digital:{label:'Data & digital methods',terms:['data','digital','algorithm','algorithms','modelling','modeling','machine','artificial','intelligence','analytics']},
  health:{label:'Health & clinical research',terms:['health','healthcare','clinical','medical','patient','patients','disease','hospital','hospitals','epidemiology']},
  finance:{label:'Finance & economic evaluation',terms:['finance','financial','economic','economics','investment','investments','cost','costs','evaluation','funding']}
 };
 function normalise(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
 function terms(s,stop){return [...new Set((normalise(s).match(/[a-z]{3,}/g)||[]).filter(t=>!stop.has(t)))];}
 function createEngine(data){
  const stop=new Set(data.stopWords), N=data.projects.length;
  const variants=t=>[t,...(t.endsWith('ies')?[t.slice(0,-3)+'y']:t.endsWith('s')&&t.length>4?[t.slice(0,-1)]:[t+'s'])].filter(x=>Object.prototype.hasOwnProperty.call(data.index,x));
  function posting(term){return [...new Set(variants(term).flatMap(v=>data.index[v]))];}
  function groupMatch(key,project){return ROLES[key]?.terms.some(t=>variants(t).some(v=>data.index[v].includes(project)))||false;}
  const roleSets=Object.fromEntries(Object.keys(ROLES).map(key=>[key,new Set(ROLES[key].terms.flatMap(posting))]));
  function search(options){
   const queryTerms=terms(options.idea,stop), recognised=queryTerms.filter(t=>posting(t).length);
   if(!queryTerms.length)return {results:[],reason:'Describe your project idea using a few specific research terms.',recognised:[]};
   if(!recognised.length)return {results:[],reason:'No project evidence matches these terms. Try a more specific English research description.',recognised:[]};
   const researcher=data.researchers.find(r=>r.id===options.researcher), profileTerms=options.researcher==='custom'?terms(String(options.profileExpertise||'').slice(0,1500),stop):researcher?terms(researcher.keywords.join(' '),stop):[];
   const weights=queryTerms.map(t=>Math.log(1+(N+1)/(posting(t).length+1))), denominator=weights.reduce((s,w)=>s+w,0);
   const matches=new Map();
   queryTerms.forEach((t,i)=>posting(t).forEach(pi=>{if(!matches.has(pi))matches.set(pi,{value:0,terms:[]});matches.get(pi).value+=weights[i];matches.get(pi).terms.push(t);}));
   const profiles=new Map();profileTerms.forEach(t=>posting(t).forEach(pi=>profiles.set(pi,(profiles.get(pi)||0)+1)));
   const roles=(options.roles||[]).filter(k=>ROLES[k]), scored=[];
   matches.forEach((m,pi)=>{
    const p=data.projects[pi];
    if(options.currentOnly && (p.start>options.referenceDate || p.end<options.referenceDate))return;
    const subject=m.value/denominator;
    // Do not retrieve organisations on profile keywords alone or a single incidental term.
    if(subject<0.12 || (queryTerms.length>=4 && m.terms.length<2))return;
    scored.push({pi,subject,matched:m.terms,profile:profileTerms.length?(profiles.get(pi)||0)/profileTerms.length:0,roles:roles.filter(k=>roleSets[k].has(pi))});
   });
   const candidates=new Map();
   scored.forEach(e=>data.projects[e.pi].orgs.forEach(oi=>{if(!candidates.has(oi))candidates.set(oi,[]);candidates.get(oi).push(e);}));
   const results=[];
   candidates.forEach((evidence,oi)=>{
    const org=data.organisations[oi];
    if(org.id==='999838850' || (options.country&&org.country!==options.country) || (options.type&&org.type!==options.type))return;
    if(options.connection==='new'&&org.bocconiProjects.length || options.connection==='existing'&&!org.bocconiProjects.length)return;
    const sorted=[...evidence].sort((a,b)=>b.subject-a.subject || b.profile-a.profile || a.pi-b.pi);
    // All score components use this same set of up to three cited records.
    const top=sorted.slice(0,3), covered=[...new Set(top.flatMap(e=>e.roles))];
    if(roles.length&&!covered.length)return;
    const subject=top[0].subject, gap=roles.length?covered.length/roles.length:0, profile=Math.max(...top.map(e=>e.profile));
    const components=roles.length?{idea:60*subject,gaps:30*gap,profile:10*profile}:{idea:80*subject,gaps:0,profile:20*profile};
    const score=Math.min(100,Math.round(components.idea+components.gaps+components.profile));
    results.push({org,score,components,covered,missing:roles.filter(k=>!covered.includes(k)),evidence:top.map(e=>({...e,project:data.projects[e.pi]})),matchingProjects:evidence.length});
   });
   results.sort((a,b)=>b.score-a.score || b.components.idea-a.components.idea || a.org.name.localeCompare(b.org.name));
   return {results,recognised,unrecognised:queryTerms.filter(t=>!recognised.includes(t)),queryTerms,reason:results.length?'':'No candidates meet these filters and evidence requirements. Broaden the country, organisation type or missing expertise.'};
  }
  return {search};
 }
 const api={ROLES,normalise,terms,createEngine};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ConsortiumMatcher=api;
})(typeof window!=='undefined'?window:this);
