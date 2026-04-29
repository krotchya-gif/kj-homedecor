# Ringkasan Sistem Manajemen Operasional Gorden (Custom ERP)

Dokumen ini merangkum hasil diskusi mengenai kebutuhan sistem kustom untuk menggantikan sistem lama (Jubelio/Ngorder) guna mendukung operasional bisnis gorden yang lebih mendetail dan real-time.

---

## 1. Alur Operasional Utama
Sistem harus mampu mengintegrasikan alur kerja dari berbagai divisi:
- **Admin:** Menerima pesanan (E-commerce & Offline), menginput data kustom, dan mengelola database pelanggan.
- **Finance:** Verifikasi HPP, penentuan harga jual, manajemen DP/Pelunasan, dan laporan laba rugi otomatis.
- **Gudang:** Pengecekan stok kain dan aksesori (hook, endcap, batang), serta pemrosesan retur.
- **Produksi (Jahit & Steam):** Pencatatan meter lari untuk upah jahit, proses finishing di bagian steam, serta QC akhir.
- **Pemasangan:** Penjadwalan tim lapangan berdasarkan kalender ketersediaan.

---

## 2. Fitur Spesifik yang Dibutuhkan

### A. Manajemen Stok & Inventaris
- **Varian Aksesori:** Pelacakan stok mendetail untuk Kain, Hook, Endcap, dan Batang/Rail.
- **Input Desimal:** Mendukung pengukuran presisi (contoh: 3,5 meter) untuk menghindari selisih HPP akibat pembulatan.
- **Manajemen Retur:** Fitur pemisahan barang retur (layak stok ulang vs rusak/buang) yang otomatis memengaruhi neraca aset.

### B. SDM & Penggajian
- **Kalkulator Upah Jahit:** Perhitungan otomatis bonus berdasarkan total meter lari yang dikerjakan.
- **Log Lembur:** Pencatatan jam kerja tambahan, personil yang bertugas, dan jenis pekerjaan untuk transparansi biaya.
- **Dashboard Performa:** Memantau kontribusi omzet per Admin untuk pembagian insentif/profit sharing.

### C. Keuangan & Integrasi
- **Sinkronisasi Marketplace:** Penarikan data penjualan secara real-time via API (Shopee, TikTok, Tokopedia) ke laporan keuangan.
- **Status Pembayaran:** Pembedaan jelas antara pesanan DP dan Lunas untuk kontrol pengiriman/pemasangan.
- **Otomasi Laporan:** Laba rugi yang langsung terupdate dari setiap transaksi yang tervalidasi.

---

## 3. Kebutuhan Teknis & User Experience
- **Multi-Role Access:** Hak akses berbeda untuk tiap divisi (Admin, Gudang, Finance, Steam, Laundry).
- **Akun Owner:** Satu akun master yang dapat memantau seluruh dashboard tanpa perlu login ulang ke akun divisi.
- **CRM & Database:** Kemampuan mengimpor data pelanggan lama (Excel/CSV) untuk keperluan pemasaran ulang.
- **Dokumentasi Kondisi (Laundry):** Fitur upload foto kondisi awal barang (khusus divisi laundry) untuk mencegah komplain pelanggan atas cacat yang sudah ada.

---

## 4. Evaluasi Sistem Lama
- **Masalah Utama:** Kurangnya sinkronisasi real-time dan keterbatasan dalam menangani detail pesanan kustom.
- **Solusi:** Sistem baru harus meminimalisir input manual yang berulang dan menyediakan data yang akurat untuk pengambilan keputusan owner.
