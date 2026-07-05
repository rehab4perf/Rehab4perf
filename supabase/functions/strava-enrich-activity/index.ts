import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const CLIENT_ID     = Deno.env.get('STRAVA_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!

// Appelee directement depuis le navigateur (pas serveur-a-serveur comme le
// webhook) : le navigateur envoie une requete preflight OPTIONS avant le POST
// (headers personnalises apikey/Authorization). Sans ces en-tetes CORS,
// Chrome bloque la reponse avant meme qu'elle arrive au JS de l'app.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer',
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

// Enrichit à la demande une activité déjà importée (via sync-history, donc sans
// splits) avec les détails complets de l'endpoint Strava /activities/{id}
// (splits par km, cadence, calories). Appelé depuis le panneau builder quand
// donnees.splits est absent.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  const body = await req.json().catch(() => ({}))
  const stravaId  = body.strava_id
  const patientId = body.patient_id
  if (!stravaId || !patientId) {
    return new Response('Missing strava_id or patient_id', { status: 400, headers: CORS_HEADERS })
  }

  const { data: activity } = await supabase
    .from('strava_activities')
    .select('donnees, patient_id')
    .eq('strava_id', stravaId)
    .single()
  if (!activity || String(activity.patient_id) !== String(patientId)) {
    return new Response('Activity not found', { status: 404, headers: CORS_HEADERS })
  }

  const { data: token } = await supabase
    .from('strava_tokens')
    .select('*')
    .eq('patient_id', patientId)
    .single()
  if (!token) {
    return new Response('No Strava token for this patient', { status: 404, headers: CORS_HEADERS })
  }

  const accessToken = await refreshIfNeeded(token)

  const actRes = await fetch(
    `https://www.strava.com/api/v3/activities/${stravaId}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  if (!actRes.ok) return new Response('Strava API error', { status: 502, headers: CORS_HEADERS })

  const act = await actRes.json()

  const splits = Array.isArray(act.splits_metric)
    ? act.splits_metric.map((s: Record<string, unknown>) => ({
        d:  Math.round((s.distance as number) || 0),
        t:  (s.moving_time as number) || 0,
        hr: s.average_heartrate ? Math.round(s.average_heartrate as number) : null,
      }))
    : null

  const mergedDonnees = {
    ...(activity.donnees || {}),
    cadence:  act.average_cadence,
    calories: act.calories,
    polyline: act.map?.summary_polyline || (activity.donnees || {}).polyline || null,
    splits,
  }

  await supabase.from('strava_activities')
    .update({ donnees: mergedDonnees })
    .eq('strava_id', stravaId)

  return new Response(JSON.stringify({ ok: true, donnees: mergedDonnees }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
