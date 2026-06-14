import { DEFAULT_STATUSES } from '@chorala/config'
import { sql } from 'drizzle-orm'
import { client, db } from './client.ts'
import { generatePublicKey, generateSecret, newId } from './ids.ts'
import * as schema from './schema.ts'
import { SEED_ADMIN } from './seedData.ts'

/** Deterministic pick (avoids randomness so seeds are reproducible). */
const pick = <T>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length] as T

async function main() {
  console.log('› wiping existing data…')
  await db.execute(
    sql.raw(`TRUNCATE TABLE
      votes, comments, post_tags, post_translations, posts, statuses, boards, tags,
      changelog_subscribers, changelog_entries, notifications, integrations, webhooks,
      api_keys, audit_log, ai_jobs, feedback_clusters, end_users, projects, members,
      organizations, accounts, sessions, verifications, users
      RESTART IDENTITY CASCADE`),
  )

  // --- Org + admin -----------------------------------------------------------
  const orgId = newId('organization')
  await db.insert(schema.organizations).values({
    id: orgId,
    slug: 'acme',
    name: 'Acme Inc',
    plan: 'pro',
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr'],
    settings: {},
  })

  const userId = newId('user')
  await db.insert(schema.users).values({
    id: userId,
    name: SEED_ADMIN.name,
    email: SEED_ADMIN.email,
    emailVerified: true,
  })
  const adminMemberId = newId('member')
  await db.insert(schema.members).values({ id: adminMemberId, orgId, userId, role: 'owner' })

  // --- Project ---------------------------------------------------------------
  const projectId = newId('project')
  const publicKey = generatePublicKey()
  const endUserJwtSecret = generateSecret()
  await db.insert(schema.projects).values({
    id: projectId,
    orgId,
    slug: 'acme',
    name: 'Acme Feedback',
    isPublic: true,
    publicKey,
    endUserJwtSecret,
    allowedOrigins: ['http://localhost:3000', 'http://localhost:8787', 'https://idea.2pu.net'],
    widgetSettings: {
      theme: 'light',
      position: 'bottom-right',
      primaryColor: '#6366f1',
      mode: 'floating',
    },
  })

  // --- Statuses --------------------------------------------------------------
  const statusByKind: Record<string, string> = {}
  for (const s of DEFAULT_STATUSES) {
    const id = newId('status')
    statusByKind[s.kind] = id
    await db.insert(schema.statuses).values({
      id,
      projectId,
      name: s.name,
      color: s.color,
      kind: s.kind,
      position: s.position,
      showOnRoadmap: s.showOnRoadmap,
    })
  }

  // --- Boards ----------------------------------------------------------------
  const featureBoardId = newId('board')
  const bugBoardId = newId('board')
  await db.insert(schema.boards).values([
    {
      id: featureBoardId,
      projectId,
      slug: 'feature-requests',
      name: 'Feature Requests',
      description: 'Ideas to make Acme better',
      kind: 'feature',
      position: 0,
    },
    {
      id: bugBoardId,
      projectId,
      slug: 'bugs',
      name: 'Bugs',
      description: 'Something not working?',
      kind: 'bug',
      position: 1,
    },
  ])

  // --- End users (voters) across locales ------------------------------------
  const endUserDefs = [
    { name: 'María García', email: 'maria@example.com', locale: 'es' },
    { name: 'Jean Dupont', email: 'jean@example.fr', locale: 'fr' },
    { name: 'Alice Smith', email: 'alice@example.com', locale: 'en' },
    { name: 'Bob Jones', email: 'bob@example.com', locale: 'en' },
    { name: 'Yuki Tanaka', email: 'yuki@example.com', locale: 'en' },
    { name: 'Priya Patel', email: 'priya@example.com', locale: 'en' },
  ]
  const endUserIds: string[] = []
  for (const u of endUserDefs) {
    const id = newId('endUser')
    endUserIds.push(id)
    await db.insert(schema.endUsers).values({
      id,
      projectId,
      email: u.email,
      name: u.name,
      isAnonymous: false,
      locale: u.locale,
      metadata: {},
      segment: { plan: pick(['free', 'pro', 'enterprise'], endUserIds.length) },
    })
  }

  // --- Tags ------------------------------------------------------------------
  const mobileTagId = newId('tag')
  const apiTagId = newId('tag')
  await db.insert(schema.tags).values([
    { id: mobileTagId, projectId, name: 'mobile', color: '#0ea5e9' },
    { id: apiTagId, projectId, name: 'api', color: '#a855f7' },
  ])

  // --- Posts -----------------------------------------------------------------
  type PostDef = {
    board: 'feature' | 'bug'
    title: string
    body: string
    locale: string
    status: keyof typeof statusByKind & string
    pinned?: boolean
    tags?: string[]
    translate?: boolean
  }
  const postDefs: PostDef[] = [
    {
      board: 'feature',
      title: 'Dark mode for the dashboard',
      body: 'Please add a dark theme, my eyes hurt at night.',
      locale: 'en',
      status: 'planned',
      pinned: true,
      tags: [mobileTagId],
      translate: true,
    },
    {
      board: 'feature',
      title: 'Slack notifications for new posts',
      body: 'Notify our #product channel when feedback comes in.',
      locale: 'en',
      status: 'in_progress',
      tags: [apiTagId],
    },
    {
      board: 'feature',
      title: 'Single sign-on (SAML)',
      body: 'We need SAML SSO for enterprise rollout.',
      locale: 'en',
      status: 'open',
      translate: true,
    },
    {
      board: 'feature',
      title: 'Exportar datos a CSV',
      body: 'Quiero exportar todas las ideas a un archivo CSV.',
      locale: 'es',
      status: 'open',
    },
    {
      board: 'feature',
      title: 'Mode sombre sur mobile',
      body: 'Un thème sombre pour l’application mobile serait génial.',
      locale: 'fr',
      status: 'planned',
      tags: [mobileTagId],
    },
    {
      board: 'feature',
      title: 'Roadmap public embed',
      body: 'Embed the roadmap on our marketing site.',
      locale: 'en',
      status: 'complete',
    },
    {
      board: 'feature',
      title: 'Custom statuses',
      body: 'Let admins define their own status columns.',
      locale: 'en',
      status: 'open',
    },
    {
      board: 'feature',
      title: 'Weighted votes by MRR',
      body: 'Prioritize feedback from high-MRR customers.',
      locale: 'en',
      status: 'planned',
      translate: true,
    },
    {
      board: 'feature',
      title: 'AI duplicate detection',
      body: 'Automatically suggest duplicate ideas to merge.',
      locale: 'en',
      status: 'in_progress',
      tags: [apiTagId],
    },
    {
      board: 'feature',
      title: 'Changelog email digest',
      body: 'Send subscribers a monthly digest of shipped changes.',
      locale: 'en',
      status: 'open',
    },
    {
      board: 'bug',
      title: 'Vote button double-counts on mobile Safari',
      body: 'Tapping vote quickly registers two votes.',
      locale: 'en',
      status: 'in_progress',
      pinned: true,
      tags: [mobileTagId],
    },
    {
      board: 'bug',
      title: 'Comentarios no se guardan',
      body: 'A veces mi comentario desaparece al enviarlo.',
      locale: 'es',
      status: 'open',
    },
    {
      board: 'bug',
      title: 'Widget overlaps cookie banner',
      body: 'The floating launcher hides our consent banner.',
      locale: 'en',
      status: 'open',
    },
    {
      board: 'bug',
      title: 'Roadmap colors wrong in Firefox',
      body: 'Status colors render gray in Firefox 120.',
      locale: 'en',
      status: 'complete',
    },
    {
      board: 'bug',
      title: 'Émojis cassés dans les titres',
      body: 'Les emojis s’affichent en carrés dans les titres.',
      locale: 'fr',
      status: 'closed',
    },
  ]

  const translations: Record<string, { es: string; fr: string }> = {
    'Dark mode for the dashboard': {
      es: 'Modo oscuro para el panel',
      fr: 'Mode sombre pour le tableau de bord',
    },
    'Single sign-on (SAML)': {
      es: 'Inicio de sesión único (SAML)',
      fr: 'Authentification unique (SAML)',
    },
    'Weighted votes by MRR': { es: 'Votos ponderados por MRR', fr: 'Votes pondérés par MRR' },
  }

  let postIndex = 0
  for (const def of postDefs) {
    const postId = newId('post')
    const boardId = def.board === 'feature' ? featureBoardId : bugBoardId
    const author = pick(endUserIds, postIndex)

    // deterministic vote + comment counts
    const voterCount = 1 + (postIndex % endUserIds.length)
    const voters = endUserIds.slice(0, voterCount)
    const commentCount = postIndex % 3

    await db.insert(schema.posts).values({
      id: postId,
      boardId,
      projectId,
      authorEndUserId: author,
      title: def.title,
      body: def.body,
      originalLocale: def.locale,
      statusId: statusByKind[def.status] ?? null,
      isPinned: def.pinned ?? false,
      voteCount: voters.length,
      commentCount,
    })

    await db
      .insert(schema.votes)
      .values(voters.map((euId) => ({ postId, endUserId: euId, weight: 1 })))

    for (let c = 0; c < commentCount; c++) {
      await db.insert(schema.comments).values({
        postId,
        authorEndUserId: pick(endUserIds, postIndex + c + 1),
        body: pick(
          ['+1, would love this!', 'Same here, big pain point.', 'Any timeline on this?'],
          postIndex + c,
        ),
        isInternal: false,
      })
    }
    // one internal staff note on the first two posts
    if (postIndex < 2) {
      await db.insert(schema.comments).values({
        postId,
        authorMemberId: adminMemberId,
        body: 'Internal: discussed in triage, leaning towards next quarter.',
        isInternal: true,
      })
    }

    if (def.tags?.length) {
      await db.insert(schema.postTags).values(def.tags.map((tagId) => ({ postId, tagId })))
    }

    const tr = def.translate ? translations[def.title] : undefined
    if (tr) {
      await db.insert(schema.postTranslations).values([
        { postId, locale: 'es', title: tr.es, body: def.body, isAuto: true },
        { postId, locale: 'fr', title: tr.fr, body: def.body, isAuto: true },
      ])
    }

    postIndex++
  }

  // --- Changelog -------------------------------------------------------------
  await db.insert(schema.changelogEntries).values([
    {
      projectId,
      title: 'Roadmap embeds are here 🎉',
      body: 'You can now embed your public roadmap on any site with a single script tag.',
      status: 'published',
      publishedAt: new Date(),
      labels: ['new'],
      linkedPostIds: [],
    },
    {
      projectId,
      title: 'Upcoming: weighted votes',
      body: 'Draft entry — weighting votes by customer segment.',
      status: 'draft',
      labels: ['improved'],
      linkedPostIds: [],
    },
  ])

  // --- Summary ---------------------------------------------------------------
  const rows = await db.execute<{ count: number }>(sql`select count(*)::int as count from posts`)
  const postCount = rows[0]?.count ?? 0
  console.log('✓ seed complete')
  console.log(`  org:        Acme Inc (${orgId})`)
  console.log(`  admin:      ${SEED_ADMIN.email} / ${SEED_ADMIN.password}`)
  console.log(`  project:    Acme Feedback (${projectId})`)
  console.log(`  publicKey:  ${publicKey}`)
  console.log(`  posts:      ${postCount}`)
}

main()
  .then(async () => {
    await client.end()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('✗ seed failed:', err)
    await client.end()
    process.exit(1)
  })
