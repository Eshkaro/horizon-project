const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {rate,aggregate,order}=require('../benchmarks.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/proposal-benchmarks.json'),'utf8'));
assert.deepEqual(aggregate(data.areas),{eligible:184441,retained:26072});
assert.equal(data.overall.eligible,data.overall.retained+data.overall.nonSuccessful);
for(const row of data.areas){assert.equal(row.eligible,row.retained+row.nonSuccessful);assert.ok(Math.abs(rate(row)-row.exportedRate)<1e-12);}
// Unequal group sizes must produce a weighted aggregate, not a mean of percentages.
assert.equal(rate(aggregate([{eligible:10,retained:9},{eligible:990,retained:1}])),0.01);
assert.equal(rate({eligible:0,retained:0}),null);
assert.equal(order(data.areas,'rate')[0].name,'The European Institute of Innovation and Technology (EIT)');
assert.equal(order(data.areas,'volume')[0].name,'Marie Skłodowska-Curie Actions (MSCA)');
assert.equal(data.frameworks.reduce((s,r)=>s+r.eligible,0),605861);
assert.equal(data.frameworks.reduce((s,r)=>s+r.retained,0),85390);
console.log('Benchmark totals, source rates, weighted aggregation and sorting verified.');
