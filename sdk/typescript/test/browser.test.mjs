import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fixture,csv,identity} from './fixtures.mjs';

test('browser bundles run in a context with Web APIs and no Node globals',()=>{
  const script=`
    import vm from 'node:vm';
    import fs from 'node:fs';
    const input=JSON.parse(fs.readFileSync(0,'utf8'));
    const context=vm.createContext({TextEncoder,TextDecoder,structuredClone});
    for(const [file,run] of [
      ['dist/browser.js',m=>m.namespace.serialize(m.namespace.parse(input.record))],
      ['dist/irdb.browser.js',m=>m.namespace.restoreIrdbSource(m.namespace.importIrdb(m.namespace.parseIrdb(input.csv),input.identity).record).csv]
    ]) {
      const module=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});
      await module.link(()=>{throw Error('Unexpected external browser dependency');});
      await module.evaluate();
      console.log(JSON.stringify(run(module)));
    }
  `;
  const lines=execFileSync(process.execPath,['--experimental-vm-modules','--input-type=module','-e',script],{input:JSON.stringify({record:JSON.stringify(fixture()),csv,identity}),encoding:'utf8',env:{...process.env,NODE_NO_WARNINGS:'1'}}).trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(JSON.parse(lines[0]),fixture());assert.equal(lines[1],csv);
});
