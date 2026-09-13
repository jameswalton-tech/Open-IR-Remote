import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// The SDK is also usable outside this repository. Inside it, CI must reject an
// authority update until the SDK is deliberately repinned and requalified.
const repositorySchema=new URL('../../../schema/open-ir-remote-v1.schema.json',import.meta.url);
test('SDK authority copies match the main repository byte for byte',{skip:!existsSync(fileURLToPath(repositorySchema))},async()=>{
  for(const path of ['schema/open-ir-remote-v1.schema.json','tools/validate.py']){
    const pinned=await readFile(new URL('../vendor/'+path,import.meta.url));
    const current=await readFile(new URL('../../../'+path,import.meta.url));
    assert.deepEqual(pinned,current,`SDK authority drift: ${path}`);
  }
});
