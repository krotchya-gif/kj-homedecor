// Server component layout — revalidate valid di sini (bukan di client page).
// Halaman statis Next.js di-cache CDN 1 tahun (s-maxage=31536000). Setelah
// deploy, HTML lama tetap di-serve CDN sementara file CSS/JS lama sudah
// terhapus -> halaman tampil tanpa CSS. Batasi revalidate 60 detik supaya
// HTML segar maksimal 1 menit setelah deploy baru.
export const revalidate = 60

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children
}
