import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('style_rates')
    .select('*')
    .eq('is_active', true)
    .order('style')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { style, rate_per_meter } = body

  if (!style || rate_per_meter == null) {
    return NextResponse.json({ error: 'style and rate_per_meter are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('style_rates')
    .update({ rate_per_meter, updated_at: new Date().toISOString() })
    .eq('style', style)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
