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
