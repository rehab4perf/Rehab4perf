import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SB_SERVICE_ROLE_KEY')!
)

async function sendInviteEmail(email: string, inviteLink: string, plan: string) {
  const planLabel = plan === 'clinique' ? 'Plan Clinique' : 'Plan Performance'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Rehab4Perf <noreply@rehab4perf.com>',
      to: [email],
      subject: 'Votre invitation Rehab4Perf',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#1a3a6b;margin-bottom:8px">Bienvenue sur Rehab4Perf</h2>
          <p style="color:#444">Votre accès <strong>${planLabel}</strong> est activé.</p>
          <p style="color:#444">Cliquez sur le bouton ci-dessous pour créer votre mot de passe et accéder à l'application :</p>
          <a href="${inviteLink}" style="display:inline-block;background:#2B5FA6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:20px 0">
            Créer mon mot de passe
          </a>
          <p style="color:#888;font-size:13px;margin-top:24px">Ce lien est valable 24 heures.</p>
          <p style="color:#888;font-size:13px">Si vous n'êtes pas à l'origine de cette invitation, ignorez cet email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#aaa;font-size:12px">Rehab4Perf — <a href="https://app.rehab4perf.com" style="color:#2B5FA6">app.rehab4perf.com</a></p>
        </div>
      `,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }
  return res.json()
}

Deno.serve(async (req: Request) => {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('No signature', { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature error:', err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email ?? session.customer_email

    if (!email) {
      console.error('Missing email')
      return new Response('Missing email', { status: 400 })
    }

    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price'],
    })
    const price = expanded.line_items?.data[0]?.price
    const plan = price?.metadata?.plan

    if (!plan) {
      console.error('plan manquant dans price.metadata', { priceId: price?.id })
      return new Response('Missing plan metadata', { status: 400 })
    }
    console.log(`Plan détecté: ${plan} (price: ${price?.id})`)

    // Vérifie si l'utilisateur existe déjà
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) {
      console.error('listUsers error:', listErr)
      return new Response('Server error', { status: 500 })
    }
    const existing = users.find((u) => u.email === email)

    if (existing) {
      // Utilisateur existant → mise à jour du plan uniquement
      await supabase.auth.admin.updateUserById(existing.id, {
        user_metadata: { ...existing.user_metadata, plan },
      })
      console.log(`Plan mis à jour pour ${email} → ${plan}`)
    } else {
      // Nouvel utilisateur → générer le lien d'invitation
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          data: { plan },
          redirectTo: 'https://app.rehab4perf.com/auth.html',
        },
      })
      if (linkErr || !linkData?.properties?.action_link) {
        console.error('generateLink error:', linkErr)
        return new Response('Server error', { status: 500 })
      }
      const inviteLink = linkData.properties.action_link
      console.log(`Lien généré pour ${email}`)

      // Envoyer l'email via Resend directement
      await sendInviteEmail(email, inviteLink, plan)
      console.log(`Email envoyé à ${email} via Resend (plan: ${plan})`)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
