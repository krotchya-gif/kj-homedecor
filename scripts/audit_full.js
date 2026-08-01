// Audit menyeluruh: SEMUA tabel/kolom/fungsi dari 54 migration vs production.
// Cara test kolom: select per-kolom -> error "column X does not exist" = MISSING
// Cara test fungsi: panggil rpc dengan dummy args sesuai tipe -> "Could not find the function" = MISSING
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---------- 1. Parse semua migration ----------
const dir = 'supabase/migrations';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const tables = {}; // name -> Set(cols)
const functions = {}; // name -> [{name, type}]

for (const f of files) {
  let sql = fs.readFileSync(path.join(dir, f), 'utf8');
  sql = sql.replace(/^\s*--.*$/gm, '');
  const stmts = sql.split(';');

  for (const stmt of stmts) {
    // CREATE TABLE
    const tm = stmt.match(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(/);
    if (tm) {
      const tname = tm[1];
      if (!tables[tname]) tables[tname] = new Set();
      const rest = stmt.slice(stmt.indexOf('(') + 1);
      // ambil sampai paren penutup level-0 (tabel tidak nested di migration ini)
      const closeIdx = rest.lastIndexOf(')');
      const defs = rest.slice(0, closeIdx);
      for (const line of defs.split(',')) {
        const trimmed = line.trim();
        if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|REFERENCES|EXCLUDE)/i.test(trimmed)) continue;
        const colName = trimmed.match(/^"?(\w+)"?\s/);
        if (colName && !/^id\s.*/i.test(trimmed.slice(0, 40)) || colName && !/^\)/.test(trimmed)) {
          if (colName) tables[tname].add(colName[1]);
        }
      }
      continue;
    }
    // ALTER TABLE ... ADD COLUMN
    const at = stmt.match(/ALTER TABLE (?:ONLY )?(?:public\.)?(\w+)/);
    if (at && /ADD COLUMN/.test(stmt)) {
      const tname = at[1];
      if (!tables[tname]) tables[tname] = new Set();
      const cols = stmt.matchAll(/ADD COLUMN (?:IF NOT EXISTS )?([\w"]+)/g);
      for (const c of cols) tables[tname].add(c[1]);
      continue;
    }
    // CREATE FUNCTION
    const fm = stmt.match(/CREATE (?:OR REPLACE )?FUNCTION (?:public\.)?(\w+)\s*\(([^)]*)\)/);
    if (fm) {
      const args = fm[2].split(',').map((a) => a.trim()).filter(Boolean).map((a) => {
        const parts = a.split(/\s+/);
        return { name: parts[0], type: parts.slice(1).join(' ') || 'text' };
      });
      if (!functions[fm[1]]) functions[fm[1]] = args;
    }
  }
}

console.log('Parse OK. tables:', Object.keys(tables).length, '| functions:', Object.keys(functions).length);

// ---------- 2. Test tabel ----------
async function tableExists(t) {
  const { error } = await sb.from(t).select('*').limit(1);
  return error ? { exists: false, msg: error.message.slice(0, 90) } : { exists: true };
}

// ---------- 3. Test kolom (per-kolom, concurrent 15) ----------
async function colMissing(t, c) {
  const { error } = await sb.from(t).select(c).limit(1);
  if (error) {
    if (/column .* does not exist/.test(error.message)) return true;
    return error.message.slice(0, 80); // error lain (tabel missing dll) -> string
  }
  return false;
}

// ---------- 4. Test fungsi dengan dummy args ----------
function dummyVal(type) {
  const t = type.toLowerCase();
  if (t.includes('uuid')) return '00000000-0000-0000-0000-000000000000';
  if (t.includes('numeric') || t.includes('int')) return 0;
  if (t.includes('bool')) return false;
  if (t.includes('json')) return {};
  if (t.includes('text') || t.includes('char')) return 'x';
  if (t.includes('timestamp') || t.includes('date')) return null;
  return 'x';
}
async function fnMissing(name, args) {
  const params = {};
  for (const a of args) params[a.name] = dummyVal(a.type);
  const { error } = await sb.rpc(name, params);
  if (error && /Could not find the function|does not exist|Failed to fetch function|No function matches/i.test(error.message)) return true;
  if (error && /function .* does not exist/i.test(error.message)) return true;
  return false; // ada (error runtime / sukses)
}

(async () => {
  const missingTables = [];
  const missingCols = {}; // table -> [cols]
  const otherColErrs = {}; // table -> {col: msg} (error bukan missing)
  const missingFns = [];

  const tableNames = Object.keys(tables).sort();
  for (const t of tableNames) {
    const r = await tableExists(t);
    if (!r.exists) {
      if (/does not exist|relation/.test(r.msg)) { missingTables.push(t); continue; }
      // error lain: catat tapi lanjut cek kolom
      otherColErrs[t] = { '*': r.msg };
    }
    // test kolom concurrent
    const cols = [...tables[t]].sort();
    const results = [];
    for (let i = 0; i < cols.length; i += 15) {
      const chunk = cols.slice(i, i + 15);
      const rs = await Promise.all(chunk.map((c) => colMissing(t, c)));
      rs.forEach((r, j) => results.push([chunk[j], r]));
    }
    const miss = results.filter(([, r]) => r === true).map(([c]) => c);
    if (miss.length) missingCols[t] = miss;
    const others = results.filter(([, r]) => r !== true && r !== false);
    if (others.length) otherColErrs[t] = Object.fromEntries(others);
  }

  for (const fname of Object.keys(functions).sort()) {
    const args = functions[fname];
    const miss = await fnMissing(fname, args);
    if (miss) missingFns.push(fname);
  }

  // ---------- Output ----------
  console.log('\n=== TABEL MISSING ===');
  missingTables.length ? console.log(missingTables.join('\n')) : console.log('(tidak ada)');
  console.log('\n=== KOLOM MISSING (per tabel) ===');
  const keys = Object.keys(missingCols).sort();
  keys.length ? keys.forEach((t) => console.log(t + ': ' + missingCols[t].join(', '))) : console.log('(tidak ada)');
  console.log('\n=== FUNGSI MISSING ===');
  missingFns.length ? console.log(missingFns.join('\n')) : console.log('(tidak ada)');
  console.log('\n=== ERROR LAIN (perlu dicek manual) ===');
  const ok = Object.keys(otherColErrs);
  ok.length ? ok.forEach((t) => console.log(t + ':', JSON.stringify(otherColErrs[t]))) : console.log('(tidak ada)');

  fs.writeFileSync('scripts/_audit_result.json', JSON.stringify({
    missingTables, missingCols, missingFns, otherColErrs,
    generatedAt: new Date().toISOString()
  }, null, 2));
  console.log('\nSaved scripts/_audit_result.json');
})();
