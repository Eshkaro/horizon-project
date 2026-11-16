'use strict';
(function () {
 const rate = row => row.eligible > 0 ? row.retained / row.eligible : null;
 const aggregate = rows => ({eligible: rows.reduce((s,r)=>s+r.eligible,0),retained:rows.reduce((s,r)=>s+r.retained,0)});
 const order = (rows, by) => [...rows].sort((a,b)=>by==='name'?a.name.localeCompare(b.name):by==='rate'?rate(b)-rate(a):b.eligible-a.eligible);
 if(typeof module!=='undefined' && module.exports){module.exports={rate,aggregate,order};return;}
 const source=window.BENCHMARKS, byId=id=>document.getElementById(id);
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const integer=n=>new Intl.NumberFormat('en-IE').format(n);
 const percent=n=>new Intl.NumberFormat('en-IE',{style:'percent',maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
 const select=byId('benchmark-area');
 source.areas.forEach((r,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=r.name;select.appendChild(option);});
 byId('benchmark-source').href=source.metadata.source;
 byId('benchmark-glossary').href=source.metadata.glossary;
 function renderBenchmarks(){
  const row=select.value==='overall'?source.overall:source.areas[Number(select.value)];
  const p=rate(row), baseline=rate(source.overall), delta=(p-baseline)*100;
  let warning='';
  if(row.name.includes('(EIT)'))warning='Small sample: 43 eligible proposals. The Commission also flags gaps in EIT data availability.';
  else if(row.name.includes('(EIC)'))warning='EIC totals include proposal resubmissions; these are not unique applicants.';
  else if(row.name.includes('(ERC)'))warning='This combines ERC grant types. It is not a Consolidator Grant-specific success rate.';
  byId('benchmark-summary').innerHTML=`<h3>${safe(row.name)}</h3><strong class="benchmark-rate">${percent(p)}</strong><p class="benchmark-baseline">${select.value==='overall'?'Overall historical proposal success rate':`${Math.abs(delta).toFixed(2)} percentage points ${delta>=0?'above':'below'} the Horizon Europe overall rate (${percent(baseline)})`}</p><div class="benchmark-counts"><div><span>ELIGIBLE PROPOSALS</span><strong>${integer(row.eligible)}</strong></div><div><span>RETAINED FOR FUNDING</span><strong>${integer(row.retained)}</strong></div></div><div class="benchmark-track" role="img" aria-label="${percent(p)} retained; ${percent(1-p)} not retained"><span style="width:${p*100}%"></span></div><p class="benchmark-caption">${integer(row.nonSuccessful)} not retained · approximately ${Math.round(p*100)} in every 100 eligible proposals retained.</p>${warning?`<p class="benchmark-special">${safe(warning)}</p>`:''}`;
  const sorted=order(source.areas,byId('benchmark-sort').value);
  byId('benchmark-bars').innerHTML=sorted.map(r=>{const index=source.areas.indexOf(r),selected=String(index)===select.value;return `<button type="button" class="benchmark-row ${selected?'selected':''}" data-benchmark-index="${index}" aria-pressed="${selected}" aria-label="Show ${safe(r.name)} benchmark"><span>${safe(r.name)}</span><span class="benchmark-mini-track"><i style="width:${rate(r)*100}%"></i></span><strong>${percent(rate(r))}</strong></button>`;}).join('');
  byId('benchmark-bars').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{select.value=b.dataset.benchmarkIndex;renderBenchmarks();}));
  byId('benchmark-table').innerHTML=[source.overall,...sorted].map(r=>`<tr><td>${safe(r.name)}</td><td>${integer(r.eligible)}</td><td>${integer(r.retained)}</td><td>${integer(r.nonSuccessful)}</td><td>${percent(rate(r))}</td></tr>`).join('');
 }
 select.addEventListener('change',renderBenchmarks);byId('benchmark-sort').addEventListener('change',renderBenchmarks);renderBenchmarks();
})();
