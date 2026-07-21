// Envoi de notifications Web Push a l'athlete quand le praticien modifie l'agenda.
// Appelee depuis l'app praticien (prog-main.js) avec le JWT du praticien.
// Securite : le praticien ne peut notifier QUE ses propres patients.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@rehab4perf.com',
  Deno.env.get('VAPID_PUBLIC')!,
  Deno.env.get('VAPID_PRIVATE')!,
)

// Appelee depuis le navigateur : preflight OPTIONS + en-tetes CORS obligatoires.
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer',
}

function uidFromJwt(auth: string | null): string | null {
  if (!auth) return null
  const m = auth.match(/Bearer\s+(.+)/i)
  if (!m) return null
  try {
    const payload = JSON.parse(atob(m[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub || null
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const uid = uidFromJwt(req.headers.get('authorization'))
  if (!uid) return new Response('Unauthorized', { status: 401, headers: CORS })

  const body = await req.json().catch(() => ({}))
  const patientId = body.patient_id
  const title = String(body.title || 'Rehab4Perf').slice(0, 80)
  const message = String(body.body || 'Votre planning a ete mis a jour.').slice(0, 160)
  if (!patientId) return new Response('Missing patient_id', { status: 400, headers: CORS })

  // Le praticien ne peut notifier que ses propres patients.
  const { data: pat } = await supabase
    .from('patients')
    .select('praticien_id')
    .eq('id', patientId)
    .single()
  if (!pat || String(pat.praticien_id) !== String(uid)) {
    return new Response('Forbidden', { status: 403, headers: CORS })
  }

  const { data: subs } = await supabase
    .from('athlete_push_subscriptions')
    .select('*')
    .eq('patient_id', patientId)

  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const payload = JSON.stringify({ title, body: message, url: '/athlete.html', tag: 'r4p-agenda' })
  let sent = 0
  const dead: string[] = []

  await Promise.all(subs.map(async (s: Record<string, string>) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      sent++
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) dead.push(s.id) // abonnement expire → purge
    }
  }))

  if (dead.length) {
    await supabase.from('athlete_push_subscriptions').delete().in('id', dead)
  }

  return new Response(
    JSON.stringify({ sent, purged: dead.length }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
