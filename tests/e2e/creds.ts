import { readFileSync } from 'fs'
import path from 'path'

// Sumber kredensial SATU-SATUNYA untuk E2E = USER.md di root repo
// (sesuai docs/flows/10-staff-akses.md:38 — wajib sinkron dengan akun live).
// Parse tabel "Akun Test" → ambil hanya akun dev test @kjhomedecor.com.
// Akun asli produksi (mis. cici.yunita124@gmail.com) sengaja TIDAK dipakai E2E.

export interface RoleCred {
  role: string
  email: string
  password: string
  dash: string
}

const USER_MD_PATH = path.resolve(__dirname, '../../USER.md')

const DASH_BY_ROLE: Record<string, string> = {
  owner: '/owner',
  admin: '/admin',
  gudang: '/gudang',
  finance: '/finance',
  penjahit: '/penjahit',
  installer: '/installer',
  surveyor: '/surveyor',
  laundry: '/laundry'
}

function parseCreds(): RoleCred[] {
  const md = readFileSync(USER_MD_PATH, 'utf8')
  const creds: RoleCred[] = []
  for (const line of md.split('\n')) {
    if (!line.trim().startsWith('|') || !line.includes('kjhomedecor.com')) continue
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim().replace(/`/g, ''))
    if (cells.length < 4) continue
    const [email, , role, password] = cells
    if (!email.includes('kjhomedecor.com')) continue
    const dash = DASH_BY_ROLE[role]
    if (!dash) continue
    creds.push({ role, email, password, dash })
  }
  if (creds.length !== Object.keys(DASH_BY_ROLE).length) {
    throw new Error(
      `USER.md (${USER_MD_PATH}) tidak memuat semua akun test @kjhomedecor.com — dapat ${creds.length}/${Object.keys(DASH_BY_ROLE).length}. Sinkronkan USER.md dulu.`
    )
  }
  return creds
}

export const CREDS: RoleCred[] = parseCreds()