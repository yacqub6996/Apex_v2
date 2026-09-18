import { ApiError } from '@/api/core/ApiError'

interface FastApiValidationErrorItem {
  loc?: (string | number)[]
  msg?: string
  type?: string
}

/**
 * Extracts a user-friendly error message from an unknown error or generated ApiError.
 * Surfaces backend `body.detail` messages from FastAPI rather than generic statusText ("Bad Request").
 */
export function extractApiErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  if (!error) return fallbackMessage

  if (error instanceof ApiError) {
    const body = error.body
    if (body) {
      if (typeof body.detail === 'string' && body.detail.trim().length > 0) {
        return body.detail.trim()
      }
      if (Array.isArray(body.detail) && body.detail.length > 0) {
        const first = body.detail[0] as FastApiValidationErrorItem | string
        if (typeof first === 'string' && first.trim().length > 0) {
          return first.trim()
        }
        if (first && typeof first === 'object' && typeof first.msg === 'string' && first.msg.trim().length > 0) {
          return first.msg.trim()
        }
      }
      if (typeof body.message === 'string' && body.message.trim().length > 0) {
        return body.message.trim()
      }
    }

    if (error.statusText && error.statusText.trim().length > 0) {
      return `${error.statusText} (${error.status})`
    }
  }

  if (error instanceof Error && error.message && error.message.trim().length > 0) {
    return error.message.trim()
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim()
  }

  return fallbackMessage
}
