export type Email = { subject: string; html: string; text: string }

const layout = (heading: string, bodyHtml: string) => `<!doctype html>
<html><body style="font-family:ui-sans-serif,system-ui,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
    <h1 style="font-size:18px;margin:0 0 12px">${heading}</h1>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
    <p style="font-size:12px;color:#94a3b8">Powered by Chorala</p>
  </div>
</body></html>`

export function magicLinkEmail(url: string): Email {
  return {
    subject: 'Your Chorala sign-in link',
    text: `Sign in to Chorala: ${url}`,
    html: layout(
      'Sign in to Chorala',
      `<p>Click the button below to sign in. This link expires shortly.</p>
       <p><a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Sign in</a></p>`,
    ),
  }
}

const button = (url: string, label: string) =>
  `<p><a href="${url}" style="display:inline-block;background:#d9512a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`

export function resetPasswordEmail(url: string): Email {
  return {
    subject: 'Reset your Chorala password',
    text: `Reset your Chorala password: ${url}`,
    html: layout(
      'Reset your password',
      `<p>We received a request to reset your Chorala password. Click below to choose a new one — this link expires shortly.</p>
       ${button(url, 'Reset password')}
       <p style="font-size:12px;color:#94a3b8">If you didn’t request this, you can safely ignore this email.</p>`,
    ),
  }
}

export function verifyEmail(url: string): Email {
  return {
    subject: 'Verify your email for Chorala',
    text: `Verify your email for Chorala: ${url}`,
    html: layout(
      'Welcome to Chorala 👋',
      `<p>Confirm your email address to finish setting up your account.</p>
       ${button(url, 'Verify email')}`,
    ),
  }
}

export function changelogPublishedEmail(args: {
  projectName: string
  title: string
  body: string
  url: string
}): Email {
  return {
    subject: `${args.projectName}: ${args.title}`,
    text: `${args.title}\n\n${args.body}\n\n${args.url}`,
    html: layout(
      args.title,
      `<p style="white-space:pre-wrap;color:#475569">${args.body}</p>
       <p><a href="${args.url}" style="color:#6366f1">Read the changelog →</a></p>`,
    ),
  }
}

export function notificationEmail(args: { title: string; message: string; url?: string }): Email {
  return {
    subject: args.title,
    text: `${args.message}${args.url ? `\n\n${args.url}` : ''}`,
    html: layout(
      args.title,
      `<p style="color:#475569">${args.message}</p>${
        args.url ? `<p><a href="${args.url}" style="color:#6366f1">View →</a></p>` : ''
      }`,
    ),
  }
}

/** Weekly digest (Phase 20): "what your users asked for this week". */
export function weeklyDigestEmail(args: {
  projectName: string
  narrative: string
  newPosts: number
  newVotes: number
  topVoted: { title: string; voteCount: number }[]
  shipped: { title: string }[]
  url?: string
}): Email {
  const li = (s: string) => `<li style="margin:2px 0">${s}</li>`
  const topHtml = args.topVoted.length
    ? `<p style="margin:14px 0 4px;font-weight:600">Most wanted</p><ul style="margin:0;padding-left:18px;color:#475569">${args.topVoted
        .map((p) => li(`${p.title} <span style="color:#94a3b8">▲ ${p.voteCount}</span>`))
        .join('')}</ul>`
    : ''
  const shippedHtml = args.shipped.length
    ? `<p style="margin:14px 0 4px;font-weight:600">Shipped this week</p><ul style="margin:0;padding-left:18px;color:#475569">${args.shipped
        .map((p) => li(p.title))
        .join('')}</ul>`
    : ''
  return {
    subject: `${args.projectName}: your weekly feedback digest`,
    text:
      `${args.narrative}\n\n${args.newPosts} new posts · ${args.newVotes} new votes\n` +
      `${args.topVoted.map((p) => `- ${p.title} (▲ ${p.voteCount})`).join('\n')}` +
      `${args.url ? `\n\n${args.url}` : ''}`,
    html: layout(
      `${args.projectName} · weekly digest`,
      `<p style="color:#475569">${args.narrative}</p>
       <p style="color:#0f172a"><strong>${args.newPosts}</strong> new posts ·
        <strong>${args.newVotes}</strong> new votes</p>
       ${topHtml}${shippedHtml}
       ${args.url ? button(args.url, 'Open dashboard') : ''}`,
    ),
  }
}
