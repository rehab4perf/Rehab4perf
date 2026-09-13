// Export pour la newsletter « Le Vestiaire » (voir 20260913_newsletter_vestiaire.sql).
//
// Appelée chaque dimanche par la tâche qui rédige les numéros, jamais par un
// navigateur : pas de CORS. Déployée `--no-verify-jwt` — elle n'a pas de
// session, elle a un SECRET, envoyé dans `x-newsletter-secret`. La base n'en
// garde que l'empreinte SHA-256 (`newsletter_praticiens`), qui désigne aussi
// le praticien : un secret n'ouvre que SES athlètes.
//
// Ce qui sort, et rien d'autre : prénom, sport, niveau, tranche d'âge, sexe,
// format et sujets choisis par l'athlète, ses échéances, et le volume Strava
// AGRÉGÉ des 28 derniers jours. Jamais le nom, la date de naissance, un
// bilan, une note clinique ni l'identifiant du patient — l'uuid est le
// secret du lien athlète (20260912) : il est remplacé par une référence
// dérivée, stable d'une semaine à l'autre pour l'historique de la tâche.
//
// Seuls les athlètes dont la newsletter est ACTIVE (praticien) ET CONSENTIE
// (athlète) sortent.
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!,
)

const JOUR = 86400000

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function sha256Hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function isoJour(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function trancheAge(ddn: string | null, auj: Date): string | null {
  if (!ddn) return null
  const n = new Date(ddn + 'T00:00:00Z')
  if (isNaN(n.getTime())) return null
  let age = auj.getUTCFullYear() - n.getUTCFullYear()
  const m = auj.getUTCMonth() - n.getUTCMonth()
  if (m < 0 || (m === 0 && auj.getUTCDate() < n.getUTCDate())) age--
  if (age < 0 || age > 110) return null
  if (age < 18) return 'moins de 18'
  const d = Math.floor(age / 10) * 10
  return d + '-' + (d + 9)
}

const arrondi = (x: number, n = 1) => Math.round(x * 10 ** n) / 10 ** n

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const secret = req.headers.get('x-newsletter-secret') || ''
  if (secret.length < 32) return json({ error: 'Unauthorized' }, 401)
  const { data: prat, error: e0 } = await supabase
    .from('newsletter_praticiens')
    .select('praticien_id')
    .eq('secret_sha256', await sha256Hex(secret))
    .maybeSingle()
  if (e0) return json({ error: 'Lecture des praticiens inscrits : ' + e0.message }, 500)
  if (!prat) return json({ error: 'Unauthorized' }, 401)

  const auj = new Date()
  const { data: nl, error: e1 } = await supabase
    .from('athlete_newsletter')
    .select('patient_id, format, sujets, consenti_at')
    .eq('active', true)
    .eq('consentement', true)
  if (e1) return json({ error: 'Lecture des newsletters : ' + e1.message }, 500)

  const base = { genere_le: auj.toISOString(), athletes: [] as unknown[] }
  if (!nl || !nl.length) return json(base)

  // Le praticien du secret, et lui seul : la ligne d'un autre cabinet ne sort pas.
  const { data: pats, error: e2 } = await supabase
    .from('patients')
    .select('id, prenom, sport, niveau, ddn, sexe')
    .in('id', nl.map((r) => r.patient_id))
    .eq('praticien_id', prat.praticien_id)
  if (e2) return json({ error: 'Lecture des patients : ' + e2.message }, 500)
  if (!pats || !pats.length) return json(base)
  const ids = pats.map((p) => p.id)

  // `select=*` : `date_fin` n'existe qu'avec 20260906 — la nommer ferait
  // échouer la lecture là où elle manque.
  const { data: objs, error: e3 } = await supabase
    .from('athlete_objectifs')
    .select('*')
    .in('patient_id', ids)
  if (e3) return json({ error: 'Lecture des échéances : ' + e3.message }, 500)

  const depuis28 = isoJour(new Date(auj.getTime() - 28 * JOUR))
  const { data: acts, error: e4 } = await supabase
    .from('strava_activities')
    .select('patient_id, date, type, duree_s, distance_m')
    .in('patient_id', ids)
    .gte('date', depuis28)
  if (e4) return json({ error: 'Lecture des activités : ' + e4.message }, 500)

  // Échéances : à venir, ou passées depuis moins de 30 jours — la tâche en a
  // besoin pour savoir qu'un athlète sort d'une course.
  const aujIso = isoJour(auj)
  const limitePassee = isoJour(new Date(auj.getTime() - 30 * JOUR))
  const joursJusqua = (d: string) =>
    Math.round((new Date(d + 'T00:00:00Z').getTime() - new Date(aujIso + 'T00:00:00Z').getTime()) / JOUR)

  const athletes = []
  for (const p of pats) {
    const r = nl.find((x) => x.patient_id === p.id)!
    const echeances = (objs || [])
      .filter((o) => o.patient_id === p.id && (o.date_fin || o.date) >= limitePassee)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 6)
      .map((o) => ({
        texte: o.texte,
        date: o.date,
        date_fin: o.date_fin && o.date_fin !== o.date ? o.date_fin : null,
        dans_jours: joursJusqua(o.date),
      }))

    const siennes = (acts || []).filter((a) => a.patient_id === p.id)
    const parType: Record<string, { seances: number; secondes: number; metres: number }> = {}
    for (const a of siennes) {
      const t = a.type || 'Autre'
      parType[t] = parType[t] || { seances: 0, secondes: 0, metres: 0 }
      parType[t].seances++
      parType[t].secondes += a.duree_s || 0
      parType[t].metres += a.distance_m || 0
    }
    const totalS = siennes.reduce((s, a) => s + (a.duree_s || 0), 0)

    athletes.push({
      ref: (await sha256Hex('r4p-vestiaire:' + p.id)).slice(0, 10),
      prenom: p.prenom || null,
      sport: p.sport || null,
      format: r.format || null,
      niveau: p.niveau || null,
      tranche_age: trancheAge(p.ddn, auj),
      sexe: p.sexe || null,
      sujets: r.sujets || [],
      consenti_le: r.consenti_at ? String(r.consenti_at).slice(0, 10) : null,
      echeances,
      strava_28j: siennes.length
        ? {
            seances: siennes.length,
            heures: arrondi(totalS / 3600),
            heures_par_semaine: arrondi(totalS / 3600 / 4),
            par_sport: Object.entries(parType)
              .map(([type, v]) => ({
                type,
                seances: v.seances,
                heures: arrondi(v.secondes / 3600),
                km: arrondi(v.metres / 1000, 0),
              }))
              .sort((a, b) => b.heures - a.heures),
          }
        : null,
    })
  }

  return json({ ...base, athletes })
})
