import { env, isCloud } from '@chorala/config'
import { count, db, eq, members, organizations } from '@chorala/db'
import { PLANS, type PlanId, planFor } from './plans.ts'

export { PLANS, type Plan, type PlanId, planFor } from './plans.ts'

/** Billing only does anything in cloud mode; self-host is fully inert (SPEC §12). */
export const isBillingEnabled = (): boolean => isCloud()

// Lazy Stripe — never imported/instantiated in self-host.
let stripeClient: import('stripe').Stripe | null = null
async function getStripe() {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')
  if (!stripeClient) {
    const { default: Stripe } = await import('stripe')
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY)
  }
  return stripeClient
}

/**
 * Enforce the org's admin-seat limit before adding a member. NO-OP in self-host
 * (unlimited admins). NEVER limits end-users or votes (SPEC §1/§12).
 */
export async function assertSeatAvailable(orgId: string): Promise<void> {
  if (!isCloud()) return
  const [org] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, orgId))
  const plan = planFor(org?.plan ?? 'free')
  const [seatRow] = await db
    .select({ value: count() })
    .from(members)
    .where(eq(members.orgId, orgId))
  if ((seatRow?.value ?? 0) >= plan.adminSeats) {
    throw new Error(
      `Your ${plan.name} plan allows ${plan.adminSeats} admin seat(s). Upgrade to add more.`,
    )
  }
}

/** Create a Stripe Checkout session to subscribe an org to a plan (cloud only). */
export async function createCheckoutSession(args: {
  orgId: string
  plan: PlanId
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  if (!isCloud()) throw new Error('Billing is only available in cloud mode')
  const priceId = PLANS[args.plan].priceId()
  if (!priceId) throw new Error(`No Stripe price configured for the ${args.plan} plan`)
  const stripe = await getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    client_reference_id: args.orgId,
    metadata: { orgId: args.orgId, plan: args.plan },
  })
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
}

/** Handle a Stripe webhook (cloud only): keep the org's plan in sync with the subscription. */
export async function handleStripeWebhook(rawBody: string, signature: string): Promise<void> {
  if (!isCloud()) return
  const stripe = await getStripe()
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET ?? '')

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { metadata?: { orgId?: string; plan?: string } }
    const orgId = session.metadata?.orgId
    const plan = session.metadata?.plan as PlanId | undefined
    if (orgId && plan) {
      await db.update(organizations).set({ plan }).where(eq(organizations.id, orgId))
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { metadata?: { orgId?: string } }
    const orgId = sub.metadata?.orgId
    if (orgId) {
      await db.update(organizations).set({ plan: 'free' }).where(eq(organizations.id, orgId))
    }
  }
}
