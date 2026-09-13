import schemaValidator from './schema-validator.js';
import {readJson, encodeJson, OpenIrError, pointer, type Issue} from './json.js';
import type {OpenIrRecord} from './record.js';
export {OpenIrError, MAX_BYTES, type Issue} from './json.js';
export type {OpenIrRecord} from './record.js';
export type Signal = OpenIrRecord['commands'][number]['signals'][number];
/** Record-only validation never claims to have opened an image or tested a device. */
export interface ValidationReport {
  valid: boolean;
  scope: 'record-only';
  assets: 'not-present' | 'unchecked';
  issues: Issue[];
}

/**
 * Validate the pinned schema and additional record semantics without modifying data.
 * The byte check uses this SDK's compact encoding for in-memory values. parse checks
 * the original input byte count too. Use validateFile from ./node for image assets.
 */
export function validate(value: unknown): ValidationReport {
  const issues: Issue[] = [];
  const result = (): ValidationReport => ({valid:!issues.length,scope:'record-only',assets: value && typeof value === 'object' && Object.hasOwn(value,'image') ? 'unchecked' : 'not-present',issues});
  try { encodeJson(value); }
  catch (error) { if (error instanceof OpenIrError) { issues.push(...error.issues); return result(); } throw error; }
  if (!schemaValidator(value)) {
    for (const error of (schemaValidator as any).errors ?? []) {
      let path = error.instancePath;
      if (error.keyword === 'required') path = pointer(path,error.params.missingProperty);
      if (error.keyword === 'additionalProperties') path = pointer(path,error.params.additionalProperty);
      issues.push({path,code:`schema.${error.keyword}`,message:error.message ?? 'Schema validation failed'});
    }
    return result();
  }
  const record = value as OpenIrRecord;
  const ids = new Set<string>();
  record.commands.forEach((command,c) => {
    const base = `/commands/${c}`;
    if (ids.has(command.id)) issues.push({path:base+'/id',code:'duplicate-id',message:'Duplicate command ID'});
    ids.add(command.id);
    if (command.id.match(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/)?.[0] !== command.id) issues.push({path:base+'/id',code:'command-id',message:'Invalid command ID'});
    command.signals.forEach((signal,s) => {
      const path = `${base}/signals/${s}`, effective = effectiveSignal(record,signal);
      if (signal.kind === 'decoded' && effective.protocol === 'unknown' && signal.source_complete !== false) issues.push({path:path+'/source_complete',code:'unknown-protocol',message:'Unknown protocol requires source_complete false'});
      let total = 0;
      for (const key of ['intro_us','repeat_us','ending_us'] as const) {
        const timings = signal[key] ?? []; total += timings.length;
        if (timings.length % 2) issues.push({path:path+'/'+key,code:'timing-pairs',message:'Timings must end with a space'});
        timings.forEach((v,i) => { if (i % 2 ? v >= 0 : v <= 0) issues.push({path:`${path}/${key}/${i}`,code:'timing-sign',message:'Expected alternating positive marks and negative spaces'}); });
      }
      if (total > 8192) issues.push({path,code:'timing-count',message:'Signal exceeds 8192 total timings'});
    });
  });
  if (record.image && record.image.path !== 'remote.webp') issues.push({path:'/image/path',code:'image-path',message:'Standalone image path must be remote.webp'});
  return result();
}
/** Parse and validate one UTF-8 JSON record; preserves IDs, labels and all extensions. */
export function parse(input: string | Uint8Array): OpenIrRecord {
  const value = readJson(input), report = validate(value);
  if (!report.valid) throw new OpenIrError(report.issues);
  return value as OpenIrRecord;
}
/** Validate and emit deterministic compact UTF-8-compatible JSON. No fields are projected away. */
export function serialize(record: OpenIrRecord): string {
  const report = validate(record);
  if (!report.valid) throw new OpenIrError(report.issues);
  return encodeJson(record);
}
/**
 * Resolve defaults into a copy. Call after validation. No guessed NEC, carrier,
 * or source completeness is introduced, and the stored signal stays untouched.
 * A default protocol on raw/Pronto data has no decoding meaning.
 */
export function effectiveSignal(record: OpenIrRecord, signal: Signal): Signal {
  return structuredClone({...record.defaults,...signal});
}
/** A representation rejected by a target is retained in the original record. */
export interface CapabilityReport {
  supported: {commandId: string; signalIndex: number}[];
  unsupported: Issue[];
  playable: 'not-assessed';
  recordChanged: false;
}
/**
 * Ask a caller-owned adapter about every representation. Return null if supported,
 * otherwise a useful reason. Support means only that the adapter accepts these
 * fields; it is not evidence of successful signal generation or physical playback.
 */
export function assessCapabilities(record: OpenIrRecord, accepts: (signal: Signal, commandId: string) => string | null): CapabilityReport {
  const report: CapabilityReport = {supported:[],unsupported:[],playable:'not-assessed',recordChanged:false};
  record.commands.forEach((command,c) => command.signals.forEach((signal,s) => {
    const reason = accepts(effectiveSignal(record,signal),command.id);
    if (reason === null) report.supported.push({commandId:command.id,signalIndex:s});
    else report.unsupported.push({path:`/commands/${c}/signals/${s}`,code:'unsupported-signal',message:reason});
  }));
  return report;
}

