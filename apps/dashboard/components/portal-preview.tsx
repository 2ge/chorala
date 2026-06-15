'use client'

import { useState } from 'react'

/** Live preview of the end-user portal inside the admin, with a desktop/mobile toggle. */
export function PortalPreview({ src }: { src: string }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const width = device === 'mobile' ? 390 : '100%'

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex rounded-full border border-line bg-raised p-0.5 text-xs font-semibold">
          {(['desktop', 'mobile'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`rounded-full px-3 py-1 capitalize transition ${
                device === d ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-sm font-medium text-ink-soft transition hover:text-accent"
        >
          Open in new tab ↗
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line-strong bg-ink/[0.03] shadow-[0_20px_60px_-30px_rgba(28,24,21,0.5)]">
        {/* faux browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-line bg-raised px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-red-400/70" />
          <span className="h-3 w-3 rounded-full bg-amber-400/70" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
          <span className="ml-3 truncate rounded-md bg-ink/[0.06] px-3 py-1 text-xs text-ink-faint">
            {src}
          </span>
        </div>
        <div className="flex justify-center bg-ink/[0.02] p-4">
          <iframe
            title="Portal preview"
            src={src}
            style={{ width, height: 720, maxWidth: '100%' }}
            className="rounded-xl border border-line bg-paper"
          />
        </div>
      </div>
    </div>
  )
}
