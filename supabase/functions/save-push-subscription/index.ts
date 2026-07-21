// Enregistre l'abonnement Web Push d'un athlete depuis athlete.html.
// Contournement : l'INSERT anonyme direct (anon + RLS, policy check(true))
// est bloque par un comportement de plateforme non explique (voir debug du
// 2026-07-21 — grants et policy corrects, reproductible sur table neuve,
// hors cause identifiable cote SQL). On passe donc par le service role, qui
// ne passe jamais par RLS, avec exactement la meme portee de securite que
// la policy anon (aucune restriction au-dela d'un patient_id fourni).
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!,
)

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const body = await req.json().catch(() => ({}))
  const patientId = body.patient_id
  const endpoint  = body.endpoint
  const p256dh    = body.p256dh
  const auth      = body.auth
  if (!patientId || !endpoint || !p256dh || !auth) {
    return new Response('Missing fields', { status: 400, headers: CORS })
  }

  const { error } = await supabase
    .from('athlete_push_subscriptions')
    .upsert(
      { patient_id: patientId, endpoint, p256dh, auth },
      { onConflict: 'endpoint,patient_id' },
    )

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
