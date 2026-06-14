import { useCallback, useEffect, useState } from 'preact/hooks'
import type { Api } from './api.ts'
import { emitEngaged } from './engage.ts'
import type { Translator } from './i18n.ts'
import type { Board, ChangelogEntry, Comment, Post, RoadmapResponse, View } from './types.ts'

type Props = {
  api: Api
  t: Translator
  locale: string
  initialView: View
  inline: boolean
  onClose: () => void
}

export function App(props: Props) {
  const { api, t, locale, inline, onClose } = props
  const [view, setView] = useState<View>(props.initialView)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [boards, setBoards] = useState<Board[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null)
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])

  const [detailId, setDetailId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(
    async (v: View) => {
      setLoading(true)
      setError(null)
      try {
        if (v === 'board') {
          const r = await api.listBoards(locale)
          setBoards(r.boards)
          setPosts(r.posts)
        } else if (v === 'roadmap') {
          setRoadmap(await api.roadmap(locale))
        } else {
          setChangelog(await api.changelog())
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [api, locale],
  )

  useEffect(() => {
    void load(view)
  }, [view, load])

  const vote = useCallback(
    async (post: Post) => {
      const on = !post.hasVoted
      setPosts((cur) =>
        cur.map((p) =>
          p.id === post.id ? { ...p, hasVoted: on, voteCount: p.voteCount + (on ? 1 : -1) } : p,
        ),
      )
      try {
        await api.vote(post.id, on)
        emitEngaged('vote')
      } catch (e) {
        setError((e as Error).message)
        void load('board')
      }
    },
    [api, load],
  )

  const tabs: View[] = ['board', 'roadmap', 'changelog']

  return (
    <div class={`heed-root ${inline ? 'heed-inline' : ''}`}>
      <div class="heed-header">
        <h1>{t('feedback')}</h1>
        {!inline && (
          <button type="button" class="heed-x" onClick={onClose} aria-label={t('close')}>
            ×
          </button>
        )}
      </div>

      <div class="heed-tabs">
        {tabs.map((v) => (
          <button
            key={v}
            type="button"
            class={`heed-tab ${view === v ? 'active' : ''}`}
            onClick={() => {
              setDetailId(null)
              setShowForm(false)
              setView(v)
            }}
          >
            {t(v)}
          </button>
        ))}
      </div>

      <div class="heed-body">
        {error && <div class="heed-error">{error}</div>}
        {loading ? (
          <div class="heed-empty">{t('loading')}</div>
        ) : detailId ? (
          <PostDetailView
            api={api}
            t={t}
            locale={locale}
            postId={detailId}
            onBack={() => setDetailId(null)}
          />
        ) : view === 'board' ? (
          showForm ? (
            <SubmitForm
              api={api}
              t={t}
              locale={locale}
              boards={boards}
              onDone={() => {
                setShowForm(false)
                void load('board')
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <BoardList
              t={t}
              posts={posts}
              onVote={vote}
              onOpen={setDetailId}
              onNew={() => setShowForm(true)}
            />
          )
        ) : view === 'roadmap' ? (
          <RoadmapView t={t} roadmap={roadmap} onOpen={setDetailId} />
        ) : (
          <ChangelogView t={t} entries={changelog} />
        )}
      </div>

      <div class="heed-footer">
        <a class="heed-credit" href="https://chorala.com" target="_blank" rel="noreferrer">
          {t('poweredBy')}
        </a>
      </div>
    </div>
  )
}

function VoteButton({ post, onVote, label }: { post: Post; onVote: () => void; label: string }) {
  return (
    <button
      type="button"
      class={`heed-votebtn ${post.hasVoted ? 'voted' : ''}`}
      onClick={onVote}
      aria-pressed={post.hasVoted}
      aria-label={label}
    >
      <span class="arrow">▲</span>
      <span>{post.voteCount}</span>
    </button>
  )
}

function PostRow({
  post,
  t,
  onVote,
  onOpen,
}: {
  post: Post
  t: Translator
  onVote?: () => void
  onOpen: () => void
}) {
  return (
    <div class="heed-post">
      {onVote && <VoteButton post={post} onVote={onVote} label={t('vote')} />}
      <button type="button" class="heed-postbtn heed-post-main" onClick={onOpen}>
        <p class="heed-post-title">{post.title}</p>
        {post.body && <p class="heed-post-body">{post.body}</p>}
        <p class="heed-post-meta">
          {post.commentCount} {t('comments')}
        </p>
      </button>
    </div>
  )
}

function BoardList({
  t,
  posts,
  onVote,
  onOpen,
  onNew,
}: {
  t: Translator
  posts: Post[]
  onVote: (p: Post) => void
  onOpen: (id: string) => void
  onNew: () => void
}) {
  return (
    <div>
      <button type="button" class="heed-btn" style="width:100%;margin-bottom:12px" onClick={onNew}>
        + {t('submitIdea')}
      </button>
      {posts.length === 0 ? (
        <div class="heed-empty">{t('noPosts')}</div>
      ) : (
        posts.map((p) => (
          <PostRow key={p.id} post={p} t={t} onVote={() => onVote(p)} onOpen={() => onOpen(p.id)} />
        ))
      )}
    </div>
  )
}

function SubmitForm({
  api,
  t,
  locale,
  boards,
  onDone,
  onCancel,
}: {
  api: Api
  t: Translator
  locale: string
  boards: Board[]
  onDone: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [boardSlug, setBoardSlug] = useState(boards[0]?.slug ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: Event) => {
    e.preventDefault()
    if (title.trim().length < 2) return
    setBusy(true)
    setErr(null)
    try {
      await api.createPost({ boardSlug, title: title.trim(), body: body.trim(), locale })
      emitEngaged('feedback')
      onDone()
    } catch (e2) {
      setErr((e2 as Error).message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      {boards.length > 1 && (
        <div class="heed-field">
          <label>
            <span>{t('board')}</span>
            <select
              class="heed-input"
              value={boardSlug}
              onChange={(e) => setBoardSlug((e.target as HTMLSelectElement).value)}
            >
              {boards.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div class="heed-field">
        <label>
          <span>{t('title')}</span>
          <input
            class="heed-input"
            value={title}
            placeholder={t('titlePlaceholder')}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
        </label>
      </div>
      <div class="heed-field">
        <label>
          <span>{t('details')}</span>
          <textarea
            class="heed-textarea"
            value={body}
            placeholder={t('detailsPlaceholder')}
            onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
          />
        </label>
      </div>
      {err && <div class="heed-error">{err}</div>}
      <div class="heed-row">
        <button type="submit" class="heed-btn" disabled={busy || title.trim().length < 2}>
          {t('submit')}
        </button>
        <button type="button" class="heed-btn secondary" onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}

function PostDetailView({
  api,
  t,
  locale,
  postId,
  onBack,
}: {
  api: Api
  t: Translator
  locale: string
  postId: string
  onBack: () => void
}) {
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const d = await api.getPost(postId, locale)
      setPost(d.post)
      setComments(d.comments)
    } catch (e) {
      setErr((e as Error).message)
    }
  }, [api, postId, locale])

  useEffect(() => {
    void reload()
  }, [reload])

  const vote = async () => {
    if (!post) return
    const on = !post.hasVoted
    setPost({ ...post, hasVoted: on, voteCount: post.voteCount + (on ? 1 : -1) })
    try {
      await api.vote(post.id, on)
      emitEngaged('vote')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const addComment = async (e: Event) => {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await api.comment(postId, text.trim())
      emitEngaged('comment')
      setText('')
      await reload()
    } catch (e2) {
      setErr((e2 as Error).message)
    }
  }

  if (!post) return <div class="heed-empty">{t('loading')}</div>

  return (
    <div>
      <button type="button" class="heed-btn secondary" style="margin-bottom:12px" onClick={onBack}>
        ← {t('back')}
      </button>
      <div class="heed-post">
        <VoteButton post={post} onVote={vote} label={t('vote')} />
        <div class="heed-post-main">
          <p class="heed-post-title">{post.title}</p>
          {post.body && <p style="color:var(--heed-muted);margin:4px 0 0">{post.body}</p>}
        </div>
      </div>
      {err && <div class="heed-error">{err}</div>}
      <h3 style="font-size:13px;margin:16px 0 4px;color:var(--heed-muted)">
        {comments.length} {t('comments')}
      </h3>
      {comments.map((c) => (
        <div key={c.id} class="heed-comment">
          {c.body}
        </div>
      ))}
      <form onSubmit={addComment} style="margin-top:10px">
        <textarea
          class="heed-textarea"
          value={text}
          placeholder={t('addComment')}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        />
        <button type="submit" class="heed-btn" style="margin-top:6px" disabled={!text.trim()}>
          {t('send')}
        </button>
      </form>
    </div>
  )
}

function RoadmapView({
  t,
  roadmap,
  onOpen,
}: {
  t: Translator
  roadmap: RoadmapResponse | null
  onOpen: (id: string) => void
}) {
  if (!roadmap || roadmap.columns.length === 0)
    return <div class="heed-empty">{t('nothingHere')}</div>
  return (
    <div>
      {roadmap.columns.map((col) => (
        <div key={col.status.id} style="margin-bottom:16px">
          <div class="heed-col-title">
            <span class="heed-dot" style={`background:${col.status.color}`} />
            {col.status.name} · {col.posts.length}
          </div>
          {col.posts.map((p) => (
            <PostRow key={p.id} post={p} t={t} onOpen={() => onOpen(p.id)} />
          ))}
        </div>
      ))}
    </div>
  )
}

function ChangelogView({ t, entries }: { t: Translator; entries: ChangelogEntry[] }) {
  if (entries.length === 0) return <div class="heed-empty">{t('nothingHere')}</div>
  return (
    <div>
      {entries.map((e) => (
        <div key={e.id} class="heed-cl">
          <h3>{e.title}</h3>
          {e.publishedAt && <div class="date">{new Date(e.publishedAt).toLocaleDateString()}</div>}
          {e.labels.length > 0 && (
            <div class="heed-labels">
              {e.labels.map((l) => (
                <span key={l} class="heed-label">
                  {l}
                </span>
              ))}
            </div>
          )}
          <p style="color:var(--heed-muted);font-size:13px">{e.body}</p>
        </div>
      ))}
    </div>
  )
}
