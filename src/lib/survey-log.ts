/**
 * Log aktivitas survey — non-blocking: kegagalan log TIDAK menggagalkan operasi utama
 * (pola audit-trail skill kj-homedecor: console.error, bukan throw).
 */
export async function logSurveyActivity(
  supabase: any,
  surveyId: string,
  userId: string | null,
  action: 'created' | 'updated' | 'deleted' | 'linked_order',
  detail?: string | null
) {
  try {
    const { error } = await supabase.from('survey_logs').insert({
      survey_id: surveyId,
      user_id: userId,
      action,
      detail: detail ?? null
    })
    if (error) console.error('logSurveyActivity gagal:', error.message)
  } catch (e) {
    console.error('logSurveyActivity gagal:', e)
  }
}
