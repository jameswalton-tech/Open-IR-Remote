/** JSON Pointer diagnostics shared by parsing, validation and adapter reports. */
export interface Issue { path: string; code: string; message: string }
/** Expected input failures are inspectable; callers need not scrape an error message. */
export class OpenIrError extends Error {
  constructor(public readonly issues: Issue[]) {
    super(issues.map(i => `${i.path || '/'}: ${i.message}`).join('\n'));
    this.name = 'OpenIrError';
  }
}
/** Escape a property name for an RFC 6901 JSON Pointer. */
export const pointer = (base: string, key: string | number) => `${base}/${String(key).replace(/~/g,'~0').replace(/\//g,'~1')}`;
/** Throw one structured error at the boundary where it is discovered. */
export function fail(path: string, code: string, message: string): never {
  throw new OpenIrError([{path,code,message}]);
}
export const MAX_BYTES = 1_048_576;

/** Decode UTF-8 strictly. A BOM is rejected, matching the authority's JSON reader. */
export function decode(input: string | Uint8Array, maxBytes: number): string {
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).length > maxBytes) fail('','bytes',`Input exceeds ${maxBytes} UTF-8 bytes`);
    return input;
  }
  if (input.byteLength > maxBytes) fail('','bytes',`Input exceeds ${maxBytes} UTF-8 bytes`);
  try { return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(input); }
  catch { return fail('','utf8','Input is not valid UTF-8'); }
}

/**
 * Compare decimal values without binary floating-point rounding. This lets 1e-1
 * become 0.1, but rejects a token whose value JSON.parse would silently change.
 * It is deliberately stricter than Python's float parser for very precise decimals.
 */
function decimal(token: string): string {
  const [mantissa, exp = '0'] = token.toLowerCase().split('e');
  let digits = mantissa.replace('.','');
  let power = BigInt(exp) - BigInt(mantissa.includes('.') ? mantissa.length - mantissa.indexOf('.') - 1 : 0);
  const negative = digits.startsWith('-');
  digits = digits.replace(/^-/,'').replace(/^0+/,'');
  if (!digits) return '0';
  while (digits.endsWith('0')) { digits = digits.slice(0,-1); power++; }
  return `${negative ? '-' : ''}${digits}e${power}`;
}

/**
 * Small strict JSON reader. Object keys are checked after decoding escapes, before
 * an object can overwrite a duplicate. Null-prototype dictionaries prevent a
 * source key such as __proto__ from changing the object's prototype.
 */
export function readJson(input: string | Uint8Array): unknown {
  const text = decode(input,MAX_BYTES);
  let offset = 0;
  const skip = () => { while (/[\x20\t\r\n]/.test(text[offset] ?? '\0')) offset++; };
  const error = (path: string, message: string): never => fail(path,'json',`${message} at character ${offset}`);
  function string(path: string): string {
    const start = offset++;
    while (offset < text.length) {
      const char = text[offset++];
      if (char === '\\') { offset++; continue; }
      if (char === '"') {
        try { return JSON.parse(text.slice(start,offset)); }
        catch { return error(path,'Invalid JSON string'); }
      }
    }
    return error(path,'Unterminated string');
  }
  function value(path: string, depth: number): any {
    skip();
    const char = text[offset];
    if (char === '"') return string(path);
    if (char === '{' || char === '[') {
      if (++depth > 16) fail(path,'depth','JSON nesting exceeds 16 containers');
      offset++; skip();
      const object = char === '{';
      const result: any = object ? Object.create(null) : [];
      const close = object ? '}' : ']';
      if (text[offset] === close) { offset++; return result; }
      while (true) {
        let key: string | number = result.length;
        if (object) {
          if (text[offset] !== '"') return error(path,'Expected object key');
          key = string(path); skip();
          if (Object.hasOwn(result,key)) fail(pointer(path,key),'duplicate-key','Duplicate JSON key');
          if (text[offset++] !== ':') return error(pointer(path,key),'Expected colon');
        }
        result[key] = value(pointer(path,key),depth); skip();
        if (text[offset] === close) { offset++; return result; }
        if (text[offset++] !== ',') return error(path,'Expected comma or closing delimiter');
        skip();
      }
    }
    for (const [token, parsed] of [['true',true],['false',false],['null',null]] as const) {
      if (text.startsWith(token,offset)) { offset += token.length; return parsed; }
    }
    const number = text.slice(offset).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (number) {
      const token = number[0], parsed = Number(token);
      if (!Number.isFinite(parsed)) fail(path,'number','Nonfinite JSON number');
      if (decimal(token) !== decimal(String(parsed))) fail(path,'precision','Number cannot be preserved by this JavaScript SDK; use a defined string representation');
      offset += token.length; return parsed;
    }
    return error(path,'Expected JSON value');
  }
  const result = value('',0); skip();
  if (offset !== text.length) error('','Unexpected trailing text');
  return result;
}

/**
 * Stable compact encoding: UTF-16 key order, preserved array order, no Unicode
 * normalization, no newline. This is an SDK convention, not a v1 canonical hash
 * format or RFC 8785. Reject non-JSON objects instead of invoking toJSON/getters.
 */
export function encodeJson(input: unknown): string {
  const active = new Set<object>();
  function visit(value: any, path: string, depth: number): string {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) fail(path,'number','Expected finite number');
      return Object.is(value,-0) ? '-0' : JSON.stringify(value);
    }
    if (typeof value !== 'object') fail(path,'json-type','Expected a JSON value, not undefined, bigint, symbol or function');
    if (++depth > 16) fail(path,'depth','JSON nesting exceeds 16 containers');
    if (active.has(value)) fail(path,'cycle','Circular JSON value');
    const array = Array.isArray(value);
    // A plain object from another browser realm has a different Object.prototype.
    // Recognise that native root prototype without accepting class instances or
    // executing a constructor getter. Only own data properties are encoded below.
    const prototype = Object.getPrototypeOf(value);
    if (!array && prototype !== null && prototype !== Object.prototype) {
      const constructor = Object.getOwnPropertyDescriptor(prototype,'constructor')?.value;
      if (Object.getPrototypeOf(prototype) !== null || typeof constructor !== 'function' || Function.prototype.toString.call(constructor) !== Function.prototype.toString.call(Object)) fail(path,'json-type','Expected a plain object');
    }
    active.add(value);
    const keys = Reflect.ownKeys(value).filter(key => !(array && key === 'length'));
    for (const key of keys) {
      if (typeof key !== 'string') fail(path,'json-type','Symbol keys cannot be serialized');
      const descriptor = Object.getOwnPropertyDescriptor(value,key)!;
      if (!descriptor.enumerable || !('value' in descriptor)) fail(pointer(path,key),'json-type','Non-enumerable properties and accessors cannot be serialized');
      if (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length)) fail(pointer(path,key),'json-type','Array has an extra property');
    }
    let result: string;
    if (array) {
      if (keys.length !== value.length) fail(path,'json-type','Sparse arrays cannot be serialized');
      result = '[' + value.map((v: unknown,i: number) => visit(v,pointer(path,i),depth)).join(',') + ']';
    } else result = '{' + (keys as string[]).sort().map(key => JSON.stringify(key)+':'+visit(value[key],pointer(path,key),depth)).join(',') + '}';
    active.delete(value); return result;
  }
  const text = visit(input,'',0);
  if (new TextEncoder().encode(text).length > MAX_BYTES) fail('','bytes','Encoded record exceeds 1 MiB');
  return text;
}
