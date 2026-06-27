import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const CLIENT_ID     = Deno.env.get('STRAVA_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!
const APP_URL       = Deno.env.get('APP_URL')!

Deno.serve(async (req: Request) => {
  const url       = new URL(req.url)
  const code      = url.searchParams.get('code')
  const state     = url.searchParams.get('state')  // "patientId:praticienId"
  const error     = url.searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(APP_URL + '?strava=denied', 302)
  }

  const parts = state.split(':')
  if (parts.length < 2) {
    return new Response('Invalid state', { status: 400 })
  }
  const patientId   = parts[0]
  const praticienId = parts[1]

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return Response.redirect(APP_URL + '?strava=error', 302)
  }

  const data = await tokenRes.json()

  const { error: upsertErr } = await supabase.from('strava_tokens').upsert({
    patient_id:        patientId,
    praticien_id:      praticienId,
    strava_athlete_id: data.athlete.id,
    access_token:      data.access_token,
    refresh_token:     data.refresh_token,
    expires_at:        new Date(data.expires_at * 1000).toISOString(),
    scope:             data.scope || 'read,activity:read_all',
    updated_at:        new Date().toISOString(),
  }, { onConflict: 'patient_id' })

  if (upsertErr) {
    return Response.redirect(APP_URL + '?strava=error', 302)
  }

  // Sync last 90 days in background (fire and forget)
  fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/strava-sync-history?patient_id=${patientId}`,
    { headers: { 'Authorization': `Bearer ${Deno.env.get('SB_SERVICE_ROLE_KEY')}` } }
  ).catch(() => {})

  return Response.redirect(APP_URL + '?strava=ok', 302)
})
