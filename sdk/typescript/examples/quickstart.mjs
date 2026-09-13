import {readFile,writeFile} from 'node:fs/promises';
import {parse,serialize,effectiveSignal,assessCapabilities,OpenIrError} from '../dist/index.js';
import {tryImportIrdb,restoreIrdbSource} from '../dist/irdb.js';

// This file contains invented readings for API demonstration. They are not a
// capture from a real handset and must not be used as a playback qualification.
const text=await readFile(new URL('./remote.irr.json',import.meta.url),'utf8');
try {
  const remote=parse(text);
  const originalId=remote.commands[0].id;
  remote.remote.name='Renamed synthetic handset';
  remote.commands[0].labels.en='Changed display label';
  const compact=serialize(remote);
  console.log('Stable command ID:',parse(compact).commands[0].id===originalId);
  console.log('Compact UTF-8 bytes:',Buffer.byteLength(compact));
  console.log('Resolved protocol:',effectiveSignal(remote,remote.commands[0].signals[0]).protocol);

  // Target capability policy belongs to the application. The original remote,
  // all alternate representations, translations and metadata remain available.
  const capabilities=assessCapabilities(remote,signal=>signal.kind==='raw' ? null : 'This example adapter has no decoded or Pronto renderer');
  console.log('Unsupported representations:',capabilities.unsupported);

  // Parsing preserves this mapping as data. A receiver adapter would need to
  // verify the namespace version, receiver identity and available slots, present
  // a restore preview, then perform a separately authorised hardware operation.
  // Merely finding a binding here must never change receiver configuration.
  const mapping=remote.extensions['example.receiver.v1'];
  console.log('Inert receiver mapping:',mapping);

  const csv=await readFile(new URL('./complete.irdb.csv',import.meta.url),'utf8');
  const result=tryImportIrdb(csv,{
    id:'oir:example:synthetic-import',
    remote:{name:'Unidentified synthetic handset',manufacturer:'Unknown',model:'Unknown',variant:'Unverified',device_types:['other']},
    locale:'en',importedAt:'2026-09-13',sourcePath:'synthetic:complete.irdb.csv',sourceRevision:'synthetic-v1',
    identityNotes:'Invented collection for this example. No physical handset model has been established.'
  });
  if(result.status==='ignored') console.log('Submission ignored:',result.diagnostics);
  else {
    console.log('Accepted commands:',result.result.record.commands.length);
    const source=restoreIrdbSource(result.result.record);
    console.log('Exact source restoration:',source.csv===csv);
    console.log('CSV restoration scope:',source.losses);
  }
} catch(error) {
  if(error instanceof OpenIrError) console.error(error.issues);
  else throw error;
}
