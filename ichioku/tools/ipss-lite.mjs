// 人口統計資料集の表（Excel から書き出した HTML）を行の配列にする
import fs from 'node:fs';
const ent = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"' };
const clean = s => s.replace(/<[^>]+>/g, '').replace(/&[a-z]+;|&#\d+;/g, m => ent[m] ?? (m.startsWith('&#') ? String.fromCharCode(+m.slice(2, -1)) : ' ')).replace(/\s+/g, ' ').trim();
export function ipssRows(file) {
  const t = fs.readFileSync(file, 'utf8');
  const rows = [];
  for (const r of t.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const cells = [];
    for (const m of r.matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)) {
      const span = +(m[1].match(/colspan=(\d+)/i)?.[1] || 1);
      cells.push(clean(m[2]));
      for (let i = 1; i < span; i++) cells.push('');
    }
    if (cells.some(c => c)) rows.push(cells);
  }
  return rows;
}
export const num = s => { if (s == null) return null; const x = String(s).replace(/[,\s]/g, ''); return /^-?\d+(\.\d+)?$/.test(x) ? +x : null; };
