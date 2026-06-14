import { loadEnv } from '@chorala/config'

export type PlanId = 'free' | 'starter' | 'pro'

/**
 * Cloud plans. Pricing is flat **per admin seat** — end-users and votes are ALWAYS
 * unlimited on every plan (SPEC §1/§12). Never meter users or votes.
 */
export type Plan = {
  id: PlanId
  name: string
  adminSeats: number
  monthly: number
  features: string[]
  priceId: () => string | undefined
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    adminSeats: 1,
    monthly: 0,
    features: ['1 admin', 'Chorala branding', 'unlimited end-users & votes'],
    priceId: () => undefined,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    adminSeats: 3,
    monthly: 15,
    features: ['custom domain', 'AI included', 'deliverable email', 'unlimited end-users & votes'],
    priceId: () => loadEnv().STRIPE_PRICE_STARTER,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    adminSeats: 10,
    monthly: 39,
    features: ['white-label', 'SSO', 'EU residency', 'unlimited end-users & votes'],
    priceId: () => loadEnv().STRIPE_PRICE_PRO,
  },
}

export const planFor = (id: string): Plan =>
  PLANS[(id as PlanId) in PLANS ? (id as PlanId) : 'free']
