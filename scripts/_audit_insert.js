// Audit arah-balik INSERT v3: parse akurat top-level keys di payload insert
// - brace-balance utk ambil argumen .insert(...)
// - split koma level-0 utk key top-level (abaikan nested objek/array/template)
// - spread {...x} → cek key objek x di file yg sama
const fs = require('fs')
const path = require('path')
const SRC = path.join(__dirname, '..', 'src')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.includes('node_modules') || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

// ambil substring sampai paren balance (dari posisi setelah '(')
function takeBalanced(src, start) {
  let depth = 0, i = start
  let inStr = null, inTpl = false, tplDepth = 0
  for (; i < src.length; i++) {
    const ch = src[i]
    if (inStr) {
      if (ch === '\\') { i++; continue }
      if (ch === inStr) inStr = null
      continue
    }
    if (inTpl) {
      if (ch === '\\') { i++; continue }
      if (ch === '`') { inTpl = false; continue }
      if (ch === '$' && src[i + 1] === '{') { tplDepth++; i++; continue }
      if (ch === '}' && tplDepth > 0) { tplDepth--; continue }
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { ch === '`' ? (inTpl = true) : (inStr = ch); continue }
    if (ch === '(') depth++
    else if (ch === ')') { depth--; if (depth === 0) return src.slice(start, i) }
  }
  return src.slice(start, i)
}

// split koma level-0 (luar brace/bracket/string/template)
function splitTop(src) {
  const out = []
  let depth = 0, last = 0, inStr = null, inTpl = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inStr) { if (ch === '\\') i++; else if (ch === inStr) inStr = null; continue }
    if (inTpl) { if (ch === '\\') i++; else if (ch === '`') inTpl = false; continue }
    if (ch === '"' || ch === "'") { inStr = ch; continue }
    if (ch === '`') { inTpl = true; continue }
    if (ch === '{' || ch === '[' || ch === '(') depth++
    else if (ch === '}' || ch === ']' || ch === ')') depth--
    else if (ch === ',' && depth === 0) { out.push(src.slice(last, i)); last = i + 1 }
  }
  out.push(src.slice(last))
  return out
}

// ekstrak key top-level dari sebuah objek literal '{...}'
function topKeys(objSrc) {
  const keys = new Set()
  const body = objSrc.slice(1, -1) // buang { }
  for (const seg of splitTop(body)) {
    const s = seg.trim()
    if (s.startsWith('...')) { keys.add('SPREAD:' + s.slice(3).trim()); continue }
    const m = s.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/)
    if (m) keys.add(m[1])
  }
  return keys
}

const files = walk(SRC)
const insertInfo = {} // table -> { keys: Set, spreads: Set, files: Set }

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const re = /\.from\(\s*['"]([a-z_]+)['"]\s*\)\s*\.(insert|upsert)\(/g
  let m
  while ((m = re.exec(src))) {
    const table = m[1]
    const arg = takeBalanced(src, re.lastIndex) // mulai dari char setelah '('
    if (!insertInfo[table]) insertInfo[table] = { keys: new Set(), spreads: new Set(), files: new Set() }
    insertInfo[table].files.add(f)
    // arg bisa objek tunggal / array objek
    const objects = []
    if (arg.trim().startsWith('[')) {
      // cari objek-objek dalam array (brace balance per elemen)
      let i = 1, depth = 0, last = 1, inStr = null
      for (; i < arg.length; i++) {
        const ch = arg[i]
        if (inStr) { if (ch === '\\') i++; else if (ch === inStr) inStr = null; continue }
        if (ch === '"' || ch === "'") { inStr = ch; continue }
        if (ch === '{') { if (depth === 0 && i > last) objects.push(arg.slice(last, i)); depth++ }
        else if (ch === '}') { depth--; if (depth === 0) { objects.push(arg.slice(last, i + 1)); last = i + 1 } }
        else if (ch === ',' && depth === 0) last = i + 1
      }
    } else {
      const firstBrace = arg.indexOf('{')
      if (firstBrace >= 0) {
        let i = firstBrace, depth = 0
        for (; i < arg.length; i++) {
          if (arg[i] === '{') depth++
          else if (arg[i] === '}') { depth--; if (depth === 0) break }
        }
        objects.push(arg.slice(firstBrace, i + 1))
      }
    }
    for (const o of objects) {
      for (const k of topKeys(o)) {
        if (k.startsWith('SPREAD:')) insertInfo[table].spreads.add(k.slice(7))
        else insertInfo[table].keys.add(k)
      }
    }
  }
}

// resolusi spread: key dari objek state di file yang sama
for (const table of Object.keys(insertInfo)) {
  const info = insertInfo[table]
  for (const f of info.files) {
    const src = fs.readFileSync(f, 'utf8')
    for (const spread of [...info.spreads]) {
      // cari "spread: {" ... "}" atau "spread = {"
      const reObj = new RegExp(spread + '\\s*[:=]\\s*\\{')
      const mm = reObj.exec(src)
      if (mm) {
        let i = mm.index + mm[0].length - 1, depth = 0
        for (; i < src.length; i++) {
          if (src[i] === '{') depth++
          else if (src[i] === '}') { depth--; if (depth === 0) break }
        }
        for (const k of topKeys(src.slice(mm.index + mm[0].length - 1, i + 1))) info.keys.add(k)
      }
    }
  }
}

const notNull = JSON.parse(process.argv[2])
const problem = []
for (const c of notNull) {
  const info = insertInfo[c.table_name]
  if (!info) { problem.push({ table: c.table_name, column: c.column_name, why: 'TIDAK ADA INSERT di kode' }); continue }
  if (!info.keys.has(c.column_name)) {
    problem.push({
      table: c.table_name, column: c.column_name,
      why: 'payload insert: [' + [...info.keys].join(', ') + '] di ' + [...info.files].map((f) => path.basename(f)).join(',')
    })
  }
}
console.log('=== KOLOM NOT NULL TIDAK di payload insert (BOM WAKTU 23502) ===')
problem.forEach((p) => console.log('* ' + p.table + '.' + p.column + '  -> ' + p.why))
console.log('TOTAL:', problem.length)
