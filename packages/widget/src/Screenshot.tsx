import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { Translator } from './i18n.ts'

type Rect = { x: number; y: number; w: number; h: number; tool: Tool }
type Tool = 'highlight' | 'redact'

const MAX_W = 300 // displayed/exported width cap — keeps screenshots well under the size quota

/**
 * Bug-report screenshot capture + light annotation. Capture via the Screen Capture API,
 * a file pick, or paste; then drag to highlight or redact (black out) regions. Emits the
 * final annotated PNG as a data URL — zero dependencies, all canvas.
 */
export function Screenshot({
  t,
  onChange,
}: {
  t: Translator
  onChange: (dataUrl: string | null) => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [tool, setTool] = useState<Tool>('redact')
  const [rects, setRects] = useState<Rect[]>([])
  const [err, setErr] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const draft = useRef<Rect | null>(null)

  const canCapture = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia

  const loadImage = useCallback(
    (dataUrl: string) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, MAX_W / img.naturalWidth)
        imgRef.current = img
        setDims({
          w: Math.round(img.naturalWidth * scale),
          h: Math.round(img.naturalHeight * scale),
        })
        setRects([])
        setSrc(dataUrl)
      }
      img.onerror = () => setErr(t('shotFailed'))
      img.src = dataUrl
    },
    [t],
  )

  // Redraw the image + committed rects (+ the in-progress draft) whenever anything changes.
  const redraw = useCallback(
    (extra?: Rect | null) => {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas || !img) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      for (const r of extra ? [...rects, extra] : rects) {
        if (r.tool === 'redact') {
          ctx.fillStyle = '#111827'
          ctx.fillRect(r.x, r.y, r.w, r.h)
        } else {
          ctx.fillStyle = 'rgba(255,214,0,0.32)'
          ctx.fillRect(r.x, r.y, r.w, r.h)
          ctx.strokeStyle = '#f5a623'
          ctx.lineWidth = 2
          ctx.strokeRect(r.x, r.y, r.w, r.h)
        }
      }
    },
    [rects],
  )

  useEffect(() => {
    if (src) redraw()
  }, [src, redraw])

  // Emit the annotated PNG up to the form whenever the picture or its annotations change.
  useEffect(() => {
    if (!src) {
      onChange(null)
      return
    }
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL('image/png'))
  }, [src, rects, onChange])

  // Paste-to-attach (Cmd/Ctrl+V anywhere while the picker is open).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((i) => i.type.startsWith('image/'))
        ?.getAsFile()
      if (file) {
        e.preventDefault()
        readFile(file)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  })

  const readFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => loadImage(String(reader.result))
    reader.onerror = () => setErr(t('shotFailed'))
    reader.readAsDataURL(file)
  }

  const capture = async () => {
    setErr(null)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' } as MediaTrackConstraints,
        audio: false,
      })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      const c = document.createElement('canvas')
      c.width = video.videoWidth
      c.height = video.videoHeight
      c.getContext('2d')?.drawImage(video, 0, 0)
      for (const tr of stream.getTracks()) tr.stop()
      loadImage(c.toDataURL('image/png'))
    } catch {
      // user cancelled the picker, or capture is blocked — silent, they can upload instead
    }
  }

  const pos = (e: PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) }
  }
  const onDown = (e: PointerEvent) => {
    const p = pos(e)
    draft.current = { x: p.x, y: p.y, w: 0, h: 0, tool }
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    if (!draft.current) return
    const p = pos(e)
    draft.current = { ...draft.current, w: p.x - draft.current.x, h: p.y - draft.current.y }
    redraw(draft.current)
  }
  const onUp = () => {
    const d = draft.current
    draft.current = null
    if (d && (Math.abs(d.w) > 4 || Math.abs(d.h) > 4)) {
      // normalise negative drags so fill/stroke work regardless of direction
      const norm: Rect = {
        x: Math.min(d.x, d.x + d.w),
        y: Math.min(d.y, d.y + d.h),
        w: Math.abs(d.w),
        h: Math.abs(d.h),
        tool: d.tool,
      }
      setRects((r) => [...r, norm])
    } else {
      redraw()
    }
  }

  const reset = () => {
    imgRef.current = null
    setSrc(null)
    setRects([])
  }

  if (!src) {
    return (
      <div class="chorala-shot">
        <div class="chorala-shot-actions">
          {canCapture && (
            <button type="button" class="chorala-btn secondary" onClick={capture}>
              📷 {t('captureScreen')}
            </button>
          )}
          <label class="chorala-btn secondary chorala-shot-upload">
            🖼 {t('uploadImage')}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0]
                if (f) readFile(f)
              }}
            />
          </label>
        </div>
        <p class="chorala-shot-hint">{t('shotHint')}</p>
        {err && <div class="chorala-error">{err}</div>}
      </div>
    )
  }

  return (
    <div class="chorala-shot">
      <div class="chorala-shot-toolbar">
        <button
          type="button"
          class={`chorala-chip ${tool === 'redact' ? 'active' : ''}`}
          onClick={() => setTool('redact')}
        >
          ▮ {t('redact')}
        </button>
        <button
          type="button"
          class={`chorala-chip ${tool === 'highlight' ? 'active' : ''}`}
          onClick={() => setTool('highlight')}
        >
          ▤ {t('highlight')}
        </button>
        {rects.length > 0 && (
          <button
            type="button"
            class="chorala-chip"
            onClick={() => setRects((r) => r.slice(0, -1))}
          >
            ↺ {t('undo')}
          </button>
        )}
        <button type="button" class="chorala-chip danger" onClick={reset}>
          ✕ {t('remove')}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        class="chorala-shot-canvas"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      />
      <p class="chorala-shot-hint">{t('annotateHint')}</p>
    </div>
  )
}
