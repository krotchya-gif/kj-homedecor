// UI CRUD test presisi: products (admin), customers (admin), materials (owner)
const { chromium } = require('playwright')
const T = Date.now().toString(36).slice(-5)

async function login(page, email, pass) {
  await page.goto('http://localhost:3100/login', { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(500)
  await page.fill('input[type=email], input[name=email]', email).catch(() => {})
  await page.fill('input[type=password]', pass)
  await page.click('button[type=submit]')
  await page.waitForTimeout(2500)
}

async function main() {
  const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
  const report = []

  // ===== ADMIN: PRODUCTS full CRUD =====
  {
    const page = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await login(page, 'qa.admin.1785643503918@hermes.local', 'QaTest123!')
    const name = 'QA UI Produk ' + T
    const steps = []
    // CREATE
    await page.goto('http://localhost:3100/admin/catalog/products', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.locator('button:has-text("Tambah Produk")').first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(800)
    // fallback: dispatch native click via evaluate (React onClick tetap terpanggil)
    if (!(await page.locator('#name').count())) {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')]
        const t = btns.find((x) => x.textContent.includes('Tambah Produk'))
        if (t) t.click()
      })
      await page.waitForTimeout(1000)
    }
    await page.locator('#name').fill(name).catch(() => {})
    // input tidak punya id di DOM — pakai placeholder unik
    const nameInp = page.locator('input[placeholder="Atlas 59-1 Smokering"]').first()
    if (await nameInp.count()) await nameInp.fill(name)
    else steps.push('❌ input nama (placeholder Atlas) tidak ada')
    await page.locator('input[placeholder="SKU-001"]').first().fill('QA-' + T).catch(() => {})
    await page.locator('input[placeholder="250000"]').first().fill('123456').catch(() => {})
    await page.locator('input[placeholder="0"]').first().fill('7').catch(() => {})
    // radio product_type default perabot — klik radio perabot jika ada
    const radio = page.locator('input[type=radio][name=product_type]').first()
    if (await radio.count()) await radio.check({ force: true }).catch(() => {})
    await page.locator('button[type=submit]:has-text("Simpan")').click({ force: true }).catch(() => steps.push('❌ submit tidak diklik'))
    await page.waitForTimeout(2000)
    // VERIFY CREATE via search
    const search = page.locator('input[placeholder*="Cari produk"]').first()
    if (await search.count()) { await search.fill(name); await page.waitForTimeout(1200) }
    let body = await page.evaluate(() => document.body.innerText)
    steps.push('CREATE: produk muncul di tabel = ' + body.includes(name))
    // UPDATE
    const row = page.locator('tr', { hasText: name }).first()
    if (await row.count()) {
      const editBtn = row.locator('button[title="Edit"]').first()
      if (await editBtn.count()) {
        await editBtn.click({ force: true }).catch(() => {
          // fallback native click
          return page.evaluate((n) => {
            const trs = [...document.querySelectorAll('tr')]
            const tr = trs.find((x) => x.textContent.includes(n))
            const b = tr?.querySelector('button[title="Edit"]')
            if (b) b.click()
          }, name)
        })
        await page.waitForTimeout(1000)
        await page.locator('input[placeholder="250000"]').first().fill('654321').catch(() => {})
        await page.locator('button[type=submit]:has-text("Simpan")').click({ force: true }).catch(() => {})
        await page.waitForTimeout(2000)
        if (await search.count()) { await search.fill(''); await page.waitForTimeout(500); await search.fill(name); await page.waitForTimeout(1200) }
        body = await page.evaluate(() => document.body.innerText)
        steps.push('UPDATE: harga baru tampil = ' + body.includes('654.321') + ' (atau ' + body.includes('654321') + ')')
      } else steps.push('⚠️ tombol Edit tidak ditemukan di row')
    } else steps.push('⚠️ row tidak muncul setelah create')
    // DELETE
    if (await row.count()) {
      const delBtn = row.locator('button[title="Hapus"]').first()
      if (await delBtn.count()) {
        page.once('dialog', (d) => d.accept())
        await delBtn.click({ force: true }).catch(() => {
          return page.evaluate((n) => {
            const trs = [...document.querySelectorAll('tr')]
            const tr = trs.find((x) => x.textContent.includes(n))
            const b = tr?.querySelector('button[title="Hapus"]')
            if (b) b.click()
          }, name)
        })
        await page.waitForTimeout(2000)
        body = await page.evaluate(() => document.body.innerText)
        steps.push('DELETE: produk hilang = ' + !body.includes(name))
      } else steps.push('⚠️ tombol Hapus tidak ditemukan')
    }
    report.push(['ADMIN products', steps])
    await page.close()
  }

  // ===== ADMIN: CUSTOMERS create + delete =====
  {
    const page = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await login(page, 'qa.admin.1785643503918@hermes.local', 'QaTest123!')
    const name = 'QA UI Customer ' + T
    const steps = []
    await page.goto('http://localhost:3100/admin/customers', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const addBtn = page.locator('button:has-text("Tambah")').first()
    if (await addBtn.count()) {
      await addBtn.click({ force: true }).catch(() => {
        return page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')]
          const t = btns.find((x) => /^ *Tambah *$/.test(x.textContent))
          if (t) t.click()
        })
      })
      await page.waitForTimeout(800)
      const inp = page.locator('input[placeholder="Nama lengkap"]').first()
      if (await inp.count()) await inp.fill(name)
      const phone = page.locator('input[placeholder="08xxx"]').first()
      if (await phone.count()) await phone.fill('0812' + T.slice(0, 8))
      const addr = page.locator('input[placeholder="Jl. ..."]').first()
      if (await addr.count()) await addr.fill('Jl. QA Test')
      await page.locator('button[type=submit]').first().click({ force: true }).catch(() => {
        return page.evaluate(() => {
          const b = document.querySelector('button[type=submit]')
          if (b) b.click()
        })
      })
      await page.waitForTimeout(2000)
      let body = await page.evaluate(() => document.body.innerText)
      steps.push('CREATE: customer muncul = ' + body.includes(name))
      const row = page.locator('tr', { hasText: name }).first()
      if (await row.count()) {
        const delBtn = row.locator('button[title="Hapus"], button:has-text("Hapus")').first()
        if (await delBtn.count()) {
          page.once('dialog', (d) => d.accept())
          await delBtn.click({ force: true }).catch(() => {
            return page.evaluate((n) => {
              const trs = [...document.querySelectorAll('tr')]
              const tr = trs.find((x) => x.textContent.includes(n))
              const b = tr?.querySelector('button[title="Hapus"]') || [...(tr?.querySelectorAll('button') || [])].find((x) => /hapus/i.test(x.textContent))
              if (b) b.click()
            }, name)
          })
          await page.waitForTimeout(2000)
          body = await page.evaluate(() => document.body.innerText)
          steps.push('DELETE: customer hilang = ' + !body.includes(name))
        } else steps.push('⚠️ tombol Hapus tidak ditemukan')
      } else steps.push('⚠️ row tidak muncul')
    } else steps.push('⚠️ tombol Tambah tidak ditemukan')
    report.push(['ADMIN customers', steps])
    await page.close()
  }

  // ===== OWNER: MATERIALS create + delete =====
  {
    const page = await b.newPage({ viewport: { width: 1280, height: 900 } })
    await login(page, 'qa.owner.1785643505609@hermes.local', 'QaTest123!')
    const name = 'QA UI Material ' + T
    const steps = []
    await page.goto('http://localhost:3100/owner/materials', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const addBtn = page.locator('button:has-text("Tambah")').first()
    if (await addBtn.count()) {
      await addBtn.click({ force: true }).catch(() => {
        return page.evaluate(() => {
          const btns = [...document.querySelectorAll('button')]
          const t = btns.find((x) => /^ *Tambah *$/.test(x.textContent))
          if (t) t.click()
        })
      })
      await page.waitForTimeout(800)
      const inp = page.locator('input[placeholder="Kain Atlas 59-1"]').first()
      if (await inp.count()) await inp.fill(name)
      // cost_per_unit = input number pertama, stock_gudang kedua, stock_toko ketiga
      const nums = page.locator('input[type=number]')
      if (await nums.count() >= 1) await nums.nth(0).fill('5000')
      if (await nums.count() >= 2) await nums.nth(1).fill('10')
      if (await nums.count() >= 3) await nums.nth(2).fill('2')
      await page.locator('button[type=submit]').first().click({ force: true }).catch(() => {
        return page.evaluate(() => {
          const b = document.querySelector('button[type=submit]')
          if (b) b.click()
        })
      })
      await page.waitForTimeout(2000)
      let body = await page.evaluate(() => document.body.innerText)
      steps.push('CREATE: material muncul = ' + body.includes(name))
      const row = page.locator('tr', { hasText: name }).first()
      if (await row.count()) {
        const delBtn = row.locator('button[title="Hapus"], button:has-text("Hapus")').first()
        if (await delBtn.count()) {
          page.once('dialog', (d) => d.accept())
          await delBtn.click({ force: true }).catch(() => {
            return page.evaluate((n) => {
              const trs = [...document.querySelectorAll('tr')]
              const tr = trs.find((x) => x.textContent.includes(n))
              const b = tr?.querySelector('button[title="Hapus"]') || [...(tr?.querySelectorAll('button') || [])].find((x) => /hapus/i.test(x.textContent))
              if (b) b.click()
            }, name)
          })
          await page.waitForTimeout(2000)
          body = await page.evaluate(() => document.body.innerText)
          steps.push('DELETE: material hilang = ' + !body.includes(name))
        } else steps.push('⚠️ tombol Hapus tidak ditemukan')
      } else steps.push('⚠️ row tidak muncul')
    } else steps.push('⚠️ tombol Tambah tidak ditemukan')
    report.push(['OWNER materials', steps])
    await page.close()
  }

  await b.close()
  console.log('========== UI CRUD TEST ==========')
  for (const [n, steps] of report) {
    console.log('\n### ' + n)
    steps.forEach((s) => console.log('  ' + s))
  }
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
