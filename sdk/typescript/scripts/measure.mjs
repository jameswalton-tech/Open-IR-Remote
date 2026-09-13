import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,brotliCompressSync} from 'node:zlib';
import {fixture,csv,identity} from '../test/fixtures.mjs';
import {serialize} from '../dist/index.js';
import {parseIrdb,importIrdb} from '../dist/irdb.js';
const files={};
for(const path of ['dist/browser.js','dist/irdb.browser.js','src/schema-validator.js','vendor/schema/open-ir-remote-v1.schema.json']){
  const bytes=await readFile(path);files[path]={bytes:bytes.length,gzip:gzipSync(bytes).length,brotli:brotliCompressSync(bytes).length};
}
// npm's CLI path differs by host, so ask the caller to run pack separately. This
// report measures the deliverable bundles and an identical synthetic value tree.
const normal=fixture(), imported=importIrdb(parseIrdb(csv),identity).record;
const result={node:process.version,platform:process.platform,runtimeDependencies:0,files,examples:{normal:{prettyUtf8:Buffer.byteLength(JSON.stringify(normal,null,2)),compactUtf8:Buffer.byteLength(serialize(normal))},irdb:{sourceCsvUtf8:Buffer.byteLength(csv),compactWithArchiveUtf8:Buffer.byteLength(serialize(imported))}},notes:['Browser bundles include the compiled pinned schema and its helper code.','The irdb bundle also includes the core validator; do not add bundle sizes if bundling shared modules together.','gzip and Brotli use Node defaults. Transfer bytes are not runtime RAM measurements.','No protocol renderer, hardware adapter, Python interpreter or Python dependencies are included in browser bundles.']};
await writeFile('FOOTPRINT.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
