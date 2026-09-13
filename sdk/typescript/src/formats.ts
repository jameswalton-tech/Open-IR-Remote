import type {OpenIrRecord} from './record.js';
import type {Issue} from './json.js';

/**
 * The pinned Python authority uses datetime.date and rfc3339-validator 0.1.4.
 * Match their calendar range explicitly instead of letting JavaScript Date roll
 * an invalid day into another month or interpret a timezone implicitly.
 */
function calendarDate(year: number, month: number, day: number): boolean {
  const leap=year%4===0 && (year%100!==0 || year%400===0);
  const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  return year>=1 && year<=9999 && month>=1 && month<=12 && day>=1 && day<=days[month-1];
}

/** Python's date format uses fullmatch: even a terminal newline is invalid. */
function date(value: string): boolean {
  const match=/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  return !!match && match[0].length===value.length && calendarDate(+match[1],+match[2],+match[3]);
}

/**
 * rfc3339-validator requires T, a complete offset and seconds below 60. Python's
 * FormatChecker uppercases first, so lowercase t/z are accepted. The dependency's
 * anchored regex also accepts a single terminal LF; preserve that reference
 * behaviour rather than quietly imposing a stricter standard in this SDK.
 */
function dateTime(value: string): boolean {
  const candidate=value.endsWith('\n') ? value.slice(0,-1) : value;
  const match=/^([0-9]{4})-(0[1-9]|1[0-2])-([0-9]{2})T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?(?:Z|[+-](?:[01][0-9]|2[0-3]):[0-5][0-9])$/i.exec(candidate);
  return !!match && match[0].length===candidate.length && calendarDate(+match[1],+match[2],+match[3]);
}

/** Check only schema-declared date fields after the structural validator succeeds. */
export function recordFormatIssues(record: OpenIrRecord): Issue[] {
  const issues: Issue[]=[];
  function check(value: string | undefined, path: string, format: 'date' | 'date-time') {
    if (value !== undefined && !(format==='date' ? date(value) : dateTime(value))) issues.push({path,code:'schema.format',message:`Must match the pinned Python ${format} format`});
  }
  check(record.updated,'/updated','date');
  record.provenance.forEach((source,i)=>check(source.imported_at,`/provenance/${i}/imported_at`,'date'));
  check(record.validation.tested_at,'/validation/tested_at','date');
  check(record.export_source?.exported_at,'/export_source/exported_at','date-time');
  return issues;
}
