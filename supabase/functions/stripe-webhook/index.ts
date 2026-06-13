import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

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

  // Paiement Stripe validé → créer le compte Supabase
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email ?? session.customer_email
    const plan  = session.metadata?.plan // 'performance' | 'clinique'

    if (!email || !plan) {
      console.error('Missing email or plan', { email, plan })
      return new Response('Missing data', { status: 400 })
    }

    // Tenter d'inviter l'utilisateur (envoie le magic link)
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://app.rehab4perf.com/auth.html',
      data: { plan },
    })

    if (inviteErr) {
      // L'utilisateur existe déjà → mettre à jour son plan
      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers()
      if (listErr) {
        console.error('listUsers error:', listErr)
        return new Response('Server error', { status: 500 })
      }
      const existing = users.find((u) => u.email === email)
      if (existing) {
        const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...existing.user_metadata, plan },
        })
        if (updateErr) {
          console.error('updateUser error:', updateErr)
          return new Response('Server error', { status: 500 })
        }
        console.log(`Plan mis à jour pour ${email} → ${plan}`)
      } else {
        console.error('inviteUserByEmail error:', inviteErr)
        return new Response('Server error', { status: 500 })
      }
    } else {
      console.log(`Invitation envoyée à ${email} (plan: ${plan})`)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
