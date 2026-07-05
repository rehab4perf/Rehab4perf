import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const CLIENT_ID    = Deno.env.get('STRAVA_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!
const VERIFY_TOKEN = 'r4p_webhook_2026'

// Intensité par défaut (proxy RPE) si suffer_score absent
const TYPE_INTENSITY: Record<string, number> = {
  Run: 6, TrailRun: 7, Ride: 5, VirtualRide: 5, Swim: 6,
  Walk: 3, Hike: 4, WeightTraining: 4, Rowing: 6,
}

function _calcCharge(act: Record<string, unknown>): number | null {
  const durationMin = ((act.moving_time as number) || 0) / 60
  if (durationMin < 1) return null
  const sufferScore = act.suffer_score as number | null
  if (sufferScore && sufferScore > 0) {
    // suffer_score × 5 ≈ RPE × durée (Foster) — même ordre de grandeur
    return Math.round(sufferScore * 5)
  }
  const type = (act.sport_type as string) || (act.type as string) || ''
  const intensity = TYPE_INTENSITY[type] ?? 5
  return Math.round(durationMin * intensity)
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
  // GET: Strava subscription verification challenge
  if (req.method === 'GET') {
    const url       = new URL(req.url)
    const mode      = url.searchParams.get('hub.mode')
    const challenge = url.searchParams.get('hub.challenge')
    const verify    = url.searchParams.get('hub.verify_token')
    if (mode === 'subscribe' && verify === VERIFY_TOKEN && challenge) {
      return new Response(JSON.stringify({ 'hub.challenge': challenge }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // POST: activity event from Strava
  if (req.method === 'POST') {
    const event = await req.json()

    // Only handle activity create/update
    if (event.object_type !== 'activity' || !['create', 'update'].includes(event.aspect_type)) {
      return new Response('ok')
    }

    const stravaAthleteId  = event.owner_id
    const stravaActivityId = event.object_id

    const { data: token } = await supabase
      .from('strava_tokens')
      .select('*')
      .eq('strava_athlete_id', stravaAthleteId)
      .single()

    if (!token) return new Response('ok') // athlete not linked

    const accessToken = await refreshIfNeeded(token)

    // Fetch full activity details
    const actRes = await fetch(
      `https://www.strava.com/api/v3/activities/${stravaActivityId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (!actRes.ok) return new Response('ok')

    const act  = await actRes.json()
    const date = (act.start_date_local as string)?.substring(0, 10)

    await supabase.from('strava_activities').upsert({
      patient_id: token.patient_id,
      strava_id:  stravaActivityId,
      date,
      type:       act.sport_type || act.type,
      nom:        act.name,
      distance_m: Math.round(act.distance || 0),
      duree_s:    act.moving_time || 0,
      charge:     _calcCharge(act),
      donnees: {
        elevation:   act.total_elevation_gain,
        avg_hr:      act.average_heartrate,
        max_hr:      act.max_heartrate,
        avg_speed:   act.average_speed,
        max_speed:   act.max_speed,
        suffer_score: act.suffer_score,
        cadence:     act.average_cadence,
        calories:    act.calories,
        // Tracé abstrait du parcours (encodage Google polyline)
        polyline:    act.map?.summary_polyline || null,
        // Allures par km : compact [{d: distance_m, t: moving_time_s, hr: avg_hr}]
        splits:      Array.isArray(act.splits_metric)
          ? act.splits_metric.map((s: Record<string, unknown>) => ({
              d:  Math.round((s.distance as number) || 0),
              t:  (s.moving_time as number) || 0,
              hr: s.average_heartrate ? Math.round(s.average_heartrate as number) : null,
            }))
          : null,
      },
    }, { onConflict: 'strava_id' })

    return new Response('ok')
  }

  return new Response('Method not allowed', { status: 405 })
})
