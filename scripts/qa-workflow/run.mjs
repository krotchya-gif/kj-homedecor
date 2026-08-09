/**
 * QA Workflow Runner — data-driven Playwright untuk 12 workflow KJ Homedecor.
 * Cara pakai: node scripts/qa-workflow/run.mjs <wfXX|all>
 * Config per workflow: scripts/qa-workflow/config/wfXX-*.mjs (export default)
 *
 * Aksi (steps): goto, type, fill, click, clickText, select, wait, screenshot,
 * expectText, expectToast, expectUrl, logout
 * - expectText must=true  → teks WAJIB muncul (positif)
 * - expectText must=false → teks WAJIB TIDAK muncul (negatif)
 * - expectToast must=false → toast error/peringatan MUNCUL (negatif case butuh feedback)
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.QA_BASE ?? 'http://localhost:3002'
const REPORT_DIR = path.join(__dirname, 'reports', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))
const results = []

async function doStep(page, step, ctx) {
  const { act } = step
  switch (act) {
    case 'goto': {
      const url = step.url.startsWith('http') ? step.url : BASE + step.url
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1200)
      return `goto ${url}`
    }
    case 'type':
    case 'fill': {
      const sel = step.placeholder ? `input[placeholder="${step.placeholder}"]` : step.selector
      await page.fill(sel, step.value)
      return `${act} ${sel} = ${String(step.value).slice(0, 30)}`
    }
    case 'click':
      await page.click(step.selector, { timeout: 8000 })
      await page.waitForTimeout(400)
      return `click ${step.selector}`
    case 'clickText': {
      const loc = page.locator(`text=${step.text}`).first()
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      await loc.click({ timeout: 8000 })
      await page.waitForTimeout(500)
      return `clickText "${step.text}"`
    }
    case 'select': {
      const sel = step.placeholder ? `select[placeholder="${step.placeholder}"]` : step.selector
      await page.selectOption(sel, step.value)
      await page.waitForTimeout(400)
      return `select ${sel} = ${step.value}`
    }
    case 'selectLabel': {
      await page.selectOption(step.selector, { label: step.label })
      await page.waitForTimeout(400)
      return `selectLabel ${step.selector} = "${step.label}"`
    }
    case 'wait':
      await page.waitForTimeout(step.ms ?? 1000)
      return `wait ${step.ms ?? 1000}ms`
    case 'screenshot': {
      await page.screenshot({ path: path.join(ctx.dir, step.name + '.png'), fullPage: false })
      return `screenshot ${step.name}`
    }
    case 'expectText': {
      const loc = page.locator(`text=${step.text}`).first()
      const found = await loc.isVisible().catch(() => false)
      if (step.must === false && found) throw new Error(`teks "${step.text}" SEHARUSNYA tidak muncul tapi ADA`)
      if (step.must !== false && !found) throw new Error(`teks "${step.text}" tidak ditemukan`)
      return `expectText "${step.text}" ${step.must === false ? 'ABSENT' : 'present'} ✓`
    }
    case 'expectToast': {
      const toasts = page.locator('[data-sonner-toast]')
      const n = await toasts.count()
      let ok = n > 0
      let msg = `toast muncul (${n})`
      if (step.text) {
        const body = await page.locator('[data-sonner-toast]').first().innerText().catch(() => '')
        ok = body.includes(step.text)
        msg = ok ? `toast "${step.text.slice(0, 30)}" ✓` : `toast TIDAK berisi "${step.text.slice(0, 30)}" (body: ${body.slice(0, 60)})`
      }
      if (step.must === false) ok = !ok // negatif: toast (error) justru harus muncul → dibalik di config dgn must=false & text pesan error
      if (!ok) throw new Error(msg)
      return msg
    }
    case 'expectUrl': {
      const url = page.url()
      const ok = step.contains ? url.includes(step.url) : url === step.url
      if (!ok) throw new Error(`URL ${url} ≠ ${step.url}`)
      return `expectUrl ${url} ✓`
    }
    case 'expectDisabled': {
      const loc = page.locator(step.selector).first()
      const disabled = await loc.isDisabled().catch(() => false)
      if (step.must === false && disabled) throw new Error(`elemen SEHARUSNYA aktif tapi disabled`)
      if (step.must !== false && !disabled) throw new Error(`elemen seharusnya disabled tapi aktif`)
      return `expectDisabled ${step.selector} ${disabled ? 'disabled' : 'enabled'} ✓`
    }
    case 'dbExpect': {
      const env = readEnv()
      const payload = JSON.stringify({ query: step.sql })
      const { execFileSync } = await import('child_process')
      const out = execFileSync('curl', [
        '-s', '-X', 'POST',
        'https://api.supabase.com/v1/projects/glblgsfenarnztawtpmu/database/query',
        '-H', `Authorization: Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        '-H', 'Content-Type: application/json',
        '-d', payload,
      ], { encoding: 'utf-8' })
      let n = 0
      try {
        const rows = JSON.parse(out)
        n = Array.isArray(rows) && rows.length ? Number(Object.values(rows[0])[0] ?? 0) : 0
      } catch { n = 0 }
      const ok = step.min !== undefined ? n >= step.min : n === 0
      console.log(`     [dbExpect] ${n} rows (${step.sql.slice(0, 70)}…)`)
      if (!ok) throw new Error(`DB count ${n} tidak sesuai (min=${step.min})`)
      return `dbExpect count=${n} ✓ (${step.sql.slice(0, 60)}…)`
    }
    case 'dbExec': {
      // seed/update data test via Management API SQL — output tidak di-assert
      const env = readEnv()
      const payload = JSON.stringify({ query: step.sql })
      const { execFileSync } = await import('child_process')
      const out = execFileSync('curl', [
        '-s', '-X', 'POST',
        'https://api.supabase.com/v1/projects/glblgsfenarnztawtpmu/database/query',
        '-H', `Authorization: Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        '-H', 'Content-Type: application/json',
        '-d', payload,
      ], { encoding: 'utf-8' })
      return `dbExec OK (${step.sql.slice(0, 60)}…)`
    }
    case 'draw': {
      const loc = page.locator(step.selector ?? 'canvas').first()
      await loc.scrollIntoViewIfNeeded().catch(() => {})
      const box = await loc.boundingBox()
      if (!box) throw new Error(`canvas tidak terlihat`)
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      await page.mouse.move(cx - 60, cy)
      await page.mouse.down()
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(cx - 60 + i * 12, cy + Math.sin(i) * 14)
      }
      await page.mouse.up()
      await page.waitForTimeout(400)
      return `draw di canvas (${Math.round(box.width)}x${Math.round(box.height)})`
    }
    case 'logout':
      await page.evaluate(() => localStorage.clear())
      await page.goto(BASE + '/logout', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(800)
      return 'logout'
    default:
      throw new Error(`aksi tak dikenal: ${act}`)
  }
}

async function runCase(browser, cfg, cse) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  // auto-accept confirm() dialog (konfirmasi hapus/aksi QA)
  page.on('dialog', (d) => d.accept().catch(() => {}))
  const dir = path.join(REPORT_DIR, slug(cfg.name), slug(cse.name))
  fs.mkdirSync(dir, { recursive: true })
  const steps = []
  try {
    if (cse.login) {
      await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      await page.fill('input[placeholder*="Email" i], input[type="email"]', cse.login.email)
      await page.fill('input[type="password"]', cse.login.password)
      await page.waitForTimeout(1500)
      await page.click('button:has-text("Masuk")')
      let okLogin = false
      for (let attempt = 0; attempt < 3 && !okLogin; attempt++) {
        await page.waitForTimeout(3000)
        okLogin = !page.url().includes('/login')
        if (!okLogin) {
          // coba lagi (rate-limit / lambat)
          await page.click('button:has-text("Masuk")').catch(() => {})
        }
      }
      if (okLogin) steps.push({ name: 'login', pass: true, note: `login ${cse.login.email}` })
      else throw new Error('login gagal (masih di /login setelah retry)')
    }
    for (const [i, step] of cse.steps.entries()) {
      try {
        const note = await doStep(page, step, { dir })
        steps.push({ name: step.act + (step.name ? ':' + step.name : ''), pass: true, note })
      } catch (e) {
        await page.screenshot({ path: path.join(dir, `FAIL-step${i + 1}.png`) }).catch(() => {})
        steps.push({ name: step.act + (step.name ? ':' + step.name : ''), pass: false, note: e.message })
        throw e
      }
    }
    return { name: cse.name, pass: true, steps }
  } catch (e) {
    return { name: cse.name, pass: false, steps, error: e.message }
  } finally {
    await ctx.close()
  }
}

async function runCleanup(cfg) {
  if (!cfg.cleanup || !cfg.cleanup.length) return
  const env = readEnv()
  const token = env.SUPABASE_ACCESS_TOKEN
  const project = 'glblgsfenarnztawtpmu'
  for (const sql of cfg.cleanup) {
    try {
      const payload = JSON.stringify({ query: sql })
      const cp = await import('child_process')
      const { execFileSync } = cp
      const out = execFileSync('curl', [
        '-s', '-X', 'POST',
        `https://api.supabase.com/v1/projects/${project}/database/query`,
        '-H', `Authorization: Bearer ${token}`,
        '-H', 'Content-Type: application/json',
        '-d', payload,
      ], { encoding: 'utf-8' })
      console.log('   cleanup OK:', out.trim().slice(0, 80))
    } catch (e) {
      console.log('   cleanup skip:', String(e.message || e).slice(0, 100))
    }
  }
}

function readEnv() {
  const env = {}
  for (const line of fs.readFileSync(path.join(__dirname, '..', '..', '.env.local'), 'utf-8').split(/\r?\n/)) {
    const idx = line.indexOf('=')
    if (idx > 0 && !line.trimStart().startsWith('#')) {
      env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^"|"$/g, '')
    }
  }
  return env
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
}

const target = process.argv[2] ?? 'all'
const cfgDir = path.join(__dirname, 'config')
const files = fs.readdirSync(cfgDir).filter((f) => f.endsWith('.mjs') && f.startsWith('wf'))
const selected = target === 'all' ? files : files.filter((f) => f.includes(target))
if (!selected.length) {
  console.error('Tidak ada config untuk:', target)
  process.exit(1)
}

const browser = await chromium.launch()
let passAll = true
for (const f of selected) {
  const cfg = (await import(pathToFileURL(path.join(cfgDir, f)).href)).default
  console.log(`\n=== ${cfg.name} (${cfg.cases.length} case) ===`)
  for (const cse of cfg.cases) {
    const r = await runCase(browser, cfg, cse)
    results.push({ wf: cfg.name, case: r.name, pass: r.pass, steps: r.steps, error: r.error })
    console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${cse.name}${r.error ? ' — ' + r.error.slice(0, 100) : ''}`)
    if (!r.pass) passAll = false
  }
  await runCleanup(cfg)
}
await browser.close()

// ringkasan
console.log(`\n${'='.repeat(50)}\nRINGKASAN`)
let p = 0
for (const r of results) {
  if (r.pass) p++
  console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.wf} :: ${r.case}`)
}
console.log(`\n${p}/${results.length} case PASS — laporan: ${REPORT_DIR}`)
fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(results, null, 2))
process.exit(passAll ? 0 : 1)
