const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createEngine,ROLES}=require('../matcher-engine.js');
const corpus=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/matcher-corpus.json'),'utf8'));
const engine=createEngine(corpus);
const base={researcher:'bosetti',idea:'Climate resilience and social inclusion through access to urban green spaces',roles:['urban','environment','survey'],country:'',type:'',connection:'any',currentOnly:false,referenceDate:'2026-11-26'};
const found=engine.search(base);
assert.ok(found.results.length>=5);
assert.equal(new Set(found.results.map(r=>r.org.id)).size,found.results.length);
const orgMap=new Map(corpus.organisations.map((o,i)=>[o.id,i]));
for(const result of found.results){
 assert.notEqual(result.org.id,'999838850');
 assert.ok(result.evidence.length<=3);
 assert.ok(result.covered.length);
 assert.equal(result.score,Math.min(100,Math.round(Object.values(result.components).reduce((s,x)=>s+x,0))));
 for(const e of result.evidence)assert.ok(e.project.orgs.includes(orgMap.get(result.org.id)));
 for(const role of result.covered){
  assert.ok(result.evidence.some(e=>ROLES[role].terms.some(t=>(corpus.index[t]||[]).includes(e.pi)||(corpus.index[t+'s']||[]).includes(e.pi))));
 }
}
const italy=engine.search({...base,country:'IT',type:'HES'}).results;
assert.ok(italy.length);assert.ok(italy.every(r=>r.org.country==='IT'&&r.org.type==='HES'));
const existing=engine.search({...base,connection:'existing'}).results;
assert.ok(existing.length);assert.ok(existing.every(r=>r.org.bocconiProjects.length));
assert.ok(engine.search({...base,connection:'new'}).results.every(r=>!r.org.bocconiProjects.length));
const active=engine.search({...base,currentOnly:true}).results;
assert.ok(active.every(r=>r.evidence.every(e=>e.project.start<=base.referenceDate&&e.project.end>=base.referenceDate)));
assert.equal(engine.search({...base,idea:'zzzxxyyqq'}).results.length,0);
assert.equal(engine.search({...base,idea:'the and for'}).results.length,0);
assert.equal(engine.search({...base,idea:'constructor'}).results.length,0);
assert.deepEqual(engine.search(base).results.slice(0,5).map(r=>r.org.id),found.results.slice(0,5).map(r=>r.org.id));
assert.ok(corpus.projects.every(p=>p.orgs.length>=2&&p.orgs.every(i=>i>=0&&i<corpus.organisations.length)));
assert.ok(corpus.researchers.length>=5&&corpus.researchers.every(r=>r.source.startsWith('https://')));
console.log(`Matcher checked: ${found.results.length} candidates; membership evidence, filters, score accounting, dates, empty states and deterministic ordering pass.`);
console.log('Top five:',found.results.slice(0,5).map(r=>r.org.name+' ('+r.score+')').join('; '));

// Custom expertise follows exactly the same scoring path as equivalent starter keywords.
const starter=corpus.researchers.find(r=>r.id==='bosetti');
const custom=engine.search({...base,researcher:'custom',profileExpertise:starter.keywords.join(' ')});
assert.deepEqual(custom.results,found.results);
const different=engine.search({...base,researcher:'custom',profileExpertise:'clinical medical patients healthcare'});
assert.ok(different.results.some(r=>r.components.profile!==found.results.find(x=>x.org.id===r.org.id)?.components.profile));
assert.equal(engine.search({...base,researcher:'custom',profileExpertise:'climate energy',idea:'zzzxxyyqq'}).results.length,0);
assert.deepEqual(engine.search(base).results,found.results);
console.log('Custom expertise affects profile scoring without changing source profiles or bypassing idea evidence.');
