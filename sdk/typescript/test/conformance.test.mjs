import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parse,validate} from '../dist/index.js';
import {validateFile} from '../dist/node.js';
import {parseIrdb,importIrdb} from '../dist/irdb.js';
import {fixture,csv,identity,header} from './fixtures.mjs';

// Each mutation isolates a v1 boundary or semantic rule. Comparing both validators
// catches schema drift as well as mistakes in the small semantic layer.
const cases=[];
function add(name,mutate){const r=fixture();mutate?.(r);cases.push({name,text:JSON.stringify(r)});}
add('baseline');
for(const key of ['format','format_version','record_kind','id','updated','remote','locale','commands','provenance','validation'])add(`missing ${key}`,r=>delete r[key]);
for(const [field,max] of [['name',120],['manufacturer',80],['model',100],['variant',80],['remote_model_number',100]])for(const n of [1,max,max+1])add(`${field} ${n} Unicode points`,r=>r.remote[field]='💡'.repeat(n));
for(const value of [-2147483649,-2147483648,-1,0,4294967295,4294967296,1.5])add(`parameter ${value}`,r=>r.commands[0].signals[0].parameters.value=value);
for(const value of ['0x00','0xFFFFFFFFFFFFFFFF','0x'+'F'.repeat(1022),'0x'+'F'.repeat(1023),'ff','0xGG'])add(`hex ${value.slice(0,25)} length${value.length}`,r=>r.commands[0].signals[0].parameters.wide_hex=value);
for(const n of [0,1,128,129])add(`command count ${n}`,r=>r.commands=Array.from({length:n},(_,i)=>({...structuredClone(r.commands[0]),id:`button.${i}`})));
for(const n of [120,121])add(`translated label ${n}`,r=>r.commands[0].labels.fr='é'.repeat(n));
for(const value of [0,0.1,1,1.1])add(`duty ${value}`,r=>r.defaults.duty_cycle=value);
for(const value of [999,1000,1000000,1000001])add(`carrier ${value}`,r=>r.defaults.carrier_hz=value);
for(const value of ['2026-09-13','2026-02-30','2024-02-29','2025-02-29','2026-9-13','not-a-date','0000-01-01','0001-01-01','9999-12-31','2026-09-13\n'])add(`date ${value}`,r=>r.updated=value);
for(const value of ['https://example.org/path','urn:example:test','relative/path','https://exa mple.org'])add(`URI ${value}`,r=>r.export_source={application:'test',version:'0',url:value});
for(const value of ['2026-09-13T10:10:10Z','2026-09-13t10:10:10z','2026-02-30T10:10:10Z','not-a-time','0000-01-01T00:00:00Z','0001-01-01T00:00:00Z','2026-09-13 10:10:10Z','2026-09-13T10:10:10+01','2026-09-13T23:59:60Z','2026-09-13T10:10:10+23:59','2026-09-13T10:10:10+24:00','2026-09-13T10:10:10Z\n','2026-09-13T10:10:10Z\r\n','2026-09-13T10:10:10.123456Z'])add(`timestamp ${value}`,r=>r.export_source={application:'test',version:'0',exported_at:value});
for(const path of ['provenance','validation'])add(`invalid date at ${path}`,r=>{if(path==='provenance')r.provenance[0].imported_at='0000-01-01';else r.validation.tested_at='0000-01-01';});
add('duplicate IDs',r=>r.commands[1].id=r.commands[0].id);
add('ID newline',r=>r.commands[0].id='power.toggle\n');
add('unknown direct incomplete',r=>{r.commands[0].signals[0].protocol='unknown';r.commands[0].signals[0].source_complete=false;});
add('unknown inherited complete',r=>r.defaults.protocol='unknown');
add('missing protocol',r=>delete r.defaults.protocol);
add('missing raw carrier',r=>delete r.defaults.carrier_hz);
add('null protocol',r=>r.commands[0].signals[0].protocol=null);
add('raw direct overrides',r=>{r.commands[1].signals[0].carrier_hz=40000;delete r.defaults.carrier_hz;});
for(const timings of [[1,-1],[1],[-1,1],[0,-1],[1,-1,1],Array.from({length:4096},(_,i)=>i%2?-1:1),Array.from({length:4098},(_,i)=>i%2?-1:1)])add(`timings ${timings.length} ${timings[0]}`,r=>r.commands[1].signals[0].intro_us=timings);
for(const count of [8192,12288])add(`total timings ${count}`,r=>{const s=r.commands[1].signals[0];s.intro_us=Array.from({length:4096},(_,i)=>i%2?-1:1);s.repeat_us=[...s.intro_us];if(count>8192)s.ending_us=[...s.intro_us];});
add('two primaries',r=>r.commands[0].signals.push({...r.commands[0].signals[0]}));
add('zero primaries',r=>r.commands[0].signals[0].primary=false);
add('Pronto',r=>r.commands[0].signals=[{kind:'pronto',primary:true,source_complete:false,pronto_hex:'0000 006D 0000 0000'}]);
add('decoded plus raw payload',r=>r.commands[0].signals[0].intro_us=[1,-1]);
for(const n of [64,65])add(`extension array ${n}`,r=>r.extensions.extra=Array(n).fill(1));
for(const n of [12,14,15])add(`extension depth ${n}`,r=>{let v=0;for(let i=0;i<n;i++)v={x:v};r.extensions.extra=v;});
for(const n of [32,33])add(`extension properties ${n}`,r=>r.extensions.extra=Object.fromEntries(Array.from({length:n},(_,i)=>[`x${i}`,i])));
for(const text of ['{"x":1,"x":2}','{"x":NaN}','{"x":Infinity}','{"x":1e999}','\uFEFF{}',' '.repeat(1048576)+'{}'])cases.push({name:`text ${text.slice(0,30)}`,text});
for(const source of [csv,header+'T,NEC,1,-1,2\n'.repeat(128)])cases.push({name:'irdb output',text:JSON.stringify(importIrdb(parseIrdb(source),identity).record)});

test(`Python authority parity for ${cases.length} synthetic acceptance cases`,()=>{
  const result=JSON.parse(execFileSync('python',['test/oracle.py'],{input:JSON.stringify(cases.map(c=>c.text)),encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUTF8:'1'}}));
  const differences=[];
  cases.forEach((c,i)=>{let js=true;try{parse(c.text);}catch{js=false;}if(js !== (result[i].length===0))differences.push({name:c.name,js,python:result[i]});});
  assert.deepEqual(differences,[]);
});
test('documented numeric precision safeguard is stricter than Python',()=>{
  const text=JSON.stringify(fixture()).replace('"carrier_hz":38000','"carrier_hz":38000,"duty_cycle":0.10000000000000001');
  const [errors]=JSON.parse(execFileSync('python',['test/oracle.py'],{input:JSON.stringify([text]),encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUTF8:'1'}}));
  assert.equal(errors.length,0);assert.throws(()=>parse(text),e=>e.issues.some(i=>i.code==='precision'));
});
test('full file validation checks synthetic image assets; browser reports them unchecked',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'open-ir-sdk-'));
  try{
    const script='from PIL import Image; import sys; Image.new("RGB",(240,240),"white").save(sys.argv[1],"WEBP")';
    const imagePath=join(directory,'remote.webp');execFileSync('python',['-c',script,imagePath]);
    const bytes=await readFile(imagePath),{createHash}=await import('node:crypto');
    const r=fixture();r.image={path:'remote.webp',media_type:'image/webp',width_px:240,height_px:240,size_bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),background:'plain-white',rights:{basis:'public-domain',holder:'Synthetic test',notice:'Generated solid white fixture'},alt:'Synthetic white square'};
    const path=join(directory,'remote.irr');await writeFile(path,JSON.stringify(r));
    assert.equal(validate(r).assets,'unchecked');assert.equal((await validateFile(path)).valid,true);
    await rm(imagePath);assert.equal((await validateFile(path)).valid,false);
  }finally{await rm(directory,{recursive:true,force:true});}
});
