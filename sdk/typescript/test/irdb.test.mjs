import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseIrdb,importIrdb,tryImportIrdb,restoreIrdbSource} from '../dist/irdb.js';
import {parse,serialize,OpenIrError} from '../dist/index.js';
import {csv,header,identity,fixture} from './fixtures.mjs';
const ignored=(source,code)=>{
  const result=tryImportIrdb(source,identity);
  assert.equal(result.status,'ignored');
  assert.ok(result.diagnostics.some(d=>d.code===code),JSON.stringify(result));
  assert.equal('record' in result,false);
};

test('complete irdb quoted commas/newlines, Unicode, exact numbers, sentinels, variants and duplicates',()=>{
  const c=parseIrdb(csv);assert.equal(c.rows.length,3);assert.equal(c.diagnostics.length,0);
  assert.equal(c.rows[0].cells[0],'Power, "main"\nÉclair');assert.equal(c.rows[0].cells[2],'0001');
  const accepted=tryImportIrdb(csv,identity);assert.equal(accepted.status,'accepted');
  const {record,losses}=accepted.result,cmds=record.commands;assert.deepEqual(losses,[]);
  assert.equal(cmds[0].signals[0].protocol,'NEC1');assert.equal(cmds[1].signals[0].protocol,'NEC2');
  assert.deepEqual({...cmds[0].signals[0].parameters},{device:1,subdevice:-1,function:2});
  assert.equal(cmds[0].signals[0].source_complete,false);
  assert.notEqual(cmds[1].id,cmds[2].id);assert.equal(cmds.length,3);
  assert.equal(restoreIrdbSource(parse(serialize(record))).csv,csv);
  assert.ok(record.provenance[0].rights.includes('Simon Peter'));assert.ok(!record.provenance[0].rights.includes('CC0'));
});
test('headerless, duplicate headers, tab headers and unknown headers are ignored',()=>{
  const row='Test,NEC,1,-1,2\n';ignored(row,'csv-header');
  for(const bad of ['function,protocol,device,subdevice,function\n','functionname\tprotocol,device,subdevice,function\n','a,b,c,d,e\n']){
    ignored(bad+row,'csv-header');
    assert.throws(()=>importIrdb(parseIrdb(bad+row,{header:'replace'}),identity),e=>e.issues[0].code==='incompatible-header');
  }
  assert.throws(()=>importIrdb(parseIrdb(row,{header:'absent'}),identity),OpenIrError);
});
test('one incomplete or malformed row ignores the whole submission without importing valid neighbours',()=>{
  for(const [row,code] of [['Test,Denon-K,4.1,945\n','csv-columns'],['Test,,1,-1,2\n','missing-value'],['Test,unknown,1,-1,2\n','missing-value'],['Test,NEC,1,,2\n','missing-value'],[',NEC,1,-1,2\n','blank-label'],['  ,NEC,1,-1,2\n','blank-label'],['Test,NEC,4.1,-1,2\n','numeric-syntax'],['Test,NEC,4294967296,-1,2\n','numeric-range'],['"bad,NEC,1,-1,2\n','csv-quote'],['"bad"x,NEC,1,-1,2\n','csv-quote'],['ba"d,NEC,1,-1,2\n','csv-quote']]){
    ignored(header+'Valid,NEC,1,-1,2\n'+row,code);
  }
});
test('128 rows are accepted; 129 and 2499 rows are ignored with no automatic selection',()=>{
  assert.equal(tryImportIrdb(header+'Same,NEC,1,-1,2\n'.repeat(128),identity).status,'accepted');
  for(const n of [129,2499]){
    const source=header+'Same,NEC,1,-1,2\n'.repeat(n);ignored(source,'submission-size');
    // Extra JS arguments cannot re-enable a removed row-selection path.
    assert.throws(()=>importIrdb(parseIrdb(source),identity,[0]),e=>e.issues.some(i=>i.code==='submission-size'));
  }
});
test('assigned IDs survive renames and saved canonical IDs are honoured',()=>{
  const a=importIrdb(parseIrdb(csv),{...identity,commandIds:{2:'power.toggle'}}).record;
  a.remote.name='Renamed';a.commands[0].labels.en='Changed';a.commands[0].labels.fr='Allumer';a.extensions.vendor={slot:9};
  assert.equal(parse(serialize(a)).commands[0].id,'power.toggle');
  const restored=restoreIrdbSource(a);assert.equal(restored.csv,csv);assert.equal(restored.losses[0].code,'source-snapshot-only');
});
test('incompatible schema values, missing identity and empty submissions are ignored',()=>{
  const long=header+'X'.repeat(121)+',NEC,1,-1,2\n';ignored(long,'schema.maxLength');
  assert.equal(tryImportIrdb(csv,{...identity,identityNotes:''}).status,'ignored');
  assert.throws(()=>restoreIrdbSource(fixture()),OpenIrError);
  ignored(header,'submission-size');ignored('','csv-header');
});
test('complete CSV with CRLF, no final newline and escaped quotes round trips; extra columns do not',()=>{
  for(const source of [header+'Test,NEC,001,-1,002',header+'"A""B",NEC,1,-1,2\r\n']){
    assert.equal(restoreIrdbSource(importIrdb(parseIrdb(source),identity).record).csv,source);
  }
  ignored(header+'A,NEC,1,-1,2,\n','csv-columns');
});
