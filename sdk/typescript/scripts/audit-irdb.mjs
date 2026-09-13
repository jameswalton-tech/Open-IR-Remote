import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {tryImportIrdb} from '../dist/irdb.js';
// Supply an existing, locally licensed checkout. This script performs no download.
const root=process.argv[2];
if (!root) throw new Error('Usage: node scripts/audit-irdb.mjs PATH_TO_IRDB_CHECKOUT');
const packageRoot=fileURLToPath(new URL('../',import.meta.url));
const revision=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
async function walk(path){const list=[];for(const e of await readdir(path,{withFileTypes:true})){const p=join(path,e.name);if(e.isDirectory())list.push(...await walk(p));else if(p.endsWith('.csv'))list.push(p);}return list;}
const counts={}, records=[];let ignored=0;
for(const path of await walk(join(root,'codes'))){
  const result=tryImportIrdb(await readFile(path),{id:'oir:example:audit',remote:{name:'Unidentified source collection',manufacturer:'Unknown',model:'Unknown',variant:'Unverified',device_types:['other']},locale:'en',importedAt:'2026-09-13',sourcePath:path.slice(root.length+1).replaceAll('\\','/'),sourceRevision:revision,identityNotes:'Read-only software audit. No physical handset identity inferred or asserted.'});
  if(result.status==='accepted')records.push(JSON.stringify(result.result.record));
  else{ignored++;for(const code of new Set(result.diagnostics.map(d=>d.code)))counts[code]=(counts[code]??0)+1;}
}
// Transient migration records are passed to the authority and immediately discarded.
// Only counts are saved. No upstream CSV or derivative signal data enters the SDK.
const results=JSON.parse(execFileSync('python',['test/oracle.py'],{cwd:packageRoot,input:JSON.stringify(records),encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUTF8:'1'}}));
const summary={revision,files:records.length+ignored,accepted:records.length,ignored,ignoredReasonFileCounts:counts,pythonValidated:results.filter(e=>!e.length).length,pythonRejected:results.filter(e=>e.length).length,identity:'Explicit unknown identity used for audit only. No physical remote records published.',dataSaved:false};
console.log(JSON.stringify(summary,null,2));
