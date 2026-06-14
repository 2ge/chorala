/** A typed application error mapped to a JSON `{ error: { code, message } }` response. */
export class AppError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export const notFound = (what = 'Resource') => new AppError('not_found', `${what} not found`, 404)
export const forbidden = (msg = 'Forbidden') => new AppError('forbidden', msg, 403)
export const unauthorized = (msg = 'Unauthorized') => new AppError('unauthorized', msg, 401)
export const conflict = (msg = 'Conflict') => new AppError('conflict', msg, 409)
export const badRequest = (msg = 'Bad request', details?: unknown) =>
  new AppError('bad_request', msg, 400, details)
