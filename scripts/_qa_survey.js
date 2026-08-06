/* QA Survey Gorden: alur API + RLS role surveyor (test akun, lalu cleanup).
 * node scripts/_qa_survey.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PREFIX = 'qa-survey-';

// cleanup sisa run sebelumnya (kalau ada)
async function preCleanup() {
  const { data: oldSurveys } = await sb.from('surveys').select('id').eq('client_name', 'QA Client Survey');
  for (const s of oldSurveys ?? []) await sb.from('surveys').delete().eq('id', s.id);
  const { data: oldUsers } = await sb.from('users').select('id, name').like('name', 'QA %');
  for (const u of oldUsers ?? []) {
    await sb.from('users').delete().eq('id', u.id);
    await sb.auth.admin.deleteUser(u.id).catch(() => {});
  }
}

async function makeUser(tag) {
  const email = `${PREFIX}${tag}-${Date.now()}@test.local`;
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: 'Survey123!', email_confirm: true });
  if (error) throw new Error('createUser: ' + error.message);
  const { error: uErr } = await sb.from('users').insert({ id: u.user.id, name: 'QA ' + tag, role: 'surveyor', status: 'active' });
  if (uErr) throw new Error('insert users: ' + uErr.message);
  return u.user;
}

async function loginAs(user) {
  const { data, error } = await sb.auth.signInWithPassword({ email: user.email, password: 'Survey123!' });
  if (error) throw new Error('login: ' + error.message);
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: 'Bearer ' + data.session.access_token } }
  });
}

(async () => {
  await preCleanup();
  const userA = await makeUser('a');
  const userB = await makeUser('b');
  console.log('✓ akun test dibuat:', userA.email, '/', userB.email);

  // 1. Buat survey milik A (simulasi API: surveyor_id = A, status tersimpan, 2 rooms + foto)
  const { data: num } = await sb.rpc('generate_survey_number');
  const { data: survey, error: sErr } = await sb.from('surveys').insert({
    survey_number: num,
    client_name: 'QA Client Survey',
    client_address: 'Jl. Test 123',
    survey_date: new Date().toISOString().split('T')[0],
    surveyor_id: userA.id,
    status: 'tersimpan'
  }).select().single();
  if (sErr) throw new Error('insert survey: ' + sErr.message);
  const { error: rErr } = await sb.from('survey_rooms').insert([
    { survey_id: survey.id, room_name: 'Ruang Tamu', width_cm: 300, height_cm: 250, model_gorden: 'Smokring', fabric_name: 'Kain Linen', sort_order: 0 },
    { survey_id: survey.id, room_name: 'Kamar Utama', width_cm: 240, height_cm: 260, model_gorden: 'Kupu-kupu', notes: 'Ada AC', sort_order: 1 }
  ]);
  if (rErr) throw new Error('insert rooms: ' + rErr.message);
  console.log('✓ survey A dibuat:', survey.survey_number, survey.id);

  // 2. Login sebagai A → harus bisa lihat survey-nya
  const clientA = await loginAs(userA);
  const rA = await clientA.from('surveys').select('id, client_name, rooms:survey_rooms(count)');
  if (rA.error) throw new Error('A select: ' + rA.error.message);
  const foundA = (rA.data ?? []).some((s) => s.id === survey.id);
  console.log(foundA ? '✓ A bisa lihat survey-nya' : '✗ A TIDAK bisa lihat survey-nya');

  // 3. Login sebagai B → TIDAK boleh lihat survey A (RLS)
  const clientB = await loginAs(userB);
  const rB = await clientB.from('surveys').select('id');
  if (rB.error) throw new Error('B select: ' + rB.error.message);
  const leakB = (rB.data ?? []).some((s) => s.id === survey.id);
  console.log(leakB ? '✗ BOCOR: B bisa lihat survey A!' : '✓ RLS benar: B tidak bisa lihat survey A');

  // 4. B coba update survey A → harus ditolak (0 rows affected)
  const updB = await clientB.from('surveys').update({ client_name: 'HACK' }).eq('id', survey.id).select();
  const updatedRows = updB.data?.length ?? 0;
  console.log(updatedRows === 0 ? '✓ RLS update ditolak (0 baris)' : '✗ BOCOR: B bisa update survey A (' + updatedRows + ' baris)');

  // 5. Cek RPC nomor survey jalan
  console.log('✓ generate_survey_number:', num);

  // cleanup
  await sb.from('surveys').delete().eq('id', survey.id);
  for (const u of [userA, userB]) {
    await sb.from('users').delete().eq('id', u.id);
    await sb.auth.admin.deleteUser(u.id);
  }
  console.log('✓ cleanup selesai (survey + 2 akun test dihapus)');
  console.log('RESULT:', foundA && !leakB && updatedRows === 0 ? 'PASS' : 'FAIL');
})().catch((e) => { console.error('QA FAIL:', e.message); process.exit(1); });
