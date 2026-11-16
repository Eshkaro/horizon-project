'use strict';
const data = window.PORTFOLIO;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = v => v === null ? 'Unavailable' : new Intl.NumberFormat('en-IE', {style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v);
const compact = v => new Intl.NumberFormat('en-IE', {style:'currency',currency:'EUR',notation:'compact',maximumFractionDigits:2}).format(v);
const roleName = r => ({coordinator:'Coordinator',participant:'Participant',associatedPartner:'Associated partner'}[r] || r);
function cutoff(date) {const d = new Date(date+'T00:00:00Z'); const month=d.getUTCMonth(); d.setUTCFullYear(d.getUTCFullYear()+1); if(d.getUTCMonth()!==month)d.setUTCDate(0);return d.toISOString().slice(0,10);}
function phase(p,date) {
  if(p.participationEnded) return 'Participation ended';
  if(/TERMINAT|CANCEL/i.test(p.sourceStatus)) return 'Terminated / cancelled';
  if(!p.start || !p.end) return 'Dates unavailable';
  if(p.start>date) return 'Not started';
  if(p.end<date) return 'Past end date';
  return p.end<=cutoff(date) ? 'Ends within 12 months' : 'Within project dates';
}
function selectedProjects() {
 const normalise=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const terms=normalise($('search').value).trim().split(/\s+/).filter(Boolean);
 return data.projects.filter(p=>{
  const text=normalise([p.id,p.acronym,p.title,p.topics,p.objective,...p.topicTitles,...p.sciencePaths].join(' '));
  return (!$('scheme').value || p.scheme===$('scheme').value) && (!$('role').value || p.role===$('role').value) && terms.every(term=>text.includes(term));
 });
}
function bars(id, items, format) {
 const max=Math.max(1,...items.map(x=>x[1]));
 $(id).innerHTML=items.length ? items.map(([label,value])=>`<div class="bar-row"><div class="bar-label"><span>${esc(label)}</span><strong>${esc(format(value))}</strong></div><div class="track"><div class="fill" style="width:${Math.max(0,value/max*100)}%"></div></div></div>`).join('') : '<p class="empty">No records match these filters.</p>';
}
function render() {
 if(!$('asof').value)return;
 const ps=selectedProjects(), date=$('asof').value;
 const sum=ps.reduce((s,p)=>s+(p.bocconiEU??0),0), missing=ps.filter(p=>p.bocconiEU===null).length;
 const current=ps.filter(p=>['Within project dates','Ends within 12 months'].includes(phase(p,date)));
 const ending=ps.filter(p=>phase(p,date)==='Ends within 12 months').sort((a,b)=>a.end.localeCompare(b.end));
 const metrics=[['Bocconi net EU contribution',compact(sum),`Full grant amounts · ${missing} missing values`],['Funded projects',ps.length,'Signed awards · Horizon Europe only'],['Coordinator roles',ps.filter(p=>p.role==='coordinator').length,'CORDIS participation role'],['Within project dates',current.length,`As of ${date} · ${ending.length} end within 12 months`]];
 $('metrics').innerHTML=metrics.map(([a,b,c])=>`<div class="metric"><p>${esc(a)}</p><strong>${esc(b)}</strong><small>${esc(c)}</small></div>`).join('');
 const schemes=new Map(), themes=new Map();
 ps.forEach(p=>{schemes.set(p.scheme,(schemes.get(p.scheme)||0)+(p.bocconiEU??0)); const fields=new Set(p.sciencePaths.map(path=>path.split('/')[0]));if(!fields.size)fields.add('Unclassified');fields.forEach(f=>themes.set(f,(themes.get(f)||0)+1));});
 bars('schemes',[...schemes].sort((a,b)=>b[1]-a[1]),compact);
 bars('themes',[...themes].sort((a,b)=>b[1]-a[1]),v=>`${v} projects`);
 const ids=new Set(ps.map(p=>p.id));
 const partners=data.partners.map(p=>({...p,shared:p.projects.filter(id=>ids.has(id)).length})).filter(p=>p.shared).sort((a,b)=>b.shared-a.shared || a.name.localeCompare(b.name)).slice(0,6);
 bars('partners',partners.map(p=>[p.name+' · '+p.country,p.shared]),v=>String(v));
 $('expiries').innerHTML=ending.length ? ending.slice(0,5).map(p=>`<div class="expiry"><div><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.acronym)} ↗</a><small>Ends ${esc(p.end)}</small></div><strong>${money(p.bocconiEU)}</strong></div>`).join('')+`<p class="footnote">${ending.length} projects in this window · ${compact(ending.reduce((s,p)=>s+(p.bocconiEU??0),0))} full-grant net contribution${ending.length>5?' · First 5 shown; all appear in the explorer':''}.</p>` : '<p class="empty">No matching projects end within the next 12 months.</p>';
 $('count').textContent=`/ ${ps.length}`;
 $('projects').innerHTML=ps.length ? ps.map(p=>{const state=phase(p,date);return `<tr><td><strong><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.acronym)} ↗</a></strong><small>${esc(p.title)}</small><details><summary>Read objective & source details</summary><p>${esc(p.objective)}</p><p><b>Topics:</b> ${esc(p.topicTitles.join('; '))}<br><b>Source status:</b> ${esc(p.sourceStatus)}<br><b>Consortium EU grant:</b> ${money(p.consortiumEU)}<br><b>CORDIS project:</b> ${esc(p.id)} · Updated ${esc(p.updated)}</p></details></td><td>${esc(roleName(p.role))}<small>${esc(p.scheme)}</small></td><td>${esc(p.start)}<small>to ${esc(p.end)}</small></td><td>${money(p.bocconiEU)}</td><td><span class="pill ${state==='Ends within 12 months'?'ending':state==='Within project dates'?'current':''}">${esc(state)}</span></td></tr>`;}).join('') : '<tr><td colspan="5">No matching projects. Try clearing the filters.</td></tr>';
}
const m=data.metadata;
$('snapshot').textContent=`Retrieved ${m.retrievedUTC.slice(0,10)} · Archive modified ${m.httpLastModified ? new Date(m.httpLastModified).toISOString().slice(0,10) : 'unknown'}`;
$('source-info').innerHTML=`Official <a href="${esc(m.source)}">Horizon Europe bulk CSV archive</a>, retrieved ${esc(m.retrievedUTC)}. HTTP Last-Modified: ${esc(m.httpLastModified||'unavailable')}. ${m.projectCount} distinct Bocconi projects; ${m.missingNetContributions} missing net contribution values. Archive SHA-256 is recorded in the source manifest.`;
[...new Set(data.projects.map(p=>p.scheme))].sort().forEach(s=>{const option=document.createElement('option');option.value=s;option.textContent=s;$('scheme').appendChild(option);});
['search','scheme','role','asof'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
$('reset').addEventListener('click',()=>{$('search').value='';$('scheme').value='';$('role').value='';$('asof').value='2026-10-29';render();});
$('download').addEventListener('click',()=>{
 const fields=['id','acronym','title','role','scheme','start','end','bocconiEU','consortiumEU','sourceStatus','url'];
 // Guard spreadsheet formula interpretation in exported text fields.
 const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const text=[fields.join(','),...selectedProjects().map(p=>fields.map(f=>cell(p[f])).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='bocconi-horizon-filtered.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
