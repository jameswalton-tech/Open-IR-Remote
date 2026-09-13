import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
/** Exact authority result, including WebP existence, dimensions, size and digest. */
export interface FileValidation { valid: boolean; scope: 'record-and-assets'; issues: string[] }
/**
 * Run the unmodified pinned Python validate_record against a local file. Python
 * must have the versions in requirements.txt. Missing Python/dependencies reject
 * the promise as an environment failure, rather than reporting an invalid record.
 * Filenames are passed as arguments without a shell. No assets are downloaded.
 */
export async function validateFile(path: string, python = 'python'): Promise<FileValidation> {
  const bridge = fileURLToPath(new URL('../vendor/bridge.py',import.meta.url));
  const {stdout} = await promisify(execFile)(python,[bridge,path],{maxBuffer:4*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUTF8:'1'}});
  const issues: string[] = JSON.parse(stdout);
  return {valid:issues.length === 0,scope:'record-and-assets',issues};
}
