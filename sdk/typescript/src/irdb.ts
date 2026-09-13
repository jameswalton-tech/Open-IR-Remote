import {parse, serialize, type OpenIrRecord, type Issue} from './index.js';
import {decode, fail, OpenIrError} from './json.js';

/** The five columns in the irdb profile, in their published order. */
export const IRDB_HEADER = ['functionname','protocol','device','subdevice','function'] as const;
/** One logical CSV record, including its exact original spelling and terminator. */
export interface CsvRow { ordinal: number; startLine: number; cells: string[]; raw: string }
/** Import diagnostics identify logical rows through /rows/N and physical source lines in messages. */
export interface CsvDiagnostic extends Issue { severity: 'error' | 'warning' }
/**
 * An application collection is not an Open IR handset. It may contain more than
 * 128 commands or unresolved errors. Such submissions are not accepted for import.
 */
export interface IrdbCollection {
  profile: 'irdb';
  sourceText: string;
  header: 'strict' | 'absent' | 'replace';
  rows: CsvRow[];
  diagnostics: CsvDiagnostic[];
}
/**
 * Strict headers are the default. absent means the caller knows there is no header;
 * replace means the caller reviewed an invalid first row and explicitly assigned
 * the standard column order to subsequent rows. Neither mode repairs data rows.
 */
export interface CsvOptions { header?: IrdbCollection['header'] }

/**
 * RFC 4180-style comma reader with LF and CRLF support. Quoted newlines and doubled
 * quotes are preserved. A quote inside an unquoted field, text after a closing
 * quote, or an unterminated quoted field is an error, never a guessed repair.
 */
export function parseIrdb(input: string | Uint8Array, options: CsvOptions = {}): IrdbCollection {
  const sourceText = decode(input,8*1024*1024), rows: CsvRow[] = [], diagnostics: CsvDiagnostic[] = [];
  const header = options.header ?? 'strict';
  if (!['strict','absent','replace'].includes(header)) fail('/header','header-mode','Choose strict, absent or replace');
  let i=0, line=1;
  const rowPath=() => header !== 'absent' && rows.length === 0 ? '/header' : `/rows/${rows.length - (header === 'absent' ? 0 : 1)}`;
  try {
    while (i < sourceText.length) {
      const start=i, startLine=line, cells: string[] = [];
      let done=false;
      while (!done) {
        let cell='';
        if (sourceText[i] === '"') {
          i++; let closed=false;
          while (i < sourceText.length) {
            const char=sourceText[i++];
            if (char === '"') {
              if (sourceText[i] === '"') { cell+='"'; i++; }
              else { closed=true; break; }
            } else { cell+=char; if (char === '\n' || (char === '\r' && sourceText[i] !== '\n')) line++; }
          }
          if (!closed) fail(rowPath(),'csv-quote',`Unterminated quoted field beginning on line ${startLine}`);
          if (i < sourceText.length && ![',','\r','\n'].includes(sourceText[i])) fail(rowPath(),'csv-quote',`Unexpected text after closing quote on line ${line}`);
        } else {
          while (i < sourceText.length && ![',','\r','\n'].includes(sourceText[i])) {
            if (sourceText[i] === '"') fail(rowPath(),'csv-quote',`Quote inside unquoted field on line ${line}`);
            cell+=sourceText[i++];
          }
        }
        cells.push(cell);
        if (sourceText[i] === ',') { i++; continue; }
        if (sourceText[i] === '\r') { i++; if (sourceText[i] === '\n') i++; line++; }
        else if (sourceText[i] === '\n') { i++; line++; }
        done=true;
      }
      rows.push({ordinal:rows.length+1,startLine,cells,raw:sourceText.slice(start,i)});
    }
  } catch (error) {
    if (!(error instanceof OpenIrError)) throw error;
    diagnostics.push(...error.issues.map(issue => ({...issue,severity:'error' as const})));
  }
  const first=rows[0];
  if (header === 'strict' && (!first || JSON.stringify(first.cells) !== JSON.stringify(IRDB_HEADER))) {
    diagnostics.push({path:'/header',code:'csv-header',severity:'error',message:'Expected functionname,protocol,device,subdevice,function. Review the source before explicitly choosing absent or replace.'});
  }
  if (header !== 'strict') diagnostics.push({path:'/header',code:'header-override',severity:'warning',message:`Caller selected ${header} header mode; original source is retained.`});
  const data=header === 'absent' ? rows : rows.slice(1);
  for (const [index,row] of data.entries()) {
    const path=`/rows/${index}`;
    if (row.cells.length !== 5) { diagnostics.push({path,code:'csv-columns',severity:'error',message:`Line ${row.startLine}: expected 5 columns, found ${row.cells.length}. Repair must be a caller decision.`}); continue; }
    if (!row.cells[0].trim()) diagnostics.push({path:path+'/functionname',code:'blank-label',severity:'error',message:`Line ${row.startLine}: functionname is blank. Incomplete submissions are ignored.`});
    if (!row.cells[1].trim() || row.cells[1] === 'unknown') diagnostics.push({path:path+'/protocol',code:'missing-value',severity:'error',message:`Line ${row.startLine}: protocol is missing; no protocol will be inferred.`});
    for (const [column,name] of [[2,'device'],[3,'subdevice'],[4,'function']] as const) {
      const text=row.cells[column];
      if (!/^[+-]?[0-9]+$/.test(text)) diagnostics.push({path:path+'/'+name,code:text === '' ? 'missing-value' : 'numeric-syntax',severity:'error',message:`Line ${row.startLine}: ${name} must be an explicit decimal integer; found ${JSON.stringify(text)}.`});
      else if (BigInt(text) < -2147483648n || BigInt(text) > 4294967295n) diagnostics.push({path:path+'/'+name,code:'numeric-range',severity:'error',message:`Line ${row.startLine}: ${name} is outside v1 parameter bounds.`});
    }
  }
  return {profile:'irdb',sourceText,header,rows:data,diagnostics};
}

/**
 * Identity is supplied by the application after reviewing the collection. Paths
 * identify device categories and do not establish the physical handset model.
 * Persist id and commandIds. Changing a source revision requires reviewing row
 * correspondence; the SDK does not match buttons by mutable names or readings.
 */
export interface IrdbIdentity {
  id: OpenIrRecord['id'];
  remote: OpenIrRecord['remote'];
  locale: string;
  importedAt: string;
  sourcePath: string;
  sourceRevision: string;
  /** Must explain what is known or unknown about the physical handset identity. */
  identityNotes: string;
  /** Optional persisted IDs, keyed by the one-based logical source row ordinal. */
  commandIds?: { [ordinal: number]: string };
}
/** Profile notice retained in every imported record, never relabelled as CC0. */
export const IRDB_RIGHTS = 'irdb, Copyright (c) 2013-15 Simon Peter and contributors. Contains/accesses irdb by Simon Peter and contributors, used under permission. For licensing details and for information on how to contribute to the database, see https://github.com/probonopd/irdb. Terms: https://github.com/probonopd/irdb/blob/11aa5eb3ad9fec9e5c03f170c29c1467733d9f3e/LICENSE.md';
/** Loss reports describe a projection's omissions separately from source archival. */
export interface ImportResult { record: OpenIrRecord; diagnostics: CsvDiagnostic[]; losses: Issue[]; sourceArchived: true }

/** Split by code point so the v1 extension string limit never splits a surrogate pair. */
function archive(text: string): string[][] {
  const points=Array.from(text), chunks: string[]=[];
  for (let i=0;i<points.length;i+=1024) chunks.push(points.slice(i,i+1024).join(''));
  const groups: string[][]=[];
  for (let i=0;i<chunks.length;i+=64) groups.push(chunks.slice(i,i+64));
  return groups;
}

/**
 * Import one complete, caller-identified submission of 1 to 128 commands. An
 * incomplete row, blank label, invalid header or oversized collection rejects the
 * whole submission. There is no selection, fallback label or partial import path.
 * Original number spellings, duplicate rows, headers and line endings are archived.
 * If the archive exceeds v1 limits, reject it instead of dropping source evidence.
 * Use tryImportIrdb for batch workflows that should ignore rejected submissions.
 */
export function importIrdb(collection: IrdbCollection, identity: IrdbIdentity): ImportResult {
  // Reparse source, rather than trust editable cached cells or diagnostics supplied by a caller.
  const fresh=parseIrdb(collection.sourceText,{header:collection.header});
  if (fresh.header !== 'strict') fail('/header','incompatible-header','Only complete submissions with the standard header are accepted');
  const errors=fresh.diagnostics.filter(d => d.severity === 'error');
  if (errors.length) throw new OpenIrError(errors);
  if (!identity.identityNotes?.trim()) fail('/identityNotes','identity-required','Explain handset identity and uncertainty explicitly');
  if (!identity.sourceRevision?.trim()) fail('/sourceRevision','revision-required','Supply the immutable source revision or content identity');
  const indexes=fresh.rows.map((_,i)=>i);
  if (indexes.length < 1 || indexes.length > 128) fail('/rows','submission-size',`${indexes.length} commands: only complete submissions with 1 to 128 commands are accepted. This submission is ignored.`);
  const mapping: {command_id: string; source_row: number}[]=[];
  const commands=indexes.map(index => {
    const row=fresh.rows[index];
    // The ordinal identifies a row within this pinned source, even when labels repeat.
    // Assigned once on migration, this ID must be persisted with the imported record.
    const id=identity.commandIds?.[row.ordinal] ?? `irdb.row.${row.ordinal}`;
    mapping.push({command_id:id,source_row:row.ordinal});
    return {id,labels:{[identity.locale]:row.cells[0]},signals:[{
      kind:'decoded' as const,primary:true,source_complete:false,protocol:row.cells[1],
      parameters:{device:Number(row.cells[2]),subdevice:Number(row.cells[3]),function:Number(row.cells[4])}
    }]};
  });
  const record: OpenIrRecord={
    format:'open-ir-remote',format_version:'1.0.0',record_kind:'legacy-import',id:identity.id,updated:identity.importedAt,
    remote:structuredClone(identity.remote),locale:identity.locale,commands,
    provenance:[{source_type:'csv-import',source_path:identity.sourcePath,source_revision:identity.sourceRevision,imported_at:identity.importedAt,rights:IRDB_RIGHTS,notes:identity.identityNotes}],
    validation:{status:'imported-unverified',issues:['irdb device/subdevice/function fields preserved. Protocol spelling is unchanged. No transmit mapping or handset identity has been verified.']},
    extensions:{'org.openir.sdk.irdb':{profile:'irdb-source-v1',header:fresh.header,source_text:archive(fresh.sourceText),rows:[mapping.slice(0,64),mapping.slice(64)],identity_notes:identity.identityNotes}}
  };
  // Validate the complete archive as well as the mapped signal, without trimming metadata.
  const checked=parse(serialize(record));
  return {record:checked,diagnostics:fresh.diagnostics,losses:[],sourceArchived:true};
}

/**
 * Restore an archived source snapshot, not an export of current Open IR edits.
 * Every call reports that limitation, including translations, vendor metadata and
 * alternate signal representations which the five-column profile cannot carry.
 * The record's archive is untrusted user data; this checks its shape, not authenticity.
 */
export function restoreIrdbSource(record: OpenIrRecord): {csv: string; losses: Issue[]} {
  const checked=parse(serialize(record));
  const extension=checked.extensions?.['org.openir.sdk.irdb'] as any;
  if (extension?.profile !== 'irdb-source-v1' || !Array.isArray(extension.source_text) || !extension.source_text.every((group: unknown)=>Array.isArray(group)&&group.every(x=>typeof x==='string'))) fail('/extensions/org.openir.sdk.irdb','no-source-archive','No supported irdb source archive is present');
  return {csv:extension.source_text.flat().join(''),losses:[{path:'',code:'source-snapshot-only',message:'Restores the archived CSV only. Current IDs, renamed labels, translations, metadata, provenance edits and additional signal representations are not exported to CSV.'}]};
}

/** A batch consumer can count ignored files and show reasons without catching exceptions. */
export type IrdbSubmission =
  | { status: 'accepted'; result: ImportResult }
  | { status: 'ignored'; diagnostics: Issue[] };

/**
 * Accept a whole compatible submission or return structured reasons for ignoring
 * it. All rows must be complete and the file must have 1 to 128 commands. Source
 * completeness is not verified signal playback. Unexpected programming failures
 * still throw, so a batch job cannot mistake a broken importer for bad input.
 */
export function tryImportIrdb(input: string | Uint8Array, identity: IrdbIdentity): IrdbSubmission {
  try { return {status:'accepted',result:importIrdb(parseIrdb(input),identity)}; }
  catch (error) {
    if (error instanceof OpenIrError) return {status:'ignored',diagnostics:error.issues};
    throw error;
  }
}
