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
  /* Strava refuse un refresh_token revoque ou deja tourne : il repond 400 avec
     un corps d'erreur, sans `expires_at`. `new Date(undefined * 1000)` est une
     date invalide, et `.toISOString()` levait alors une RangeError NON CAPTUREE
     — le vrai motif (« refresh token invalide ») n'apparaissait nulle part, on
     ne voyait qu'un 500 sans explication. On echoue desormais explicitement,
     et SANS ecrire : un corps partiel aurait pu remplacer un refresh_token
     encore valide par `undefined`, ce qui delie l'athlete definitivement. */
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Strava refresh ${res.status} (token ${token.id}) : ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.access_token || !data.expires_at) {
    throw new Error(`Strava refresh : reponse sans access_token (token ${token.id})`)
  }
  const { error: majErr } = await supabase.from('strava_tokens').update({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    new Date(data.expires_at * 1000).toISOString(),
    updated_at:    new Date().toISOString(),
  }).eq('id', token.id)
  // Un token rafraichi mais non ecrit rejouerait le refresh a chaque appel,
  // jusqu'a ce que Strava invalide celui qu'on n'a pas su ranger.
  if (majErr) throw new Error(`Ecriture du token echouee : ${majErr.message}`)
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
   /* `refreshIfNeeded` leve desormais au lieu de laisser passer une reponse
      d'erreur. Sans ce filet, l'exception ressortait telle quelle : Strava
      recevait un 500 nu, et le MOTIF n'etait consigne nulle part — c'est
      exactement ce qui rendait la panne indiagnosticable. */
   try {
    const event = await req.json()

    /* `delete` etait ignore. Or supprimer un doublon depuis Strava est
       exactement le geste qu'on demande a l'athlete : l'activite disparaissait
       de chez lui et restait chez le praticien, ou elle continuait de fausser
       l'ACWR. Le seul recours etait la suppression manuelle cote praticien. */
    if (event.object_type !== 'activity' || !['create', 'update', 'delete'].includes(event.aspect_type)) {
      return new Response('ok')
    }

    const stravaAthleteId  = event.owner_id
    const stravaActivityId = event.object_id

    /* `.single()` leve une erreur quand aucune ligne ne correspond — un athlete
       non relie faisait donc echouer la requete au lieu de rendre `null`. */
    const { data: token, error: tokErr } = await supabase
      .from('strava_tokens')
      .select('*')
      .eq('strava_athlete_id', stravaAthleteId)
      .maybeSingle()

    if (tokErr) {
      console.error('[strava-webhook] lecture du token', tokErr.message)
      return new Response('token lookup failed', { status: 500 })
    }
    if (!token) return new Response('ok') // athlete not linked

    // Une suppression n'a besoin d'aucun appel a l'API : on sait deja quoi retirer.
    if (event.aspect_type === 'delete') {
      const { error: supErr } = await supabase
        .from('strava_activities')
        .delete()
        .eq('strava_id', stravaActivityId)
        .eq('patient_id', token.patient_id)
      if (supErr) {
        console.error('[strava-webhook] suppression', stravaActivityId, supErr.message)
        return new Response('delete failed', { status: 500 })
      }
      return new Response('ok')
    }

    const accessToken = await refreshIfNeeded(token)

    // Fetch full activity details
    const actRes = await fetch(
      `https://www.strava.com/api/v3/activities/${stravaActivityId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    /* Tous les echecs de lecture ne se valent pas, et les confondre en « ok »
       perdait l'activite pour de bon : Strava ne rejoue jamais un evenement
       acquitte. Un 404 est definitif — activite privee ou deja supprimee, il
       n'y a rien a attendre. Une limite de debit (429) ou une panne Strava
       (5xx) sont passageres : on rend un 500 pour qu'il repasse. */
    if (!actRes.ok) {
      if (actRes.status === 404) return new Response('ok')
      console.error('[strava-webhook] lecture activite', stravaActivityId, actRes.status)
      return new Response('strava fetch failed', { status: 500 })
    }

    const act  = await actRes.json()
    const date = (act.start_date_local as string)?.substring(0, 10)

    const { error: ecrErr } = await supabase.from('strava_activities').upsert({
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

    /* Le resultat de l'ecriture n'etait pas regarde : une contrainte violee ou
       une RLS refusee rendait « ok » a Strava, qui ne rejoue jamais un
       evenement acquitte. L'activite etait perdue sans le moindre signal — ni
       chez le praticien, ni dans les journaux. Un 500 fait rejouer Strava. */
    if (ecrErr) {
      console.error('[strava-webhook] ecriture activite', stravaActivityId, ecrErr.message)
      return new Response('write failed', { status: 500 })
    }

    return new Response('ok')
   } catch (e) {
     console.error('[strava-webhook]', (e as Error).message)
     // 500 volontaire : Strava rejoue l'evenement, un 200 le perdrait.
     return new Response('error', { status: 500 })
   }
  }

  return new Response('Method not allowed', { status: 405 })
})
