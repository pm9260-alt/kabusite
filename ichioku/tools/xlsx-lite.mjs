// Excel（.xlsx）の表を読むだけの小さな部品。追加のインストールなしで Node.js だけで動く。
// readSheets(buffer) → [{ name, rows: [[セルの値, ...], ...] }]
import zlib from 'node:zlib';

function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Excel のファイルとして読めない（zip の終わりが見つからない）');
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = {};
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Excel のファイルの目次が壊れている');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + csize);
    files[name] = () => (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
    p += 46 + nlen + elen + clen;
  }
  return files;
}
const ent = s => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (m, e) =>
  e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'amp' ? '&' : e === 'quot' ? '"' : e === 'apos' ? "'" :
  String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
const texts = xml => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => ent(m[1])).join('');
const colNum = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

export function readSheets(buf) {
  const f = unzip(buf);
  const shared = f['xl/sharedStrings.xml'] ? [...f['xl/sharedStrings.xml']().matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => texts(m[1].replace(/<rPh[\s\S]*?<\/rPh>/g, ''))) : [];
  const rels = {};
  for (const m of f['xl/_rels/workbook.xml.rels']().matchAll(/<Relationship\s[^>]*>/g)) {
    const id = (m[0].match(/Id="([^"]+)"/) || [])[1], target = (m[0].match(/Target="([^"]+)"/) || [])[1];
    if (id && target) rels[id] = target.replace(/^\/?(xl\/)?/, 'xl/');
  }
  const out = [];
  for (const m of f['xl/workbook.xml']().matchAll(/<sheet\s[^>]*>/g)) {
    const name = ent((m[0].match(/name="([^"]*)"/) || [])[1] || '');
    const rid = (m[0].match(/r:id="([^"]+)"/) || [])[1];
    const file = f[rels[rid]];
    if (!file) continue;
    const rows = [];
    for (const r of file().matchAll(/<row\s[^>]*?r="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const row = [];
      for (const c of (r[2] || '').matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = (c[1].match(/r="([A-Z]+\d+)"/) || [])[1];
        const t = (c[1].match(/t="([^"]+)"/) || [])[1];
        const body = c[2] || '';
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = null;
        if (t === 's') val = shared[+v] ?? null;
        else if (t === 'inlineStr') val = texts(body);
        else if (t === 'str' || t === 'e') val = v != null ? ent(v) : null;
        else if (t === 'b') val = v === '1';
        else if (v != null) val = Number(v);
        if (ref) row[colNum(ref)] = val;
      }
      rows[+r[1] - 1] = row;
    }
    out.push({ name, rows: Array.from(rows, x => x || []) });
  }
  return out;
}
