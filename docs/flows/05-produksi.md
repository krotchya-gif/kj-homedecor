# Flow 05 — Produksi (Gudang, Penjahit, Steam/QC)

> Alur produksi gorden setelah order di-sortir: dibuat job penjahit, dikerjakan, dicek steam/QC, siap packing.

## Aktor
| Role | Bisa apa |
|---|---|
| Gudang | Kelola produksi, assign penjahit, QC steam |
| Penjahit | Ambil job, kerjakan, lapor hasil |
| Owner | Semua tahap |

## Langkah-langkah

1. **Order masuk produksi** — dari order detail: status Sudah Disortir → klik "Lanjut: Mulai Produksi":
   - Sistem **otomatis membuat job produksi** (idempotent — dicek dulu, tidak dobel)
   - Job berisi: order, meteran kain yang dibutuhkan (dari item gorden), status `waiting`
   - Order pindah ke status **Produksi**
2. **Assign penjahit** (Gudang, halaman Produksi):
   - Pilih job → assign ke penjahit → status job: `in_progress`
   - Penjahit dapat melihat job miliknya di menu **Job Saya**
3. **Penjahit mengerjakan**:
   - Ambil job → mulai
   - Selesai → lapor hasil (status job: `done` / laporan produksi)
4. **Steam/QC** (Gudang, halaman Steam/QC):
   - Upload foto hasil jahitan (wajib)
   - **Lolos** → order **otomatis** pindah ke **Siap** (auto-advance, pakai foto yang barusan di-upload)
   - **Gagal** → revisi → job dikembalikan ke penjahit (status `revision`) + foto bukti, order kembali ke **Produksi**
5. **Siap** → lanjut ke packing (lihat Flow 01/07 — tombol "Kemas" di halaman QC Per-Item Gudang)

## Material & HPP
- Setiap order bisa punya **kebutuhan material** (BOM) — dihitung dari item + meteran
- **HPP** dihitung dari material terpakai + biaya → dipakai laporan laba
- Penggunaan material dicatat (stok berkurang saat produksi/job selesai)

## Aturan
- Job produksi **tidak bisa diambil penjahit lain** (job terikat penjahit)
- Semua transisi terekam di **audit log order**
- Gate pembayaran: order harus lunas sebelum produksi lanjut ke packing
