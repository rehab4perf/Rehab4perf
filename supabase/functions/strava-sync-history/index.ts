import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const CLIENT_ID     = Deno.env.get('STRAVA_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!

const TYPE_INTENSITY: Record<string, number> = {
  Run: 6, TrailRun: 7, Ride: 5, VirtualRide: 5, Swim: 6,
  Walk: 3, Hike: 4, WeightTraining: 4, Rowing: 6,
}

function _calcCharge(act: Record<string, unknown>): number | null {
  const durationMin = ((act.moving_time as number) || 0) / 60
  if (durationMin < 1) return null
  const sufferScore = act.suffer_score as number | null
  if (sufferScore && sufferScore > 0) return Math.round(sufferScore * 5)
  const type = (act.sport_type as string) || (act.type as string) || ''
  return Math.round(durationMin * (TYPE_INTENSITY[type] ?? 5))
}

async function refreshIfNeeded(token: Record<string, string>): Promise<string> {
  if (new Date(token.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return token.access_token
  }
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: token.refresh_token,
    }),
  })
  const data = await res.json()
  await supabase.from('strava_tokens').update({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    new Date(data.expires_at * 1000).toISOString(),
    updated_at:    new Date().toISOString(),
  }).eq('id', token.id)
  return data.access_token
}

Deno.serve(async (req: Request) => {
  const url       = new URL(req.url)
  const patientId = url.searchParams.get('patient_id')
  if (!patientId) return new Response('Missing patient_id', { status: 400 })

  const { data: token } = await supabase
    .from('strava_tokens')
    .select('*')
    .eq('patient_id', patientId)
    .single()

  if (!token) return new Response('No token for this patient', { status: 404 })

  const accessToken = await refreshIfNeeded(token)

  // Sync last 90 days
  const after = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)

  let page     = 1
  let inserted = 0

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${after}&page=${page}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (!res.ok) break

    const activities = await res.json()
    if (!Array.isArray(activities) || activities.length === 0) break

    const rows = activities.map((act: Record<string, unknown>) => ({
      patient_id: token.patient_id,
      strava_id:  act.id,
      date:       (act.start_date_local as string)?.substring(0, 10),
      type:       act.sport_type || act.type,
      nom:        act.name,
      distance_m: Math.round((act.distance as number) || 0),
      duree_s:    (act.moving_time as number) || 0,
      charge:     _calcCharge(act),
      donnees: {
        elevation: act.total_elevation_gain,
        avg_hr:    act.average_heartrate,
        max_hr:    act.max_heartrate,
        avg_speed: act.average_speed,
        max_speed: act.max_speed,
        // L'endpoint liste fournit le tracé mais pas les splits (endpoint detail uniquement)
        polyline:  (act.map as Record<string, unknown> | undefined)?.summary_polyline || null,
      },
    }))

    await supabase.from('strava_activities').upsert(rows, { onConflict: 'strava_id' })
    inserted += rows.length
    page++
    if (activities.length < 100) break
  }

  return new Response(JSON.stringify({ ok: true, inserted }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
