// Audit arah-balik: SEMUA kolom yang dipakai kode (.from('tabel')...) vs production
// Menangkap kolom yang dipakai kode tapi TIDAK ADA di migration manapun (contoh: orders.updated_at)
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// 1. Scan semua file src untuk .from('tabel') + method chains
function scanCode() {
  const files = []
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (f === 'node_modules' || f === '.next' || f === 'tiktok-shop-sdk') continue
      const p = path.join(dir, f)
      if (fs.statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(f)) files.push(p)
    }
  }
  walk(path.join(__dirname, '..', 'src'))

  const usage = {} // tabel -> Set(kolom) + method
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    // pola: .from('tabel').select('a,b,c').eq('col', v).order('col').in('col', ...).update({...}).insert({...})
    const fromRe = /\.from\(\s*['"]([a-z_]+)['"]\s*\)/g
    let m
    while ((m = fromRe.exec(content))) {
      const table = m[1]
      if (!usage[table]) usage[table] = { select: new Set(), filter: new Set(), order: new Set(), update: new Set(), insert: new Set() }
      // ambil sampai .from berikutnya (atau 500 chars) untuk parse chain
      const nextFrom = content.indexOf('.from(', m.index + 7)
      const chunkEnd = nextFrom > -1 && nextFrom < m.index + 500 ? nextFrom : m.index + 500
      const chunk = content.slice(m.index, chunkEnd)
      // select('a,b,c') atau select('*,customer:customers(name)')
      const sel = chunk.match(/\.select\(\s*['"]([^'"]+)['"]/)
      if (sel) {
        const cols = sel[1].split(',').map(c => c.trim()).filter(c => c && !c.includes(':') && !c.includes('(') && !c.includes(')') && c !== '*')
        cols.forEach(c => usage[table].select.add(c))
      }
      // .eq('col', ...) .neq .gt .lt .gte .lte .like .ilike .is
      const fRe = /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\(\s*['"]([a-z_]+)['"]/g
      let fm
      while ((fm = fRe.exec(chunk))) {
        if (fm[1] !== 'in' || chunk.slice(fm.index).startsWith('.in(')) usage[table].filter.add(fm[2])
      }
      // .order('col')
      const ord = chunk.match(/\.order\(\s*['"]([a-z_]+)['"]/)
      if (ord) usage[table].order.add(ord[1])
      // .update({ a, b })
      const upd = chunk.match(/\.update\(\s*\{([^}]*)\}/)
      if (upd) {
        upd[1].split(',').map(c => c.trim().split(':')[0].trim()).filter(c => c && /^[a-z_]+$/.test(c)).forEach(c => usage[table].update.add(c))
      }
      // .insert({ a, b }) — multiline objek, ambil sampai kurung tutup pertama yang wajar
      const ins = chunk.match(/\.insert\(\s*\{([\s\S]{0,400}?)\}/)
      if (ins) {
        ins[1].split(',').map(c => c.trim().split(':')[0].trim().replace(/[\n\r]/g, '')).filter(c => c && /^[a-z_]+$/.test(c)).forEach(c => usage[table].insert.add(c))
      }
    }
  }
  return usage
}

async function main() {
  const usage = scanCode()

  // 2. Ambil kolom aktual semua tabel dari information_schema
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const r = await fetch('https://api.supabase.com/v1/projects/glblgsfenarnztawtpmu/database/query', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "select table_name, column_name from information_schema.columns where table_schema='public'" })
  })
  const cols = await r.json()
  const actual = {}
  for (const c of cols) {
    if (!actual[c.table_name]) actual[c.table_name] = new Set()
    actual[c.table_name].add(c.column_name)
  }

  // 3. Bandingkan
  const problems = []
  for (const [table, u] of Object.entries(usage)) {
    if (!actual[table]) { problems.push({ table, kolom: 'TABLE TIDAK ADA' }); continue }
    const all = new Set([...u.select, ...u.filter, ...u.order, ...u.update, ...u.insert])
    for (const col of all) {
      if (!actual[table].has(col)) {
        const where = []
        if (u.select.has(col)) where.push('select')
        if (u.filter.has(col)) where.push('filter')
        if (u.order.has(col)) where.push('order')
        if (u.update.has(col)) where.push('update')
        if (u.insert.has(col)) where.push('insert')
        problems.push({ table, kolom: col, dipakai: where.join(',') })
      }
    }
  }

  console.log('===== KOLOM DIPAKAI KODE TAPI TIDAK ADA DI PRODUCTION =====')
  if (problems.length === 0) console.log('BERSIH — semua kolom yang dipakai kode ada di DB')
  else {
    const byTable = {}
    for (const p of problems) {
      if (!byTable[p.table]) byTable[p.table] = []
      byTable[p.table].push(p.kolom + ' (' + p.dipakai + ')')
    }
    for (const [t, cols] of Object.entries(byTable)) {
      console.log('\n' + t + ':\n  ' + cols.join('\n  '))
    }
  }
  fs.writeFileSync(path.join(__dirname, '_kolom_audit.json'), JSON.stringify(problems, null, 1))
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
