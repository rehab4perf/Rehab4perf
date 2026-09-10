import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

const CLIENT_ID     = Deno.env.get('STRAVA_CLIENT_ID')!
const CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!
const APP_URL       = Deno.env.get('APP_URL')!

// L'athlete qui clique le lien de connexion n'a pas de compte Rehab4Perf —
// on ne le renvoie donc jamais vers l'app praticien (APP_URL), mais vers une
// page neutre dediee qui ne requiert aucune authentification.
const ATHLETE_REDIRECT = APP_URL + '/strava-connected.html'

Deno.serve(async (req: Request) => {
  const url       = new URL(req.url)
  const code      = url.searchParams.get('code')
  const state     = url.searchParams.get('state')  // "patientId:praticienId"
  const error     = url.searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(ATHLETE_REDIRECT + '?status=denied', 302)
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
    return Response.redirect(ATHLETE_REDIRECT + '?status=error', 302)
  }

  const data = await tokenRes.json()

  /* Un compte Strava = un seul lien. L'upsert ci-dessous a pour cle le PATIENT :
     seul, il laissait le meme `strava_athlete_id` relie a deux fiches, et le
     webhook — qui cherche le patient par compte Strava — tombait alors en
     erreur sur chaque activite, perdue pour les deux fiches.
     Regle decidee avec le praticien : chez le MEME praticien, la derniere fiche
     reliee l'emporte (c'est la correction d'une fiche en double, et l'app n'a
     aucun bouton « delier Strava ») ; chez un AUTRE praticien, on refuse — on
     ne retire pas en silence le lien d'un confrere. */
  const { data: liens, error: lienErr } = await supabase
    .from('strava_tokens')
    .select('id, patient_id, praticien_id')
    .eq('strava_athlete_id', data.athlete.id)
  if (lienErr) {
    return Response.redirect(ATHLETE_REDIRECT + '?status=error', 302)
  }
  const autres = (liens || []).filter(l => String(l.patient_id) !== String(patientId))
  if (autres.some(l => String(l.praticien_id) !== String(praticienId))) {
    return Response.redirect(ATHLETE_REDIRECT + '?status=taken', 302)
  }
  if (autres.length) {
    // Retire AVANT d'ecrire : avec l'index unique sur strava_athlete_id,
    // l'upsert de la nouvelle fiche serait refuse tant que l'ancienne existe.
    const { error: retraitErr } = await supabase
      .from('strava_tokens')
      .delete()
      .eq('strava_athlete_id', data.athlete.id)
      .eq('praticien_id', praticienId)
      .neq('patient_id', patientId)
    if (retraitErr) {
      return Response.redirect(ATHLETE_REDIRECT + '?status=error', 302)
    }
  }

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
    return Response.redirect(ATHLETE_REDIRECT + '?status=error', 302)
  }

  // Sync last 90 days in background (fire and forget)
  fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/strava-sync-history?patient_id=${patientId}`,
    { headers: { 'Authorization': `Bearer ${Deno.env.get('SB_SERVICE_ROLE_KEY')}` } }
  ).catch(() => {})

  return Response.redirect(ATHLETE_REDIRECT + '?status=ok', 302)
})
