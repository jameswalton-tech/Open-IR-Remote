import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parse,serialize,validate,effectiveSignal,assessCapabilities,OpenIrError} from '../dist/index.js';
import {fixture} from './fixtures.mjs';
const issue=(fn,code,path)=>assert.throws(fn,e=>e instanceof OpenIrError&&e.issues.some(i=>i.code===code&&(!path||i.path===path)));

test('metadata, exact strings, unsigned32, wider hex, raw and decoded survive compact encoding',()=>{
  const record=fixture(), text=serialize(record);
  assert.deepEqual(JSON.parse(text),record);
  assert.equal(text.includes('\n'),false);
  assert.equal(serialize(parse(text)),text);
  assert.equal(parse(text).commands[0].signals[0].parameters.wide_hex,'0x0000FFFFFFFFFFFFFFFF');
});
test('canonical IDs and imported IDs survive handset and translated label renames',()=>{
  const record=parse(serialize(fixture())); record.commands[0].id='effect.rainbow';
  record.remote.name='Renamed handset'; record.commands[0].labels.en='Changed label';
  const after=parse(serialize(record));
  assert.equal(after.commands[0].id,'effect.rainbow'); assert.equal(after.id,'oir:example:synthetic');
  assert.equal(after.commands[0].labels.fr,'Marche / arrêt'); assert.deepEqual(after.extensions,record.extensions);
});
test('no missing-protocol fallback; inherited fields resolve separately without materializing defaults',()=>{
  const record=fixture(), signal=record.commands[0].signals[0]; signal.carrier_hz=40000;
  assert.equal(effectiveSignal(record,signal).protocol,'NEC'); assert.equal(effectiveSignal(record,signal).carrier_hz,40000);
  assert.equal(signal.protocol,undefined); delete record.defaults.protocol;
  assert.equal(validate(record).valid,false);
  signal.protocol='unknown'; signal.source_complete=false; assert.equal(validate(record).valid,true);
  signal.source_complete=true; assert.equal(validate(record).valid,false);
});
test('duplicate escaped keys are detected with field paths before JSON overwrites data',()=>{
  issue(()=>parse('{"extensions":{"a":1,"\\u0061":2}}'),'duplicate-key','/extensions/a');
  issue(()=>parse('{"x":0,"x":1}'),'duplicate-key','/x');
});
test('JSON syntax, UTF8, BOM, nonfinite and lossy numeric tokens fail explicitly',()=>{
  for(const text of ['{"a":NaN}','{"a":Infinity}','{"a":1,}','[1,]','{}{}','{"a":"\n"}','\uFEFF{}']) assert.throws(()=>parse(text),OpenIrError);
  issue(()=>parse(new Uint8Array([0xff])),'utf8');
  issue(()=>parse('{"a":1e999}'),'number','/a');
  issue(()=>parse('{"a":1e-999}'),'precision','/a');
  issue(()=>parse('{"a":0.10000000000000001}'),'precision','/a');
  issue(()=>parse('{"a":9007199254740993}'),'precision','/a');
});
test('programmatic lossy JSON values and getters are rejected without executing them',()=>{
  for(const bad of [NaN,Infinity,undefined,1n,()=>1,new Date(),new Map()]) {const r=fixture();r.extensions.bad=bad;assert.equal(validate(r).valid,false);}
  const r=fixture(); let invoked=false;
  Object.defineProperty(r.extensions,'access',{enumerable:true,get(){invoked=true;return 1;}});
  assert.equal(validate(r).valid,false); assert.equal(invoked,false);
  const cycle=fixture();cycle.extensions.cycle=cycle;assert.equal(validate(cycle).valid,false);
  const sparse=fixture();sparse.extensions.arr=Array(2);assert.equal(validate(sparse).valid,false);
});
test('determinism sorts even numeric object keys, preserves array order and negative zero',()=>{
  const a=fixture();a.extensions.test={'2':2,'10':10,zero:-0};
  const b=Object.fromEntries(Object.entries(a).reverse());assert.equal(serialize(a),serialize(b));
  assert.match(serialize(a),/"10":10,"2":2/);assert.ok(Object.is(parse(serialize(a)).extensions.test.zero,-0));
});
test('code-point bounds, byte ceiling and depth count containers',()=>{
  const r=fixture();r.remote.name='💡'.repeat(120);assert.equal(validate(r).valid,true);
  r.remote.name+='💡';assert.equal(validate(r).valid,false);
  issue(()=>parse(' '.repeat(1048576)+'{}'),'bytes');
  issue(()=>parse('{"x":'.repeat(17)+'0'+'}'.repeat(17)),'depth');
});
test('capability report retains all representations and receiver mappings stay inert',()=>{
  const r=fixture(), before=serialize(r);
  const report=assessCapabilities(r,s=>s.kind==='decoded'?'No verified decoder adapter':null);
  assert.equal(report.unsupported.length,1);assert.equal(report.supported.length,1);
  assert.equal(report.playable,'not-assessed');assert.equal(serialize(r),before);
  assert.equal(parse(before).extensions['example.receiver.v1'].bindings[0].slot,7);
});
test('field-path diagnostics pinpoint missing required fields',()=>{
  const r=fixture();delete r.remote.model;
  assert.ok(validate(r).issues.some(i=>i.path==='/remote/model'));
});
