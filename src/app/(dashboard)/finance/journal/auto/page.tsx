import { redirect } from 'next/navigation'

// Sesi 45: /finance/journal/auto dipindah ke /finance/journal (tampil langsung).
// Route lama dipertahankan sebagai redirect agar bookmark tidak rusak.
export default function AutoJournalRedirect() {
  redirect('/finance/journal')
}
